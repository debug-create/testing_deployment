from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.persistence.repositories import (
    ScenarioRepository, AssetRepository, RelationshipRepository, EvidenceRepository
)
from app.ir.builder import build_ir_graph
from app.twin.graph import SecurityDigitalTwin
from app.paths.search import find_all_attack_paths
from app.paths.scoring import rank_and_score_paths
from app.simulation.reachability import run_monte_carlo_reachability

# Multi-Scenario Ground Truth Specifications
BENCHMARK_GROUND_TRUTHS = {
    "scenario_demo": {
        "organization_name": "Enterprise Cloud & Payment Perimeter",
        "entry_points": ["gw_01"],
        "target_assets": ["db_prod", "role_admin"],
        "critical_paths": [
            {
                "id": "GT_PATH_1",
                "name": "Payment Service Data Compromise",
                "sequence": ["gw_01", "svc_app", "db_prod"],
                "target": "db_prod",
                "criticality": 1.0,
                "description": "Exploit public API gateway to reach internal payment service and query payment vault."
            },
            {
                "id": "GT_PATH_2",
                "name": "Bastion IAM Admin Escalation",
                "sequence": ["gw_01", "host_bastion", "role_admin"],
                "target": "role_admin",
                "criticality": 0.95,
                "description": "Compromise DMZ Bastion via SSH and assume high-privilege IAM Admin Role."
            },
            {
                "id": "GT_PATH_3",
                "name": "Bastion -> Admin -> Vault Cascading Breach",
                "sequence": ["gw_01", "host_bastion", "role_admin", "db_prod"],
                "target": "db_prod",
                "criticality": 1.0,
                "description": "Pivot through Bastion to IAM Admin role to bypass perimeter controls into the Vault."
            }
        ],
        "decoy_nodes": ["decoy_honeypot"]
    },
    "scenario_k8s": {
        "organization_name": "Kubernetes Microservices & S3 Cloud Storage",
        "entry_points": ["ingress_nginx"],
        "target_assets": ["s3_customer_vault", "iam_instance_profile"],
        "critical_paths": [
            {
                "id": "GT_K8S_1",
                "name": "Full Ingress to S3 Vault Exfiltration",
                "sequence": ["ingress_nginx", "pod_frontend", "pod_payment", "node_worker", "iam_instance_profile", "s3_customer_vault"],
                "target": "s3_customer_vault",
                "criticality": 1.0,
                "description": "Exploit ingress, pivot to payment pod, escape container to host, query IMDS for role, exfiltrate S3 vault."
            },
            {
                "id": "GT_K8S_2",
                "name": "Worker Node IAM Role Theft",
                "sequence": ["ingress_nginx", "pod_frontend", "pod_payment", "node_worker", "iam_instance_profile"],
                "target": "iam_instance_profile",
                "criticality": 0.90,
                "description": "Traverse microservices and escape container to steal worker instance profile."
            }
        ],
        "decoy_nodes": ["canary_debug_pod"]
    },
    "scenario_ad": {
        "organization_name": "Corporate Active Directory & Decoy Traps",
        "entry_points": ["ws_phished"],
        "target_assets": ["srv_dc", "identity_domain_admin"],
        "critical_paths": [
            {
                "id": "GT_AD_1",
                "name": "Phished Workstation to Root Domain Controller",
                "sequence": ["ws_phished", "share_smb", "srv_radius", "identity_domain_admin", "srv_dc"],
                "target": "srv_dc",
                "criticality": 1.0,
                "description": "Pivot from phished workstation through SMB and RADIUS, kerberoast domain admin, DCSync root domain controller."
            },
            {
                "id": "GT_AD_2",
                "name": "Domain Admin Kerberos Ticket Extraction",
                "sequence": ["ws_phished", "share_smb", "srv_radius", "identity_domain_admin"],
                "target": "identity_domain_admin",
                "criticality": 0.95,
                "description": "Lateral spread via file share to kerberoast Domain Admin ticket."
            }
        ],
        "decoy_nodes": ["decoy_honey_user"]
    }
}

# Alias for backwards compatibility
DEMO_GROUND_TRUTH = BENCHMARK_GROUND_TRUTHS["scenario_demo"]

def evaluate_scenario_benchmark(db: Session, scenario_id: str) -> Dict[str, Any]:
    """
    Evaluates discovered paths against known synthetic ground truth.
    Computes path recall, precision, decoy demotion compliance, and reachability.
    """
    scenario = ScenarioRepository(db).get_or_seed_demo(scenario_id)
    assets = AssetRepository(db).list_by_scenario(scenario_id)
    relationships = RelationshipRepository(db).list_by_scenario(scenario_id)
    evidence = EvidenceRepository(db).list_by_scenario(scenario_id)

    ir = build_ir_graph(scenario_id, scenario.graph_version, assets, relationships, evidence)
    twin = SecurityDigitalTwin(ir)

    raw_paths = find_all_attack_paths(twin)
    ranked_paths = rank_and_score_paths(scenario_id, scenario.graph_version, raw_paths, twin)
    reachability = run_monte_carlo_reachability(twin, num_trials=1000, seed=scenario.seed)

    gt_data = BENCHMARK_GROUND_TRUTHS.get(scenario_id, DEMO_GROUND_TRUTH)
    gt_paths = gt_data["critical_paths"]
    gt_sequences = [tuple(p["sequence"]) for p in gt_paths]
    decoy_nodes = gt_data.get("decoy_nodes", [])
    target_assets = gt_data.get("target_assets", [])

    discovered_sequences = [tuple(p.path_nodes) for p in ranked_paths]

    # Metrics
    true_positives = [seq for seq in discovered_sequences if seq in gt_sequences]
    false_positives = [seq for seq in discovered_sequences if seq not in gt_sequences and not any(d in seq for d in decoy_nodes)]
    missed_paths = [seq for seq in gt_sequences if seq not in discovered_sequences]

    recall = len(true_positives) / max(1, len(gt_sequences))
    precision = len(true_positives) / max(1, (len(true_positives) + len(false_positives)))
    f1_score = (2 * precision * recall) / max(1e-6, (precision + recall))

    # Decoy validation
    decoy_violations = []
    top_critical_target_score = max([p.risk_score for p in ranked_paths if p.target_id in target_assets] or [0])
    for p in ranked_paths:
        if any(d in p.path_nodes for d in decoy_nodes):
            if not p.is_decoy_penalized:
                decoy_violations.append(f"Path {p.path_id} traversed decoy but lacked decoy penalty flag.")
            if p.risk_score > top_critical_target_score:
                decoy_violations.append(f"Decoy path {p.path_id} outranked critical target path!")

    return {
        "scenario_id": scenario_id,
        "graph_version": scenario.graph_version,
        "ground_truth_total_critical_paths": len(gt_sequences),
        "discovered_attack_paths": len(ranked_paths),
        "true_positives_count": len(true_positives),
        "false_positives_count": len(false_positives),
        "missed_paths_count": len(missed_paths),
        "path_recall": round(recall, 4),
        "path_precision": round(precision, 4),
        "f1_score": round(f1_score, 4),
        "decoy_demotion_healthy": len(decoy_violations) == 0,
        "decoy_violations": decoy_violations,
        "target_reachability_frequencies": reachability["target_reachability"],
        "benchmark_passed": recall >= 1.0 and len(decoy_violations) == 0
    }
