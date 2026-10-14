from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.persistence.database import get_db
from app.persistence.repositories import (
    ScenarioRepository, AssetRepository, RelationshipRepository,
    EvidenceRepository, AttackPathRepository
)
from app.schemas.paths import AttackPathsListResponse, AttackPathResponse, AttackPathHop
from app.ir.builder import build_ir_graph
from app.twin.graph import SecurityDigitalTwin
from app.paths.search import find_all_attack_paths
from app.paths.scoring import rank_and_score_paths
from app.core.errors import ScenarioNotFoundError, EntityNotFoundError

router = APIRouter()

def _recompute_paths(db: Session, scenario_id: str) -> List[AttackPathResponse]:
    scenario = ScenarioRepository(db).get_or_seed_demo(scenario_id)
    if not scenario:
        raise ScenarioNotFoundError(scenario_id)

    assets = AssetRepository(db).list_by_scenario(scenario_id)
    relationships = RelationshipRepository(db).list_by_scenario(scenario_id)
    evidence = EvidenceRepository(db).list_by_scenario(scenario_id)

    ir = build_ir_graph(scenario_id, scenario.graph_version, assets, relationships, evidence)
    twin = SecurityDigitalTwin(ir)
    raw = find_all_attack_paths(twin)
    return rank_and_score_paths(scenario_id, scenario.graph_version, raw, twin)

@router.get("/scenarios/{id}/paths", response_model=AttackPathsListResponse)
def get_attack_paths(id: str, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    ranked_paths = _recompute_paths(db, id)

    return AttackPathsListResponse(
        scenario_id=id,
        graph_version=scenario.graph_version,
        total_paths=len(ranked_paths),
        paths=ranked_paths
    )

@router.get("/scenarios/{id}/paths/{path_id}", response_model=AttackPathResponse)
def get_attack_path_detail(id: str, path_id: str, db: Session = Depends(get_db)):
    ranked_paths = _recompute_paths(db, id)
    for p in ranked_paths:
        if p.path_id == path_id:
            return p
    raise EntityNotFoundError("AttackPath", path_id)
