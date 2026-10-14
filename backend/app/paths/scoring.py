import math
from typing import List, Dict, Any
from app.twin.graph import SecurityDigitalTwin
from app.schemas.paths import AttackPathResponse, AttackPathHop

def rank_and_score_paths(
    scenario_id: str,
    graph_version: int,
    raw_paths: List[Dict[str, Any]],
    twin: SecurityDigitalTwin,
    evidence_map: Dict[str, Any] = None
) -> List[AttackPathResponse]:
    """
    Ranks attack paths based on:
    - Path likelihood estimate (under independent hop traversal baseline)
    - Target criticality
    - Hop-level evidence validation
    - Decoy demotion penalty (unsupported alarms or intentional decoys get demoted)
    """
    g = twin.nx_graph
    scored_paths = []

    for idx, item in enumerate(raw_paths):
        nodes = item["nodes"]
        entry_id = item["entry_id"]
        target_id = item["target_id"]
        target_data = g.nodes[target_id]
        target_criticality = float(target_data.get("criticality", 0.5))

        hops: List[AttackPathHop] = []
        hop_probabilities = []
        has_corroborated_evidence = False
        is_decoy = False

        for h_idx in range(len(nodes) - 1):
            u = nodes[h_idx]
            v = nodes[h_idx + 1]
            edge_data = g.get_edge_data(u, v) or {}
            edge_prob = float(edge_data.get("calibrated_probability", 0.5))
            edge_id = str(edge_data.get("id", f"{u}->{v}"))
            rel_type = str(edge_data.get("relationship_type", "connects_to"))
            edge_ev_ids = list(edge_data.get("evidence_ids", []))

            # Check if target or intermediate is a decoy
            u_data = g.nodes[u]
            v_data = g.nodes[v]
            def _is_decoy_node(nd):
                p = nd.get("properties") or {}
                return bool(p.get("is_decoy") or p.get("canary") or nd.get("asset_type") in ("decoy", "honeypot", "canary"))

            if _is_decoy_node(u_data) or _is_decoy_node(v_data):
                is_decoy = True


            if edge_ev_ids or u_data.get("evidence_ids") or v_data.get("evidence_ids"):
                has_corroborated_evidence = True

            hop_probabilities.append(edge_prob)
            hops.append(AttackPathHop(
                hop_index=h_idx,
                source_id=u,
                target_id=v,
                relationship_id=edge_id,
                relationship_type=rel_type,
                edge_probability=round(edge_prob, 3),
                evidence_ids=edge_ev_ids,
                stride_categories=edge_data.get("attributes", {}).get("stride_tags", []),
                mitre_techniques=edge_data.get("attributes", {}).get("attack_tags", [])
            ))

        # Path likelihood: geometric mean or product baseline
        # Using calibrated product bounded by length penalty
        path_likelihood = 1.0
        for p in hop_probabilities:
            path_likelihood *= p
        
        # Risk score = Path Likelihood * Target Criticality * Evidence Multiplier
        evidence_multiplier = 1.25 if has_corroborated_evidence else 0.85
        decoy_penalty = 0.35 if is_decoy else 1.0

        raw_risk = path_likelihood * target_criticality * evidence_multiplier * decoy_penalty
        risk_score = round(min(1.0, raw_risk) * 100.0, 2)

        explanation = (
            f"Path traversing {len(hops)} hops from {entry_id} to {target_id}. "
            f"Target criticality is {target_criticality:.2f}. "
            f"Path likelihood is estimated at {path_likelihood:.4f} under conditional baseline."
        )
        if is_decoy:
            explanation += " [Decoy Demotion Applied: Traversal involves detected decoy/honeypot node]."
        if has_corroborated_evidence:
            explanation += " Corroborated with active security telemetry."

        path_id = f"path_{idx + 1:03d}_{entry_id[:8]}_{target_id[:8]}"
        scored_paths.append(AttackPathResponse(
            path_id=path_id,
            scenario_id=scenario_id,
            graph_version=graph_version,
            entry_id=entry_id,
            target_id=target_id,
            risk_score=risk_score,
            path_likelihood=round(path_likelihood, 4),
            target_criticality=target_criticality,
            path_nodes=nodes,
            hops=hops,
            is_decoy_penalized=is_decoy,
            explanation=explanation
        ))

    # Sort descending by risk score
    scored_paths.sort(key=lambda p: p.risk_score, reverse=True)
    return scored_paths
