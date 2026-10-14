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
        "keywords": ["phishing", "spearphishing", "attachment", "invoice"],
        "technique_id": "T1566",
        "technique_name": "Phishing",
        "tactic": "Initial Access",
        "rationale": "Adversary used social engineering and malicious lure to gain user execution."
    },
    {
        "keywords": ["port_scan", "nmap", "syn_scan", "network_recon"],
        "technique_id": "T1595",
        "technique_name": "Active Scanning",
        "tactic": "Reconnaissance / Discovery",
        "rationale": "Adversary actively probed network ports and perimeter listeners."
    },
    {
        "keywords": ["container_escape", "runc", "hostpath", "breakout"],
        "technique_id": "T1611",
        "technique_name": "Escape to Host",
        "tactic": "Privilege Escalation",
        "rationale": "Adversary broke out of container isolation onto the host operating system."
    },
    {
        "keywords": ["process_injection", "memory_injection", "ptrace"],
        "technique_id": "T1055",
        "technique_name": "Process Injection",
        "tactic": "Defense Evasion / Privilege Escalation",
        "rationale": "Adversary injected code into a running legitimate system process."
    },
    {
        "keywords": ["imds", "metadata_api", "instance_role"],
        "technique_id": "T1552.005",
        "technique_name": "Cloud Instance Metadata API",
        "tactic": "Credential Access",
        "rationale": "Adversary queried instance metadata service to steal cloud role tokens."
    },
    {
        "keywords": ["kerberoast", "tgs_req", "rc4_ticket"],
        "technique_id": "T1558.003",
        "technique_name": "Kerberoasting",
        "tactic": "Credential Access",
        "rationale": "Adversary requested service ticket to crack offline and extract service credentials."
    },
    {
        "keywords": ["dcsync", "replication", "ms_drsr", "domain_compromise"],
        "technique_id": "T1003.006",
        "technique_name": "DCSync",
        "tactic": "Credential Access",
        "rationale": "Adversary simulated domain controller replication to harvest Active Directory password hashes."
    },
    {
        "keywords": ["canary", "honeypot", "honeytoken", "tripwire"],
        "technique_id": "T1082",
        "technique_name": "System Information Discovery",
        "tactic": "Discovery",
        "rationale": "Adversary interacted with deceptive canary tripwire while enumerating environment."
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
        "keywords": ["lateral_movement", "psexec", "ssh_pivot", "smb_session", "cross_vpc_hop"],
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
    
    # 1. Honor explicit technique provided in payload
    explicit_technique = payload.get("technique") or payload.get("technique_id")
    if explicit_technique:
        results.append({
            "framework": "MITRE_ATTACK",
            "technique_id": str(explicit_technique),
            "technique_name": str(payload.get("technique_name") or explicit_technique),
            "tactic": str(payload.get("tactic") or "Execution / Discovery"),
            "confidence": float(payload.get("confidence", 0.9)),
            "rationale": f"Explicit MITRE technique {explicit_technique} supplied in event telemetry."
        })

    # 2. Rule-based keyword matching
    text_corpus = f"{event_type} {str(payload)}".lower()
    for rule in MITRE_RULES:
        if any(kw in text_corpus for kw in rule["keywords"]):
            # Avoid duplicate technique_id if already added explicitly
            if not any(r["technique_id"] == rule["technique_id"] for r in results):
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
