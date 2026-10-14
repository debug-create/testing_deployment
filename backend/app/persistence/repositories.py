from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import datetime
from app.models.scenario import ScenarioModel
from app.models.asset import AssetModel, RelationshipModel
from app.models.event import SecurityEventModel
from app.models.evidence import EvidenceModel, TechniqueMappingModel
from app.models.simulation import AttackPathModel, InterventionModel, SimulationRunModel, AuditRecordModel

class ScenarioRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, scenario_id: str) -> Optional[ScenarioModel]:
        return self.db.query(ScenarioModel).filter(ScenarioModel.id == scenario_id).first()

    def get_or_seed_demo(self, scenario_id: str) -> Optional[ScenarioModel]:
        sc = self.get(scenario_id)
        if not sc and scenario_id == "scenario_demo":
            from app.demo.scenarios import seed_demo_scenario
            return seed_demo_scenario(self.db, scenario_id)
        return sc

    def list_all(self) -> List[ScenarioModel]:
        return self.db.query(ScenarioModel).all()

    def create(self, scenario_id: str, name: str, seed: int = 42) -> ScenarioModel:
        scenario = ScenarioModel(
            id=scenario_id,
            name=name,
            seed=seed,
            graph_version=1
        )
        self.db.add(scenario)
        self.db.commit()
        self.db.refresh(scenario)
        return scenario

    def bump_version(self, scenario_id: str) -> int:
        scenario = self.get(scenario_id)
        if scenario:
            scenario.graph_version += 1
            scenario.updated_at = datetime.datetime.now(datetime.timezone.utc)
            self.db.commit()
            return scenario.graph_version
        return 1

class AssetRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, asset_id: str) -> Optional[AssetModel]:
        return self.db.query(AssetModel).filter(AssetModel.id == asset_id).first()

    def list_by_scenario(self, scenario_id: str) -> List[AssetModel]:
        return self.db.query(AssetModel).filter(AssetModel.scenario_id == scenario_id).all()

    def create(self, asset_id: str, scenario_id: str, name: str, asset_type: str,
               criticality: float = 0.5, is_entry_point: bool = False,
               is_target: bool = False, properties: dict = None) -> AssetModel:
        asset = AssetModel(
            id=asset_id,
            scenario_id=scenario_id,
            name=name,
            asset_type=asset_type,
            criticality=criticality,
            is_entry_point=is_entry_point,
            is_target=is_target,
            properties=properties or {}
        )
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        return asset

class RelationshipRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_scenario(self, scenario_id: str) -> List[RelationshipModel]:
        return self.db.query(RelationshipModel).filter(RelationshipModel.scenario_id == scenario_id).all()

    def create(self, rel_id: str, scenario_id: str, source_id: str, target_id: str,
               relationship_type: str, attributes: dict = None, is_active: bool = True) -> RelationshipModel:
        rel = RelationshipModel(
            id=rel_id,
            scenario_id=scenario_id,
            source_id=source_id,
            target_id=target_id,
            relationship_type=relationship_type,
            attributes=attributes or {},
            is_active=is_active
        )
        self.db.add(rel)
        self.db.commit()
        self.db.refresh(rel)
        return rel

class EventRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_hash(self, scenario_id: str, deduplication_hash: str) -> Optional[SecurityEventModel]:
        return self.db.query(SecurityEventModel).filter(
            SecurityEventModel.scenario_id == scenario_id,
            SecurityEventModel.deduplication_hash == deduplication_hash
        ).first()

    def list_by_scenario(self, scenario_id: str) -> List[SecurityEventModel]:
        return self.db.query(SecurityEventModel).filter(
            SecurityEventModel.scenario_id == scenario_id
        ).order_by(SecurityEventModel.timestamp.asc()).all()

    def create(self, event_id: str, scenario_id: str, event_type: str, timestamp: datetime.datetime,
               source: str, deduplication_hash: str, normalized_payload: dict, raw_payload: dict) -> SecurityEventModel:
        event = SecurityEventModel(
            id=event_id,
            scenario_id=scenario_id,
            event_type=event_type,
            timestamp=timestamp,
            source=source,
            deduplication_hash=deduplication_hash,
            normalized_payload=normalized_payload,
            raw_payload=raw_payload
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

class EvidenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_scenario(self, scenario_id: str) -> List[EvidenceModel]:
        return self.db.query(EvidenceModel).filter(EvidenceModel.scenario_id == scenario_id).all()

    def create(self, evidence_id: str, scenario_id: str, event_id: str,
               subject_type: str, subject_id: str, claim_type: str,
               confidence: float, observed_at: datetime.datetime,
               metadata_payload: dict) -> EvidenceModel:
        evidence = EvidenceModel(
            id=evidence_id,
            scenario_id=scenario_id,
            event_id=event_id,
            subject_type=subject_type,
            subject_id=subject_id,
            claim_type=claim_type,
            confidence=confidence,
            observed_at=observed_at,
            metadata_payload=metadata_payload
        )
        self.db.add(evidence)
        self.db.commit()
        self.db.refresh(evidence)
        return evidence

    def add_mapping(self, mapping_id: str, evidence_id: str, framework: str,
                    technique_id: str, technique_name: str, tactic: str,
                    confidence: float, rationale: str) -> TechniqueMappingModel:
        mapping = TechniqueMappingModel(
            id=mapping_id,
            evidence_id=evidence_id,
            framework=framework,
            technique_id=technique_id,
            technique_name=technique_name,
            tactic=tactic,
            confidence=confidence,
            rationale=rationale
        )
        self.db.add(mapping)
        self.db.commit()
        self.db.refresh(mapping)
        return mapping

class AttackPathRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_scenario(self, scenario_id: str) -> List[AttackPathModel]:
        return self.db.query(AttackPathModel).filter(
            AttackPathModel.scenario_id == scenario_id
        ).order_by(AttackPathModel.risk_score.desc()).all()

    def get(self, path_id: str) -> Optional[AttackPathModel]:
        return self.db.query(AttackPathModel).filter(AttackPathModel.id == path_id).first()

    def replace_all(self, scenario_id: str, graph_version: int, paths: List[dict]):
        self.db.query(AttackPathModel).filter(AttackPathModel.scenario_id == scenario_id).delete()
        for p in paths:
            record = AttackPathModel(
                id=p["path_id"],
                scenario_id=scenario_id,
                graph_version=graph_version,
                entry_id=p["entry_id"],
                target_id=p["target_id"],
                risk_score=p["risk_score"],
                path_nodes=p["path_nodes"],
                hops=p["hops"]
            )
            self.db.add(record)
        self.db.commit()

class SimulationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, run_id: str, scenario_id: str, base_version: int,
               sim_type: str, params: dict, results: dict) -> SimulationRunModel:
        run = SimulationRunModel(
            id=run_id,
            scenario_id=scenario_id,
            base_version=base_version,
            simulation_type=sim_type,
            parameters=params,
            results=results
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def get(self, run_id: str) -> Optional[SimulationRunModel]:
        return self.db.query(SimulationRunModel).filter(SimulationRunModel.id == run_id).first()

class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def record(self, record_id: str, scenario_id: str, action: str,
               input_hash: str, summary: dict) -> AuditRecordModel:
        rec = AuditRecordModel(
            id=record_id,
            scenario_id=scenario_id,
            action=action,
            input_hash=input_hash,
            output_summary=summary
        )
        self.db.add(rec)
        self.db.commit()
        return rec

    def list_by_scenario(self, scenario_id: str) -> List[AuditRecordModel]:
        return self.db.query(AuditRecordModel).filter(
            AuditRecordModel.scenario_id == scenario_id
        ).order_by(AuditRecordModel.timestamp.desc()).all()
