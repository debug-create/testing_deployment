import hashlib
import json
from typing import Dict, Any

def compute_event_hash(scenario_id: str, event_type: str, normalized_payload: Dict[str, Any]) -> str:
    """
    Computes a deterministic SHA-256 fingerprint for the event.
    Deduplicates events to prevent silent inflation of evidence or risk.
    """
    # Deterministic representation excluding variable transient network timestamps if present in payload
    stable_payload = {k: v for k, v in normalized_payload.items() if k not in ("ingestion_time", "request_id")}
    serialized = json.dumps(
        {
            "scenario_id": scenario_id,
            "event_type": event_type,
            "payload": stable_payload
        },
        sort_keys=True,
        default=str
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
