import math
from typing import List, Dict, Any
from app.models.evidence import EvidenceModel

def calculate_bayesian_edge_probability(
    base_prior: float,
    evidence_items: List[EvidenceModel]
) -> float:
    """
    Computes an evidence-calibrated probability using a Bayesian update model.
    P(Compromised | Evidence) = Prior + Evidence_Weights, bounded in [0.05, 0.98].
    Accounts for confidence and observation count while preventing extreme over-certainty.
    """
    if not evidence_items:
        return max(0.05, min(0.95, base_prior))

    # Log-odds update formulation
    prior = max(0.01, min(0.99, base_prior))
    log_odds = math.log(prior / (1.0 - prior))

    for ev in evidence_items:
        conf = max(0.1, min(0.99, ev.confidence))
        # Weight contribution from evidence
        weight = math.log(conf / (1.0 - conf)) * 0.5
        log_odds += weight

    # Clamp log_odds to prevent float overflow under high evidence volume
    log_odds = max(-35.0, min(35.0, log_odds))
    # Convert back to probability via sigmoid
    prob = 1.0 / (1.0 + math.exp(-log_odds))
    # Calibrate within operational bounds
    return round(max(0.05, min(0.98, prob)), 4)

