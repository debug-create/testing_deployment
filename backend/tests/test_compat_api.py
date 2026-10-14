import pytest
import os
import sys

# Ensure backend root is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_state():
    """Reset the compatibility state before each test."""
    response = client.post("/api/reset")
    assert response.status_code == 200

def test_health_endpoints():
    r1 = client.get("/health")
    assert r1.status_code == 200
    assert r1.json()["status"] == "healthy"

    r2 = client.get("/api/health")
    assert r2.status_code == 200
    assert r2.json()["status"] == "healthy"

    r3 = client.get("/api/v1/health")
    assert r3.status_code == 200
    assert r3.json()["status"] == "healthy"

def test_get_entities():
    response = client.get("/api/entities")
    assert response.status_code == 200
    entities = response.json()
    assert isinstance(entities, list)
    assert len(entities) >= 4

    entity_ids = [e["id"] for e in entities]
    assert "arjun-107" in entity_ids
    assert "devraj-104" in entity_ids
    assert "priya-101" in entity_ids
    assert "neha-112" in entity_ids

    # Verify structure matches frontend Entity contract
    for ent in entities:
        assert "id" in ent
        assert "name" in ent
        assert "riskScore" in ent
        assert "riskLevel" in ent
        assert "summary" in ent

def test_get_cases_and_sorting():
    response = client.get("/api/cases")
    assert response.status_code == 200
    cases = response.json()
    assert len(cases) == 4

    # Priority sorting check (highest priority score first)
    priorities = [c["priority_score"] for c in cases]
    assert priorities == sorted(priorities, reverse=True)

    # Verify Case Contract fields
    for c in cases:
        assert "id" in c
        assert "actor_id" in c
        assert "raw_deviation" in c
        assert "context_coverage" in c
        assert "residual_risk" in c
        assert "priority_score" in c
        assert "scoring_version" in c
        assert "response_action" in c

def test_get_case_lookup_aliases():
    # Test lookup by numeric ID, actor name prefix, and entity_ref
    r1 = client.get("/api/cases/107")
    assert r1.status_code == 200
    assert r1.json()["actor_name"] == "Arjun Patel"

    r2 = client.get("/api/cases/arjun-107")
    assert r2.status_code == 200
    assert r2.json()["id"] == "107"

    r3 = client.get("/api/cases/usr-7823")
    assert r3.status_code == 200
    assert r3.json()["id"] == "107"

    r4 = client.get("/api/cases/devraj")
    assert r4.status_code == 200
    assert r4.json()["id"] == "104"

def test_get_case_detail_contract():
    response = client.get("/api/cases/107/detail")
    assert response.status_code == 200
    detail = response.json()

    assert detail["id"] == "107"
    assert "originalAssessment" in detail
    assert "currentAssessment" in detail
    assert "timelineEvents" in detail
    assert "eventContributions" in detail
    assert "signalCategories" in detail
    assert "contextLedger" in detail
    assert "counterfactualWaterfall" in detail
    assert "shiftMap" in detail
    assert "blastRadius" in detail
    assert "responseAction" in detail

    # Verify event contribution structure
    for ec in detail["eventContributions"]:
        assert "event_raw_risk" in ec
        assert "context_state" in ec
        assert "final_residual_contribution" in ec

def test_separation_of_duties_enforcement():
    """Proposer cannot approve or reject their own context revision proposal."""
    # 1. Propose context revision as analyst
    proposal_res = client.post(
        "/api/cases/107/context-revisions",
        json={
            "reason": "Auditor sampling request FIN-AUDIT-2026",
            "effective_from": "2026-09-12 04:00 UTC",
            "effective_until": "2026-09-12 08:00 UTC",
            "allowed_resources": ["gcs://analytics-finance-lake/*"],
            "allowed_actions": ["storage.objects.get"],
            "proposer_id": "analyst-proposer",
            "proposer_name": "Alex Thorne",
            "proposer_role": "SOC Tier 2 Analyst",
        }
    )
    assert proposal_res.status_code == 200
    created_rev = proposal_res.json()
    rev_id = created_rev["id"]

    # 2. Attempt self-approval by same analyst -> Must be rejected with 400
    self_approve_res = client.post(
        f"/api/cases/107/context-revisions/{rev_id}/review",
        json={
            "action": "approve",
            "reviewer_id": "analyst-proposer",
            "reviewer_name": "Alex Thorne",
            "reviewer_role": "SOC Tier 2 Analyst",
        }
    )
    assert self_approve_res.status_code == 400
    assert "Separation of Duties" in self_approve_res.json()["detail"]

    # 3. Independent reviewer approval -> Succeeds and attenuates risk
    independent_res = client.post(
        f"/api/cases/107/context-revisions/{rev_id}/review",
        json={
            "action": "approve",
            "reviewer_id": "lead-approver",
            "reviewer_name": "Sarah Sterling",
            "reviewer_role": "VP Data Platform & Compliance Reviewer",
            "notes": "Verified against compliance schedule FIN-AUDIT-2026.",
        }
    )
    assert independent_res.status_code == 200
    approved_body = independent_res.json()
    assert approved_body["success"] is True
    assert approved_body["revision"]["status"] == "approved"
    assert approved_body["revision"]["approver_name"] == "Sarah Sterling"

    # 4. Verify Arjun's case is now attenuated from 100 to 8.2 residual risk
    case_res = client.get("/api/cases/107")
    assert case_res.status_code == 200
    case_data = case_res.json()
    assert case_data["residual_risk"] == 8.2
    assert case_data["priority_score"] == 14.2
    assert case_data["status"] == "explained"
    assert case_data["retroactive_justification_review"] is True

    # 5. Verify Entity list reflects the attenuation
    entities_res = client.get("/api/entities")
    assert entities_res.status_code == 200
    arjun_ent = next(e for e in entities_res.json() if e["id"] == "arjun-107")
    assert arjun_ent["riskScore"] == 8.2
    assert arjun_ent["riskLevel"] == "resolved"

def test_response_action_authority_and_execution():
    """Broad containment requires Reviewer/Admin authority."""
    # Analyst cannot execute broad containment
    r1 = client.post(
        "/api/cases/104/response-actions/execute",
        json={
            "action": "approve_containment",
            "actor_id": "analyst-proposer",
            "actor_name": "Alex Thorne",
            "actor_role": "SOC Tier 2 Analyst",
        }
    )
    assert r1.status_code == 403
    assert "Human Authority" in r1.json()["detail"]

    # Authorized reviewer can execute broad containment
    r2 = client.post(
        "/api/cases/104/response-actions/execute",
        json={
            "action": "approve_containment",
            "actor_id": "lead-approver",
            "actor_name": "Sarah Sterling",
            "actor_role": "VP Data Platform & Compliance Reviewer",
            "notes": "Approved containment for critical exfiltration anomaly.",
        }
    )
    assert r2.status_code == 200
    res_data = r2.json()
    assert res_data["success"] is True
    assert res_data["response_action"]["status"] == "approved"
    assert "Sarah Sterling" in res_data["response_action"]["approved_by"]

    # Rollback can be initiated
    r3 = client.post(
        "/api/cases/104/response-actions/execute",
        json={
            "action": "rollback",
            "notes": "Incident resolved; rolling back isolation.",
        }
    )
    assert r3.status_code == 200
    assert r3.json()["response_action"]["status"] == "rolled_back"

def test_narrative_generation():
    # Case 104 narrative
    r_dev = client.get("/api/cases/104/narrative")
    assert r_dev.status_code == 200
    narrative_dev = r_dev.json()
    assert "Singapore" in narrative_dev["narrative"]
    assert len(narrative_dev["key_evidence_citations"]) >= 3
    assert narrative_dev["is_live"] is True

    # Case 107 initial narrative
    r_arjun = client.get("/api/cases/107/narrative")
    assert r_arjun.status_code == 200
    assert "RFC-3982" in r_arjun.json()["narrative"]

def test_containment_recommendation():
    response = client.post(
        "/api/cases/104/containment-recommendation",
        json={"rationale": "High-confidence exfiltration anomaly requires emergency containment."}
    )
    assert response.status_code == 200
    assert "Containment Recommended" in response.json()["status"]

    # Verify case status updated
    case_res = client.get("/api/cases/104")
    assert case_res.status_code == 200
    assert case_res.json()["status"] == "Containment Recommended"
