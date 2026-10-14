import uuid
import datetime
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.core.errors import DuplicateEventError, ScenarioNotFoundError
from app.ingestion.validate import validate_event_payload
from app.ingestion.normalize import normalize_event
from app.ingestion.deduplicate import compute_event_hash
from app.mapping.stride import map_stride
from app.mapping.attack import map_mitre_attack
from app.ir.builder import build_ir_graph
from app.twin.graph import SecurityDigitalTwin
from app.risk.edge_probability import calculate_bayesian_edge_probability
from app.risk.trust_vector import compute_trust_vector
from app.paths.search import find_all_attack_paths
from app.paths.scoring import rank_and_score_paths
from app.persistence.repositories import (
    ScenarioRepository, AssetRepository, RelationshipRepository,
    EventRepository, EvidenceRepository, AttackPathRepository, AuditRepository
)
from app.schemas.events import IngestEventResponse

class EventPipelineService:
    def __init__(self, db: Session):
        self.db = db
        self.scenario_repo = ScenarioRepository(db)
        self.asset_repo = AssetRepository(db)
        self.rel_repo = RelationshipRepository(db)
        self.event_repo = EventRepository(db)
        self.evidence_repo = EvidenceRepository(db)
        self.path_repo = AttackPathRepository(db)
        self.audit_repo = AuditRepository(db)

    def process_event(
        self,
        scenario_id: str,
        event_type: str,
        source: str,
        raw_payload: Dict[str, Any],
        timestamp: datetime.datetime = None
    ) -> IngestEventResponse:
        # 1. Verify scenario exists
        scenario = self.scenario_repo.get_or_seed_demo(scenario_id)
        if not scenario:
            raise ScenarioNotFoundError(scenario_id)

        # 2. Validation
        validate_event_payload(event_type, raw_payload)

        # 3. Normalization
        norm_type, norm_payload, event_time = normalize_event(event_type, raw_payload, timestamp)

        # 4. Deduplication
        dedup_hash = compute_event_hash(scenario_id, norm_type, norm_payload)
        existing_event = self.event_repo.find_by_hash(scenario_id, dedup_hash)
        if existing_event:
            raise DuplicateEventError(dedup_hash)

        # 5. Persist Security Event
        event_id = f"evt_{uuid.uuid4().hex[:8]}"
        persisted_event = self.event_repo.create(
            event_id=event_id,
            scenario_id=scenario_id,
            event_type=norm_type,
            timestamp=event_time,
            source=source,
            deduplication_hash=dedup_hash,
            normalized_payload=norm_payload,
            raw_payload=raw_payload
        )

        # 6. Canonical Evidence Model creation
        subject_id = norm_payload["resolved_subject_id"]
        subject_type = norm_payload["resolved_subject_type"]
        confidence = float(raw_payload.get("confidence", 0.8))

        evidence_id = f"ev_{uuid.uuid4().hex[:8]}"
        evidence = self.evidence_repo.create(
            evidence_id=evidence_id,
            scenario_id=scenario_id,
            event_id=event_id,
            subject_type=subject_type,
            subject_id=subject_id,
            claim_type=norm_type,
            confidence=confidence,
            observed_at=event_time,
            metadata_payload=norm_payload
        )

        # 7. STRIDE and ATT&CK Enrichment
        stride_mappings = map_stride(norm_type, norm_payload)
        for sm in stride_mappings:
            self.evidence_repo.add_mapping(
                mapping_id=f"map_{uuid.uuid4().hex[:8]}",
                evidence_id=evidence_id,
                framework="STRIDE",
                technique_id=sm["technique_id"],
                technique_name=sm["technique_name"],
                tactic=sm["tactic"],
                confidence=sm["confidence"],
                rationale=sm["rationale"]
            )

        attack_mappings = map_mitre_attack(norm_type, norm_payload)
        for am in attack_mappings:
            self.evidence_repo.add_mapping(
                mapping_id=f"map_{uuid.uuid4().hex[:8]}",
                evidence_id=evidence_id,
                framework="MITRE_ATTACK",
                technique_id=am["technique_id"],
                technique_name=am["technique_name"],
                tactic=am["tactic"],
                confidence=am["confidence"],
                rationale=am["rationale"]
            )

        # 8. Bump graph version
        new_version = self.scenario_repo.bump_version(scenario_id)

        # 9. Recompute Digital Twin and Bayesian Edge Probabilities
        assets = self.asset_repo.list_by_scenario(scenario_id)
        relationships = self.rel_repo.list_by_scenario(scenario_id)
        all_evidence = self.evidence_repo.list_by_scenario(scenario_id)

        # Evidence indexed by subject
        evidence_by_subject: Dict[str, List] = {}
        for ev in all_evidence:
            evidence_by_subject.setdefault(ev.subject_id, []).append(ev)

        ir = build_ir_graph(scenario_id, new_version, assets, relationships, all_evidence)

        # Update calibrated probabilities in IR
        for edge_id, edge in ir.edges.items():
            edge_evidence = evidence_by_subject.get(edge_id, [])
            base_prior = float(edge.attributes.get("prior_probability", 0.5))
            calibrated_p = calculate_bayesian_edge_probability(base_prior, edge_evidence)
            edge.calibrated_probability = calibrated_p

        digital_twin = SecurityDigitalTwin(ir)

        # 10. Recompute and Rank Attack Paths
        raw_paths = find_all_attack_paths(digital_twin)
        ranked_paths = rank_and_score_paths(
            scenario_id=scenario_id,
            graph_version=new_version,
            raw_paths=raw_paths,
            twin=digital_twin
        )

        # Persist ranked paths to database
        paths_data = [
            {
                "path_id": p.path_id,
                "entry_id": p.entry_id,
                "target_id": p.target_id,
                "risk_score": p.risk_score,
                "path_nodes": p.path_nodes,
                "hops": [h.model_dump() for h in p.hops]
            }
            for p in ranked_paths
        ]
        self.path_repo.replace_all(scenario_id, new_version, paths_data)

        # 11. Record Audit
        self.audit_repo.record(
            record_id=f"aud_{uuid.uuid4().hex[:8]}",
            scenario_id=scenario_id,
            action=f"ingest_event:{norm_type}",
            input_hash=dedup_hash,
            summary={
                "event_id": event_id,
                "graph_version": new_version,
                "affected_node_ids": [subject_id],
                "new_path_count": len(ranked_paths)
            }
        )

        return IngestEventResponse(
            event_id=event_id,
            scenario_id=scenario_id,
            status="processed",
            graph_version=new_version,
            affected_node_ids=[subject_id],
            new_path_count=len(ranked_paths),
            results_version=new_version
        )
