from sqlalchemy.orm import Session
from app.persistence.repositories import ScenarioRepository, AssetRepository, RelationshipRepository
from app.models.scenario import ScenarioModel

DEMO_SCENARIO_ID = "scenario_demo"

def seed_demo_scenario(db: Session, scenario_id: str = DEMO_SCENARIO_ID) -> ScenarioModel:
    scenario_repo = ScenarioRepository(db)
    asset_repo = AssetRepository(db)
    rel_repo = RelationshipRepository(db)

    # Check if scenario exists
    scenario = scenario_repo.get(scenario_id)
    if scenario:
        return scenario

    scenario = scenario_repo.create(
        scenario_id=scenario_id,
        name="Enterprise Cloud & Payment Perimeter",
        seed=42
    )

    # Assets
    assets_data = [
        {
            "id": "gw_01",
            "name": "Public API Gateway",
            "asset_type": "service",
            "criticality": 0.4,
            "is_entry_point": True,
            "is_target": False,
            "properties": {"exposure": "internet", "waf_enabled": True, "identity_baseline": 0.85, "config_baseline": 0.80}
        },
        {
            "id": "host_bastion",
            "name": "DMZ Bastion Host",
            "asset_type": "host",
            "criticality": 0.5,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"os": "Linux", "patch_level": "2026.01", "identity_baseline": 0.80, "config_baseline": 0.75}
        },
        {
            "id": "svc_app",
            "name": "Payment Processing Cluster",
            "asset_type": "service",
            "criticality": 0.7,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"framework": "FastAPI", "pci_scope": True, "identity_baseline": 0.90, "config_baseline": 0.85}
        },
        {
            "id": "role_admin",
            "name": "IAM Cloud Administrator Role",
            "asset_type": "identity",
            "criticality": 0.95,
            "is_entry_point": False,
            "is_target": True,
            "properties": {"mfa_enforced": False, "privileges": "AdministratorAccess", "identity_baseline": 0.70, "config_baseline": 0.65}
        },
        {
            "id": "db_prod",
            "name": "Production Cardholder Vault",
            "asset_type": "database",
            "criticality": 1.0,
            "is_entry_point": False,
            "is_target": True,
            "properties": {"encrypted_at_rest": True, "pci_tier": 1, "identity_baseline": 0.95, "config_baseline": 0.90}
        },
        {
            "id": "decoy_honeypot",
            "name": "Canary Honeytoken Listener",
            "asset_type": "host",
            "criticality": 0.1,
            "is_entry_point": False,
            "is_target": False,
            "properties": {"is_decoy": True, "canary": True, "identity_baseline": 0.30, "config_baseline": 0.30}
        }
    ]

    for a in assets_data:
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

    # Relationships
    relationships_data = [
        ("rel_01", "gw_01", "host_bastion", "network_ssh", {"port": 22, "prior_probability": 0.45}),
        ("rel_02", "gw_01", "svc_app", "http_proxy", {"port": 8443, "prior_probability": 0.65}),
        ("rel_03", "host_bastion", "role_admin", "assumes_role", {"role_arn": "arn:aws:iam::role/Admin", "prior_probability": 0.35}),
        ("rel_04", "svc_app", "db_prod", "db_sql_connection", {"port": 5432, "prior_probability": 0.70}),
        ("rel_05", "role_admin", "db_prod", "iam_admin_bypass", {"policy": "FullAccess", "prior_probability": 0.85}),
        ("rel_06", "host_bastion", "decoy_honeypot", "icmp_ping", {"prior_probability": 0.50})
    ]

    for rel_id, src, dst, r_type, attrs in relationships_data:
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
