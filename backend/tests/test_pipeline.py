import pytest
import os
import sys

# Ensure backend root is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.persistence.database import Base, engine, SessionLocal
from app.demo.scenarios import seed_demo_scenario

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_scenario(db)
    yield

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Attack Path Compiler" in data["service"]

def test_scenario_creation_and_persistence():
    import uuid
    sc_id = f"test_sc_{uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/scenarios", json={"id": sc_id, "name": "Banking Cloud Test"})
    assert res.status_code == 201
    
    get_res = client.get(f"/api/v1/scenarios/{sc_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Banking Cloud Test"

def test_seeded_scenario_graph_and_paths():
    # scenario_demo is auto-seeded
    res = client.get("/api/v1/scenarios/scenario_demo/graph")
    assert res.status_code == 200
    graph = res.json()
    assert len(graph["nodes"]) >= 6
    assert len(graph["edges"]) >= 6
    assert "gw_01" in graph["entry_points"]
    assert "db_prod" in graph["targets"]

    paths_res = client.get("/api/v1/scenarios/scenario_demo/paths")
    assert paths_res.status_code == 200
    paths = paths_res.json()["paths"]
    assert len(paths) > 0
    # Top path should target db_prod or role_admin, not the decoy
    top_path = paths[0]
    assert top_path["target_id"] in ("db_prod", "role_admin")

def test_invalid_event_rejection():
    # Missing subject/asset id in payload
    res = client.post(
        "/api/v1/scenarios/scenario_demo/events",
        json={"event_type": "port_scan", "source": "nmap", "payload": {}}
    )
    assert res.status_code == 422
    assert "validation failed" in res.json()["detail"].lower()

def test_event_ingestion_and_deduplication():
    event_payload = {
        "event_type": "public_exploit_detected",
        "source": "waf_sensor",
        "payload": {
            "subject_id": "gw_01",
            "subject_type": "service",
            "cve": "CVE-2026-1042",
            "confidence": 0.95
        }
    }
    # First ingestion must succeed
    res1 = client.post("/api/v1/scenarios/scenario_demo/events", json=event_payload)
    assert res1.status_code == 201
    data = res1.json()
    assert data["status"] == "processed"
    assert data["graph_version"] >= 2

    # Duplicate submission must be rejected with 409 Conflict
    res2 = client.post("/api/v1/scenarios/scenario_demo/events", json=event_payload)
    assert res2.status_code == 409
    assert "Duplicate security event detected" in res2.json()["detail"]

def test_decoy_demotion():
    paths_res = client.get("/api/v1/scenarios/scenario_demo/paths")
    paths = paths_res.json()["paths"]
    
    # Decoy paths must have is_decoy_penalized == True and rank below primary critical targets
    for p in paths:
        if "decoy_honeypot" in p["path_nodes"]:
            assert p["is_decoy_penalized"] is True

def test_what_if_simulation_does_not_mutate_base_graph():
    # Initial graph snapshot
    init_graph = client.get("/api/v1/scenarios/scenario_demo/graph").json()
    init_edge_count = len(init_graph["edges"])

    # Run what-if disabling rel_01
    sim_res = client.post(
        "/api/v1/scenarios/scenario_demo/simulations/what-if",
        json={"disabled_relationship_ids": ["rel_01"], "disabled_node_ids": [], "num_trials": 500}
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert "risk_reduction_percentage" in sim_data

    # Verify live base graph is completely untouched
    post_graph = client.get("/api/v1/scenarios/scenario_demo/graph").json()
    assert len(post_graph["edges"]) == init_edge_count

def test_cost_aware_intervention_optimization():
    opt_res = client.post(
        "/api/v1/scenarios/scenario_demo/interventions/optimize",
        json={"budget": 5.0}
    )
    assert opt_res.status_code == 200
    data = opt_res.json()
    assert data["total_cost"] <= 5.0
    assert len(data["selected_interventions"]) > 0
    assert data["severed_path_count"] > 0

def test_ground_truth_benchmark_validation():
    res = client.get("/api/v1/scenarios/scenario_demo/benchmark")
    assert res.status_code == 200
    report = res.json()
    assert report["benchmark_passed"] is True
    assert report["path_recall"] == 1.0
    assert report["decoy_demotion_healthy"] is True
    assert report["ground_truth_total_critical_paths"] == 3
    assert report["discovered_attack_paths"] >= 3

def test_event_affects_path_ranking_and_evidence():
    # Ingest evidence on payment proxy (rel_02: gw_01 -> svc_app)
    res = client.post(
        "/api/v1/scenarios/scenario_demo/events",
        json={
            "event_type": "api_exploit_traffic",
            "source": "suricata_sensor",
            "payload": {
                "subject_id": "rel_02",
                "subject_type": "relationship",
                "confidence": 0.98,
                "sqli_detected": True
            }
        }
    )
    assert res.status_code == 201

    # Fetch paths - verify hop evidence is attached and probability is elevated
    paths_res = client.get("/api/v1/scenarios/scenario_demo/paths")
    assert paths_res.status_code == 200
    paths = paths_res.json()["paths"]

    # Find path via gw_01 -> svc_app -> db_prod
    payment_path = next(p for p in paths if p["path_nodes"] == ["gw_01", "svc_app", "db_prod"])
    # The first hop should be rel_02 and have evidence attached
    rel_02_hop = payment_path["hops"][0]
    assert rel_02_hop["relationship_id"] == "rel_02"
    assert len(rel_02_hop["evidence_ids"]) > 0
    assert rel_02_hop["edge_probability"] > 0.65 # Calibrated up from prior 0.65

def test_reproducibility_of_monte_carlo():
    res1 = client.post(
        "/api/v1/scenarios/scenario_demo/simulations/reachability",
        json={"num_trials": 2000, "seed": 12345}
    )
    res2 = client.post(
        "/api/v1/scenarios/scenario_demo/simulations/reachability",
        json={"num_trials": 2000, "seed": 12345}
    )
    assert res1.status_code == 200
    assert res2.status_code == 200
    data1 = res1.json()
    data2 = res2.json()
    assert data1["target_reachability_probabilities"] == data2["target_reachability_probabilities"]
    assert data1["entry_to_target_frequencies"] == data2["entry_to_target_frequencies"]

def test_traceability_principle():
    """
    Every displayed attack path must be traceable to explicit relationships and supporting evidence.
    """
    graph_res = client.get("/api/v1/scenarios/scenario_demo/graph")
    graph_edges = {e["id"]: e for e in graph_res.json()["edges"]}

    paths_res = client.get("/api/v1/scenarios/scenario_demo/paths")
    paths = paths_res.json()["paths"]

    for path in paths:
        for hop in path["hops"]:
            assert hop["relationship_id"] in graph_edges
            edge = graph_edges[hop["relationship_id"]]
            assert edge["source_id"] == hop["source_id"]
            assert edge["target_id"] == hop["target_id"]
            assert hop["edge_probability"] > 0.0

def test_batch_event_ingestion():
    batch_payload = [
        {
            "event_type": "ssh_probe",
            "source": "honeyd_sensor",
            "payload": {"subject_id": "gw_01", "subject_type": "service", "confidence": 0.85, "port": 22}
        },
        {
            "event_type": "privilege_token_minted",
            "source": "cloudtrail",
            "payload": {"subject_id": "role_admin", "subject_type": "identity", "confidence": 0.90, "iam": True}
        }
    ]
    res = client.post("/api/v1/scenarios/scenario_demo/events/batch", json=batch_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["total_processed"] == 2
    assert len(data["events"]) == 2

def test_step_by_step_playback():
    timeline = [
        {
            "event_type": "network_recon",
            "source": "zeek",
            "payload": {"subject_id": "gw_01", "subject_type": "service", "confidence": 0.70, "scan": "syn"}
        },
        {
            "event_type": "vault_query_attempt",
            "source": "db_audit",
            "payload": {"subject_id": "db_prod", "subject_type": "database", "confidence": 0.95, "query": "SELECT *"}
        }
    ]
    # 1. Load timeline
    load_res = client.post("/api/v1/scenarios/scenario_demo/playback/load", json=timeline)
    assert load_res.status_code == 200
    assert load_res.json()["total_events"] == 2

    # 2. Step 1
    step1 = client.post("/api/v1/scenarios/scenario_demo/playback/step")
    assert step1.status_code == 200
    assert step1.json()["current_step"] == 1
    assert step1.json()["remaining_events"] == 1

    # 3. Step 2
    step2 = client.post("/api/v1/scenarios/scenario_demo/playback/step")
    assert step2.status_code == 200
    assert step2.json()["current_step"] == 2
    assert step2.json()["remaining_events"] == 0

    # 4. Status
    status_res = client.get("/api/v1/scenarios/scenario_demo/playback/status")
    assert status_res.status_code == 200
    assert status_res.json()["staged_events_remaining"] == 0

def test_multi_scenario_benchmarks():
    # Test Kubernetes Microservices Benchmark
    k8s_res = client.get("/api/v1/scenarios/scenario_k8s/benchmark")
    assert k8s_res.status_code == 200
    k8s_data = k8s_res.json()
    assert k8s_data["benchmark_passed"] is True
    assert k8s_data["path_recall"] == 1.0
    assert k8s_data["path_precision"] == 1.0
    assert k8s_data["decoy_demotion_healthy"] is True

    # Test Active Directory Benchmark
    ad_res = client.get("/api/v1/scenarios/scenario_ad/benchmark")
    assert ad_res.status_code == 200
    ad_data = ad_res.json()
    assert ad_data["benchmark_passed"] is True
    assert ad_data["path_recall"] == 1.0
    assert ad_data["path_precision"] == 1.0
    assert ad_data["decoy_demotion_healthy"] is True

def test_remediation_code_export():
    # Export Terraform
    tf_res = client.post("/api/v1/scenarios/scenario_demo/interventions/int_segment_dmz/export?format=terraform")
    assert tf_res.status_code == 200
    assert "resource \"aws_security_group_rule\"" in tf_res.json()["code"]
    assert tf_res.json()["language"] == "hcl"

    # Export IAM Policy JSON
    iam_res = client.post("/api/v1/scenarios/scenario_demo/interventions/int_mfa_admin/export?format=iam")
    assert iam_res.status_code == 200
    assert "EnforceMFAForAdminRoleAssumption" in iam_res.json()["code"]
    assert iam_res.json()["language"] == "json"

    # Export Kubernetes NetworkPolicy
    k8s_res = client.post("/api/v1/scenarios/scenario_demo/interventions/int_segment_dmz/export?format=kubernetes")
    assert k8s_res.status_code == 200
    assert "kind: NetworkPolicy" in k8s_res.json()["code"]

def test_audit_trail_export():
    # Export JSON
    json_res = client.get("/api/v1/scenarios/scenario_demo/audit/export?format=json")
    assert json_res.status_code == 200
    assert "compliance_standard" in json_res.json()
    assert "audit_records" in json_res.json()

    # Export CSV
    csv_res = client.get("/api/v1/scenarios/scenario_demo/audit/export?format=csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "record_id,scenario_id,action" in csv_res.text
