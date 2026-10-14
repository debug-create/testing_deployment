from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.persistence.database import get_db
from app.persistence.repositories import (
    ScenarioRepository, AssetRepository, RelationshipRepository,
    EvidenceRepository, AuditRepository
)
from app.schemas.simulations import (
    InterventionOptimizeRequest, InterventionOptimizeResponse, InterventionCandidate
)
from app.ir.builder import build_ir_graph
from app.twin.graph import SecurityDigitalTwin
from app.paths.search import find_all_attack_paths
from app.paths.scoring import rank_and_score_paths
from app.optimization.interventions import optimize_interventions
from app.core.errors import ScenarioNotFoundError

router = APIRouter()

DEFAULT_CANDIDATES = [
    InterventionCandidate(
        id="int_mfa_admin",
        name="Enforce Hardware MFA on Admin Role",
        description="Sever credential theft and unauthorized role assumption from jump hosts.",
        cost=3.5,
        affected_relationship_ids=["rel_03", "rel_05"],
        side_effects=["Requires physical security key enrollment for cloud admins"]
    ),
    InterventionCandidate(
        id="int_segment_dmz",
        name="Microsegment Bastion Host & Restrict SSH",
        description="Limit inbound SSH access to whitelisted internal VPN subnets.",
        cost=2.0,
        affected_relationship_ids=["rel_01"],
        side_effects=["Emergency direct SSH access requires break-glass ticket"]
    ),
    InterventionCandidate(
        id="int_waf_rules",
        name="Deploy Virtual Patching & Strict WAF Rules",
        description="Filter web exploit vectors targeting public API gateway.",
        cost=4.0,
        affected_relationship_ids=["rel_02"],
        side_effects=["0.05% transient false-positive block rate on anomalous API payloads"]
    ),
    InterventionCandidate(
        id="int_db_tls_mtls",
        name="Isolate Payment Vault & Enforce mTLS",
        description="Block direct network connections to database except through validated token proxy.",
        cost=6.0,
        affected_relationship_ids=["rel_04"],
        side_effects=["Slight increase in connection handshake latency"]
    )
]

K8S_CANDIDATES = [
    InterventionCandidate(
        id="int_k8s_imds_v2",
        name="Enforce IMDSv2 Hop Limit on EC2 Nodes",
        description="Prevent container processes from querying instance metadata credentials.",
        cost=2.0,
        affected_relationship_ids=["k8s_rel_04"],
        side_effects=["Legacy services relying on IMDSv1 must migrate"]
    ),
    InterventionCandidate(
        id="int_k8s_netpol",
        name="Kubernetes Ingress Microsegmentation Policy",
        description="Enforce strict pod network isolation on ingress and frontend services.",
        cost=3.0,
        affected_relationship_ids=["k8s_rel_01"],
        side_effects=["Explicit ingress rules required for inter-namespace services"]
    ),
    InterventionCandidate(
        id="int_k8s_gvisor",
        name="Sandbox Payment Pods with gVisor Runtime",
        description="Block container breakout CVEs to underlying worker node kernel.",
        cost=4.5,
        affected_relationship_ids=["k8s_rel_03"],
        side_effects=["Minor performance overhead on syscall-heavy workloads"]
    ),
    InterventionCandidate(
        id="int_k8s_s3_least_privilege",
        name="Restrict S3 Vault IAM Bucket Policy",
        description="Sever unauthorized data lake access from compromised worker nodes.",
        cost=2.5,
        affected_relationship_ids=["k8s_rel_05"],
        side_effects=["Requires explicit role session tagging"]
    )
]

AD_CANDIDATES = [
    InterventionCandidate(
        id="int_ad_smb_signing",
        name="Enforce SMB Signing and File Share Segmentation",
        description="Block lateral pivot and NTLM relaying towards internal file share.",
        cost=2.0,
        affected_relationship_ids=["ad_rel_01"],
        side_effects=["1-2% throughput impact on large file transfers"]
    ),
    InterventionCandidate(
        id="int_ad_cred_guard",
        name="Enable Windows Defender Credential Guard",
        description="Isolate LSASS memory on RADIUS host to stop credential harvesting.",
        cost=3.5,
        affected_relationship_ids=["ad_rel_02"],
        side_effects=["Requires UEFI Secure Boot and virtualization extensions"]
    ),
    InterventionCandidate(
        id="int_ad_aes_kerberos",
        name="Enforce AES256 & Protected Users Group",
        description="Block RC4 Kerberoasting attacks targeting administrative accounts.",
        cost=3.0,
        affected_relationship_ids=["ad_rel_03"],
        side_effects=["Disables legacy NTLM authentication for protected accounts"]
    ),
    InterventionCandidate(
        id="int_ad_dcsync_filter",
        name="Sever Non-DC Replication (DCSync Filtering)",
        description="Restrict MS-DRSR directory replication rights to authorized DC computer accounts.",
        cost=4.0,
        affected_relationship_ids=["ad_rel_04"],
        side_effects=["Delegated domain admins cannot initiate manual schema sync"]
    )
]

ALL_CANDIDATES = DEFAULT_CANDIDATES + K8S_CANDIDATES + AD_CANDIDATES

def get_default_candidates(scenario_id: str) -> List[InterventionCandidate]:
    if "k8s" in scenario_id.lower():
        return K8S_CANDIDATES
    elif "ad" in scenario_id.lower():
        return AD_CANDIDATES
    return DEFAULT_CANDIDATES

@router.post("/scenarios/{id}/interventions/optimize", response_model=InterventionOptimizeResponse)
def run_intervention_optimizer(id: str, payload: InterventionOptimizeRequest, db: Session = Depends(get_db)):
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    assets = AssetRepository(db).list_by_scenario(id)
    relationships = RelationshipRepository(db).list_by_scenario(id)
    evidence = EvidenceRepository(db).list_by_scenario(id)

    ir = build_ir_graph(id, scenario.graph_version, assets, relationships, evidence)
    twin = SecurityDigitalTwin(ir)

    raw_paths = find_all_attack_paths(twin)
    current_paths = rank_and_score_paths(id, scenario.graph_version, raw_paths, twin)

    candidates = payload.candidates if payload.candidates else get_default_candidates(id)

    return optimize_interventions(
        scenario_id=id,
        budget=payload.budget,
        candidates=candidates,
        current_paths=current_paths
    )

@router.post("/scenarios/{id}/interventions/{intervention_id}/export")
def export_intervention_code(
    id: str,
    intervention_id: str,
    format: str = "terraform",
    db: Session = Depends(get_db)
):
    from app.optimization.code_gen import generate_remediation_code
    scenario = ScenarioRepository(db).get_or_seed_demo(id)
    if not scenario:
        raise ScenarioNotFoundError(id)

    # Locate candidate metadata from combined candidate lists
    candidate = next((c for c in ALL_CANDIDATES if c.id == intervention_id), None)
    name = candidate.name if candidate else intervention_id
    affected = candidate.affected_relationship_ids if candidate else []

    return generate_remediation_code(
        intervention_id=intervention_id,
        intervention_name=name,
        format_type=format,
        affected_relationships=affected
    )

