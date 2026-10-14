from typing import Dict, Any, List
from app.models import AssetModel, RelationshipModel, EvidenceModel

def analyze_deception_status(
    assets: List[AssetModel],
    relationships: List[RelationshipModel],
    evidence: List[EvidenceModel]
) -> Dict[str, Any]:
    """
    Analyzes deception assets (honeypots, canaries, tripwires).
    Traces incoming interactions back to the originating adversary host (Attribution).
    """
    asset_by_id = {a.id: a for a in assets}
    evidence_by_subject: Dict[str, List[EvidenceModel]] = {}
    for ev in evidence:
        evidence_by_subject.setdefault(ev.subject_id, []).append(ev)

    # 1. Identify all decoy assets
    decoy_assets = []
    for a in assets:
        props = a.properties or {}
        is_decoy = props.get("is_decoy", False) or a.asset_type in ["decoy", "honeypot", "canary"]
        if is_decoy:
            decoy_assets.append(a)

    # 2. Build incoming relationships map: target_id -> list of incoming relationships
    incoming_to_node: Dict[str, List[RelationshipModel]] = {}
    for r in relationships:
        incoming_to_node.setdefault(r.target_id, []).append(r)

    # 3. Analyze each decoy and attribute intruder source
    canary_reports = []
    attributed_intruders = []
    total_triggers = 0

    for d in decoy_assets:
        # Evidence directly on decoy
        direct_ev = evidence_by_subject.get(d.id, [])
        for ev in direct_ev:
            meta = ev.metadata_payload or {}
            src = meta.get("source_host") or meta.get("attacker_ip") or meta.get("source_id") or meta.get("origin")
            if src:
                src_asset = asset_by_id.get(src)
                src_name = src_asset.name if src_asset else str(src)
                last_ev_time = getattr(ev, "observed_at", getattr(ev, "timestamp", None))
                time_str = last_ev_time.isoformat() if hasattr(last_ev_time, "isoformat") else str(last_ev_time)
                attributed_intruders.append({
                    "intruder_node_id": src,
                    "intruder_node_name": src_name,
                    "canary_touched_id": d.id,
                    "canary_touched_name": d.name,
                    "traversal_vector": "direct_canary_access",
                    "evidence_count": 1,
                    "evidence_ids": [ev.id],
                    "timestamp": time_str
                })

        # Evidence on incoming edges to this decoy
        incoming_edges = incoming_to_node.get(d.id, [])
        edge_ev_list = []
        for edge in incoming_edges:
            evs = evidence_by_subject.get(edge.id, [])
            if evs:
                edge_ev_list.extend(evs)
                # Attribute the source node as the intruder
                src_asset = asset_by_id.get(edge.source_id)
                src_name = src_asset.name if src_asset else edge.source_id
                last_ev_time = getattr(evs[-1], "observed_at", getattr(evs[-1], "timestamp", None))
                time_str = last_ev_time.isoformat() if hasattr(last_ev_time, "isoformat") else str(last_ev_time)
                attributed_intruders.append({
                    "intruder_node_id": edge.source_id,
                    "intruder_node_name": src_name,
                    "canary_touched_id": d.id,
                    "canary_touched_name": d.name,
                    "traversal_vector": edge.relationship_type,
                    "evidence_count": len(evs),
                    "evidence_ids": [e.id for e in evs],
                    "timestamp": time_str
                })

        all_decoy_ev = direct_ev + edge_ev_list

        is_triggered = len(all_decoy_ev) > 0
        if is_triggered:
            total_triggers += len(all_decoy_ev)

        last_trigger_time = None
        if all_decoy_ev:
            def _get_time(item):
                t = getattr(item, "observed_at", getattr(item, "timestamp", None))
                return t.isoformat() if hasattr(t, "isoformat") else str(t)
            last_ev = sorted(all_decoy_ev, key=_get_time)[-1]
            last_t = getattr(last_ev, "observed_at", getattr(last_ev, "timestamp", None))
            last_trigger_time = last_t.isoformat() if hasattr(last_t, "isoformat") else str(last_t)


        canary_reports.append({
            "canary_id": d.id,
            "canary_name": d.name,
            "asset_type": d.asset_type,
            "status": "triggered" if is_triggered else "quiescent",
            "trigger_count": len(all_decoy_ev),
            "evidence_count": len(all_decoy_ev),
            "last_triggered_at": last_trigger_time,
            "deployed_properties": d.properties or {}
        })

    # Summary description
    if total_triggers > 0:
        summary_text = (
            f"ALERT: {len(attributed_intruders)} adversary interaction(s) detected across "
            f"{len([c for c in canary_reports if c['status'] == 'triggered'])} canary trap(s). "
            f"Adversary origin pinned via honeytoken attribution."
        )
    else:
        summary_text = (
            f"All {len(decoy_assets)} deception canary asset(s) are quiescent with zero recorded trips. "
            f"Tripwires armed and actively monitoring lateral pivot attempts."
        )

    return {
        "total_canaries_deployed": len(decoy_assets),
        "total_tripwire_triggers": total_triggers,
        "canary_assets": canary_reports,
        "attributed_intruders": attributed_intruders,
        "summary": summary_text
    }
