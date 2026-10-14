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
