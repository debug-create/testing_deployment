from typing import List, Dict, Any

STRIDE_RULES = [
    {
        "keywords": ["spoof", "impersonat", "fake_token", "stolen_key", "credential_stuffing"],
        "category": "Spoofing",
        "affected_property": "Authenticity",
        "rationale": "Event exhibits evidence of identity falsification or fraudulent credential usage."
    },
    {
        "keywords": ["tamper", "modify_config", "file_changed", "integrity_violation", "code_injection"],
        "category": "Tampering",
        "affected_property": "Integrity",
        "rationale": "Evidence indicates unauthorized alteration of software, parameters, or persistent storage."
    },
    {
        "keywords": ["log_deleted", "audit_tamper", "repudiat", "disable_logging"],
        "category": "Repudiation",
        "affected_property": "Non-repudiation",
        "rationale": "Evidence suggests activity intended to deny actions or destroy forensic telemetry."
    },
    {
        "keywords": ["leak", "exfiltrat", "unauthorized_access", "dump_credentials", "disclosure", "unprotected_s3"],
        "category": "Information Disclosure",
        "affected_property": "Confidentiality",
        "rationale": "Evidence implies exposure of sensitive data to unauthorized actors."
    },
    {
        "keywords": ["flood", "exhaustion", "denial_of_service", "dos", "crash", "resource_spike"],
        "category": "Denial of Service",
        "affected_property": "Availability",
        "rationale": "Evidence indicates attempts to degrade service responsiveness or cause system outage."
    },
    {
        "keywords": ["privilege_escalat", "sudo_exploit", "iam_escalation", "assume_admin", "token_minting", "cve_"],
        "category": "Elevation of Privilege",
        "affected_property": "Authorization",
        "rationale": "Evidence indicates elevation beyond the assigned security boundaries."
    }
]

def map_stride(event_type: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Enriches the evidence with STRIDE categories based on event attributes.
    Does NOT fabricate attack paths; merely provides threat taxonomy enrichment.
    """
    results = []
    text_corpus = f"{event_type} {str(payload)}".lower()

    for rule in STRIDE_RULES:
        if any(kw in text_corpus for kw in rule["keywords"]):
            results.append({
                "framework": "STRIDE",
                "technique_id": rule["category"].upper().replace(" ", "_"),
                "technique_name": rule["category"],
                "tactic": rule["affected_property"],
                "confidence": 0.85,
                "rationale": rule["rationale"]
            })

    if not results:
        # Default fallback
        results.append({
            "framework": "STRIDE",
            "technique_id": "GENERAL_THREAT",
            "technique_name": "General Security Event",
            "tactic": "Security Monitoring",
            "confidence": 0.5,
            "rationale": "Telemetry event recorded against asset context."
        })

    return results
