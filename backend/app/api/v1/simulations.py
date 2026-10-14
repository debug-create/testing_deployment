import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.persistence.database import get_db
from app.persistence.repositories import (
    ScenarioRepository, AssetRepository, RelationshipRepository,
    EvidenceRepository, SimulationRepository, AuditRepository
)
from app.schemas.simulations import (
    ReachabilityRequest, ReachabilityResponse,
    WhatIfRequest, WhatIfResponse
)
from app.ir.builder import build_ir_graph
from app.twin.graph import SecurityDigitalTwin
from app.simulation.reachability import run_monte_carlo_reachability
from app.simulation.what_if import evaluate_what_if_scenario
from app.core.errors import ScenarioNotFoundError, EntityNotFoundError

router = APIRouter()

@router.post("/scenarios/{id}/simulations/reachability", response_model=ReachabilityResponse)
def run_reachability_simulation(id: str, payload: ReachabilityRequest, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    assets = AssetRepository(db).list_by_scenario(id)
    relationships = RelationshipRepository(db).list_by_scenario(id)
    evidence = EvidenceRepository(db).list_by_scenario(id)

    ir = build_ir_graph(id, scenario.graph_version, assets, relationships, evidence)
    twin = SecurityDigitalTwin(ir)

    sim_seed = payload.seed if payload.seed is not None else scenario.seed
    results = run_monte_carlo_reachability(twin, num_trials=payload.num_trials, seed=sim_seed)

    run_id = f"sim_mc_{uuid.uuid4().hex[:8]}"
    SimulationRepository(db).create(
        run_id=run_id,
        scenario_id=id,
        base_version=scenario.graph_version,
        sim_type="reachability",
        params={"num_trials": payload.num_trials, "seed": sim_seed},
        results=results
    )

    AuditRepository(db).record(
        record_id=f"aud_{uuid.uuid4().hex[:8]}",
        scenario_id=id,
        action="simulation:reachability",
        input_hash=str(sim_seed),
        summary={"run_id": run_id, "num_trials": payload.num_trials}
    )

    return ReachabilityResponse(
        run_id=run_id,
        scenario_id=id,
        base_version=scenario.graph_version,
        num_trials=payload.num_trials,
        target_reachability_probabilities=results["target_reachability"],
        entry_to_target_frequencies=results["entry_target_pairs"],
        simulation_seed=sim_seed
    )

@router.post("/scenarios/{id}/simulations/what-if", response_model=WhatIfResponse)
def run_what_if_simulation(id: str, payload: WhatIfRequest, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    assets = AssetRepository(db).list_by_scenario(id)
    relationships = RelationshipRepository(db).list_by_scenario(id)
    evidence = EvidenceRepository(db).list_by_scenario(id)

    ir = build_ir_graph(id, scenario.graph_version, assets, relationships, evidence)
    twin = SecurityDigitalTwin(ir)

    results = evaluate_what_if_scenario(
        live_twin=twin,
        disabled_relationship_ids=payload.disabled_relationship_ids,
        disabled_node_ids=payload.disabled_node_ids,
        num_trials=payload.num_trials,
        seed=scenario.seed
    )

    run_id = f"sim_wi_{uuid.uuid4().hex[:8]}"
    SimulationRepository(db).create(
        run_id=run_id,
        scenario_id=id,
        base_version=scenario.graph_version,
        sim_type="what_if",
        params=payload.model_dump(),
        results={
            "original_reachability": results["original_reachability"],
            "modified_reachability": results["modified_reachability"],
            "risk_reduction_percentage": results["risk_reduction_percentage"]
        }
    )

    return WhatIfResponse(
        run_id=run_id,
        scenario_id=id,
        base_version=scenario.graph_version,
        hypothetical_changes=payload.model_dump(),
        original_reachability=results["original_reachability"],
        modified_reachability=results["modified_reachability"],
        risk_reduction_percentage=results["risk_reduction_percentage"],
        surviving_paths=results["surviving_paths"]
    )

@router.get("/scenarios/{id}/simulations/{run_id}")
def get_simulation_run(id: str, run_id: str, db: Session = Depends(get_db)):
    run = SimulationRepository(db).get(run_id)
    if not run or run.scenario_id != id:
        raise EntityNotFoundError("SimulationRun", run_id)
    return {
        "run_id": run.id,
        "scenario_id": run.scenario_id,
        "base_version": run.base_version,
        "simulation_type": run.simulation_type,
        "parameters": run.parameters,
        "results": run.results,
        "created_at": run.created_at
    }
