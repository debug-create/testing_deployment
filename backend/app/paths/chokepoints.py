import networkx as nx
from typing import Dict, Any, List
from app.twin.graph import SecurityDigitalTwin
from app.schemas.paths import AttackPathResponse

def compute_graph_chokepoints_and_blast_radius(
    twin: SecurityDigitalTwin,
    ranked_paths: List[AttackPathResponse]
) -> Dict[str, Any]:
    """
    Computes:
    1. Node Blast Radius: Total downstream business criticality compromised if node is breached.
    2. Critical Chokepoints: Strategic relationship bottlenecks that appear across multiple attack routes.
    3. Structural Cut Vertices: Single points of topological failure between perimeter and targets.
    """
    g = twin.nx_graph
    targets = twin.get_targets()
    entry_points = twin.get_entry_points()

    total_target_crit = sum(float(g.nodes[t].get("criticality", 1.0)) for t in targets) or 1.0

    # 1. Compute Blast Radius for each node
    blast_radius_by_node = {}
    for node in g.nodes():
        node_crit = float(g.nodes[node].get("criticality", 0.5))
        descendants = nx.descendants(g, node)
        
        reachable_targets = [t for t in targets if t in descendants or t == node]
        downstream_crit = sum(float(g.nodes[v].get("criticality", 0.5)) for v in descendants) + node_crit
        normalized_blast_score = round(min(100.0, (downstream_crit / total_target_crit) * 100.0), 2)

        blast_radius_by_node[node] = {
            "node_id": node,
            "asset_type": g.nodes[node].get("asset_type", "host"),
            "criticality": node_crit,
            "downstream_node_count": len(descendants),
            "reachable_targets": reachable_targets,
            "blast_radius_score": normalized_blast_score,
            "is_entry_point": node in entry_points,
            "is_target": node in targets
        }

    # Sort nodes by blast radius descending
    sorted_nodes = sorted(blast_radius_by_node.values(), key=lambda x: x["blast_radius_score"], reverse=True)

    # 2. Compute Edge Chokepoints across discovered attack paths
    edge_traversal_counts: Dict[str, Dict[str, Any]] = {}
    total_paths = len(ranked_paths)

    for path in ranked_paths:
        for hop in path.hops:
            rel_id = hop.relationship_id
            if rel_id not in edge_traversal_counts:
                edge_traversal_counts[rel_id] = {
                    "relationship_id": rel_id,
                    "source_id": hop.source_id,
                    "target_id": hop.target_id,
                    "relationship_type": hop.relationship_type,
                    "calibrated_probability": hop.edge_probability,
                    "traversed_path_count": 0,
                    "cumulative_risk_severable": 0.0,
                    "paths_affected": []
                }
            edge_traversal_counts[rel_id]["traversed_path_count"] += 1
            edge_traversal_counts[rel_id]["cumulative_risk_severable"] += path.risk_score
            edge_traversal_counts[rel_id]["paths_affected"].append(path.path_id)

    chokepoints = []
    for rel_id, data in edge_traversal_counts.items():
        frequency = round((data["traversed_path_count"] / max(1, total_paths)) * 100.0, 2)
        is_critical = frequency >= 50.0 or data["traversed_path_count"] >= 2
        data["path_frequency_percentage"] = frequency
        data["is_critical_chokepoint"] = is_critical
        data["cumulative_risk_severable"] = round(data["cumulative_risk_severable"], 2)
        chokepoints.append(data)

    # Sort chokepoints by cumulative risk severable descending
    chokepoints.sort(key=lambda x: x["cumulative_risk_severable"], reverse=True)

    # 3. Graph Articulation Points (Cut Vertices on undirected representation)
    undirected_g = g.to_undirected()
    try:
        articulation_points = list(nx.articulation_points(undirected_g))
    except Exception:
        articulation_points = []

    return {
        "scenario_id": twin.scenario_id,
        "graph_version": twin.graph_version,
        "total_active_paths": total_paths,
        "critical_chokepoints": [c for c in chokepoints if c["is_critical_chokepoint"]],
        "all_edge_bottlenecks": chokepoints,
        "blast_radius_rankings": sorted_nodes,
        "structural_cut_vertices": articulation_points,
        "summary": (
            f"Identified {len([c for c in chokepoints if c['is_critical_chokepoint']])} critical edge chokepoints "
            f"and {len(sorted_nodes)} evaluated node blast radii across {total_paths} attack routes."
        )
    }
