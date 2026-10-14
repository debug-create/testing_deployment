from typing import List
from app.ir.entities import IRGraph, IRNode, IREdge
from app.models.asset import AssetModel, RelationshipModel
from app.models.evidence import EvidenceModel

def build_ir_graph(
    scenario_id: str,
    graph_version: int,
    assets: List[AssetModel],
    relationships: List[RelationshipModel],
    evidence_items: List[EvidenceModel]
) -> IRGraph:
    """
    Constructs the canonical Intermediate Representation (IR) from database entities.
    Links verified evidence to specific nodes and relationships.
    """
    ir = IRGraph(
        scenario_id=scenario_id,
        graph_version=graph_version
    )

    for asset in assets:
        node = IRNode(
            id=asset.id,
            name=asset.name,
            asset_type=asset.asset_type,
            criticality=asset.criticality,
            is_entry_point=asset.is_entry_point,
            is_target=asset.is_target,
            properties=dict(asset.properties or {})
        )
        ir.nodes[asset.id] = node
        if asset.is_entry_point:
            ir.entry_points.append(asset.id)
        if asset.is_target:
            ir.targets.append(asset.id)

    for rel in relationships:
        if rel.source_id in ir.nodes and rel.target_id in ir.nodes:
            edge = IREdge(
                id=rel.id,
                source_id=rel.source_id,
                target_id=rel.target_id,
                relationship_type=rel.relationship_type,
                attributes=dict(rel.attributes or {}),
                is_active=rel.is_active,
                calibrated_probability=float((rel.attributes or {}).get("prior_probability", 0.5))
            )
            ir.edges[rel.id] = edge


    # Annotate with evidence
    for ev in evidence_items:
        if ev.subject_type == "asset" and ev.subject_id in ir.nodes:
            ir.nodes[ev.subject_id].evidence_ids.append(ev.id)
        elif ev.subject_type == "relationship" and ev.subject_id in ir.edges:
            ir.edges[ev.subject_id].evidence_ids.append(ev.id)

    # Calculate evidence-calibrated Bayesian probabilities for all edges
    from app.risk.edge_probability import calculate_bayesian_edge_probability
    for edge in ir.edges.values():
        edge_ev = [ev for ev in evidence_items if ev.subject_type == "relationship" and ev.subject_id == edge.id]
        src_ev = [ev for ev in evidence_items if ev.subject_type == "asset" and ev.subject_id == edge.source_id]
        prior = float(edge.attributes.get("prior_probability", 0.5))
        edge.calibrated_probability = calculate_bayesian_edge_probability(prior, edge_ev + src_ev)

    return ir
