from typing import Dict, Any, List
from app.twin.graph import SecurityDigitalTwin
from app.simulation.reachability import run_monte_carlo_reachability
from app.paths.search import find_all_attack_paths
from app.paths.scoring import rank_and_score_paths

def evaluate_what_if_scenario(
    live_twin: SecurityDigitalTwin,
    disabled_relationship_ids: List[str],
    disabled_node_ids: List[str],
    num_trials: int = 1000,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Evaluates hypothetical security modifications without altering the live digital twin.
    Clones the graph in memory, applies hypothetical interventions, and measures risk reduction.
    """
    # 1. Baseline reachability on live graph
    baseline_results = run_monte_carlo_reachability(live_twin, num_trials=num_trials, seed=seed)
    orig_reachability = baseline_results["target_reachability"]

    # 2. Clone twin to guarantee zero side-effects on live state
    hypothetical_twin = live_twin.clone()
    hg = hypothetical_twin.nx_graph

    # Remove hypothetical disabled nodes
    for nid in disabled_node_ids:
        if hg.has_node(nid):
            hg.remove_node(nid)

    # Remove hypothetical disabled edges
    edges_to_remove = []
    for u, v, d in hg.edges(data=True):
        if d.get("id") in disabled_relationship_ids:
            edges_to_remove.append((u, v))

    for u, v in edges_to_remove:
        hg.remove_edge(u, v)

    # 3. Recompute reachability on modified graph
    mod_results = run_monte_carlo_reachability(hypothetical_twin, num_trials=num_trials, seed=seed)
    modified_reachability = mod_results["target_reachability"]

    # 4. Compute risk reduction percentage
    risk_reduction = {}
    for target, orig_p in orig_reachability.items():
        mod_p = modified_reachability.get(target, 0.0)
        if orig_p > 0:
            reduction = round(((orig_p - mod_p) / orig_p) * 100.0, 2)
        else:
            reduction = 0.0
        risk_reduction[target] = max(0.0, reduction)

    # 5. Discover surviving alternate paths
    surviving_raw = find_all_attack_paths(hypothetical_twin)
    surviving_paths = rank_and_score_paths(
        scenario_id=live_twin.scenario_id,
        graph_version=live_twin.graph_version,
        raw_paths=surviving_raw,
        twin=hypothetical_twin
    )

    return {
        "original_reachability": orig_reachability,
        "modified_reachability": modified_reachability,
        "risk_reduction_percentage": risk_reduction,
        "surviving_paths": surviving_paths
    }
