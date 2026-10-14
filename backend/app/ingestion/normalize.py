from typing import Dict, Any, Tuple
from datetime import datetime, timezone

def normalize_event(
    event_type: str,
    raw_payload: Dict[str, Any],
    timestamp: datetime = None
) -> Tuple[str, Dict[str, Any], datetime]:
    # Normalize event type to lower case and snake_case
    normalized_type = event_type.strip().lower().replace(" ", "_").replace("-", "_")
    
    # Resolve subject ID
    subject_id = raw_payload.get("subject_id") or raw_payload.get("asset_id") or raw_payload.get("source_id")
    subject_type = raw_payload.get("subject_type", "asset")

    normalized_payload = dict(raw_payload)
    normalized_payload["resolved_subject_id"] = str(subject_id).strip()
    normalized_payload["resolved_subject_type"] = str(subject_type).strip()

    if timestamp is None:
        event_time = datetime.now(timezone.utc)
    else:
        event_time = timestamp

    return normalized_type, normalized_payload, event_time
