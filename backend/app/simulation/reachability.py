import numpy as np
import networkx as nx
from typing import Dict, Any, List
from app.twin.graph import SecurityDigitalTwin

def run_monte_carlo_reachability(
    twin: SecurityDigitalTwin,
    num_trials: int = 1000,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Monte Carlo Reachability Simulation.
    Samples Bernoulli edge activations p_e for each edge across N trials.
    Computes exact empirical frequency of reaching target nodes from entry points.
    """
    rng = np.random.default_rng(seed)
    g = twin.nx_graph
    entry_points = twin.get_entry_points()
    targets = twin.get_targets()

    if not entry_points or not targets:
        return {
            "target_reachability": {t: 0.0 for t in targets},
            "entry_target_pairs": {}
        }

    edges_list = list(g.edges(data=True))
    edge_probs = np.array([float(d.get("calibrated_probability", 0.5)) for _, _, d in edges_list])

    # Sample activation matrix: (num_trials, num_edges)
    activations = rng.random(size=(num_trials, len(edges_list))) < edge_probs

    target_hit_counts = {t: 0 for t in targets}
    pair_hit_counts = {f"{e}->{t}": 0 for e in entry_points for t in targets}

    for trial_idx in range(num_trials):
        # Build trial active subgraph
        active_subgraph = nx.DiGraph()
        active_subgraph.add_nodes_from(g.nodes())
        
        trial_edges = [
            (edges_list[i][0], edges_list[i][1])
            for i in range(len(edges_list))
            if activations[trial_idx, i]
        ]
        active_subgraph.add_edges_from(trial_edges)

        # Check reachability in trial subgraph
        reachable_nodes = set()
        for entry in entry_points:
            descendants = nx.descendants(active_subgraph, entry) | {entry}
            reachable_nodes.update(descendants)
            for t in targets:
                if t in descendants:
                    pair_hit_counts[f"{entry}->{t}"] += 1

        for t in targets:
            if t in reachable_nodes:
                target_hit_counts[t] += 1

    reachability_probs = {
        t: round(target_hit_counts[t] / float(num_trials), 4)
        for t in targets
    }
    pair_probs = {
        k: round(v / float(num_trials), 4)
        for k, v in pair_hit_counts.items()
    }

    return {
        "target_reachability": reachability_probs,
        "entry_target_pairs": pair_probs
    }
