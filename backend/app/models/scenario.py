import datetime
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from app.persistence.database import Base

class ScenarioModel(Base):
    __tablename__ = "scenarios"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(32), default="active", nullable=False)
    seed = Column(Integer, default=42, nullable=False)
    graph_version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    assets = relationship("AssetModel", back_populates="scenario", cascade="all, delete-orphan")
    relationships = relationship("RelationshipModel", back_populates="scenario", cascade="all, delete-orphan")
    events = relationship("SecurityEventModel", back_populates="scenario", cascade="all, delete-orphan")
    evidence = relationship("EvidenceModel", back_populates="scenario", cascade="all, delete-orphan")
    attack_paths = relationship("AttackPathModel", back_populates="scenario", cascade="all, delete-orphan")
    simulations = relationship("SimulationRunModel", back_populates="scenario", cascade="all, delete-orphan")
    audit_records = relationship("AuditRecordModel", back_populates="scenario", cascade="all, delete-orphan")
