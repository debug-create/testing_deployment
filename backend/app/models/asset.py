from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.persistence.database import Base

class AssetModel(Base):
    __tablename__ = "assets"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(64), nullable=False) # e.g. host, service, identity, database, cloud_role
    criticality = Column(Float, default=0.5, nullable=False) # 0.0 to 1.0 (business impact)
    is_entry_point = Column(Boolean, default=False, nullable=False)
    is_target = Column(Boolean, default=False, nullable=False)
    properties = Column(JSON, default=dict, nullable=False)

    scenario = relationship("ScenarioModel", back_populates="assets")
    outgoing_relationships = relationship("RelationshipModel", foreign_keys="[RelationshipModel.source_id]", back_populates="source_asset", cascade="all, delete-orphan")
    incoming_relationships = relationship("RelationshipModel", foreign_keys="[RelationshipModel.target_id]", back_populates="target_asset", cascade="all, delete-orphan")

class RelationshipModel(Base):
    __tablename__ = "relationships"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(64), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(String(64), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(64), nullable=False) # e.g. network_access, has_credential, assumes_role, exploits
    attributes = Column(JSON, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    scenario = relationship("ScenarioModel", back_populates="relationships")
    source_asset = relationship("AssetModel", foreign_keys=[source_id], back_populates="outgoing_relationships")
    target_asset = relationship("AssetModel", foreign_keys=[target_id], back_populates="incoming_relationships")
