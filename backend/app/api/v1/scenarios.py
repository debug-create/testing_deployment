from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.persistence.database import get_db
from app.persistence.repositories import ScenarioRepository, AuditRepository
from app.schemas.simulations import ScenarioCreate, ScenarioResponse, AuditRecordResponse
from app.demo.scenarios import seed_demo_scenario
from app.core.errors import ScenarioNotFoundError

router = APIRouter()

@router.get("/scenarios", response_model=List[ScenarioResponse])
def list_scenarios(db: Session = Depends(get_db)):
    repo = ScenarioRepository(db)
    scenarios = repo.list_all()
    # Auto-seed default demo scenario if database is empty
    if not scenarios:
        seed_demo_scenario(db)
        scenarios = repo.list_all()
    return scenarios

@router.post("/scenarios", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(payload: ScenarioCreate, db: Session = Depends(get_db)):
    repo = ScenarioRepository(db)
    existing = repo.get(payload.id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Scenario with ID '{payload.id}' already exists.")
    return repo.create(scenario_id=payload.id, name=payload.name, seed=payload.seed or 42)

@router.get("/scenarios/{id}", response_model=ScenarioResponse)
def get_scenario(id: str, db: Session = Depends(get_db)):
    repo = ScenarioRepository(db)
    sc = repo.get_or_seed_demo(id)
    if not sc:
        raise ScenarioNotFoundError(id)
    return sc

@router.post("/scenarios/{id}/reset", response_model=ScenarioResponse)
def reset_scenario(id: str, db: Session = Depends(get_db)):
    """
    Restores a seeded demo scenario without affecting other scenarios.
    """
    repo = ScenarioRepository(db)
    sc = repo.get(id)
    if sc:
        # Cascade delete removes child entities
        db.delete(sc)
        db.commit()
    if id == "scenario_k8s":
        from app.demo.scenarios_extended import seed_k8s_scenario
        return seed_k8s_scenario(db, id)
    elif id == "scenario_ad":
        from app.demo.scenarios_extended import seed_ad_scenario
        return seed_ad_scenario(db, id)
    return seed_demo_scenario(db, id)

@router.get("/scenarios/{id}/audit", response_model=List[AuditRecordResponse])
def get_audit_trail(id: str, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get(id)
    if not scenario:
        raise ScenarioNotFoundError(id)
    records = AuditRepository(db).list_by_scenario(id)
    return [
        AuditRecordResponse(
            id=r.id,
            scenario_id=r.scenario_id,
            action=r.action,
            input_hash=r.input_hash,
            output_summary=r.output_summary,
            timestamp=r.timestamp
        )
        for r in records
    ]

@router.get("/scenarios/{id}/benchmark")
def get_scenario_benchmark(id: str, db: Session = Depends(get_db)):
    from app.demo.ground_truth import evaluate_scenario_benchmark
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)
    return evaluate_scenario_benchmark(db, id)

@router.get("/scenarios/{id}/audit/export")
def export_audit_trail(id: str, format: str = "json", db: Session = Depends(get_db)):
    from fastapi.responses import Response
    import csv, io, datetime, json
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    records = AuditRepository(db).list_by_scenario(id)

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["record_id", "scenario_id", "action", "input_hash", "output_summary", "timestamp"])
        for r in records:
            writer.writerow([r.id, r.scenario_id, r.action, r.input_hash, json.dumps(r.output_summary or {}), r.timestamp.isoformat()])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={id}_audit_trail.csv"}
        )

    return {
        "compliance_standard": "SOC2-CC7.1 / ISO27001-A.12.4 Audit Logging",
        "scenario_id": id,
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "total_records": len(records),
        "audit_records": [
            {
                "id": r.id,
                "action": r.action,
                "input_hash": r.input_hash,
                "output_summary": r.output_summary,
                "timestamp": r.timestamp.isoformat()
            }
            for r in records
        ]
    }

@router.get("/scenarios/{id}/dashboard-state")
def get_dashboard_state(id: str, db: Session = Depends(get_db)):
    from app.persistence.repositories import (
        AssetRepository, RelationshipRepository, EvidenceRepository
    )
    from app.ir.builder import build_ir_graph
    from app.twin.graph import SecurityDigitalTwin
    from app.paths.search import find_all_attack_paths
    from app.paths.scoring import rank_and_score_paths
    from app.paths.chokepoints import compute_graph_chokepoints_and_blast_radius
    from app.paths.narrative import generate_attack_narrative
    from app.risk.deception import analyze_deception_status
    from app.risk.trust_vector import compute_trust_vector
    from app.risk.edge_probability import calculate_bayesian_edge_probability
    from app.simulation.reachability import run_monte_carlo_reachability
    from app.optimization.interventions import optimize_interventions
    from app.api.v1.interventions import DEFAULT_CANDIDATES

    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    assets = AssetRepository(db).list_by_scenario(id)
    relationships = RelationshipRepository(db).list_by_scenario(id)
    evidence_items = EvidenceRepository(db).list_by_scenario(id)

    evidence_by_subject = {}
    for ev in evidence_items:
        evidence_by_subject.setdefault(ev.subject_id, []).append(ev)

    # Build IR and Digital Twin
    ir = build_ir_graph(id, scenario.graph_version, assets, relationships, evidence_items)
    twin = SecurityDigitalTwin(ir)

    # 1. Nodes with 5D Trust Vectors
    node_names = {a.id: a.name for a in assets}
    nodes_data = []
    for a in assets:
        tv = compute_trust_vector(a.id, {"properties": a.properties or {}}, evidence_by_subject.get(a.id, []))
        nodes_data.append({
            "id": a.id,
            "name": a.name,
            "asset_type": a.asset_type,
            "criticality": a.criticality,
            "is_entry_point": a.is_entry_point,
            "is_target": a.is_target,
            "trust_vector": tv.model_dump(),
            "properties": a.properties or {}
        })

    # 2. Edges with Calibrated Bayesian Probabilities
    edges_data = []
    for r in relationships:
        r_ev = evidence_by_subject.get(r.id, [])
        src_ev = evidence_by_subject.get(r.source_id, [])
        prior = float(r.attributes.get("prior_probability", 0.5) if r.attributes else 0.5)
        calibrated_p = calculate_bayesian_edge_probability(prior, r_ev + src_ev)
        edges_data.append({
            "id": r.id,
            "source_id": r.source_id,
            "target_id": r.target_id,
            "relationship_type": r.relationship_type,
            "calibrated_probability": calibrated_p,
            "is_active": r.is_active,
            "attributes": r.attributes or {}
        })

    # 3. Paths & Explainable Narratives
    raw_paths = find_all_attack_paths(twin)
    ranked_paths = rank_and_score_paths(id, scenario.graph_version, raw_paths, twin)

    paths_data = []
    for p in ranked_paths:
        narrative = generate_attack_narrative(p, node_names)
        p_dump = p.model_dump()
        p_dump["narrative"] = narrative
        paths_data.append(p_dump)

    # 4. Chokepoints and Blast Radius
    chokepoint_analysis = compute_graph_chokepoints_and_blast_radius(twin, ranked_paths)

    # 5. Monte Carlo Reachability
    mc_results = run_monte_carlo_reachability(twin, num_trials=500, seed=scenario.seed)

    # 6. Deception & Canary Status
    deception_status = analyze_deception_status(assets, relationships, evidence_items)

    # 7. Optimizer Recommendation (Budget = 5.0)
    optimizer_plan = optimize_interventions(
        scenario_id=id,
        budget=5.0,
        candidates=DEFAULT_CANDIDATES,
        current_paths=ranked_paths
    )

    return {
        "scenario": {
            "id": scenario.id,
            "name": scenario.name,
            "graph_version": scenario.graph_version,
            "seed": scenario.seed,
            "created_at": scenario.created_at.isoformat() if hasattr(scenario.created_at, "isoformat") else str(scenario.created_at)
        },
        "topology": {
            "node_count": len(nodes_data),
            "edge_count": len(edges_data),
            "nodes": nodes_data,
            "edges": edges_data
        },
        "attack_paths": {
            "total_paths": len(paths_data),
            "max_risk_score": max((p["risk_score"] for p in paths_data), default=0.0),
            "paths": paths_data
        },
        "reachability": mc_results,
        "chokepoints": chokepoint_analysis,
        "deception": deception_status,
        "recommended_remediation": optimizer_plan.model_dump()
    }

