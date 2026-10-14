from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from app.schemas.events import SecurityEventCreate

def generate_synthetic_campaign(
    scenario_id: str,
    template: str = "payment_breach"
) -> Dict[str, Any]:
    """
    Generates structured, staged attack campaigns with realistic multi-step alert timelines.
    """
    now = datetime.now(timezone.utc)
    template_key = template.lower().strip()

    if "k8s" in template_key:
        return _generate_k8s_campaign(scenario_id, now)
    elif "ad" in template_key or "ransomware" in template_key:
        return _generate_ad_campaign(scenario_id, now)
    else:
        # Default: payment_breach
        return _generate_payment_campaign(scenario_id, now)


def _generate_payment_campaign(scenario_id: str, base_time: datetime) -> Dict[str, Any]:
    title = "Payment Perimeter Breach & Vault Exfiltration"
    description = (
        "Adversary performs initial perimeter reconnaissance on the Public API Gateway, "
        "exploits an injection vulnerability, moves laterally towards the payment cluster, "
        "inadvertently triggers a canary honeypot listener, and queries the cardholder database vault."
    )

    events_data = [
        {
            "event_type": "port_scan",
            "source": "perimeter_firewall",
            "delta_minutes": 0,
            "payload": {
                "subject_id": "gw_01",
                "subject_type": "asset",
                "confidence": 0.75,
                "attacker_ip": "198.51.100.42",
                "targeted_ports": [80, 443, 8443, 22],
                "description": "Port scanning activity detected targeting external gateway."
            }
        },
        {
            "event_type": "sqli_attempt",
            "source": "waf_sensor",
            "delta_minutes": 2,
            "payload": {
                "subject_id": "gw_01",
                "subject_type": "asset",
                "confidence": 0.88,
                "cve": "CVE-2026-1042",
                "uri": "/api/v1/auth/login",
                "description": "Web application SQL injection attack observed on login endpoint."
            }
        },
        {
            "event_type": "lateral_traversal",
            "source": "network_tap",
            "delta_minutes": 5,
            "payload": {
                "subject_id": "rel_02",
                "subject_type": "relationship",
                "confidence": 0.82,
                "protocol": "HTTP/2",
                "bytes_transferred": 1048576,
                "description": "Anomalous high-volume HTTP proxy traversal from gateway to payment microservice."
            }
        },
        {
            "event_type": "process_injection",
            "source": "edr_agent",
            "delta_minutes": 8,
            "payload": {
                "subject_id": "svc_app",
                "subject_type": "asset",
                "confidence": 0.90,
                "process_name": "python3",
                "description": "Suspicious memory injection and shell execution on payment processing node."
            }
        },
        {
            "event_type": "canary_token_accessed",
            "source": "honeypot_listener",
            "delta_minutes": 11,
            "payload": {
                "subject_id": "rel_06",
                "subject_type": "relationship",
                "confidence": 0.95,
                "canary_node": "decoy_honeypot",
                "source_host": "host_bastion",
                "description": "Canary tripwire probe triggered: unauthorized ICMP ping / sweep towards decoy honeytoken."
            }
        },
        {
            "event_type": "database_credential_dump",
            "source": "db_audit_log",
            "delta_minutes": 15,
            "payload": {
                "subject_id": "rel_04",
                "subject_type": "relationship",
                "confidence": 0.92,
                "query": "SELECT * FROM cardholder_vault.credit_cards LIMIT 50000;",
                "description": "Unauthorized administrative bulk extraction from production cardholder vault."
            }
        }
    ]

    events = [
        SecurityEventCreate(
            event_type=d["event_type"],
            source=d["source"],
            timestamp=base_time + timedelta(minutes=d["delta_minutes"]),
            payload=d["payload"]
        )
        for d in events_data
    ]

    return {
        "campaign_id": f"camp_payment_{int(base_time.timestamp())}",
        "scenario_id": scenario_id,
        "template": "payment_breach",
        "title": title,
        "description": description,
        "total_stages": len(events),
        "events": events
    }


def _generate_k8s_campaign(scenario_id: str, base_time: datetime) -> Dict[str, Any]:
    title = "Kubernetes Cluster Escape & Cloud Role Theft"
    description = (
        "Attacker exploits ingress controller, pivots across microservices via gRPC, "
        "triggers canary debug container, escapes pod onto worker node host, "
        "and queries AWS IMDS to steal instance role credentials for S3 data theft."
    )

    events_data = [
        {
            "event_type": "cve_exploit",
            "source": "ingress_waf",
            "delta_minutes": 0,
            "payload": {
                "subject_id": "ingress_nginx",
                "subject_type": "asset",
                "confidence": 0.85,
                "cve": "CVE-2023-5043",
                "description": "Remote code execution attempt against NGINX Ingress controller."
            }
        },
        {
            "event_type": "lateral_traversal",
            "source": "k8s_flow_log",
            "delta_minutes": 3,
            "payload": {
                "subject_id": "k8s_rel_01",
                "subject_type": "relationship",
                "confidence": 0.80,
                "description": "Ingress forwarding illicit payload to frontend pod."
            }
        },
        {
            "event_type": "canary_token_accessed",
            "source": "canary_daemon",
            "delta_minutes": 6,
            "payload": {
                "subject_id": "k8s_rel_06",
                "subject_type": "relationship",
                "confidence": 0.96,
                "canary_node": "canary_debug_pod",
                "description": "Canary tripwire triggered: frontend pod accessed hidden debug socket."
            }
        },
        {
            "event_type": "container_escape",
            "source": "host_falco",
            "delta_minutes": 9,
            "payload": {
                "subject_id": "k8s_rel_03",
                "subject_type": "relationship",
                "confidence": 0.94,
                "cve": "CVE-2024-21626",
                "description": "Container escape detected: runc process breakout onto EC2 worker node filesystem."
            }
        },
        {
            "event_type": "credential_theft",
            "source": "aws_cloudtrail",
            "delta_minutes": 12,
            "payload": {
                "subject_id": "k8s_rel_04",
                "subject_type": "relationship",
                "confidence": 0.91,
                "api": "IMDSv1 /latest/meta-data/iam/security-credentials/",
                "description": "Instance metadata service query stole temporary IAM role credentials."
            }
        },
        {
            "event_type": "data_exfiltration",
            "source": "aws_cloudtrail",
            "delta_minutes": 15,
            "payload": {
                "subject_id": "k8s_rel_05",
                "subject_type": "relationship",
                "confidence": 0.95,
                "action": "s3:GetObject",
                "description": "Bulk retrieval of customer data lake vault via stolen IAM instance role."
            }
        }
    ]

    events = [
        SecurityEventCreate(
            event_type=d["event_type"],
            source=d["source"],
            timestamp=base_time + timedelta(minutes=d["delta_minutes"]),
            payload=d["payload"]
        )
        for d in events_data
    ]

    return {
        "campaign_id": f"camp_k8s_{int(base_time.timestamp())}",
        "scenario_id": scenario_id,
        "template": "k8s_escape",
        "title": title,
        "description": description,
        "total_stages": len(events),
        "events": events
    }


def _generate_ad_campaign(scenario_id: str, base_time: datetime) -> Dict[str, Any]:
    title = "Active Directory Ransomware & Domain Controller Compromise"
    description = (
        "Initial workstation infected via malicious attachment, touches honeytoken account, "
        "spreads via internal file share SMB, harvests RADIUS credentials, performs Kerberoasting, "
        "and executes DCSync against the primary Domain Controller."
    )

    events_data = [
        {
            "event_type": "phishing_payload",
            "source": "edr_workstation",
            "delta_minutes": 0,
            "payload": {
                "subject_id": "ws_phished",
                "subject_type": "asset",
                "confidence": 0.86,
                "technique": "T1566.001",
                "description": "Malicious macro executed from finance invoice spearphishing attachment."
            }
        },
        {
            "event_type": "canary_token_accessed",
            "source": "ad_honeytoken_audit",
            "delta_minutes": 2,
            "payload": {
                "subject_id": "ad_rel_05",
                "subject_type": "relationship",
                "confidence": 0.98,
                "spn": "MSSQLSvc/honey.corp.internal",
                "description": "Canary Honeytoken triggered: LDAP query requested SPN for decoy service account."
            }
        },
        {
            "event_type": "lateral_traversal",
            "source": "zeek_smb",
            "delta_minutes": 5,
            "payload": {
                "subject_id": "ad_rel_01",
                "subject_type": "relationship",
                "confidence": 0.80,
                "protocol": "SMB2",
                "description": "Anomalous SMB session established towards corporate file share."
            }
        },
        {
            "event_type": "credential_dumping",
            "source": "windows_event_log",
            "delta_minutes": 8,
            "payload": {
                "subject_id": "ad_rel_02",
                "subject_type": "relationship",
                "confidence": 0.88,
                "technique": "T1003.001",
                "description": "LSASS memory scraping detected on VPN RADIUS host."
            }
        },
        {
            "event_type": "kerberoasting",
            "source": "ad_kdc_log",
            "delta_minutes": 11,
            "payload": {
                "subject_id": "ad_rel_03",
                "subject_type": "relationship",
                "confidence": 0.90,
                "technique": "T1558.003",
                "description": "RC4 Kerberos TGS ticket request for domain admin service account."
            }
        },
        {
            "event_type": "domain_compromise",
            "source": "domain_controller_audit",
            "delta_minutes": 14,
            "payload": {
                "subject_id": "ad_rel_04",
                "subject_type": "relationship",
                "confidence": 0.97,
                "technique": "T1003.006",
                "description": "DCSync directory replication request initiated from non-DC host targeting DC01."
            }
        }
    ]

    events = [
        SecurityEventCreate(
            event_type=d["event_type"],
            source=d["source"],
            timestamp=base_time + timedelta(minutes=d["delta_minutes"]),
            payload=d["payload"]
        )
        for d in events_data
    ]

    return {
        "campaign_id": f"camp_ad_{int(base_time.timestamp())}",
        "scenario_id": scenario_id,
        "template": "ad_ransomware",
        "title": title,
        "description": description,
        "total_stages": len(events),
        "events": events
    }
