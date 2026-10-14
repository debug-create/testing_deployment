from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class AssetCreate(BaseModel):
    id: str
    name: str
    asset_type: str # host, service, identity, database, cloud_role
    criticality: float = Field(default=0.5, ge=0.0, le=1.0)
    is_entry_point: bool = False
    is_target: bool = False
    properties: Dict[str, Any] = Field(default_factory=dict)

class AssetResponse(BaseModel):
    id: str
    scenario_id: str
    name: str
    asset_type: str
    criticality: float
    is_entry_point: bool
    is_target: bool
    properties: Dict[str, Any]

class RelationshipCreate(BaseModel):
    id: str
    source_id: str
    target_id: str
    relationship_type: str # network_access, has_credential, assumes_role, exploits
    attributes: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True

class RelationshipResponse(BaseModel):
    id: str
    scenario_id: str
    source_id: str
    target_id: str
    relationship_type: str
    attributes: Dict[str, Any]
    is_active: bool
    calibrated_probability: Optional[float] = None

class TrustVectorResponse(BaseModel):
    node_id: str
    identity_confidence: float = Field(ge=0.0, le=1.0)
    configuration_confidence: float = Field(ge=0.0, le=1.0)
    evidence_coverage: float = Field(ge=0.0, le=1.0)
    freshness: float = Field(ge=0.0, le=1.0)
    uncertainty: float = Field(ge=0.0, le=1.0)

class GraphSnapshotResponse(BaseModel):
    scenario_id: str
    graph_version: int
    nodes: List[AssetResponse]
    edges: List[RelationshipResponse]
    trust_vectors: Dict[str, TrustVectorResponse]
    entry_points: List[str]
    targets: List[str]
