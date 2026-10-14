from datetime import datetime, timezone
from typing import List, Dict, Any
from app.schemas.graph import TrustVectorResponse
from app.models.evidence import EvidenceModel

def compute_trust_vector(
    node_id: str,
    node_data: Dict[str, Any],
    evidence_items: List[EvidenceModel]
) -> TrustVectorResponse:
    """
    Computes a 5-dimensional trust vector per asset/identity:
    1. identity_confidence: Validation of subject provenance & credential integrity
    2. configuration_confidence: State of security controls & compliance posture
    3. evidence_coverage: Proportion of corroborating observations vs expectations
    4. freshness: Recency of the latest security telemetry
    5. uncertainty: Residual epistemic ambiguity
    """
    # Baseline configuration & identity confidence from asset properties
    props = node_data.get("properties", {})
    id_conf = float(props.get("identity_baseline", 0.85))
    cfg_conf = float(props.get("config_baseline", 0.80))

    if not evidence_items:
        coverage = 0.1
        freshness = 0.5
        uncertainty = 0.7
    else:
        coverage = min(1.0, 0.2 + (0.15 * len(evidence_items)))
        now = datetime.utcnow()
        latest_time = max(ev.observed_at for ev in evidence_items)
        seconds_ago = max(0, (now - latest_time).total_seconds())
        # Freshness decays over 24 hours (86400s)
        freshness = max(0.1, round(1.0 - min(1.0, seconds_ago / 86400.0), 3))
        # More evidence decreases uncertainty
        uncertainty = max(0.05, round(1.0 - (0.5 * coverage + 0.5 * freshness), 3))

    return TrustVectorResponse(
        node_id=node_id,
        identity_confidence=round(id_conf, 3),
        configuration_confidence=round(cfg_conf, 3),
        evidence_coverage=round(coverage, 3),
        freshness=round(freshness, 3),
        uncertainty=round(uncertainty, 3)
    )
