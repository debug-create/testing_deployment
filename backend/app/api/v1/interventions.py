from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.persistence.database import get_db
from app.persistence.repositories import (
    ScenarioRepository, AssetRepository, RelationshipRepository,
    EvidenceRepository, AuditRepository
)
from app.schemas.simulations import (
    InterventionOptimizeRequest, InterventionOptimizeResponse, InterventionCandidate
)
from app.ir.builder import build_ir_graph
from app.twin.graph import SecurityDigitalTwin
from app.paths.search import find_all_attack_paths
from app.paths.scoring import rank_and_score_paths
from app.optimization.interventions import optimize_interventions
from app.core.errors import ScenarioNotFoundError

router = APIRouter()

DEFAULT_CANDIDATES = [
    InterventionCandidate(
        id="int_mfa_admin",
        name="Enforce Hardware MFA on Admin Role",
        description="Sever credential theft and unauthorized role assumption from jump hosts.",
        cost=3.5,
        affected_relationship_ids=["rel_03", "rel_05"],
        side_effects=["Requires physical security key enrollment for cloud admins"]
    ),
    InterventionCandidate(
        id="int_segment_dmz",
        name="Microsegment Bastion Host & Restrict SSH",
        description="Limit inbound SSH access to whitelisted internal VPN subnets.",
        cost=2.0,
        affected_relationship_ids=["rel_01"],
        side_effects=["Emergency direct SSH access requires break-glass ticket"]
    ),
    InterventionCandidate(
        id="int_waf_rules",
        name="Deploy Virtual Patching & Strict WAF Rules",
        description="Filter web exploit vectors targeting public API gateway.",
        cost=4.0,
        affected_relationship_ids=["rel_02"],
        side_effects=["0.05% transient false-positive block rate on anomalous API payloads"]
    ),
    InterventionCandidate(
        id="int_db_tls_mtls",
        name="Isolate Payment Vault & Enforce mTLS",
        description="Block direct network connections to database except through validated token proxy.",
        cost=6.0,
        affected_relationship_ids=["rel_04"],
        side_effects=["Slight increase in connection handshake latency"]
    )
]

@router.post("/scenarios/{id}/interventions/optimize", response_model=InterventionOptimizeResponse)
def run_intervention_optimizer(id: str, payload: InterventionOptimizeRequest, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    assets = AssetRepository(db).list_by_scenario(id)
    relationships = RelationshipRepository(db).list_by_scenario(id)
    evidence = EvidenceRepository(db).list_by_scenario(id)

    ir = build_ir_graph(id, scenario.graph_version, assets, relationships, evidence)
    twin = SecurityDigitalTwin(ir)

    raw_paths = find_all_attack_paths(twin)
    current_paths = rank_and_score_paths(id, scenario.graph_version, raw_paths, twin)

    candidates = payload.candidates if payload.candidates else DEFAULT_CANDIDATES

    return optimize_interventions(
        scenario_id=id,
        budget=payload.budget,
        candidates=candidates,
        current_paths=current_paths
    )
