from typing import Dict, Any, List
from app.schemas.paths import AttackPathResponse

def generate_attack_narrative(
    path: AttackPathResponse,
    node_names: Dict[str, str] = None
) -> Dict[str, Any]:
    """
    Transforms a mathematical attack path into an executive-ready,
    human-readable incident narrative with step-by-step forensic explanations.
    """
    names = node_names or {}
    hops = path.hops
    total_hops = len(hops)

    entry_name = names.get(path.entry_id, path.entry_id)
    target_name = names.get(path.target_id, path.target_id)

    # 1. Executive Summary
    summary = (
        f"An adversary initiates an attack at perimeter entry point '{entry_name}' and executes "
        f"a {total_hops}-stage traversal to compromise high-value target '{target_name}' "
        f"(Criticality: {path.target_criticality:.2f}). Overall path likelihood is estimated at "
        f"{path.path_likelihood * 100:.1f}%, resulting in a composite risk score of {path.risk_score:.1f}%."
    )
    if path.is_decoy_penalized:
        summary += " [DECOY PENALTY: This traversal crosses a deployed canary/honeypot node and is demoted in priority.]"

    # 2. Step-by-Step Forensic Walkthrough
    steps = []
    for idx, hop in enumerate(hops):
        u_name = names.get(hop.source_id, hop.source_id)
        v_name = names.get(hop.target_id, hop.target_id)

        prob_pct = hop.edge_probability * 100
        if prob_pct >= 70:
            qualitative_likelihood = f"High Likelihood ({prob_pct:.1f}%)"
        elif prob_pct >= 40:
            qualitative_likelihood = f"Moderate Likelihood ({prob_pct:.1f}%)"
        else:
            qualitative_likelihood = f"Low Likelihood ({prob_pct:.1f}%)"

        has_ev = len(hop.evidence_ids) > 0
        evidence_note = f"Supported by {len(hop.evidence_ids)} active telemetry observation(s)." if has_ev else "Assessed from structural configuration baseline."

        stride_tag = hop.stride_categories[0] if hop.stride_categories else "General Threat"
        attack_tag = hop.mitre_techniques[0] if hop.mitre_techniques else "T1000 Initial Reconnaissance"

        explanation = (
            f"Adversary pivots from '{u_name}' to '{v_name}' utilizing {hop.relationship_type.replace('_', ' ')}. "
            f"This movement maps to {stride_tag} and MITRE ATT&CK technique {attack_tag}. {evidence_note}"
        )

        steps.append({
            "step_number": idx + 1,
            "hop_id": hop.relationship_id,
            "from_asset": u_name,
            "to_asset": v_name,
            "relationship_type": hop.relationship_type,
            "technique": attack_tag,
            "threat_category": stride_tag,
            "likelihood_assessment": qualitative_likelihood,
            "is_corroborated_by_evidence": has_ev,
            "narrative_detail": explanation
        })

    # 3. Defensive Remediation Suggestion
    if hops:
        critical_hop = min(hops, key=lambda h: h.edge_probability if h.edge_probability > 0 else 1.0)
        weak_hop_name = f"{names.get(critical_hop.source_id, critical_hop.source_id)} -> {names.get(critical_hop.target_id, critical_hop.target_id)}"
        defensive_action = (
            f"To neutralize this attack vector with minimal disruption, deploy access controls on relationship "
            f"'{critical_hop.relationship_id}' ({weak_hop_name}). Severing this single link collapses this entire {total_hops}-hop attack chain."
        )
    else:
        defensive_action = "No traversal hops discovered for this path."


    return {
        "path_id": path.path_id,
        "scenario_id": path.scenario_id,
        "graph_version": path.graph_version,
        "risk_score": path.risk_score,
        "executive_summary": summary,
        "target_asset": {
            "id": path.target_id,
            "name": target_name,
            "criticality": path.target_criticality
        },
        "step_by_step_forensics": steps,
        "defensive_recommendation": defensive_action,
        "is_decoy_involved": path.is_decoy_penalized
    }
