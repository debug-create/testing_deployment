from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class SecurityEventCreate(BaseModel):
    event_type: str = Field(..., description="Normalized or raw event type, e.g., 'unauthorized_login', 'exploit_detected'")
    source: str = Field(default="telemetry", description="Telemetry agent or alert source")
    timestamp: Optional[datetime] = Field(default=None, description="ISO timestamp of observation")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event attributes including subject, target, details")

class TechniqueMappingResponse(BaseModel):
    framework: str
    technique_id: str
    technique_name: str
    tactic: str
    confidence: float
    rationale: str

class EvidenceResponse(BaseModel):
    id: str
    event_id: str
    subject_type: str
    subject_id: str
    claim_type: str
    confidence: float
    observed_at: datetime
    metadata_payload: Dict[str, Any]
    technique_mappings: List[TechniqueMappingResponse] = []

class SecurityEventResponse(BaseModel):
    id: str
    scenario_id: str
    event_type: str
    timestamp: datetime
    source: str
    deduplication_hash: str
    normalized_payload: Dict[str, Any]
    evidence_items: List[EvidenceResponse] = []

class IngestEventResponse(BaseModel):
    event_id: str
    scenario_id: str
    status: str
    graph_version: int
    affected_node_ids: List[str]
    new_path_count: int
    results_version: int
