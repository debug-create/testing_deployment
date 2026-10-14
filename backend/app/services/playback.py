from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from app.schemas.events import SecurityEventCreate, IngestEventResponse
from app.services.event_pipeline import EventPipelineService
from app.api.v1.websocket import broadcast_update
import logging

logger = logging.getLogger("attack_path_compiler.playback")

class PlaybackManager:
    """
    Manages sequential attack timeline queues for scenario playback.
    Enables step-by-step injection of attack campaigns to observe graph evolution in real time.
    """
    def __init__(self):
        # Maps scenario_id -> list of staged events
        self._timeline_queues: Dict[str, List[SecurityEventCreate]] = {}
        # Maps scenario_id -> current step counter
        self._current_steps: Dict[str, int] = {}
        # Maps scenario_id -> total initial events in loaded timeline
        self._total_staged: Dict[str, int] = {}

    def load_timeline(self, scenario_id: str, events: List[SecurityEventCreate]) -> Dict[str, Any]:
        self._timeline_queues[scenario_id] = list(events)
        self._current_steps[scenario_id] = 0
        self._total_staged[scenario_id] = len(events)
        logger.info(f"Loaded {len(events)} staged attack events for scenario '{scenario_id}'")
        return {
            "scenario_id": scenario_id,
            "status": "timeline_loaded",
            "total_events": len(events),
            "current_step": 0
        }

    async def step(self, scenario_id: str, db: Session) -> Dict[str, Any]:
        queue = self._timeline_queues.get(scenario_id, [])
        if not queue:
            return {
                "scenario_id": scenario_id,
                "status": "completed",
                "message": "No further staged events in timeline queue.",
                "remaining_events": 0,
                "current_step": self._current_steps.get(scenario_id, 0),
                "event_result": None
            }

        # Pop next chronological event
        next_event = queue.pop(0)
        step_num = self._current_steps.get(scenario_id, 0) + 1
        self._current_steps[scenario_id] = step_num

        # Process through authoritative pipeline
        pipeline = EventPipelineService(db)
        ingest_res = pipeline.process_event(
            scenario_id=scenario_id,
            event_type=next_event.event_type,
            source=next_event.source,
            raw_payload=next_event.payload,
            timestamp=next_event.timestamp
        )

        step_data = {
            "scenario_id": scenario_id,
            "status": "step_executed",
            "current_step": step_num,
            "total_staged": self._total_staged.get(scenario_id, step_num),
            "remaining_events": len(queue),
            "event_result": ingest_res.model_dump()
        }

        # Broadcast live playback delta
        await broadcast_update(scenario_id, {
            "event": "playback_step",
            "step": step_num,
            "remaining": len(queue),
            "event_id": ingest_res.event_id,
            "graph_version": ingest_res.graph_version,
            "affected_node_ids": ingest_res.affected_node_ids,
            "new_path_count": ingest_res.new_path_count
        })

        return step_data

    async def batch_ingest(
        self, scenario_id: str, events: List[SecurityEventCreate], db: Session
    ) -> Dict[str, Any]:
        """
        Executes an entire sequence of events chronologically in a batch,
        updating graph versions and attack paths at each step.
        """
        pipeline = EventPipelineService(db)
        results = []

        for idx, evt in enumerate(events):
            res = pipeline.process_event(
                scenario_id=scenario_id,
                event_type=evt.event_type,
                source=evt.source,
                raw_payload=evt.payload,
                timestamp=evt.timestamp
            )
            results.append(res.model_dump())

            await broadcast_update(scenario_id, {
                "event": "batch_event_processed",
                "batch_index": idx + 1,
                "total_in_batch": len(events),
                "event_id": res.event_id,
                "graph_version": res.graph_version,
                "affected_node_ids": res.affected_node_ids,
                "new_path_count": res.new_path_count
            })

        return {
            "scenario_id": scenario_id,
            "total_processed": len(results),
            "final_graph_version": results[-1]["graph_version"] if results else 1,
            "events": results
        }

    def get_status(self, scenario_id: str) -> Dict[str, Any]:
        queue = self._timeline_queues.get(scenario_id, [])
        return {
            "scenario_id": scenario_id,
            "staged_events_remaining": len(queue),
            "current_step": self._current_steps.get(scenario_id, 0),
            "total_events_loaded": self._total_staged.get(scenario_id, 0)
        }

playback_manager = PlaybackManager()
