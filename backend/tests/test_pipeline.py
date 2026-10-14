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
