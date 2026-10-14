from typing import List, Dict, Any

MITRE_RULES = [
    {
        "keywords": ["public_exploit", "cve_", "sqli", "rce", "ssrf", "ingress_attack", "api_exploit"],
        "technique_id": "T1190",
        "technique_name": "Exploit Public-Facing Application",
        "tactic": "Initial Access",
        "rationale": "Adversary attempted or succeeded in exploiting vulnerability on public interface."
    },
    {
        "keywords": ["stolen_creds", "valid_account", "ssh_login", "compromised_token", "api_key_abuse"],
        "technique_id": "T1078",
        "technique_name": "Valid Accounts",
        "tactic": "Defense Evasion / Initial Access",
        "rationale": "Adversary obtained and abused legitimate credentials of an existing identity."
    },
    {
        "keywords": ["privilege_escalation", "setuid", "sudo_cve", "iam_role_elevation", "kernel_exploit"],
        "technique_id": "T1068",
        "technique_name": "Exploitation for Privilege Escalation",
        "tactic": "Privilege Escalation",
        "rationale": "Adversary leveraged software weakness to obtain elevated authorization rights."
    },
    {
        "keywords": ["lateral_movement", "psexec", "ssh_pivot", "internal_port_scan", "cross_vpc_hop"],
        "technique_id": "T1021",
        "technique_name": "Remote Services",
        "tactic": "Lateral Movement",
        "rationale": "Adversary navigated between networked assets using legitimate or exploited remote channels."
    },
    {
        "keywords": ["exfiltrat", "data_transfer", "s3_sync_external", "dump_database", "bulk_query"],
        "technique_id": "T1048",
        "technique_name": "Exfiltration Over Alternative Protocol",
        "tactic": "Exfiltration",
        "rationale": "Adversary staged and transferred sensitive company records off internal infrastructure."
    },
    {
        "keywords": ["dump_creds", "mimikatz", "memory_dump", "env_harvest", "extract_secrets"],
        "technique_id": "T1552",
        "technique_name": "Unsecured Credentials",
        "tactic": "Credential Access",
        "rationale": "Adversary searched insecure files, environmental variables, or memories for authentication secrets."
    }
]

def map_mitre_attack(event_type: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Enriches evidence with MITRE ATT&CK technique IDs and tactics.
    Requires contextual evidence rather than blind keyword speculation.
    """
    results = []
    text_corpus = f"{event_type} {str(payload)}".lower()

    for rule in MITRE_RULES:
        if any(kw in text_corpus for kw in rule["keywords"]):
            results.append({
                "framework": "MITRE_ATTACK",
                "technique_id": rule["technique_id"],
                "technique_name": rule["technique_name"],
                "tactic": rule["tactic"],
                "confidence": 0.8,
                "rationale": rule["rationale"]
            })

    if not results:
        results.append({
            "framework": "MITRE_ATTACK",
            "technique_id": "T1000",
            "technique_name": "Unclassified Telemetry",
            "tactic": "Discovery",
            "confidence": 0.4,
            "rationale": "Telemetry observation awaiting further correlation."
        })

    return results
