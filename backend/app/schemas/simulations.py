from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.schemas.paths import AttackPathResponse

class ScenarioCreate(BaseModel):
    id: str
    name: str
    seed: Optional[int] = 42

class ScenarioResponse(BaseModel):
    id: str
    name: str
    status: str
    seed: int
    graph_version: int
    created_at: datetime
    updated_at: datetime

class ReachabilityRequest(BaseModel):
    num_trials: int = Field(default=1000, ge=10, le=50000)
    seed: Optional[int] = None

class ReachabilityResponse(BaseModel):
    run_id: str
    scenario_id: str
    base_version: int
    num_trials: int
    target_reachability_probabilities: Dict[str, float]
    entry_to_target_frequencies: Dict[str, float]
    simulation_seed: int

class WhatIfRequest(BaseModel):
    disabled_relationship_ids: List[str] = Field(default_factory=list)
    disabled_node_ids: List[str] = Field(default_factory=list)
    num_trials: int = Field(default=1000, ge=10, le=50000)

class WhatIfResponse(BaseModel):
    run_id: str
    scenario_id: str
    base_version: int
    hypothetical_changes: Dict[str, Any]
    original_reachability: Dict[str, float]
    modified_reachability: Dict[str, float]
    risk_reduction_percentage: Dict[str, float]
    surviving_paths: List[AttackPathResponse]

class InterventionCandidate(BaseModel):
    id: str
    name: str
    description: str
    cost: float = Field(ge=0.0)
    affected_relationship_ids: List[str]
    side_effects: List[str] = Field(default_factory=list)

class InterventionOptimizeRequest(BaseModel):
    budget: float = Field(default=10.0, ge=0.0)
    candidates: Optional[List[InterventionCandidate]] = None

class InterventionOptimizeResponse(BaseModel):
    scenario_id: str
    allocated_budget: float
    total_cost: float
    selected_interventions: List[InterventionCandidate]
    severed_path_count: int
    projected_risk_reduction: float
    explanation: str

class AuditRecordResponse(BaseModel):
    id: str
    scenario_id: str
    action: str
    input_hash: str
    output_summary: Dict[str, Any]
    timestamp: datetime
