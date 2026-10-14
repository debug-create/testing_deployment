import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.persistence.database import Base

class SecurityEventModel(Base):
    __tablename__ = "security_events"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    source = Column(String(128), default="telemetry", nullable=False)
    deduplication_hash = Column(String(64), nullable=False, index=True)
    normalized_payload = Column(JSON, default=dict, nullable=False)
    raw_payload = Column(JSON, default=dict, nullable=False)

    scenario = relationship("ScenarioModel", back_populates="events")
    evidence_items = relationship("EvidenceModel", back_populates="event", cascade="all, delete-orphan")
