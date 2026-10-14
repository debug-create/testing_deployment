from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.persistence.database import get_db
from app.persistence.repositories import EventRepository, ScenarioRepository
from app.schemas.events import SecurityEventCreate, IngestEventResponse, SecurityEventResponse, EvidenceResponse, TechniqueMappingResponse
from app.services.event_pipeline import EventPipelineService
from app.core.errors import ScenarioNotFoundError
from app.api.v1.websocket import broadcast_update

router = APIRouter()

@router.post("/scenarios/{id}/events", response_model=IngestEventResponse, status_code=status.HTTP_201_CREATED)
async def ingest_event(id: str, payload: SecurityEventCreate, db: Session = Depends(get_db)):
    service = EventPipelineService(db)
    response = service.process_event(
        scenario_id=id,
        event_type=payload.event_type,
        source=payload.source,
        raw_payload=payload.payload,
        timestamp=payload.timestamp
    )
    # Broadcast live update to any connected dashboard WebSockets
    await broadcast_update(id, {
        "event": "event_processed",
        "scenario_id": id,
        "event_id": response.event_id,
        "graph_version": response.graph_version,
        "new_path_count": response.new_path_count
    })
    return response

@router.get("/scenarios/{id}/events", response_model=List[SecurityEventResponse])
def get_event_timeline(id: str, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)
    events = EventRepository(db).list_by_scenario(id)

    response_list = []
    for evt in events:
        ev_items = []
        for ev in evt.evidence_items:
            mappings = [
                TechniqueMappingResponse(
                    framework=m.framework,
                    technique_id=m.technique_id,
                    technique_name=m.technique_name,
                    tactic=m.tactic,
                    confidence=m.confidence,
                    rationale=m.rationale
                )
                for m in ev.technique_mappings
            ]
            ev_items.append(EvidenceResponse(
                id=ev.id,
                event_id=ev.event_id,
                subject_type=ev.subject_type,
                subject_id=ev.subject_id,
                claim_type=ev.claim_type,
                confidence=ev.confidence,
                observed_at=ev.observed_at,
                metadata_payload=ev.metadata_payload or {},
                technique_mappings=mappings
            ))

        response_list.append(SecurityEventResponse(
            id=evt.id,
            scenario_id=evt.scenario_id,
            event_type=evt.event_type,
            timestamp=evt.timestamp,
            source=evt.source,
            deduplication_hash=evt.deduplication_hash,
            normalized_payload=evt.normalized_payload or {},
            evidence_items=ev_items
        ))

    return response_list

@router.post("/scenarios/{id}/events/batch", status_code=status.HTTP_201_CREATED)
async def batch_ingest_events(id: str, events: List[SecurityEventCreate], db: Session = Depends(get_db)):
    from app.services.playback import playback_manager
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)
    return await playback_manager.batch_ingest(id, events, db)

@router.post("/scenarios/{id}/playback/load")
def load_playback_timeline(id: str, events: List[SecurityEventCreate], db: Session = Depends(get_db)):
    from app.services.playback import playback_manager
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)
    return playback_manager.load_timeline(id, events)

@router.post("/scenarios/{id}/playback/step")
async def step_playback_timeline(id: str, db: Session = Depends(get_db)):
    from app.services.playback import playback_manager
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)
    return await playback_manager.step(id, db)

@router.get("/scenarios/{id}/playback/status")
def get_playback_status(id: str, db: Session = Depends(get_db)):
    from app.services.playback import playback_manager
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)
    return playback_manager.get_status(id)
