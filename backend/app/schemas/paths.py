from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class AttackPathHop(BaseModel):
    hop_index: int
    source_id: str
    target_id: str
    relationship_id: str
    relationship_type: str
    edge_probability: float
    evidence_ids: List[str] = []
    stride_categories: List[str] = []
    mitre_techniques: List[str] = []

class AttackPathResponse(BaseModel):
    path_id: str
    scenario_id: str
    graph_version: int
    entry_id: str
    target_id: str
    risk_score: float
    path_likelihood: float
    target_criticality: float
    path_nodes: List[str]
    hops: List[AttackPathHop]
    is_decoy_penalized: bool = False
    explanation: str

class AttackPathsListResponse(BaseModel):
    scenario_id: str
    graph_version: int
    total_paths: int
    paths: List[AttackPathResponse]
