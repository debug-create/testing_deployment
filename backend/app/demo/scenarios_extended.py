from sqlalchemy.orm import Session
from app.persistence.repositories import ScenarioRepository, AssetRepository, RelationshipRepository
from app.models.scenario import ScenarioModel

def seed_k8s_scenario(db: Session, scenario_id: str = "scenario_k8s") -> ScenarioModel:
    scenario_repo = ScenarioRepository(db)
    asset_repo = AssetRepository(db)
    rel_repo = RelationshipRepository(db)

    scenario = scenario_repo.get(scenario_id)
    if scenario:
        return scenario

    scenario = scenario_repo.create(
        scenario_id=scenario_id,
        name="Kubernetes Microservices & S3 Cloud Storage",
        seed=101
    )

    assets = [
        {
            "id": "ingress_nginx",
            "name": "NGINX Ingress Controller",
            "asset_type": "service",
            "criticality": 0.35,
            "is_entry_point": True,
            "is_target": False,
            "properties": {"exposure": "internet", "namespace": "ingress-system", "identity_baseline": 0.85, "config_baseline": 0.80}
        },
        {
            "id": "pod_frontend",
            "name": "Web Frontend Pod",
            "asset_type": "service",
            "criticality": 0.40,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"namespace": "production", "service_account": "frontend-sa", "identity_baseline": 0.80, "config_baseline": 0.75}
        },
        {
            "id": "pod_payment",
            "name": "Payment Microservice Pod",
            "asset_type": "service",
            "criticality": 0.75,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"namespace": "production", "service_account": "payment-sa", "identity_baseline": 0.90, "config_baseline": 0.85}
        },
        {
            "id": "node_worker",
            "name": "EKS EC2 Worker Node",
            "asset_type": "host",
            "criticality": 0.65,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"instance_id": "i-0987654321", "ami": "amzn2-eks", "identity_baseline": 0.80, "config_baseline": 0.70}
        },
        {
            "id": "iam_instance_profile",
            "name": "Node IAM Instance Role",
            "asset_type": "identity",
            "criticality": 0.90,
            "is_entry_point": False,
            "is_target": True,
            "properties": {"arn": "arn:aws:iam::123456789012:role/EKSNodeRole", "identity_baseline": 0.75, "config_baseline": 0.70}
        },
        {
            "id": "s3_customer_vault",
            "name": "S3 Customer Data Lake Vault",
            "asset_type": "database",
            "criticality": 1.0,
            "is_entry_point": False,
            "is_target": True,
            "properties": {"bucket": "corp-analytics-customer-vault", "encrypted": True, "identity_baseline": 0.95, "config_baseline": 0.90}
        },
        {
            "id": "canary_debug_pod",
            "name": "Canary Debug Container",
            "asset_type": "service",
            "criticality": 0.1,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"is_decoy": True, "canary": True, "namespace": "test", "identity_baseline": 0.30, "config_baseline": 0.30}
        }
    ]

    for a in assets:
        asset_repo.create(
            asset_id=a["id"],
            scenario_id=scenario_id,
            name=a["name"],
            asset_type=a["asset_type"],
            criticality=a["criticality"],
            is_entry_point=a["is_entry_point"],
            is_target=a["is_target"],
            properties=a["properties"]
        )

    relationships = [
        ("k8s_rel_01", "ingress_nginx", "pod_frontend", "http_ingress", {"port": 80, "prior_probability": 0.80}),
        ("k8s_rel_02", "pod_frontend", "pod_payment", "internal_grpc", {"port": 50051, "prior_probability": 0.60}),
        ("k8s_rel_03", "pod_payment", "node_worker", "container_escape_cve", {"cve": "CVE-2024-21626", "prior_probability": 0.35}),
        ("k8s_rel_04", "node_worker", "iam_instance_profile", "metadata_api_imds", {"imds_version": "v1", "prior_probability": 0.75}),
        ("k8s_rel_05", "iam_instance_profile", "s3_customer_vault", "s3_get_object", {"action": "s3:GetObject", "prior_probability": 0.90}),
        ("k8s_rel_06", "pod_frontend", "canary_debug_pod", "debug_proxy", {"port": 9090, "prior_probability": 0.40})
    ]

    for rel_id, src, dst, r_type, attrs in relationships:
        rel_repo.create(
            rel_id=rel_id,
            scenario_id=scenario_id,
            source_id=src,
            target_id=dst,
            relationship_type=r_type,
            attributes=attrs,
            is_active=True
        )

    return scenario

def seed_ad_scenario(db: Session, scenario_id: str = "scenario_ad") -> ScenarioModel:
    scenario_repo = ScenarioRepository(db)
    asset_repo = AssetRepository(db)
    rel_repo = RelationshipRepository(db)

    scenario = scenario_repo.get(scenario_id)
    if scenario:
        return scenario

    scenario = scenario_repo.create(
        scenario_id=scenario_id,
        name="Corporate Active Directory & Decoy Traps",
        seed=202
    )

    assets = [
        {
            "id": "ws_phished",
            "name": "Finance Workstation (Phished)",
            "asset_type": "host",
            "criticality": 0.35,
            "is_entry_point": True,
            "is_target": False,
            "properties": {"os": "Windows 11", "edr_active": True, "identity_baseline": 0.75, "config_baseline": 0.70}
        },
        {
            "id": "share_smb",
            "name": "Internal File Share (SMB)",
            "asset_type": "service",
            "criticality": 0.45,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"protocol": "SMBv2", "share": "\\\\corp\\shared", "identity_baseline": 0.80, "config_baseline": 0.75}
        },
        {
            "id": "srv_radius",
            "name": "VPN / Network RADIUS Server",
            "asset_type": "host",
            "criticality": 0.60,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"service": "FreeRADIUS", "identity_baseline": 0.85, "config_baseline": 0.80}
        },
        {
            "id": "identity_domain_admin",
            "name": "Domain Admin Kerberos Ticket",
            "asset_type": "identity",
            "criticality": 0.95,
            "is_entry_point": False,
            "is_target": True,
            "properties": {"group": "Domain Admins", "mfa": False, "identity_baseline": 0.65, "config_baseline": 0.60}
        },
        {
            "id": "srv_dc",
            "name": "Primary Domain Controller (DC01)",
            "asset_type": "host",
            "criticality": 1.0,
            "is_entry_point": False,
            "is_target": True,
            "properties": {"role": "Root DC", "forest": "corp.internal", "identity_baseline": 0.95, "config_baseline": 0.90}
        },
        {
            "id": "decoy_honey_user",
            "name": "Honeytoken Service Account",
            "asset_type": "identity",
            "criticality": 0.1,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"is_decoy": True, "spn": "MSSQLSvc/honey.corp.internal", "identity_baseline": 0.20, "config_baseline": 0.20}
        }
    ]

    for a in assets:
        asset_repo.create(
            asset_id=a["id"],
            scenario_id=scenario_id,
            name=a["name"],
            asset_type=a["asset_type"],
            criticality=a["criticality"],
            is_entry_point=a["is_entry_point"],
            is_target=a["is_target"],
            properties=a["properties"]
        )

    relationships = [
        ("ad_rel_01", "ws_phished", "share_smb", "smb_session", {"port": 445, "prior_probability": 0.75}),
        ("ad_rel_02", "share_smb", "srv_radius", "cached_creds", {"method": "memory_scrape", "prior_probability": 0.50}),
        ("ad_rel_03", "srv_radius", "identity_domain_admin", "kerberoasting", {"spn": "radius_admin", "prior_probability": 0.45}),
        ("ad_rel_04", "identity_domain_admin", "srv_dc", "dcsync_replication", {"protocol": "MS-DRSR", "prior_probability": 0.95}),
        ("ad_rel_05", "ws_phished", "decoy_honey_user", "ldap_query_spn", {"prior_probability": 0.60})
    ]

    for rel_id, src, dst, r_type, attrs in relationships:
        rel_repo.create(
            rel_id=rel_id,
            scenario_id=scenario_id,
            source_id=src,
            target_id=dst,
            relationship_type=r_type,
            attributes=attrs,
            is_active=True
        )

    return scenario
