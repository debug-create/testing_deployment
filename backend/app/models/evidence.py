import datetime
from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.persistence.database import Base

class EvidenceModel(Base):
    __tablename__ = "evidence"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(64), ForeignKey("security_events.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_type = Column(String(32), nullable=False) # 'asset' or 'relationship'
    subject_id = Column(String(64), nullable=False, index=True)
    claim_type = Column(String(64), nullable=False) # e.g. compromised, lateral_movement, vulnerability_exploited
    confidence = Column(Float, default=0.8, nullable=False) # 0.0 to 1.0
    observed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    metadata_payload = Column(JSON, default=dict, nullable=False)

    scenario = relationship("ScenarioModel", back_populates="evidence")
    event = relationship("SecurityEventModel", back_populates="evidence_items")
    technique_mappings = relationship("TechniqueMappingModel", back_populates="evidence", cascade="all, delete-orphan")

class TechniqueMappingModel(Base):
    __tablename__ = "technique_mappings"

    id = Column(String(64), primary_key=True, index=True)
    evidence_id = Column(String(64), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    framework = Column(String(32), default="MITRE_ATTACK", nullable=False) # MITRE_ATTACK or STRIDE
    technique_id = Column(String(32), nullable=False)
    technique_name = Column(String(128), nullable=False)
    tactic = Column(String(64), nullable=False)
    confidence = Column(Float, default=0.7, nullable=False)
    rationale = Column(String(512), nullable=False)

    evidence = relationship("EvidenceModel", back_populates="technique_mappings")
