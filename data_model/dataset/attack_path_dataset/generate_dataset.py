#!/usr/bin/env python3
"""
generate_dataset.py -- seeded synthetic dataset generator for the Attack Path Compiler.

Produces three related datasets (all SYNTHETIC; no real people, hosts, secrets or traffic):
  A. Digital twin      -> data/model_input/{scenarios,assets,relationships,interventions,what_if}.jsonl
  B. Telemetry         -> data/model_input/{events,evidence}.jsonl
  C. Ground truth      -> data/ground_truth/*   (EVALUATION ONLY, never feed to the engine)

Usage:
  python generate_dataset.py --preset standard --out .
  python generate_dataset.py --preset smoke --out /tmp/smoke
  python generate_dataset.py --validate-only --out .
  python generate_dataset.py --verify-repro --preset smoke

Stdlib only. Deterministic for a given (seed, preset, Python minor version).
"""
import argparse
import hashlib
import json
import math
import os
import random
import re
import shutil
import sys
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

GENERATOR_VERSION = "1.0.0"
SCHEMA_VERSION = "1.0"
LABEL_VERSION = "1.0"
PAYLOAD_VERSION = "1.0"

DEFAULT_CONFIG = {
    "master_seed": 20261014,
    "preset": "standard",
    "replicas": 10,
    "noise_pct": 0.15,        # ambiguous / unrelated telemetry share
    "decoy_pct": 0.10,        # loud-decoy share (scaled per template)
    "difficulty": "mixed",    # controlled | mixed | hard
    "duplicate_rate": 0.03,
    "alias_rate": 0.15,       # share of entity references written as aliases
    "tau_hours": 72,
    "tau_f_hours": 72,
    "window_hours": 120,
    "mc_trials_dev": 1000,
    "mc_trials_standard": 5000,
    "mc_trials_final": 20000,
}
PRESET_REPLICAS = {"smoke": 1, "standard": 10, "extended": 40}

DIFFICULTY = {
    "controlled": {"p_obs": 0.95, "stale": 0.00, "ooo_sigma_h": 1.0},
    "mixed": {"p_obs": 0.80, "stale": 0.05, "ooo_sigma_h": 4.0},
    "hard": {"p_obs": 0.60, "stale": 0.15, "ooo_sigma_h": 8.0},
}

TEMPLATES = {
    "S1": dict(name="benign_baseline", assets=(15, 25), edges=(25, 50), events=(100, 180), paths=(0, 0),
               decoy_factor=0.5, min_ev=1, alt=0.0, mid=(1, 2)),
    "S2": dict(name="direct_exposure", assets=(15, 25), edges=(30, 55), events=(100, 180), paths=(1, 2),
               decoy_factor=0.5, min_ev=1, alt=0.0, mid=(1, 2)),
    "S3": dict(name="multi_hop_compromise", assets=(20, 35), edges=(40, 75), events=(150, 250), paths=(1, 3),
               decoy_factor=0.5, min_ev=2, alt=0.0, mid=(2, 3)),
    "S4": dict(name="loud_decoy", assets=(20, 35), edges=(40, 75), events=(150, 250), paths=(1, 3),
               decoy_factor=2.0, min_ev=1, alt=0.0, mid=(1, 3)),
    "S5": dict(name="alternate_routes", assets=(25, 40), edges=(55, 100), events=(180, 300), paths=(2, 5),
               decoy_factor=1.0, min_ev=1, alt=0.4, mid=(1, 3)),
    "S6": dict(name="intervention_what_if", assets=(25, 40), edges=(55, 100), events=(180, 300), paths=(2, 5),
               decoy_factor=1.0, min_ev=1, alt=0.4, mid=(1, 3)),
}

IDENT = {"user_identity", "privileged_identity", "cloud_identity"}
HOSTLIKE = {"endpoint", "server", "application"}
ZONES = ["external", "dmz", "corporate", "server", "restricted"]

ASSET_PROPS = {
    "user_identity": 0.15, "privileged_identity": 0.08, "endpoint": 0.20, "server": 0.18,
    "application": 0.12, "database": 0.10, "cloud_identity": 0.07,
    "security_infrastructure": 0.05, "external_entry": 0.05,
}
MIN_COUNT = {"user_identity": 1, "privileged_identity": 2, "endpoint": 2, "server": 2, "application": 2,
             "database": 1, "external_entry": 1, "cloud_identity": 0, "security_infrastructure": 0}
PREFIX = {"user_identity": "identity", "privileged_identity": "identity_admin", "endpoint": "host",
          "server": "server", "application": "app", "database": "db", "cloud_identity": "cloud_identity",
          "security_infrastructure": "security_gateway", "external_entry": "external_entry"}
CONTROL_POOL = {
    "endpoint": ["edr", "mfa", "disk_encryption", "patch_management"],
    "server": ["network_acl", "edr", "audit_logging", "patch_management"],
    "application": ["waf", "rbac", "audit_logging", "rate_limiting"],
    "database": ["network_acl", "encryption_at_rest", "audit_logging", "rbac"],
    "user_identity": ["mfa", "conditional_access"],
    "privileged_identity": ["mfa", "conditional_access", "just_in_time_access"],
    "cloud_identity": ["rbac", "key_rotation"],
    "security_infrastructure": ["audit_logging", "network_acl"],
    "external_entry": ["waf", "rate_limiting"],
}
SYL = ["ka", "ro", "mi", "tel", "vor", "an", "li", "su", "dre", "pa", "zen", "qui", "tho", "bra", "fel",
       "mar", "nox", "ul", "yer", "ish"]

BASIS_RANGES = {"configured": (0.70, 0.95), "inferred": (0.25, 0.60), "weak": (0.10, 0.30),
                "unsupported": (0.02, 0.10)}

INT_TYPES = {
    "restrict_permission": ("Restrict unnecessary permission", (1, 3)),
    "tighten_network_rule": ("Tighten network rule", (2, 5)),
    "enforce_strong_auth": ("Enforce stronger authentication", (3, 6)),
    "isolate_endpoint": ("Isolate endpoint", (4, 8)),
    "replace_shared_identity": ("Replace shared identity", (5, 10)),
    "reconfigure_service": ("Reconfigure critical service", (6, 12)),
}

REL_EVENT_TYPES = {
    "NETWORK_REACHABILITY": ["connection_observed", "port_exposure_change", "service_exposed",
                             "unusual_request_rate", "vulnerability_detected", "suspicious_process"],
    "AUTHENTICATES_TO": ["login_success", "authentication_anomaly", "login_failure", "suspicious_process"],
    "CAN_ASSUME_IDENTITY": ["token_issued", "authentication_anomaly", "secret_exposure_detected",
                            "role_assigned"],
    "HAS_PRIVILEGE": ["privilege_change", "role_assigned", "token_issued"],
    "CAN_ACCESS_DATA": ["database_read", "sensitive_resource_access", "api_access"],
    "DEPLOYS_TO": ["api_access", "service_error", "connection_observed"],
    "TRUSTS_SERVICE": ["token_issued", "api_access", "connection_observed"],
    "ADMINISTERS": ["admin_login", "policy_changed"],
    "CAN_MODIFY_CONFIGURATION": ["policy_changed", "acl_updated", "privilege_change"],
}
BENIGN_TYPE = {
    "NETWORK_REACHABILITY": ["connection_observed"], "AUTHENTICATES_TO": ["login_success"],
    "CAN_ASSUME_IDENTITY": ["token_issued"], "HAS_PRIVILEGE": ["token_issued"],
    "CAN_ACCESS_DATA": ["database_read", "api_access", "sensitive_resource_access"],
    "DEPLOYS_TO": ["api_access", "connection_observed"],
    "TRUSTS_SERVICE": ["api_access", "token_issued"], "ADMINISTERS": ["admin_login"],
    "CAN_MODIFY_CONFIGURATION": ["policy_changed"],
}
SOURCE_FOR_TYPE = {
    "login_success": ["synthetic_idp_logs"], "login_failure": ["synthetic_idp_logs"],
    "authentication_anomaly": ["synthetic_idp_logs", "synthetic_cloud_audit"],
    "admin_login": ["synthetic_idp_logs", "synthetic_cloud_audit"], "mfa_challenge": ["synthetic_idp_logs"],
    "token_issued": ["synthetic_cloud_audit", "synthetic_idp_logs"], "role_assigned": ["synthetic_cloud_audit"],
    "privilege_change": ["synthetic_cloud_audit", "synthetic_idp_logs"],
    "connection_observed": ["synthetic_netflow"], "connection_denied": ["synthetic_netflow"],
    "port_exposure_change": ["synthetic_netflow", "synthetic_vuln_scan"],
    "service_exposed": ["synthetic_cloud_audit", "synthetic_vuln_scan"],
    "api_access": ["synthetic_api_gateway"], "unusual_request_rate": ["synthetic_api_gateway", "synthetic_netflow"],
    "service_error": ["synthetic_api_gateway"], "policy_changed": ["synthetic_cloud_audit"],
    "acl_updated": ["synthetic_cloud_audit"], "policy_enforced": ["synthetic_cloud_audit"],
    "access_blocked": ["synthetic_cloud_audit", "synthetic_api_gateway"],
    "database_read": ["synthetic_cloud_audit", "synthetic_api_gateway"],
    "sensitive_resource_access": ["synthetic_cloud_audit"], "health_check": ["synthetic_api_gateway"],
    "malware_detected": ["synthetic_edr"], "suspicious_process": ["synthetic_edr"],
    "secret_exposure_detected": ["synthetic_secret_scan"], "vulnerability_detected": ["synthetic_vuln_scan"],
}
SOURCE_RELIABILITY = {"synthetic_idp_logs": 0.90, "synthetic_cloud_audit": 0.95, "synthetic_edr": 0.85,
                      "synthetic_secret_scan": 0.80, "synthetic_vuln_scan": 0.75, "synthetic_netflow": 0.70,
                      "synthetic_api_gateway": 0.80}
COLLECTION_METHOD = {"synthetic_idp_logs": "log_forwarder", "synthetic_cloud_audit": "api_pull",
                     "synthetic_edr": "agent", "synthetic_secret_scan": "scanner",
                     "synthetic_vuln_scan": "scanner", "synthetic_netflow": "flow_export",
                     "synthetic_api_gateway": "log_forwarder"}
SEV_ORDER = ["low", "medium", "high", "critical"]
SEV_BY_CLASS = {
    "relevant": (["low", "medium", "high"], [0.50, 0.35, 0.15]),
    "ambiguous": (["low", "medium", "high"], [0.40, 0.40, 0.20]),
    "benign": (["low", "medium"], [0.90, 0.10]),
    "decoy": (["high", "critical"], [0.60, 0.40]),
    "defensive": (["low", "medium"], [0.70, 0.30]),
    "other": (["low", "medium"], [0.80, 0.20]),
}
# STRIDE / ATT&CK candidates. Technique IDs are written from memory: VERIFY against the official
# ATT&CK release you pin before quoting them (attack_version is left "UNPINNED" on purpose).
MAPPING = {
    "login_failure": (["Spoofing"], [("T1110", 0.50)]),
    "authentication_anomaly": (["Spoofing"], [("T1078", 0.65)]),
    "token_issued": (["Elevation of Privilege", "Spoofing"], [("T1078", 0.40)]),
    "privilege_change": (["Elevation of Privilege"], [("T1098", 0.60)]),
    "role_assigned": (["Elevation of Privilege"], [("T1098", 0.50)]),
    "database_read": (["Information Disclosure"], [("T1213", 0.40)]),
    "sensitive_resource_access": (["Information Disclosure"], [("T1213", 0.40)]),
    "port_exposure_change": (["Information Disclosure"], [("T1190", 0.30)]),
    "service_exposed": (["Information Disclosure"], [("T1190", 0.35)]),
    "unusual_request_rate": (["Denial of Service"], [("T1190", 0.25)]),
    "vulnerability_detected": (["Tampering"], [("T1190", 0.30)]),
    "malware_detected": (["Tampering"], []),
    "suspicious_process": (["Elevation of Privilege"], [("T1059", 0.40)]),
    "secret_exposure_detected": (["Information Disclosure"], [("T1552", 0.60)]),
    "policy_changed": (["Tampering"], [("T1562", 0.20)]),
    "acl_updated": (["Tampering"], [("T1562", 0.20)]),
}
ROLES = ["reader", "operator", "deployer", "data_reader", "secrets_reader", "admin"]
PORTS = [22, 80, 443, 1433, 3306, 5432, 8080, 8443]
GEOS = ["XA", "XB", "XC", "XD"]            # ISO user-assigned (reserved) codes, clearly synthetic
UAS = ["synthetic-agent/1.0", "synthetic-browser/2.1", "synthetic-cli/0.9", "synthetic-sdk/3.2"]

FORBIDDEN_KEYS = {"exists_in_ground_truth", "exploitable_in_scenario", "ground_truth_effect", "event_class",
                  "structural_truth", "feasible_in_scenario", "observable_from_telemetry",
                  "supporting_event_ids", "evidence_polarity", "template_id"}
FORBIDDEN_TOKENS = ["decoy", "benign", "unrelated", "ground_truth", "exploitable", "relevant_evidence"]


# ----------------------------------------------------------------------------------------------
# utilities
# ----------------------------------------------------------------------------------------------
def seeded_rng(*parts):
    h = hashlib.sha256("|".join(str(p) for p in parts).encode()).digest()
    return random.Random(int.from_bytes(h[:8], "big"))


def clip(x, lo, hi):
    return max(lo, min(hi, x))


def largest_remainder(total, weights):
    s = float(sum(weights.values()))
    raw = {k: total * v / s for k, v in weights.items()}
    counts = {k: int(math.floor(x)) for k, x in raw.items()}
    rem = total - sum(counts.values())
    for k in sorted(raw, key=lambda k: (raw[k] - counts[k]), reverse=True)[:rem]:
        counts[k] += 1
    return counts


def jdump(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))


def write_jsonl(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        for r in rows:
            f.write(jdump(r) + "\n")


def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


# ----------------------------------------------------------------------------------------------
# graph helpers
# ----------------------------------------------------------------------------------------------
def build_adj(edges):
    adj = defaultdict(list)
    for e in edges:
        if e["exists"] and e["exploitable"]:
            adj[e["source_id"]].append(e)
    return adj


def find_path(adj, srcs, dsts, designed_ids=None, max_hops=8):
    """First path src->dst; if designed_ids is given the path must use >=1 non-designed edge."""
    dsts = set(dsts)

    def dfs(node, visited, path, extra):
        if node in dsts and path:
            return list(path) if (designed_ids is None or extra) else None
        if len(path) >= max_hops:
            return None
        for e in adj.get(node, []):
            v = e["target_id"]
            if v in visited:
                continue
            visited.add(v)
            path.append(e)
            r = dfs(v, visited, path, extra or (designed_ids is not None and e["edge_id"] not in designed_ids))
            path.pop()
            visited.discard(v)
            if r:
                return r
        return None

    for s in srcs:
        r = dfs(s, {s}, [], False)
        if r:
            return r
    return None


def enumerate_paths(adj, srcs, dsts, max_hops=8, cap=200):
    dsts = set(dsts)
    out = []

    def dfs(node, visited, path):
        if len(out) >= cap:
            return
        if node in dsts and path:
            out.append(list(path))
            return
        if len(path) >= max_hops:
            return
        for e in adj.get(node, []):
            v = e["target_id"]
            if v in visited:
                continue
            visited.add(v)
            path.append(e)
            dfs(v, visited, path)
            path.pop()
            visited.discard(v)

    for s in srcs:
        dfs(s, {s}, [])
    return out


def plausible(a, b):
    ta, tb = a["asset_type"], b["asset_type"]
    if a is b or tb == "external_entry" or ta == "database":
        return False
    if ta == "external_entry":
        return tb in ("application", "server")
    if tb == "database":
        return ta in ("application", "server", "privileged_identity", "cloud_identity", "user_identity")
    if ta in IDENT:
        return tb in HOSTLIKE or tb in IDENT or tb == "security_infrastructure"
    if ta in HOSTLIKE:
        return tb in HOSTLIKE or tb in IDENT
    if ta == "security_infrastructure":
        return tb in HOSTLIKE
    return False


def pick_rel(u, v, rng):
    tu, tv = u["asset_type"], v["asset_type"]
    if tv == "database":
        return "CAN_ACCESS_DATA"
    if tu == "external_entry":
        return "NETWORK_REACHABILITY"
    if tv in IDENT:
        return "CAN_ASSUME_IDENTITY"
    if tu in IDENT:
        if tv in HOSTLIKE:
            return rng.choice(["AUTHENTICATES_TO", "HAS_PRIVILEGE"]) if tu == "privileged_identity" else "AUTHENTICATES_TO"
        if tv == "security_infrastructure":
            return rng.choice(["ADMINISTERS", "CAN_MODIFY_CONFIGURATION"])
    if tu == "security_infrastructure":
        return "TRUSTS_SERVICE"
    if tu == "application" and tv == "server":
        return rng.choice(["NETWORK_REACHABILITY", "DEPLOYS_TO", "TRUSTS_SERVICE"])
    return "NETWORK_REACHABILITY"


def new_edge(u, v, rng, exists, exploitable, designed):
    return {"source_id": u["asset_id"], "target_id": v["asset_id"], "relationship_type": pick_rel(u, v, rng),
            "exists": exists, "exploitable": exploitable, "designed": designed}


# ----------------------------------------------------------------------------------------------
# assets
# ----------------------------------------------------------------------------------------------
def synth_name(rng, used):
    while True:
        nm = "".join(rng.choice(SYL) for _ in range(2)) + "." + "".join(rng.choice(SYL) for _ in range(3))
        if nm not in used:
            used.add(nm)
            return nm


def zone_exposure(t, rng):
    if t == "external_entry":
        return "external", "public"
    if t == "application":
        z = rng.choice(["dmz", "dmz", "server"])
        return z, ("public" if z == "dmz" and rng.random() < 0.6 else "internal")
    if t == "server":
        return "server", ("public" if rng.random() < 0.1 else "internal")
    if t == "database":
        return "restricted", rng.choice(["restricted", "restricted", "isolated"])
    if t == "privileged_identity":
        return rng.choice(["corporate", "restricted"]), "internal"
    if t == "cloud_identity":
        return "server", "internal"
    if t == "security_infrastructure":
        return "dmz", "internal"
    return "corporate", "internal"


def create_assets(rng, n, scn_idx):
    counts = largest_remainder(n, ASSET_PROPS)
    for t, m in MIN_COUNT.items():
        while counts[t] < m:
            donor = max((k for k in counts if counts[k] > MIN_COUNT[k]),
                        key=lambda k: (counts[k] - MIN_COUNT[k], k))
            counts[donor] -= 1
            counts[t] += 1
    assets, used = [], set()
    zone_ctr = defaultdict(int)
    for t in ASSET_PROPS:
        for i in range(1, counts[t] + 1):
            aid = "%s_%03d" % (PREFIX[t], i)
            zone, exposure = zone_exposure(t, rng)
            if t == "database":
                crit = rng.choice([2, 3, 4])
            elif t == "privileged_identity":
                crit = rng.choice([3, 4])
            elif t in ("server", "application"):
                crit = rng.choice([2, 3, 4])
            elif t == "external_entry":
                crit = 1
            else:
                crit = rng.choice([1, 2, 3])
            pool = CONTROL_POOL[t]
            controls = sorted(rng.sample(pool, rng.randint(1, len(pool))))
            ti, tc, tcov = rng.uniform(0.5, 0.99), rng.uniform(0.5, 0.99), rng.uniform(0.1, 1.0)
            a = {
                "asset_id": aid, "asset_type": t, "zone": zone, "exposure": exposure, "criticality": crit,
                "security_controls": controls,
                "true_identity": ti, "true_config": tc, "true_coverage": tcov,
                "identity_confidence": round(clip(ti + rng.gauss(0, 0.08), 0.50, 0.99), 3),
                "configuration_confidence": round(clip(tc + rng.gauss(0, 0.08), 0.50, 0.99), 3),
                "evidence_coverage": round(clip(tcov + rng.gauss(0, 0.10), 0.10, 1.0), 3),
            }
            if t in IDENT:
                nm = synth_name(rng, used)
                dom = "svc.corp.example" if t == "cloud_identity" else "corp.example"
                a["display_name"], a["email"] = nm, "%s@%s" % (nm, dom)
            else:
                zone_ctr[zone] += 1
                if t == "external_entry":
                    ip = "203.0.113.%d" % (10 + zone_ctr[zone])
                else:
                    ip = "10.%d.%d.%d" % (scn_idx % 200, ZONES.index(zone), zone_ctr[zone])
                a["hostname"], a["ip_address"] = "%s-%03d.corp.example" % (PREFIX[t].replace("_", "-"), i), ip
            assets.append(a)
    return assets


# ----------------------------------------------------------------------------------------------
# world (twin + hidden truth) construction
# ----------------------------------------------------------------------------------------------
def choose_basis(exists, rng):
    if exists:
        return rng.choices(["configured", "inferred", "weak"], [0.55, 0.30, 0.15])[0]
    return rng.choices(["inferred", "weak", "unsupported"], [0.30, 0.40, 0.30])[0]


def build_interventions(rng, tpl_id, assets, edges, paths):
    existing = [e for e in edges if e["exists"]]
    path_sets = [set(p["edge_ids"]) for p in paths]
    groups, seen = [], set()

    def add(cat, es):
        sig = (cat, tuple(sorted(e["edge_id"] for e in es)))
        if es and sig not in seen:
            seen.add(sig)
            groups.append((cat, es))

    for e in existing:
        rt = e["relationship_type"]
        if rt in ("HAS_PRIVILEGE", "CAN_ACCESS_DATA", "CAN_MODIFY_CONFIGURATION"):
            add("restrict_permission", [e])
        if rt == "NETWORK_REACHABILITY":
            add("tighten_network_rule", [e])
        if rt in ("AUTHENTICATES_TO", "CAN_ASSUME_IDENTITY"):
            add("enforce_strong_auth", [e])
    for a in assets:
        outs = [e for e in existing if e["source_id"] == a["asset_id"]]
        ins = [e for e in existing if e["target_id"] == a["asset_id"]]
        if a["asset_type"] in ("endpoint", "server"):
            add("isolate_endpoint", outs)
        if a["asset_type"] in IDENT:
            add("replace_shared_identity", outs)
        if a["asset_type"] in ("application", "server"):
            add("reconfigure_service", ins)

    def cut(g):
        removed = set(e["edge_id"] for e in g[1])
        return sum(1 for ps in path_sets if ps & removed)

    full = [g for g in groups if paths and cut(g) == len(paths)]
    part = [g for g in groups if paths and 0 < cut(g) < len(paths)]
    none = [g for g in groups if cut(g) == 0]
    chosen = []
    n_int = 3 if tpl_id == "S1" else rng.randint(3, 6)

    def take(lst):
        lst = [g for g in lst if all(g is not c for c in chosen)]
        if lst:
            chosen.append(rng.choice(lst))

    if paths:
        if full and rng.random() < 0.85:
            take(full)
        take(part)
    take(none)
    while len(chosen) < n_int and len(chosen) < len(groups):
        take(groups)
    rng.shuffle(chosen)

    ints = []
    for k, (cat, es) in enumerate(chosen):
        label, (lo, hi) = INT_TYPES[cat]
        if cat in ("isolate_endpoint", "replace_shared_identity"):
            name = "%s: %s" % (label, es[0]["source_id"])
        elif cat == "reconfigure_service":
            name = "%s: %s" % (label, es[0]["target_id"])
        else:
            name = "%s: %s -> %s" % (label, es[0]["source_id"], es[0]["target_id"])
        nodes = sorted(set([x["source_id"] for x in es] + [x["target_id"] for x in es]))[:3]
        side = []
        for _ in range(rng.choice([0, 1, 1, 2])):
            side.append({"type": rng.choice(["availability", "productivity", "compliance", "operational_overhead"]),
                         "severity": rng.choice(["low", "medium", "high"]),
                         "affected_asset_ids": nodes})
        cost = rng.randint(lo, hi)
        ints.append({"intervention_id": "fix_%03d" % (k + 1), "category": cat, "name": name,
                     "cost_units": cost, "edge_ids": sorted(e["edge_id"] for e in es),
                     "side_effects": side, "requires_approval": cost >= 4})
    return ints


def compute_outcomes(paths, ints):
    n = len(ints)
    pe = [set(p["edge_ids"]) for p in paths]
    subsets = []
    for mask in range(1 << n):
        chosen = [i for i in range(n) if (mask >> i) & 1]
        removed = set()
        for i in chosen:
            removed |= set(ints[i]["edge_ids"])
        remaining = [p["path_id"] for p, s in zip(paths, pe) if not (s & removed)]
        subsets.append({"intervention_ids": [ints[i]["intervention_id"] for i in chosen],
                        "total_cost": sum(ints[i]["cost_units"] for i in chosen),
                        "remaining_path_ids": remaining,
                        "paths_removed": len(paths) - len(remaining),
                        "all_paths_cut": bool(paths) and len(remaining) == 0})
    cuts = [s for s in subsets if s["all_paths_cut"]]
    best = min((s["total_cost"] for s in cuts), default=None)
    optimal = [s["intervention_ids"] for s in cuts if s["total_cost"] == best]
    frontier, best_removed = [], -1
    for s in sorted(subsets, key=lambda s: (s["total_cost"], -s["paths_removed"])):
        if s["paths_removed"] > best_removed:
            frontier.append({"total_cost": s["total_cost"], "paths_removed": s["paths_removed"],
                             "intervention_ids": s["intervention_ids"]})
            best_removed = s["paths_removed"]
    return {"n_feasible_paths": len(paths), "subsets": subsets, "min_cost_to_cut_all": best,
            "optimal_complete_cuts": optimal, "pareto_frontier": frontier}


def build_what_ifs(rng, assets, edges, paths, ints, entries, target):
    cands = [i for i in ints if any(set(i["edge_ids"]) & set(p["edge_ids"]) for p in paths)]
    if not cands:
        return None, []
    dep = rng.choice(cands)
    removed = set(dep["edge_ids"])
    post = [dict(e, exploitable=(e["exploitable"] and e["edge_id"] not in removed)) for e in edges]
    ent = [a["asset_id"] for a in entries]
    flips = [e for e in post if e["exists"] and not e["exploitable"] and e["edge_id"] not in removed]
    rng.shuffle(flips)
    restoring, non_restoring = None, None
    for e in flips[:60]:
        trial = [dict(x, exploitable=True) if x["edge_id"] == e["edge_id"] else x for x in post]
        newp = [p for p in enumerate_paths(build_adj(trial), ent, [target["asset_id"]])
                if any(x["edge_id"] == e["edge_id"] for x in p)]
        if newp and restoring is None:
            restoring = (e, newp)
        if not newp and non_restoring is None:
            non_restoring = (e, [])
        if restoring and non_restoring:
            break
    out = []
    if restoring:
        e, newp = restoring
        out.append(({"op": "enable_relationship", "edge_id": e["edge_id"]},
                    {"creates_feasible_route": True, "new_path_edge_lists": [[x["edge_id"] for x in p] for p in newp]}))
    else:  # try adding a brand-new relationship
        amap = {a["asset_id"]: a for a in assets}
        keys = set((e["source_id"], e["target_id"]) for e in edges)
        cand_pairs = [(u, v) for u in assets for v in assets
                      if (u["asset_id"], v["asset_id"]) not in keys and plausible(u, v)]
        rng.shuffle(cand_pairs)
        for u, v in cand_pairs[:300]:
            ne = {"edge_id": "edge_new", "source_id": u["asset_id"], "target_id": v["asset_id"],
                  "relationship_type": pick_rel(u, v, rng), "exists": True, "exploitable": True}
            newp = [p for p in enumerate_paths(build_adj(post + [ne]), ent, [target["asset_id"]])
                    if any(x["edge_id"] == "edge_new" for x in p)]
            if newp:
                out.append(({"op": "add_relationship", "source_id": ne["source_id"], "target_id": ne["target_id"],
                             "relationship_type": ne["relationship_type"]},
                            {"creates_feasible_route": True,
                             "new_path_edge_lists": [[x["edge_id"] for x in p] for p in newp]}))
                break
    if non_restoring:
        out.append(({"op": "enable_relationship", "edge_id": non_restoring[0]["edge_id"]},
                    {"creates_feasible_route": False, "new_path_edge_lists": []}))
    what_ifs = []
    for k, (chg, truth) in enumerate(out):
        what_ifs.append({"what_if_id": "whatif_%02d" % (k + 1), "base_graph_version": "v1_baseline",
                         "apply_interventions": [dep["intervention_id"]], "change": chg,
                         "result_graph_version": "v3_hypothetical", "truth": truth})
    return dep, what_ifs


def try_build_world(rng, tpl_id, tpl, cfg, scn_idx):
    assets = create_assets(rng, rng.randint(*tpl["assets"]), scn_idx)
    by = defaultdict(list)
    for a in assets:
        by[a["asset_type"]].append(a)
    target = rng.choice(by["database"])
    for d in by["database"]:
        d["criticality"] = 5 if d is target else rng.choice([2, 3, 4])
    entries = by["external_entry"]
    n_decoy = 2 if (tpl_id == "S4" and len(by["endpoint"]) >= 3) else 1
    decoys = rng.sample(by["endpoint"], n_decoy)
    decoy_ids = [d["asset_id"] for d in decoys]

    idents = by["user_identity"] + by["privileged_identity"]
    collision = []
    if len(idents) >= 2 and rng.random() < 0.4:
        a, b = rng.sample(idents, 2)
        local = a["display_name"]
        b["display_name"] = local
        a["email"], b["email"] = "%s@corp.example" % local, "%s@contractor.example" % local
        collision = [a["asset_id"], b["asset_id"]]

    edges_map, node_paths = {}, []
    n_target_paths = rng.randint(*tpl["paths"])
    if n_target_paths > 0:
        apps = by["application"]
        privs = by["privileged_identity"] + by["cloud_identity"]
        pool = [a for a in by["server"] + by["endpoint"] if a not in decoys]
        p0 = rng.choice(privs)
        tries = 0
        while len(node_paths) < n_target_paths and tries < 80:
            tries += 1
            k = rng.randint(*tpl["mid"])
            entry, app = rng.choice(entries), rng.choice(apps)
            extra = rng.sample(pool, min(max(k - 1, 0), len(pool)))
            p = p0
            if tpl["alt"] > 0 and len(privs) > 1 and rng.random() < tpl["alt"]:
                p = rng.choice([x for x in privs if x is not p0])
            nodes = [entry, app] + extra + [p, target]
            ids = tuple(n["asset_id"] for n in nodes)
            if len(set(ids)) != len(ids) or ids in [tuple(x["asset_id"] for x in q) for q in node_paths]:
                continue
            node_paths.append(nodes)
        if not node_paths:
            return None
    for nodes in node_paths:
        for u, v in zip(nodes, nodes[1:]):
            key = (u["asset_id"], v["asset_id"])
            if key not in edges_map:
                edges_map[key] = new_edge(u, v, rng, True, True, True)
    n_designed = len(edges_map)

    pairs = []
    for u in assets:
        for v in assets:
            if (u["asset_id"], v["asset_id"]) in edges_map or not plausible(u, v):
                continue
            zd = abs(ZONES.index(u["zone"]) - ZONES.index(v["zone"]))
            wgt = 3.0 if zd <= 1 else 1.0
            pairs.append((rng.random() ** (1.0 / wgt), u, v))
    pairs.sort(key=lambda x: -x[0])
    n_bg = max(6, rng.randint(*tpl["edges"]) - n_designed)
    for _, u, v in pairs[:n_bg]:
        r = rng.random()
        ex, xp = (False, False) if r < 0.25 else ((True, False) if r < 0.45 else (True, True))
        edges_map[(u["asset_id"], v["asset_id"])] = new_edge(u, v, rng, ex, xp, False)

    edges = list(edges_map.values())
    rng.shuffle(edges)                       # edge ids must not reveal which edges were designed
    for i, e in enumerate(edges):
        e["edge_id"] = "edge_%03d" % (i + 1)
    designed_ids = set(e["edge_id"] for e in edges if e["designed"])
    ent_ids = [a["asset_id"] for a in entries]
    tgt = target["asset_id"]

    for _ in range(5000):                    # no accidental extra routes; decoys can never reach the target
        adj = build_adj(edges)
        p = find_path(adj, ent_ids, [tgt], designed_ids)
        if p is None:
            for d in decoy_ids:
                p = find_path(adj, [d], [tgt], None)
                if p:
                    break
        if p is None:
            break
        cand = [e for e in p if e["edge_id"] not in designed_ids]
        rng.choice(cand)["exploitable"] = False

    for e in edges:
        e["basis"] = choose_basis(e["exists"], rng)
        lo, hi = BASIS_RANGES[e["basis"]]
        e["prior"] = round(rng.uniform(lo, hi), 3)

    raw_paths = enumerate_paths(build_adj(edges), ent_ids, [tgt])
    if not (tpl["paths"][0] <= len(raw_paths) <= tpl["paths"][1]):
        return None
    raw_paths.sort(key=lambda p: (len(p), [e["edge_id"] for e in p]))
    paths = []
    for i, p in enumerate(raw_paths):
        paths.append({"path_id": "path_%02d" % (i + 1), "edge_ids": [e["edge_id"] for e in p],
                      "node_ids": [p[0]["source_id"]] + [e["target_id"] for e in p]})

    ints = build_interventions(rng, tpl_id, assets, edges, paths)
    outcomes = compute_outcomes(paths, ints)
    deployed, what_ifs, surviving = None, [], []
    if tpl_id == "S6":
        deployed, what_ifs = build_what_ifs(rng, assets, edges, paths, ints, entries, target)
        if deployed is None:
            return None
        rem = set(deployed["edge_ids"])
        surviving = sorted(set(eid for p in paths if not (set(p["edge_ids"]) & rem) for eid in p["edge_ids"]))
    return {"assets": assets, "asset_map": {a["asset_id"]: a for a in assets}, "edges": edges, "paths": paths,
            "entries": ent_ids, "target": tgt, "decoy_ids": decoy_ids, "collision": collision,
            "interventions": ints, "outcomes": outcomes, "deployed": deployed, "what_ifs": what_ifs,
            "surviving_edge_ids": surviving}


def build_world(master, tpl_id, replica, cfg, scn_idx):
    tpl = TEMPLATES[tpl_id]
    for attempt in range(80):
        rng = seeded_rng(master, "world", tpl_id, replica, attempt)
        w = try_build_world(rng, tpl_id, tpl, cfg, scn_idx)
        if w is not None:
            w["attempt"] = attempt
            return w
    raise RuntimeError("could not build world for %s replica %d" % (tpl_id, replica))


# ----------------------------------------------------------------------------------------------
# telemetry
# ----------------------------------------------------------------------------------------------
def ext_ip(rng):
    return "%s.%d" % (rng.choice(["192.0.2", "198.51.100", "203.0.113"]), rng.randint(1, 254))


def int_ip(rng):
    return "10.%d.%d.%d" % (rng.randint(0, 5), rng.randint(0, 4), rng.randint(1, 40))


def make_fields(et, s, rng):
    A = lambda p: rng.random() < p  # noqa: E731
    asn, geo = rng.randint(64512, 65534), rng.choice(GEOS)
    if et == "login_success":
        return {"src_ip": ext_ip(rng) if A(0.3 + 0.4 * s) else int_ip(rng), "asn": asn, "geo": geo,
                "new_source_for_identity": A(0.05 + 0.6 * s), "mfa_used": A(0.9 - 0.5 * s),
                "user_agent": rng.choice(UAS)}
    if et == "login_failure":
        return {"failed_attempts": 1 + int(rng.random() * (2 + 8 * s)), "src_ip": ext_ip(rng), "asn": asn,
                "geo": geo, "user_agent": rng.choice(UAS)}
    if et == "authentication_anomaly":
        return {"failed_attempts": int(rng.random() * (3 + 6 * s)), "success_after_failures": A(0.1 + 0.6 * s),
                "new_source_for_identity": A(0.15 + 0.6 * s), "src_ip": ext_ip(rng), "asn": asn, "geo": geo}
    if et == "token_issued":
        return {"token_type": rng.choice(["session", "service", "federated"]),
                "scope_count": 1 + int(rng.random() * (3 + 10 * s)), "ttl_minutes": rng.choice([15, 60, 480, 1440])}
    if et == "role_assigned":
        return {"role_name": rng.choice(ROLES), "assigned_by_known_admin": A(0.9 - 0.5 * s)}
    if et == "privilege_change":
        return {"previous_role": rng.choice(ROLES[:3]), "new_role": rng.choice(ROLES[2:]),
                "privilege_delta": int(rng.random() * (2 + 8 * s))}
    if et == "connection_observed":
        return {"dst_port": rng.choice(PORTS), "protocol": "tcp", "bytes_out": int(10 ** rng.uniform(2, 4 + 2.5 * s)),
                "first_seen_pair": A(0.05 + 0.6 * s)}
    if et == "connection_denied":
        return {"dst_port": rng.choice(PORTS), "protocol": "tcp", "rule_id": "acl_%02d" % rng.randint(1, 30)}
    if et == "port_exposure_change":
        return {"port": rng.choice(PORTS), "exposure": "public" if A(0.2 + 0.6 * s) else "internal"}
    if et == "service_exposed":
        return {"service_port": rng.choice(PORTS), "exposure_scope": "public" if A(0.2 + 0.6 * s) else "internal"}
    if et == "vulnerability_detected":
        return {"finding_id": "SYN-VULN-2026-%04d" % rng.randint(1, 400), "exploit_available": A(0.1 + 0.6 * s)}
    if et == "api_access":
        return {"endpoint_class": rng.choice(["read", "write", "admin"]),
                "status_code": rng.choice([200, 200, 200, 201, 401, 403, 500]),
                "request_count": 1 + int(rng.random() * (5 + 50 * s))}
    if et == "unusual_request_rate":
        return {"requests_per_min": int(50 + rng.random() * (200 + 3000 * s)), "baseline_per_min": int(rng.uniform(30, 120))}
    if et == "service_error":
        return {"error_class": rng.choice(["timeout", "5xx", "dependency_failure"]), "count": 1 + int(rng.random() * 5)}
    if et == "database_read":
        return {"rows_read": int(10 ** rng.uniform(1, 3 + 3 * s)), "query_class": "bulk" if A(0.1 + 0.6 * s) else "point",
                "first_access_by_principal": A(0.05 + 0.6 * s)}
    if et == "sensitive_resource_access":
        return {"resource_class": rng.choice(["customer_records", "signing_material", "config_store"]),
                "first_access_by_principal": A(0.05 + 0.6 * s)}
    if et == "policy_changed":
        return {"policy_area": rng.choice(["iam", "network", "logging"]),
                "change_type": rng.choice(["tightened", "loosened", "modified"])}
    if et == "acl_updated":
        return {"rule_count_delta": rng.randint(-3, 3)}
    if et == "mfa_challenge":
        return {"result": rng.choice(["passed", "passed", "failed"])}
    if et == "access_blocked":
        return {"reason": rng.choice(["policy", "acl", "mfa_required"])}
    if et == "policy_enforced":
        return {"policy_area": rng.choice(["iam", "network", "logging"])}
    if et == "health_check":
        return {"status": "ok", "latency_ms": int(rng.uniform(5, 80))}
    if et == "admin_login":
        return {"maintenance_window": A(0.85 - 0.6 * s), "src_ip": int_ip(rng), "mfa_used": A(0.95 - 0.4 * s)}
    if et == "malware_detected":
        return {"detection_name": "SYN-MAL-%03d" % rng.randint(1, 60), "action": rng.choice(["alerted", "quarantined"])}
    if et == "suspicious_process":
        return {"process_name": "synproc_%02d" % rng.randint(1, 40), "parent_process": "synparent_%02d" % rng.randint(1, 15),
                "signed": A(0.3)}
    if et == "secret_exposure_detected":
        return {"secret_type": rng.choice(["api_key", "service_token", "db_credential"]),
                "location": rng.choice(["public_repository", "paste_site", "build_log"]),
                "validated_active": A(0.2 + 0.6 * s)}
    return {}


def encode_sev(source, sev, rng):
    if source == "synthetic_idp_logs":
        return {"low": "info", "medium": "warn", "high": "alert", "critical": "critical"}[sev]
    if source == "synthetic_cloud_audit":
        return sev.upper()
    if source == "synthetic_api_gateway":
        return {"low": "notice", "medium": "warning", "high": "error", "critical": "critical"}[sev]
    if source == "synthetic_secret_scan":
        return {"low": "low", "medium": "medium", "high": "high", "critical": "high"}[sev]
    if source == "synthetic_edr":
        lo, hi = {"low": (1, 3), "medium": (4, 6), "high": (7, 8), "critical": (9, 10)}[sev]
        return rng.randint(lo, hi)
    if source == "synthetic_vuln_scan":
        lo, hi = {"low": (0.1, 3.9), "medium": (4.0, 6.9), "high": (7.0, 8.9), "critical": (9.0, 10.0)}[sev]
        return round(rng.uniform(lo, hi), 1)
    return None  # netflow carries no severity


def decode_sev(source, raw):
    if source == "synthetic_idp_logs":
        return {"info": "low", "warn": "medium", "alert": "high", "critical": "critical"}[raw]
    if source == "synthetic_cloud_audit":
        return raw.lower()
    if source == "synthetic_api_gateway":
        return {"notice": "low", "warning": "medium", "error": "high", "critical": "critical"}[raw]
    if source == "synthetic_secret_scan":
        return raw
    if source == "synthetic_edr":
        return "low" if raw <= 3 else "medium" if raw <= 6 else "high" if raw <= 8 else "critical"
    if source == "synthetic_vuln_scan":
        return "low" if raw < 4 else "medium" if raw < 7 else "high" if raw < 9 else "critical"
    return "low"


def fmt_ts(source, dt):
    if source == "synthetic_netflow":
        return int(dt.timestamp())
    if source == "synthetic_api_gateway":
        return int(dt.timestamp()) * 1000
    if source == "synthetic_edr":
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    return iso(dt)


def parse_ts(source, raw):
    if source == "synthetic_netflow":
        return datetime.fromtimestamp(raw, tz=timezone.utc)
    if source == "synthetic_api_gateway":
        return datetime.fromtimestamp(raw // 1000, tz=timezone.utc)
    if source == "synthetic_edr":
        return datetime.strptime(raw, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return datetime.strptime(raw, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def raw_ref(asset, rng, cfg, collision_ids):
    if asset is None:
        return None, False
    if rng.random() >= cfg["alias_rate"]:
        return asset["asset_id"], False
    if asset["asset_type"] in IDENT:
        forms = [asset["display_name"], asset["email"], asset["display_name"].upper()]
    else:
        forms = [asset["hostname"], asset["ip_address"], asset["hostname"].upper()]
    idx = rng.randrange(3)
    return forms[idx], (asset["asset_id"] in collision_ids and idx in (0, 2))


def generate_events(rng, tpl_id, tpl, cfg, w, t0):
    diff = DIFFICULTY[cfg["difficulty"]]
    W = cfg["window_hours"]
    A, edges = w["asset_map"], w["edges"]
    E = {e["edge_id"]: e for e in edges}
    paths = w["paths"]
    has_attack = bool(paths)

    def mk(h, et, src, dst, cls, s, polarity=0, supports=None, against=None, tags=None, source=None):
        h = clip(h, 0.25, W - 0.25)
        ts = t0 + timedelta(seconds=int(h * 3600))
        source = source or rng.choice(SOURCE_FOR_TYPE[et])
        sev_c = rng.choices(*SEV_BY_CLASS[cls])[0]
        if et == "health_check":
            sev_c = "low"
        raw_sev = encode_sev(source, sev_c, rng)
        fields = make_fields(et, s, rng)
        if source == "synthetic_vuln_scan":
            fields["cvss_like"] = raw_sev
        return {"ts": ts, "event_type": et, "source": source, "src": src, "dst": dst, "class": cls,
                "severity_raw": raw_sev, "severity": decode_sev(source, raw_sev), "fields": fields,
                "polarity": polarity, "supports": supports or [], "against": against or [],
                "tags": tags or {}, "strength": round(s, 3), "duplicate_of": None}

    def diurnal(lo, hi):
        while True:
            h = rng.uniform(lo * W, hi * W)
            hour = (t0 + timedelta(hours=h)).hour
            if rng.random() < (1.0 if 8 <= hour < 19 else 0.4):
                return h

    N = rng.randint(*tpl["events"])
    dup_n = int(round(cfg["duplicate_rate"] * N))
    base_n = N - dup_n
    wts = {"relevant": 0.25 if has_attack else 0.0, "benign": 0.35, "ambiguous": cfg["noise_pct"],
           "decoy": cfg["decoy_pct"] * tpl["decoy_factor"], "defensive": 0.10, "other": 0.05}
    counts = largest_remainder(base_n, {k: v for k, v in wts.items() if v > 0})
    for k in wts:
        counts.setdefault(k, 0)

    path_edge_ids = sorted(set(eid for p in paths for eid in p["edge_ids"]))
    depth = {}
    for p in paths:
        for d, eid in enumerate(p["edge_ids"]):
            depth[eid] = min(depth.get(eid, 99), d)
    lmax = max([len(p["edge_ids"]) for p in paths] or [1])
    through = Counter(eid for p in paths for eid in p["edge_ids"])
    obs = [eid for eid in path_edge_ids if rng.random() < diff["p_obs"]]
    if has_attack:
        floor = 2 if tpl_id == "S3" else 1
        hidden = [e for e in path_edge_ids if e not in obs]
        while len(obs) < floor and hidden:
            obs.append(hidden.pop(rng.randrange(len(hidden))))
    obs = sorted(obs)

    evs = []
    # ---- relevant evidence along true paths ----------------------------------------------------
    if has_attack:
        need = len(obs) * tpl["min_ev"]
        if counts["relevant"] < need:
            counts["benign"] -= need - counts["relevant"]
            counts["relevant"] = need
        alloc = {eid: tpl["min_ev"] for eid in obs}
        for _ in range(counts["relevant"] - need):
            alloc[rng.choices(obs, weights=[1 + through[x] for x in obs])[0]] += 1
        f0 = rng.uniform(0.20, 0.30)
        tfrac = {eid: f0 + (0.78 - f0) * (depth[eid] + rng.random()) / lmax for eid in obs}
        for eid in obs:
            e = E[eid]
            for _ in range(alloc[eid]):
                et = rng.choice(REL_EVENT_TYPES[e["relationship_type"]])
                s = rng.betavariate(4, 3)
                h = tfrac[eid] * W + rng.gauss(0, diff["ooo_sigma_h"]) + rng.uniform(0, 6)
                stale = rng.random() < diff["stale"]
                if stale:
                    h -= cfg["tau_hours"] * rng.uniform(1, 2)
                if tpl_id == "S6":
                    if eid in w["surviving_edge_ids"] and rng.random() < 0.3:
                        h = rng.uniform(0.90 * W, 0.98 * W)
                    elif eid not in w["surviving_edge_ids"]:
                        h = min(h, 0.79 * W)
                evs.append(mk(h, et, e["source_id"], e["target_id"], "relevant", s, +1, supports=[eid],
                              tags={"stale": stale}))

    # ---- ambiguous -----------------------------------------------------------------------------
    path_set = set(path_edge_ids)
    nonpath = [e for e in edges if e["edge_id"] not in path_set]
    path_nodes = set(n for p in paths for n in p["node_ids"])
    touching = [e for e in nonpath if e["source_id"] in path_nodes or e["target_id"] in path_nodes]
    for _ in range(counts["ambiguous"]):
        pool = touching if (touching and rng.random() < 0.35) else nonpath
        e = rng.choice(pool)
        et = rng.choice(REL_EVENT_TYPES[e["relationship_type"]])
        evs.append(mk(diurnal(0.05, 0.95), et, e["source_id"], e["target_id"], "ambiguous", rng.betavariate(3, 3),
                      tags={"cause": "touches_path_entity" if e in touching else "isolated_anomaly"}))

    # ---- benign --------------------------------------------------------------------------------
    existing = [e for e in edges if e["exists"]]
    path_existing = [e for e in existing if e["edge_id"] in path_set]
    privs = [a for a in w["assets"] if a["asset_type"] == "privileged_identity"]
    hosts = [a for a in w["assets"] if a["asset_type"] in HOSTLIKE]
    wcov = lambda lst: rng.choices(lst, weights=[0.3 + a["true_coverage"] for a in lst])[0]  # noqa: E731
    for _ in range(counts["benign"]):
        r = rng.random()
        if r < 0.15:
            a = wcov(hosts)
            evs.append(mk(diurnal(0, 1), "health_check", a["asset_id"], None, "benign", rng.betavariate(1.5, 8)))
        elif r < 0.25 and privs:
            a = wcov(privs)
            evs.append(mk(diurnal(0, 1), "admin_login", a["asset_id"], rng.choice(hosts)["asset_id"], "benign",
                          rng.betavariate(1.5, 8)))
        else:
            e = rng.choice(path_existing) if (path_existing and rng.random() < 0.12) else rng.choice(existing)
            et = rng.choice(BENIGN_TYPE[e["relationship_type"]])
            evs.append(mk(diurnal(0, 1), et, e["source_id"], e["target_id"], "benign", rng.betavariate(1.5, 8)))

    # ---- decoys (loud, structurally unrelated) -----------------------------------------------------
    for _ in range(counts["decoy"]):
        d = A[rng.choice(w["decoy_ids"])]
        et = rng.choice(["malware_detected", "suspicious_process"])
        h = rng.uniform(0.40, 0.70) * W if tpl_id == "S4" else diurnal(0.1, 0.9)
        evs.append(mk(h, et, d["asset_id"], None, "decoy", rng.betavariate(5, 2)))

    # ---- defensive ------------------------------------------------------------------------------
    control = []
    if tpl_id == "S6" and w["deployed"]:
        dep = w["deployed"]
        for eid in dep["edge_ids"][:3]:
            e = E[eid]
            et = "acl_updated" if e["relationship_type"] == "NETWORK_REACHABILITY" else "policy_changed"
            control.append(mk(rng.uniform(0.80, 0.88) * W, et, e["source_id"], e["target_id"], "defensive",
                              rng.betavariate(2, 4), -1, against=[eid], tags={"control_change": True}))
        for eid in dep["edge_ids"][:3]:
            if eid in path_set:
                e = E[eid]
                control.append(mk(rng.uniform(0.90, 0.98) * W, "access_blocked", e["source_id"], e["target_id"],
                                  "defensive", rng.betavariate(2, 4), -1, against=[eid],
                                  tags={"control_effect": True}))
    if counts["defensive"] < len(control):
        counts["benign"] -= len(control) - counts["defensive"]
        counts["defensive"] = len(control)
    evs.extend(control)
    negatives = [e for e in edges if (not e["exists"]) or (e["exists"] and not e["exploitable"])]
    for _ in range(max(0, counts["defensive"] - len(control))):
        r = rng.random()
        if r < 0.7 and negatives:
            e = rng.choice(negatives)
            et = "connection_denied" if e["relationship_type"] == "NETWORK_REACHABILITY" else "access_blocked"
            evs.append(mk(diurnal(0.05, 0.95), et, e["source_id"], e["target_id"], "defensive",
                          rng.betavariate(2, 4), -1, against=[e["edge_id"]]))
        else:
            a = rng.choice(w["assets"])
            et = "mfa_challenge" if a["asset_type"] in IDENT else "policy_enforced"
            evs.append(mk(diurnal(0.05, 0.95), et, a["asset_id"], None, "defensive", rng.betavariate(2, 4)))

    # ---- other infrastructure activity -----------------------------------------------------------
    for _ in range(counts["other"]):
        r = rng.random()
        if r < 0.25:
            a = rng.choice([x for x in hosts if x["asset_type"] != "endpoint"] or hosts)
            evs.append(mk(diurnal(0, 1), "service_error", a["asset_id"], None, "other", rng.betavariate(2, 5)))
        elif r < 0.50:
            a = rng.choice(hosts)
            evs.append(mk(diurnal(0, 1), "vulnerability_detected", a["asset_id"], None, "other", rng.betavariate(2, 5)))
        elif r < 0.75:
            a = rng.choice(w["assets"])
            evs.append(mk(diurnal(0, 1), rng.choice(["policy_changed", "acl_updated"]), a["asset_id"], None, "other",
                          rng.betavariate(2, 5)))
        else:
            eps = [x for x in w["assets"] if x["asset_type"] == "endpoint" and x["asset_id"] not in w["decoy_ids"]]
            a = rng.choice(eps or hosts)
            evs.append(mk(diurnal(0, 1), "malware_detected", a["asset_id"], None, "other", rng.betavariate(2, 5)))

    # ---- trim to N (control bumps may overshoot) then add duplicates ----------------------------
    while len(evs) > base_n:
        victims = [i for i, e in enumerate(evs) if e["class"] == "benign"]
        evs.pop(victims[rng.randrange(len(victims))])
    dup_pool = [i for i, e in enumerate(evs) if e["class"] in ("relevant", "benign", "ambiguous", "other")]
    for i in rng.sample(dup_pool, min(dup_n, len(dup_pool))):
        o = evs[i]
        alt = [s for s in SOURCE_FOR_TYPE[o["event_type"]] if s != o["source"]] or [o["source"]]
        src2 = rng.choice(alt)
        raw2 = encode_sev(src2, o["severity"], rng)
        d = dict(o, ts=o["ts"] + timedelta(seconds=rng.randint(1, 20)), source=src2, severity_raw=raw2,
                 severity=decode_sev(src2, raw2), fields=dict(o["fields"]), supports=list(o["supports"]),
                 against=list(o["against"]), tags=dict(o["tags"], duplicate=True), duplicate_of=i)
        evs.append(d)

    # ---- order, alias references ------------------------------------------------------------------
    order = sorted(range(len(evs)), key=lambda i: (evs[i]["ts"], i))
    pos = {old: new for new, old in enumerate(order)}
    out = []
    for old in order:
        e = evs[old]
        e["duplicate_of"] = pos[e["duplicate_of"]] if e["duplicate_of"] is not None else None
        sref, samb = raw_ref(A.get(e["src"]), rng, cfg, w["collision"])
        tref, tamb = raw_ref(A.get(e["dst"]) if e["dst"] else None, rng, cfg, w["collision"])
        e["src_raw"], e["dst_raw"], e["alias_ambiguous"] = sref, tref, bool(samb or tamb)
        out.append(e)
    return out


# ----------------------------------------------------------------------------------------------
# generation driver
# ----------------------------------------------------------------------------------------------
def generate(outdir, cfg):
    master = cfg["master_seed"]
    combos = [(t, r) for t in TEMPLATES for r in range(cfg["replicas"])]
    seeded_rng(master, "scenario_order").shuffle(combos)    # opaque ids must not reveal the template
    mi = os.path.join(outdir, "data", "model_input")
    gt = os.path.join(outdir, "data", "ground_truth")
    for d in (mi, gt):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)

    M = defaultdict(list)    # model-facing rows by file
    G = defaultdict(list)    # ground-truth rows by file
    scen_index = []
    ev_counter = 0

    for idx, (tpl_id, rep) in enumerate(combos):
        tpl = TEMPLATES[tpl_id]
        sid = "scn_%04d" % (idx + 1)
        w = build_world(master, tpl_id, rep, cfg, idx)
        trng = seeded_rng(master, "time", tpl_id, rep)
        t0 = datetime(2026, 9, 20, tzinfo=timezone.utc) + timedelta(days=trng.randint(0, 12))
        t1 = t0 + timedelta(hours=cfg["window_hours"])
        evs = generate_events(seeded_rng(master, "events", tpl_id, rep), tpl_id, tpl, cfg, w, t0)
        A, E = w["asset_map"], {e["edge_id"]: e for e in w["edges"]}

        # ids + raw/normalized/evidence records
        mrng = seeded_rng(master, "meta", tpl_id, rep)
        ids = []
        for e in evs:
            ev_counter += 1
            ids.append("evt_%06d" % ev_counter)
        for i, e in enumerate(evs):
            eid = ids[i]
            M["events"].append({
                "event_id": eid, "scenario_id": sid, "source": e["source"],
                "timestamp": fmt_ts(e["source"], e["ts"]), "event_type": e["event_type"],
                "source_entity_raw": e["src_raw"], "target_entity_raw": e["dst_raw"],
                "severity_raw": e["severity_raw"], "observed_fields": e["fields"],
                "payload_version": PAYLOAD_VERSION})
            G["normalized_events"].append({
                "event_id": eid, "scenario_id": sid, "timestamp": iso(e["ts"]), "event_type": e["event_type"],
                "source": e["source"], "source_entity_id": e["src"], "target_entity_id": e["dst"],
                "severity": e["severity"], "observed_fields": e["fields"]})
            rel = SOURCE_RELIABILITY[e["source"]]
            M["evidence"].append({
                "event_id": eid, "scenario_id": sid, "source_reliability": rel,
                "collection_confidence": round(clip(rel + mrng.gauss(0, 0.07), 0.30, 1.0), 3),
                "collection_method": COLLECTION_METHOD[e["source"]],
                "ingest_delay_seconds": int(mrng.uniform(0, 600))})
            m = MAPPING.get(e["event_type"])
            if m:
                stride, techs = m
                conf = round(clip(max([c for _, c in techs] or [0.5]) + mrng.gauss(0, 0.05), 0.05, 0.95), 3)
                if e["class"] == "relevant":
                    status = "confirmed_in_simulation" if e["strength"] >= 0.5 else "supported"
                else:
                    status = "candidate"
                G["mapping_annotations"].append({
                    "event_id": eid, "scenario_id": sid, "stride_categories": stride,
                    "attack_technique_ids": [t for t, _ in techs], "mapping_confidence": conf,
                    "mapping_status": status, "supported_by_simulated_facts": e["class"] == "relevant",
                    "attack_version": "UNPINNED"})
            else:
                G["mapping_annotations"].append({
                    "event_id": eid, "scenario_id": sid, "stride_categories": [], "attack_technique_ids": [],
                    "mapping_confidence": 1.0, "mapping_status": "unmapped",
                    "supported_by_simulated_facts": False, "attack_version": "UNPINNED"})
            G["ground_truth"].append({
                "entity_type": "event", "scenario_id": sid, "entity_id": eid, "event_class": e["class"],
                "evidence_polarity": e["polarity"], "supports_edge_ids": e["supports"],
                "against_edge_ids": e["against"], "duplicate_of": ids[e["duplicate_of"]] if e["duplicate_of"] is not None else None,
                "alias_ambiguous": e["alias_ambiguous"], "strength": e["strength"], "tags": e["tags"],
                "label_version": LABEL_VERSION})

        pos_support, touch = defaultdict(list), Counter()
        for i, e in enumerate(evs):
            for x in e["supports"]:
                if e["duplicate_of"] is None:
                    pos_support[x].append(ids[i])
            for key in (e["src"], e["dst"]):
                if key:
                    touch[key] += 1

        # ---- Dataset A rows ------------------------------------------------------------------------
        for a in w["assets"]:
            row = {k: a[k] for k in ("asset_id", "asset_type", "zone", "criticality", "exposure",
                                      "security_controls", "identity_confidence", "configuration_confidence",
                                      "evidence_coverage")}
            row["scenario_id"] = sid
            for k in ("display_name", "email", "hostname", "ip_address"):
                if k in a:
                    row[k] = a[k]
            M["assets"].append(row)
        for e in w["edges"]:
            M["relationships"].append({
                "edge_id": e["edge_id"], "scenario_id": sid, "source_id": e["source_id"], "target_id": e["target_id"],
                "relationship_type": e["relationship_type"], "evidence_basis": e["basis"],
                "prior_probability": e["prior"], "graph_version": "v1_baseline"})
            sup = pos_support.get(e["edge_id"], [])
            G["ground_truth"].append({
                "entity_type": "relationship", "scenario_id": sid, "entity_id": e["edge_id"],
                "structural_truth": e["exists"], "feasible_in_scenario": e["exists"] and e["exploitable"],
                "on_feasible_path": any(e["edge_id"] in p["edge_ids"] for p in w["paths"]),
                "observable_from_telemetry": len(sup) > 0, "supporting_event_ids": sup,
                "label_version": LABEL_VERSION})
        for it in w["interventions"]:
            M["interventions"].append({
                "intervention_id": it["intervention_id"], "scenario_id": sid, "category": it["category"],
                "name": it["name"], "cost_units": it["cost_units"], "affected_edge_ids": it["edge_ids"],
                "side_effects": it["side_effects"], "requires_approval": it["requires_approval"]})
        for wi in w["what_ifs"]:
            M["what_if"].append({k: wi[k] for k in ("what_if_id", "base_graph_version", "apply_interventions",
                                                     "change", "result_graph_version")} | {"scenario_id": sid})
        for p in w["paths"]:
            obs_edges = [x for x in p["edge_ids"] if pos_support.get(x)]
            single = {}
            for it in w["interventions"]:
                single[it["intervention_id"]] = not (set(it["edge_ids"]) & set(p["edge_ids"]))
            G["ground_truth"].append({
                "entity_type": "path", "scenario_id": sid, "entity_id": p["path_id"], "node_ids": p["node_ids"],
                "edge_ids": p["edge_ids"], "entry_id": p["node_ids"][0], "target_id": p["node_ids"][-1],
                "hop_count": len(p["edge_ids"]),
                "prerequisites": [{"edge_id": x, "requires": "relationship exploitable"} for x in p["edge_ids"]],
                "observed_edge_ids": obs_edges, "observable_fraction": round(len(obs_edges) / len(p["edge_ids"]), 3),
                "fully_observable": len(obs_edges) == len(p["edge_ids"]),
                "feasible_after_single_intervention": single, "label_version": LABEL_VERSION})
        last_seen = {}
        for e in evs:
            if e["duplicate_of"] is None:
                for key in (e["src"], e["dst"]):
                    if key:
                        last_seen[key] = max(last_seen.get(key, e["ts"]), e["ts"])
        for a in w["assets"]:
            inc = [e for e in w["edges"] if a["asset_id"] in (e["source_id"], e["target_id"])]
            ls = last_seen.get(a["asset_id"])
            fresh = math.exp(-((t1 - ls).total_seconds() / 3600.0) / cfg["tau_f_hours"]) if ls else 0.0
            G["ground_truth"].append({
                "entity_type": "trust", "scenario_id": sid, "entity_id": a["asset_id"],
                "identity_reliability": round(a["true_identity"], 3),
                "configuration_reliability": round(a["true_config"], 3),
                "relationship_confidence": round(sum(1 for e in inc if e["exists"]) / len(inc), 3) if inc else None,
                "evidence_coverage": round(a["true_coverage"], 3), "freshness": round(fresh, 3),
                "last_seen": iso(ls) if ls else None, "label_version": LABEL_VERSION})
        G["expected_outcomes"].append({"entity_type": "intervention_outcomes", "scenario_id": sid,
                                       "deployed_intervention_id": w["deployed"]["intervention_id"] if w["deployed"] else None,
                                       **w["outcomes"]})
        for wi in w["what_ifs"]:
            G["expected_outcomes"].append({"entity_type": "what_if", "scenario_id": sid,
                                           "what_if_id": wi["what_if_id"], **wi["truth"]})
        M["scenarios"].append({
            "scenario_id": sid, "graph_version": "v1_baseline", "entry_points": w["entries"],
            "critical_targets": [w["target"]], "time_window_start": iso(t0), "time_window_end": iso(t1),
            "trust_zones": sorted(set(a["zone"] for a in w["assets"])), "asset_count": len(w["assets"]),
            "relationship_count": len(w["edges"]), "event_count": len(evs), "synthetic": True,
            "schema_version": SCHEMA_VERSION})
        scen_index.append({"scenario_id": sid, "template_id": tpl_id, "template_name": tpl["name"], "replica": rep,
                           "world_attempt": w["attempt"], "n_feasible_paths": len(w["paths"]),
                           "decoy_asset_ids": w["decoy_ids"], "alias_collision_asset_ids": w["collision"],
                           "n_events": len(evs), "n_assets": len(w["assets"]), "n_edges": len(w["edges"])})

    G["scenario_index"] = scen_index
    for name in ("scenarios", "assets", "relationships", "interventions", "what_if", "events", "evidence"):
        write_jsonl(os.path.join(mi, name + ".jsonl"), M[name])
    for name in ("ground_truth", "expected_outcomes", "normalized_events", "mapping_annotations", "scenario_index"):
        write_jsonl(os.path.join(gt, name + ".jsonl"), G[name])

    # ---- splits: stratified by template, scenario-grouped ------------------------------------------
    by_t = defaultdict(list)
    for s in scen_index:
        by_t[s["template_id"]].append(s["scenario_id"])
    split = {"train": [], "validation": [], "test": []}
    srng = seeded_rng(master, "split")
    for t in sorted(by_t):
        lst = list(by_t[t])
        srng.shuffle(lst)
        n = len(lst)
        if n < 5:
            split["train"] += lst
            continue
        nv, nt = int(round(0.2 * n)), int(round(0.2 * n))
        split["test"] += lst[:nt]
        split["validation"] += lst[nt:nt + nv]
        split["train"] += lst[nt + nv:]
    for k in split:
        split[k].sort()
    with open(os.path.join(outdir, "data", "splits.json"), "w") as f:
        json.dump({"note": "Scenario-grouped, stratified by template. Replicas use independent seeds and topologies, "
                           "so this measures generalisation across instances, NOT across new scenario families. "
                           "See ground_truth/template_holdout_splits.json for leave-one-template-out.",
                   **split}, f, indent=1, sort_keys=True)
    lot = {}
    for t in sorted(by_t):
        lot[t] = {"test": sorted(by_t[t]), "train": sorted(s for u, v in by_t.items() if u != t for s in v)}
    with open(os.path.join(gt, "template_holdout_splits.json"), "w") as f:
        json.dump(lot, f, indent=1, sort_keys=True)

    with open(os.path.join(outdir, "generator_config.json"), "w") as f:
        json.dump({"config": cfg, "difficulty_params": DIFFICULTY, "templates": TEMPLATES,
                   "asset_proportions": ASSET_PROPS, "prior_ranges": BASIS_RANGES}, f, indent=1, sort_keys=True)
    counts = {n: len(M[n]) for n in M}
    counts.update({"gt_" + n: len(G[n]) for n in G})
    with open(os.path.join(outdir, "manifest.json"), "w") as f:
        json.dump({
            "generator_version": GENERATOR_VERSION, "schema_version": SCHEMA_VERSION, "label_version": LABEL_VERSION,
            "master_seed": master, "preset": cfg["preset"], "replicas_per_template": cfg["replicas"],
            "python_version": "%d.%d" % sys.version_info[:2],
            "synthetic_data_declaration": "All records are synthetic. Names use invented syllables; IPs use RFC 5737 "
                                          "documentation ranges and RFC 1918 space; ASNs use the private-use range; "
                                          "geo codes use ISO user-assigned codes; CVE-like IDs are prefixed SYN-.",
            "attack_framework_note": "ATT&CK technique IDs were written from memory and attack_version is UNPINNED. "
                                     "Verify against an official release before citing.",
            "model_input_dir": "data/model_input", "evaluation_only_dir": "data/ground_truth",
            "record_counts": counts}, f, indent=1, sort_keys=True)

    write_card(outdir, cfg, counts)
    files = {}
    for root, _, fs in os.walk(outdir):
        for fn in sorted(fs):
            p = os.path.join(root, fn)
            rel = os.path.relpath(p, outdir).replace(os.sep, "/")
            if (rel.startswith("data/") or rel in ("manifest.json", "generator_config.json", "DATASET_CARD.md")):
                files[rel] = sha256_file(p)
    with open(os.path.join(outdir, "checksums.json"), "w") as f:
        json.dump(files, f, indent=1, sort_keys=True)
    return counts


def write_card(outdir, cfg, counts):
    txt = """# Dataset Card: Attack Path Compiler synthetic benchmark

**Status: 100%% synthetic.** No real people, hosts, credentials, traffic or incidents. Generated by
`generate_dataset.py` v%s (seed %d, preset `%s`, %d replicas x 6 templates = %d scenarios).

## Intended use
Developing and evaluating event normalisation, entity resolution, STRIDE/ATT&CK tagging, edge-probability
estimation, attack-path ranking, Monte Carlo reachability, trust scoring and cost-aware remediation.
It is NOT evidence of performance against real attackers.

## Layout
- `data/model_input/`  what the engine may read (twin + telemetry + candidate fixes + what-if requests)
- `data/ground_truth/` evaluation only: hidden edge truth, feasible paths, event classes, normalised events,
  STRIDE/ATT&CK annotations, trust truth, intervention outcomes (all 2^k subsets), what-if outcomes
- `data/splits.json`   scenario-grouped, stratified by template
- `manifest.json`, `checksums.json`, `generator_config.json`

## Design decisions that differ from a naive layout
- Scenario ids are opaque (`scn_0001`), shuffled, so the id does not reveal the scenario family.
- Decoy telemetry uses ordinary event types (`malware_detected`, `suspicious_process`); only severity and
  placement differ. Event type names never say benign / decoy / unrelated.
- Hidden edge state (exists / exploitable) and intervention effects live only in ground truth.
- Edge ids are shuffled so numbering does not reveal which edges are on true paths.
- Feasible paths are COMPUTED by graph search over hidden state, not asserted. Decoy hosts are verified to
  have no exploitable route to the critical target.
- Raw events use per-source severity scales, timestamp formats and 15%% entity aliases; the answer key is
  `normalized_events.jsonl`.

## Known limitations
- Discriminative signal in event fields is a generator assumption, so metrics measure fit to this generator.
- Replicas share template logic; the split does not test unseen scenario families (use the leave-one-template-out file).
- The world has no shared-credential / latent layer: every edge is a deterministic hidden state, so shared-latent
  Monte Carlo cannot be scored against it yet.
- Priors depend on `evidence_basis` (configured / inferred / weak / unsupported), which correlates with edge existence by design.
- ATT&CK ids are from memory and unpinned; costs are arbitrary relative units.

Record counts: %s
""" % (GENERATOR_VERSION, cfg["master_seed"], cfg["preset"], cfg["replicas"], 6 * cfg["replicas"],
       json.dumps(counts, sort_keys=True))
    with open(os.path.join(outdir, "DATASET_CARD.md"), "w") as f:
        f.write(txt)


# ----------------------------------------------------------------------------------------------
# validation (reads the files back from disk, re-derives truth independently)
# ----------------------------------------------------------------------------------------------
def validate(outdir, verbose=True):
    mi = os.path.join(outdir, "data", "model_input")
    gt = os.path.join(outdir, "data", "ground_truth")
    L = lambda d, n: read_jsonl(os.path.join(d, n + ".jsonl"))  # noqa: E731
    scen, assets, rels = L(mi, "scenarios"), L(mi, "assets"), L(mi, "relationships")
    ints, whatif, events, evid = L(mi, "interventions"), L(mi, "what_if"), L(mi, "events"), L(mi, "evidence")
    truth, outc, norm = L(gt, "ground_truth"), L(gt, "expected_outcomes"), L(gt, "normalized_events")
    maps, sidx = L(gt, "mapping_annotations"), L(gt, "scenario_index")
    errors, warns, report = [], [], {}
    err = errors.append

    # leakage scan of everything the engine is allowed to see
    def scan(o, path):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in FORBIDDEN_KEYS:
                    err("forbidden key %s in %s" % (k, path))
                scan(v, path)
        elif isinstance(o, list):
            for v in o:
                scan(v, path)
        elif isinstance(o, str):
            lo = o.lower()
            for t in FORBIDDEN_TOKENS:
                if t in lo:
                    err("forbidden token %r in %s" % (t, path))
    for name in os.listdir(mi):
        for row in read_jsonl(os.path.join(mi, name)):
            scan(row, name)
    for s in scen:
        if not re.match(r"^scn_\d{4}$", s["scenario_id"]):
            err("scenario id not opaque: %s" % s["scenario_id"])

    # uniqueness / referential integrity
    ids = [e["event_id"] for e in events]
    if len(ids) != len(set(ids)):
        err("duplicate event ids")
    amap = {(a["scenario_id"], a["asset_id"]): a for a in assets}
    if len(amap) != len(assets):
        err("duplicate asset ids within a scenario")
    emap = {(r["scenario_id"], r["edge_id"]): r for r in rels}
    if len(emap) != len(rels):
        err("duplicate edge ids within a scenario")
    for r in rels:
        for k in ("source_id", "target_id"):
            if (r["scenario_id"], r[k]) not in amap:
                err("edge endpoint missing: %s" % r["edge_id"])
        if not (0 <= r["prior_probability"] <= 1) or not math.isfinite(r["prior_probability"]):
            err("bad prior %s" % r["edge_id"])
    for a in assets:
        for k in ("identity_confidence", "configuration_confidence", "evidence_coverage"):
            if not (0 <= a[k] <= 1):
                err("bad %s on %s" % (k, a["asset_id"]))
    nmap = {n["event_id"]: n for n in norm}
    for n in norm:
        for k in ("source_entity_id", "target_entity_id"):
            if n[k] is not None and (n["scenario_id"], n[k]) not in amap:
                err("normalized event references unknown entity %s" % n[k])
    if len(evid) != len(events) or len(norm) != len(events) or len(maps) != len(events):
        err("event/evidence/normalized/mapping count mismatch")

    # raw -> normalized round trip for timestamps + severities
    for e in events:
        n = nmap[e["event_id"]]
        if iso(parse_ts(e["source"], e["timestamp"])) != n["timestamp"]:
            err("timestamp round-trip failed %s" % e["event_id"])
        if decode_sev(e["source"], e["severity_raw"]) != n["severity"]:
            err("severity round-trip failed %s" % e["event_id"])
    # chronology + window
    win = {s["scenario_id"]: (s["time_window_start"], s["time_window_end"]) for s in scen}
    last = {}
    for n in norm:
        sid = n["scenario_id"]
        if n["timestamp"] < last.get(sid, ""):
            err("events not time ordered in %s" % sid)
        last[sid] = n["timestamp"]
        if not (win[sid][0] <= n["timestamp"] <= win[sid][1]):
            err("event outside window %s" % n["event_id"])

    # ground truth recomputed independently
    tmpl = {s["scenario_id"]: s["template_id"] for s in sidx}
    gt_edge = {(r["scenario_id"], r["entity_id"]): r for r in truth if r["entity_type"] == "relationship"}
    gt_paths = defaultdict(list)
    for r in truth:
        if r["entity_type"] == "path":
            gt_paths[r["scenario_id"]].append(r)
    ev_class = {r["entity_id"]: r for r in truth if r["entity_type"] == "event"}
    by_s_edges = defaultdict(list)
    for r in rels:
        t = gt_edge[(r["scenario_id"], r["edge_id"])]
        by_s_edges[r["scenario_id"]].append({"edge_id": r["edge_id"], "source_id": r["source_id"],
                                             "target_id": r["target_id"], "exists": t["structural_truth"],
                                             "exploitable": t["feasible_in_scenario"]})
    rng_ok = {"S1": (0, 0), "S2": (1, 2), "S3": (1, 3), "S4": (1, 3), "S5": (2, 5), "S6": (2, 5)}
    ob_s3 = []
    for s in scen:
        sid = s["scenario_id"]
        t = tmpl[sid]
        edges = by_s_edges[sid]
        ent, tg = s["entry_points"], s["critical_targets"]
        paths = enumerate_paths(build_adj(edges), ent, tg)
        stored = sorted(tuple(p["edge_ids"]) for p in gt_paths[sid])
        if sorted(tuple(e["edge_id"] for e in p) for p in paths) != stored:
            err("%s: stored paths differ from recomputed paths" % sid)
        lo, hi = rng_ok[t]
        if not (lo <= len(paths) <= hi):
            err("%s (%s): %d feasible paths outside %s" % (sid, t, len(paths), (lo, hi)))
        if t == "S1" and paths:
            err("%s: benign baseline has a feasible path" % sid)
        # disconnected graph => no route
        cut = [dict(e, exploitable=False) if e["source_id"] in ent else e for e in edges]
        if enumerate_paths(build_adj(cut), ent, tg):
            err("%s: route survives removing entry edges" % sid)
        # decoys unreachable to target
        d_ids = [x["decoy_asset_ids"] for x in sidx if x["scenario_id"] == sid][0]
        for d in d_ids:
            if find_path(build_adj(edges), [d], tg):
                err("%s: decoy host %s can reach the target" % (sid, d))
        sev_dec = [r for r in truth if r["entity_type"] == "event" and r["scenario_id"] == sid
                   and r["event_class"] == "decoy"]
        if t == "S4" and not any(nmap[r["entity_id"]]["severity"] in ("high", "critical") for r in sev_dec):
            err("%s: S4 has no loud decoy" % sid)
        # intervention outcomes recomputed from hidden edges
        oc = [o for o in outc if o["scenario_id"] == sid and o["entity_type"] == "intervention_outcomes"][0]
        its = [i for i in ints if i["scenario_id"] == sid]
        if t != "S1" and len(its) < 3:
            err("%s: fewer than 3 interventions" % sid)
        noop = [x for x in oc["subsets"] if not x["intervention_ids"]][0]
        if len(noop["remaining_path_ids"]) != len(paths):
            err("%s: no-op intervention removed a path" % sid)
        for sub in oc["subsets"]:
            removed = set()
            for iid in sub["intervention_ids"]:
                removed |= set([i for i in its if i["intervention_id"] == iid][0]["affected_edge_ids"])
            keep = [p for p in paths if not (set(e["edge_id"] for e in p) & removed)]
            adj2 = build_adj([dict(e, exploitable=e["exploitable"] and e["edge_id"] not in removed) for e in edges])
            re_paths = enumerate_paths(adj2, ent, tg)
            if len(re_paths) != len(sub["remaining_path_ids"]) or len(keep) != len(re_paths):
                err("%s: intervention outcome mismatch %s" % (sid, sub["intervention_ids"]))
                break
        if t == "S6":
            if not any(x["paths_removed"] >= 1 for x in oc["subsets"] if len(x["intervention_ids"]) == 1):
                err("%s: S6 has no verifiable fix" % sid)
            wi = [x for x in outc if x["scenario_id"] == sid and x["entity_type"] == "what_if"]
            if not wi:
                err("%s: S6 has no what-if outcome" % sid)
            if not any(r["tags"].get("control_change") for r in truth
                       if r["entity_type"] == "event" and r["scenario_id"] == sid):
                err("%s: S6 has no control-change events" % sid)
        if t == "S3":
            ob = [g for g in gt_edge.items() if g[0][0] == sid and g[1]["on_feasible_path"] and g[1]["observable_from_telemetry"]]
            ob_s3.append(len(ob))
            if len(ob) < 2:
                err("%s: S3 has <2 observable path edges" % sid)
    # range checks per template
    tpl_of = {s["scenario_id"]: s["template_id"] for s in sidx}
    for s in scen:
        tp = TEMPLATES[tpl_of[s["scenario_id"]]]
        if not (tp["assets"][0] <= s["asset_count"] <= tp["assets"][1]):
            err("%s asset count out of range" % s["scenario_id"])
        if not (tp["events"][0] <= s["event_count"] <= tp["events"][1]):
            err("%s event count out of range" % s["scenario_id"])

    # label leakage sanity: priors on true-path edges vs other existing edges
    pp, po = [], []
    for r in rels:
        g = gt_edge[(r["scenario_id"], r["edge_id"])]
        if g["on_feasible_path"]:
            pp.append(r["prior_probability"])
        elif g["structural_truth"]:
            po.append(r["prior_probability"])
    if len(pp) > 1 and len(po) > 1:
        mp, mo = sum(pp) / len(pp), sum(po) / len(po)
        vp = sum((x - mp) ** 2 for x in pp) / (len(pp) - 1)
        vo = sum((x - mo) ** 2 for x in po) / (len(po) - 1)
        se = math.sqrt(vp / len(pp) + vo / len(po))
        # sample-size aware: flag only a difference that is both practically large and > 4 standard errors
        if abs(mp - mo) > max(0.06, 4 * se):
            err("prior probability separates path edges from other existing edges (label leak)")
    report["prior_mean_path_edges"] = round(sum(pp) / len(pp), 3) if pp else None
    report["prior_mean_other_existing_edges"] = round(sum(po) / len(po), 3) if po else None

    # distribution reports
    cls = Counter(r["event_class"] for r in ev_class.values())
    report["event_class_distribution"] = {k: round(v / len(ev_class), 3) for k, v in sorted(cls.items())}
    comp = Counter()
    for g in gt_edge.values():
        comp["exists_and_feasible" if g["feasible_in_scenario"] else "exists_not_feasible" if g["structural_truth"] else "does_not_exist"] += 1
    tot = sum(comp.values())
    report["edge_composition"] = {k: round(v / tot, 3) for k, v in sorted(comp.items())}
    tc = defaultdict(Counter)
    for e in events:
        tc[e["event_type"]][ev_class[e["event_id"]]["event_class"]] += 1
    for et, c in tc.items():
        n = sum(c.values())
        if n >= 20 and max(c.values()) / n >= 0.95:
            warns.append("event_type %s is %.0f%% one class (%s)" % (et, 100 * max(c.values()) / n, c.most_common(1)[0][0]))
        for bad in ("decoy", "benign", "unrelated", "relevant"):
            if bad in et:
                err("event_type name leaks label: %s" % et)
    report["scenarios"] = len(scen)
    report["events"] = len(events)
    report["feasible_paths_total"] = sum(len(v) for v in gt_paths.values())
    report["s3_observable_edges_min_mean"] = (min(ob_s3), round(sum(ob_s3) / len(ob_s3), 2)) if ob_s3 else None
    report["errors"] = errors[:50]
    report["n_errors"] = len(errors)
    report["warnings"] = warns
    with open(os.path.join(outdir, "validation_report.json"), "w") as f:
        json.dump(report, f, indent=1, sort_keys=True)
    if verbose:
        print(json.dumps({k: v for k, v in report.items() if k != "errors"}, indent=1, sort_keys=True))
        for e in errors[:20]:
            print("ERROR:", e)
    return len(errors) == 0, report


def verify_repro(cfg):
    a, b = tempfile.mkdtemp(), tempfile.mkdtemp()
    try:
        generate(a, cfg)
        generate(b, cfg)
        ca = json.load(open(os.path.join(a, "checksums.json")))
        cb = json.load(open(os.path.join(b, "checksums.json")))
        return ca == cb
    finally:
        shutil.rmtree(a, ignore_errors=True)
        shutil.rmtree(b, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preset", default="standard", choices=list(PRESET_REPLICAS))
    ap.add_argument("--out", default=".")
    ap.add_argument("--seed", type=int, default=DEFAULT_CONFIG["master_seed"])
    ap.add_argument("--noise-pct", type=float, default=DEFAULT_CONFIG["noise_pct"])
    ap.add_argument("--decoy-pct", type=float, default=DEFAULT_CONFIG["decoy_pct"])
    ap.add_argument("--difficulty", default="mixed", choices=list(DIFFICULTY))
    ap.add_argument("--validate-only", action="store_true")
    ap.add_argument("--verify-repro", action="store_true")
    a = ap.parse_args()
    cfg = dict(DEFAULT_CONFIG, master_seed=a.seed, preset=a.preset, replicas=PRESET_REPLICAS[a.preset],
               noise_pct=a.noise_pct, decoy_pct=a.decoy_pct, difficulty=a.difficulty)
    if a.verify_repro:
        ok = verify_repro(cfg)
        print("reproducible:", ok)
        sys.exit(0 if ok else 1)
    if not a.validate_only:
        counts = generate(a.out, cfg)
        print("generated:", json.dumps(counts, sort_keys=True))
    ok, _ = validate(a.out)
    print("VALID" if ok else "INVALID")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
