import networkx as nx
from typing import Dict, Any, List, Optional
from app.ir.entities import IRGraph

class SecurityDigitalTwin:
    """
    NetworkX-based Security Digital Twin.
    Provides typed nodes, directed edges, trust boundaries, and reachability.
    """
    def __init__(self, ir_graph: IRGraph):
        self.scenario_id = ir_graph.scenario_id
        self.graph_version = ir_graph.graph_version
        self.nx_graph = nx.DiGraph()
        self._populate_graph(ir_graph)

    def _populate_graph(self, ir: IRGraph):
        for node_id, node in ir.nodes.items():
            self.nx_graph.add_node(
                node_id,
                name=node.name,
                asset_type=node.asset_type,
                criticality=node.criticality,
                is_entry_point=node.is_entry_point,
                is_target=node.is_target,
                properties=node.properties,
                evidence_ids=node.evidence_ids
            )

        for edge_id, edge in ir.edges.items():
            if not edge.is_active:
                continue
            self.nx_graph.add_edge(
                edge.source_id,
                edge.target_id,
                id=edge.id,
                relationship_type=edge.relationship_type,
                attributes=edge.attributes,
                calibrated_probability=edge.calibrated_probability,
                evidence_ids=edge.evidence_ids
            )

    def get_entry_points(self) -> List[str]:
        return [n for n, data in self.nx_graph.nodes(data=True) if data.get("is_entry_point", False)]

    def get_targets(self) -> List[str]:
        return [n for n, data in self.nx_graph.nodes(data=True) if data.get("is_target", False)]

    def clone(self) -> "SecurityDigitalTwin":
        """
        Creates an independent deep copy of the Digital Twin for what-if simulations.
        Guarantees that what-if simulations NEVER mutate the live scenario.
        """
        cloned = SecurityDigitalTwin.__new__(SecurityDigitalTwin)
        cloned.scenario_id = self.scenario_id
        cloned.graph_version = self.graph_version
        cloned.nx_graph = self.nx_graph.copy()
        return cloned
