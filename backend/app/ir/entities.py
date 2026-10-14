from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime

@dataclass
class IRNode:
    id: str
    name: str
    asset_type: str
    criticality: float
    is_entry_point: bool
    is_target: bool
    properties: Dict[str, Any] = field(default_factory=dict)
    evidence_ids: List[str] = field(default_factory=list)

@dataclass
class IREdge:
    id: str
    source_id: str
    target_id: str
    relationship_type: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    calibrated_probability: float = 0.5
    evidence_ids: List[str] = field(default_factory=list)

@dataclass
class IRGraph:
    scenario_id: str
    graph_version: int
    nodes: Dict[str, IRNode] = field(default_factory=dict)
    edges: Dict[str, IREdge] = field(default_factory=dict)
    entry_points: List[str] = field(default_factory=list)
    targets: List[str] = field(default_factory=list)
