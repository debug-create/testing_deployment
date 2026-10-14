import networkx as nx
from typing import List, Dict, Any
from app.twin.graph import SecurityDigitalTwin
from app.schemas.paths import AttackPathHop

def find_all_attack_paths(twin: SecurityDigitalTwin, cutoff: int = 8) -> List[Dict[str, Any]]:
    """
    Finds all simple directed paths from defined entry points to defined targets
    using NetworkX.
    """
    g = twin.nx_graph
    entry_points = twin.get_entry_points()
    targets = twin.get_targets()

    raw_paths = []

    for entry in entry_points:
        for target in targets:
            if not nx.has_path(g, entry, target):
                continue
            try:
                for path in nx.all_simple_paths(g, source=entry, target=target, cutoff=cutoff):
                    raw_paths.append({
                        "entry_id": entry,
                        "target_id": target,
                        "nodes": path
                    })
            except nx.NetworkXNoPath:
                continue

    return raw_paths
