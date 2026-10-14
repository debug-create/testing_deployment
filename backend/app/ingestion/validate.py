from typing import Dict, Any
from app.core.errors import EventValidationError

def validate_event_payload(event_type: str, payload: Dict[str, Any]) -> None:
    if not event_type or not isinstance(event_type, str):
        raise EventValidationError("Field 'event_type' must be a non-empty string.")
    
    if not isinstance(payload, dict):
        raise EventValidationError("Field 'payload' must be a valid JSON dictionary.")

    # Require subject identifier in payload to attach to digital twin
    if "subject_id" not in payload and "asset_id" not in payload and "source_id" not in payload:
        raise EventValidationError("Payload must specify an entity reference ('subject_id', 'asset_id', or 'source_id').")
