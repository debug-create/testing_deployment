from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, List

from app.persistence.database import get_db
from app.persistence.repositories import ScenarioRepository, AssetRepository, RelationshipRepository, EvidenceRepository
from app.schemas.graph import GraphSnapshotResponse, AssetResponse, RelationshipResponse, TrustVectorResponse
from app.risk.trust_vector import compute_trust_vector
from app.risk.edge_probability import calculate_bayesian_edge_probability
from app.core.errors import ScenarioNotFoundError

router = APIRouter()

@router.get("/scenarios/{id}/graph", response_model=GraphSnapshotResponse)
def get_graph_snapshot(id: str, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    assets = AssetRepository(db).list_by_scenario(id)
    relationships = RelationshipRepository(db).list_by_scenario(id)
    evidence_items = EvidenceRepository(db).list_by_scenario(id)

    evidence_by_subject: Dict[str, List] = {}
    for ev in evidence_items:
        evidence_by_subject.setdefault(ev.subject_id, []).append(ev)

    nodes_resp = []
    trust_vectors = {}
    entry_points = []
    targets = []

    for a in assets:
        nodes_resp.append(AssetResponse(
            id=a.id,
            scenario_id=a.scenario_id,
            name=a.name,
            asset_type=a.asset_type,
            criticality=a.criticality,
            is_entry_point=a.is_entry_point,
            is_target=a.is_target,
            properties=a.properties or {}
        ))
        if a.is_entry_point:
            entry_points.append(a.id)
        if a.is_target:
            targets.append(a.id)

        # Compute Trust Vector for each asset node
        tv = compute_trust_vector(a.id, {"properties": a.properties or {}}, evidence_by_subject.get(a.id, []))
        trust_vectors[a.id] = tv

    edges_resp = []
    for r in relationships:
        r_ev = evidence_by_subject.get(r.id, [])
        src_ev = evidence_by_subject.get(r.source_id, [])
        prior = float(r.attributes.get("prior_probability", 0.5) if r.attributes else 0.5)
        calibrated_p = calculate_bayesian_edge_probability(prior, r_ev + src_ev)
        edges_resp.append(RelationshipResponse(
            id=r.id,
            scenario_id=r.scenario_id,
            source_id=r.source_id,
            target_id=r.target_id,
            relationship_type=r.relationship_type,
            attributes=r.attributes or {},
            is_active=r.is_active,
            calibrated_probability=calibrated_p
        ))

    return GraphSnapshotResponse(
        scenario_id=id,
        graph_version=scenario.graph_version,
        nodes=nodes_resp,
        edges=edges_resp,
        trust_vectors=trust_vectors,
        entry_points=entry_points,
        targets=targets
    )

@router.get("/scenarios/{id}/trust", response_model=Dict[str, TrustVectorResponse])
def get_trust_vectors(id: str, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    assets = AssetRepository(db).list_by_scenario(id)
    evidence_items = EvidenceRepository(db).list_by_scenario(id)

    evidence_by_subject: Dict[str, List] = {}
    for ev in evidence_items:
        evidence_by_subject.setdefault(ev.subject_id, []).append(ev)

    result = {}
    for a in assets:
        result[a.id] = compute_trust_vector(a.id, {"properties": a.properties or {}}, evidence_by_subject.get(a.id, []))
    return result
