import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.persistence.database import Base

class AttackPathModel(Base):
    __tablename__ = "attack_paths"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    graph_version = Column(Integer, nullable=False)
    entry_id = Column(String(64), nullable=False)
    target_id = Column(String(64), nullable=False)
    risk_score = Column(Float, nullable=False)
    path_nodes = Column(JSON, default=list, nullable=False)
    hops = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    scenario = relationship("ScenarioModel", back_populates="attack_paths")

class InterventionModel(Base):
    __tablename__ = "interventions"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    description = Column(String(512), default="", nullable=False)
    cost = Column(Float, default=1.0, nullable=False)
    affected_relationship_ids = Column(JSON, default=list, nullable=False)
    side_effects = Column(JSON, default=list, nullable=False)

class SimulationRunModel(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    base_version = Column(Integer, nullable=False)
    simulation_type = Column(String(64), nullable=False) # 'reachability', 'what_if', 'intervention_opt'
    parameters = Column(JSON, default=dict, nullable=False)
    results = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    scenario = relationship("ScenarioModel", back_populates="simulations")

class AuditRecordModel(Base):
    __tablename__ = "audit_records"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(128), nullable=False)
    input_hash = Column(String(64), default="", nullable=False)
    output_summary = Column(JSON, default=dict, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    scenario = relationship("ScenarioModel", back_populates="audit_records")
