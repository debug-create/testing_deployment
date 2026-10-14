# AttackTwin AI — Digital Twin Technical Handoff

**Workstream:** Digital Twin & Evidence Ingestion (Phase A)  
**Location:** [`docs/digital_twin/`](./)  
**Companion Document:** [`docs/digital_twin/README.md`](./README.md)  
**Audited Execution Report:** [`data_model/model/PHASE_A_EXECUTION_REPORT.md`](../../data_model/model/PHASE_A_EXECUTION_REPORT.md)  
**Core Pipeline Module:** [`backend/app/twin/twin.py`](../../backend/app/twin/twin.py)  
**Pipeline Notebooks:** [`notebooks/`](../../notebooks/)  
**Validated Graph Exports:** [`data_model/model/twin_out/`](../../data_model/model/twin_out/)  

---

## 1. Project Summary and Ownership Boundaries

AttackTwin AI is a deterministic and probabilistic attack-graph compilation engine for cyber defense. It compiles simulated enterprise infrastructure configurations and multi-sensor telemetry into a typed attack graph, estimates edge exploitability priors with calibrated uncertainty, updates edge weights using observed evidence, simulates attacker reachability via Monte Carlo sampling, and ranks optimal remediation interventions.

To ensure modularity and parallel development, the system is partitioned into clear workstreams:

```
[ Telemetry & Assets ] ──> [ 1. DIGITAL TWIN (Phase A) ]
                                 │
                                 ├── Potential Graph (MultiDiGraph)
                                 ├── Evidence Ledger (Candidate Links)
                                 └── Coverage Map (Blind Spots)
                                 │
                                 ▼
                     [ 2. ML EDGE-PRIOR HEAD ] (Upcoming)
                                 │  Predicts prior p & variance per edge
                                 ▼
                 [ 3. EVIDENCE-BASED UPDATER ] (Upcoming)
                                 │  Updates edge weights with ledger evidence
                                 ▼
                 [ 4. MONTE CARLO RISK ENGINE ] (Upcoming)
                                 │  Samples edge states & calculates reachability
                                 ▼
                 [ 5. REMEDIATION OPTIMIZER ] (Upcoming)
                                    Evaluates interventions against graph
```

### Precise Ownership Boundaries
- **Digital Twin (This Workstream — Completed Phase A):** Owns inventory ingestion, schema dual-typing, graph topology construction, multi-source log normalization, soft entity alias resolution, candidate evidence ledger association, and telemetry coverage map computation.
- **ML Edge-Prior Estimation (Downstream ML Workstream):** Owns training an edge-prior model (logistic regression / gradient boosting baseline; heterogeneous GNN benchmark) to predict prior exploitability probability $p$ and epistemic variance $\sigma^2$ per candidate edge using permitted potential-layer features.
- **Evidence-Based Probability Updating (Downstream Engine):** Owns combining prior probabilities with observed evidence ledger rows to compute posterior edge traversal probabilities.
- **Monte Carlo Reachability & Risk (Downstream Simulation):** Owns forward edge-sampling simulations from entry points to critical targets to compute reachability distributions and aggregate enterprise risk (`Risk = sum(impact * P(reachable))`).
- **Intervention Optimization (Downstream Optimization):** Owns finding the minimal-cost cut set of interventions (`interventions.jsonl`) that breaks high-probability attack paths.

> [!WARNING]
> **No Downstream Claim:** The Digital Twin does **not** train ML models, does **not** perform Monte Carlo simulations, and does **not** make autonomous remediation decisions. Downstream components consume the artifacts emitted by the Twin.

---

## 2. Verified Phase A Execution Status

The Phase A pipeline underwent an exhaustive end-to-end execution audit recorded in [`data_model/model/PHASE_A_EXECUTION_REPORT.md`](../../data_model/model/PHASE_A_EXECUTION_REPORT.md):

- **Canonical Notebook Execution:** All six canonical notebooks (`00_data_recon.ipynb`, `01_digital_twin.ipynb`, `02_normalize_resolve.ipynb`, `03_observed_layer_ledger.ipynb`, `04_twin_export_inference.ipynb`, `05_twin_review.ipynb`) executed successfully in fresh, isolated Python kernels.
- **Audit Verification Score:** **175 named audit checks passed; 0 failed** across all six final notebook executions. This includes 7 executed adversarial stress-test groups in notebook 05 (12 passed checks).
- **Repaired Baseline Failures:** Two historical baseline executions failed initially with `FileNotFoundError` because earlier relative path discovery was sensitive to current working directory (`CWD`). Both failures were diagnosed, repaired using robust repository-root discovery, and preserved as historical evidence in `data_model/model/phase_a_audit/`.
- **Distinction Between Execution Success and Semantic Completeness:**
  - **Execution PASS:** The code runs without crashes, schema validation passes, and outputs match structural assertions.
  - **PARTIAL / Unresolved Semantics:** Notebooks 01 and 03 are flagged `PARTIAL` because requested semantic decisions remain open:
    1. Plan type naming currently uses coarse categories (`identity`, `host`, `service`, `data`, `control`) rather than the proposed canonical vocabulary.
    2. Temporal causal validation across event sequences was explicitly skipped due to lack of credential-specific prerequisite bindings in the dataset.
    3. Secret nodes are withheld (0 nodes) because scanner location fields do not provide concrete asset identifiers.
  - **No ML Training:** The audit executed no machine learning training, feature extraction, or neural network inference.

---

## 3. Verified Data Inventory

The Digital Twin operates on the synthetic cybersecurity dataset located in [`data_model/dataset/attack_path_dataset/data/`](../../data_model/dataset/attack_path_dataset/data/).

### 3.1 Model-Input Tables (Runtime Ingestion)
All runtime ingestion is strictly restricted to `data/model_input/`:

| Input File | Verified Row Count | Description / Role |
|---|---:|---|
| `scenarios.jsonl` | **60** | Scenario metadata, perimeter entry points, and critical target database assets. |
| `assets.jsonl` | **1,576** | Compute hosts, user/cloud identities, applications, databases, and controls across 60 scenarios. |
| `relationships.jsonl` | **3,589** | Candidate infrastructure reachability, authentication, and privilege relationships. |
| `events.jsonl` | **11,253** | Multi-sensor security telemetry (7 distinct sensor types). |
| `evidence.jsonl` | **11,253** | Per-event collection confidence, source reliability, and ingestion delay. |
| `interventions.jsonl` | **258** | Available remediation controls, cost units, and affected candidate edge IDs. |
| `what_if.jsonl` | **20** | Counterfactual security intervention proposals. |

### 3.2 Scenario Splits Metadata (`data/splits.json`)
Scenarios are divided into three fixed splits:
- **Train (36 scenarios):** `scn_0001, scn_0004, scn_0005, scn_0006, scn_0009, scn_0011, scn_0015, scn_0017, scn_0020, scn_0022, scn_0023, scn_0024, scn_0026, scn_0027, scn_0028, scn_0029, scn_0031, scn_0032, scn_0034, scn_0035, scn_0036, scn_0039, scn_0040, scn_0042, scn_0044, scn_0045, scn_0046, scn_0048, scn_0050, scn_0051, scn_0052, scn_0055, scn_0057, scn_0058, scn_0059, scn_0060`
- **Validation (12 scenarios):** `scn_0002, scn_0003, scn_0008, scn_0012, scn_0016, scn_0025, scn_0030, scn_0037, scn_0047, scn_0049, scn_0054, scn_0056`
- **Test (12 scenarios):** `scn_0007, scn_0010, scn_0013, scn_0014, scn_0018, scn_0019, scn_0021, scn_0033, scn_0038, scn_0041, scn_0043, scn_0053`

> [!NOTE]
> **Split Independence vs. Template Generalization:** The 36/12/12 split is verified to be **pairwise disjoint and exhaustive** across all 60 scenario IDs. However, it is an **instance-level split**; it does not evaluate generalization to completely unseen scenario template topologies.

### 3.3 Scenario Context Keying
Identifiers for assets (`asset_001`, `server_002`) and edges (`edge_001`) repeat across scenarios:
- **Assets:** 40 distinct IDs are reused across scenarios (1,536 unscoped duplicates).
- **Edges:** 97 distinct IDs are reused across scenarios (3,491 unscoped duplicates).
- **Mandatory Convention:** All nodes, edges, joins, and lookup caches **must** be keyed by composite context: `(scenario_id, asset_id)` and `(scenario_id, edge_id)`. Event IDs (`evt_000001` to `evt_011253`) are globally unique.

---

## 4. Graph Semantics and Schema Contract

The Digital Twin compiles graphs using `networkx.MultiDiGraph`. Although the current dataset has 0 parallel edges between any single pair of nodes, `MultiDiGraph` is intentionally used to guard against parallel edges in future regenerations or adversarial inputs.

### 4.1 Two-Layer Graph Topology
1. **Potential Layer (`layer="potential"`):**
   - Contains 1,576 assets and 3,589 candidate edges.
   - Represents the physical/logical infrastructure topology.
   - Attacker path-traversal algorithms must evaluate **only** nodes and edges where `layer == "potential"`.
2. **Observed Layer (`layer="observed"`):**
   - Contains 11,253 `Event` nodes and 280 `Vulnerability` nodes.
   - Contains 18,717 `AFFECTED_BY` edges (connecting events to resolved assets) and 280 `EXPLOITS` edges (connecting vulnerabilities to assets).
   - Telemetry nodes are strictly quarantined to `layer="observed"` so path search never routes through event nodes.

### 4.2 Dual-Typing Mappings

Every graph object carries two type attributes:
- `dataset_type`: The verbatim schema type from `model_input` (preserves raw ground truth for ML features).
- `plan_type`: The coarse functional tier used for reachability grammar and trust scoring.

#### Verified Asset Type Mappings:
| Raw `asset_type` (`dataset_type`) | Assigned `plan_type` | Count | Attributes / Flags |
|---|---|---:|---|
| `user_identity` | `identity` | 231 | `is_admin=False`, `display_name`, `email` |
| `privileged_identity` | `identity` | 130 | `is_admin=True`, `display_name`, `email` |
| `cloud_identity` | `identity` | 110 | `is_admin=False`, `display_name`, `email` |
| `endpoint` | `host` | 312 | `hostname`, `ip_address`, `zone`, `exposure` |
| `server` | `host` | 286 | `hostname`, `ip_address`, `zone`, `exposure` |
| `external_entry` | `host` | 72 | Perimeter ingress, `zone="external"`, `exposure="public"` |
| `application` | `service` | 195 | `hostname`, `ip_address` |
| `database` | `data` | 154 | Target tier, `criticality=1..5` |
| `security_infrastructure` | `control` | 86 | Inline security monitors |

#### Verified Relationship Type Mappings:
| Raw `relationship_type` (`dataset_type`) | Assigned `plan_type` | Count | Input Prior Probability Range |
|---|---|---:|:---:|
| `NETWORK_REACHABILITY` | `network_flow` | 1,239 | `configured`: 0.70–0.95 |
| `AUTHENTICATES_TO` | `auth` | 596 | `inferred`: 0.25–0.60 |
| `CAN_ASSUME_IDENTITY` | `privilege` | 1,173 | `weak`: 0.10–0.30 |
| `HAS_PRIVILEGE` | `privilege` | 88 | `unsupported`: 0.02–0.10 |
| `CAN_ACCESS_DATA` | `data_access` | 278 | Basis-dependent |
| `DEPLOYS_TO` | `deploy` | 49 | Basis-dependent |
| `TRUSTS_SERVICE` | `trust` | 115 | Basis-dependent |
| `ADMINISTERS` | `admin` | 31 | Basis-dependent |
| `CAN_MODIFY_CONFIGURATION` | `config_change` | 20 | Basis-dependent |

> [!CAUTION]
> **Pending Semantic Agreement:** In the design handoff (Decision D1), proposed canonical names were title-cased (`Identity`, `Endpoint`, `Server`, `Service Account`, `Database`). The current codebase implements coarse lowercase strings (`identity`, `host`, `service`, `data`, `control`). **Both `plan_type` and `dataset_type` are exported**, ensuring downstream consumers can use either representation without loss of information.

### 4.3 Unsupported Plan Types Left Empty
The following types proposed in early design drafts cannot be populated from the available input tables:
- **Node Types:** `Secret` (0 placed), `Permission` (empty), `API` (empty), `Cloud Asset` (empty).
- **Edge Types:** `USES`, `STORES`, `GRANTS_ACCESS_TO`, `EXPOSED_IN` (empty).

---

## 5. Identity Normalization and Soft Resolution

Raw events frequently refer to entities by obfuscated aliases (IP addresses, hostnames, emails, display names, and uppercase variations).

### 5.1 Measured Entity Reference Distribution
Across all 11,253 events:
- **Source Mentions:** 9,515 exact asset IDs; 1,738 alias-like references (15.4%). 0 null sources.
- **Target Mentions:** 7,283 exact asset IDs; 1,361 alias-like references (15.7% of non-null targets); **2,609 null targets** (23.2% of all events).
- **Unmatched Non-Null References:** **0**. Every non-null reference resolves to at least one asset in its scenario.
- **Null Targets are Missing Telemetry, Not Invalid Aliases:** Events such as vulnerability scans or health checks often log only a source host. Null targets are safely preserved without crashing.

### 5.2 Resolution Hierarchy & Soft Merges
Entity mentions are resolved in the following priority order:
1. Exact `asset_id` (high confidence)
2. Exact `email` (high confidence)
3. Exact `hostname` (high confidence)
4. Exact `ip_address` (high confidence)
5. Case-insensitive matches of 1–4 (high confidence)
6. Unique scenario `display_name` (medium confidence)
7. Colliding scenario `display_name` (low confidence, `ambiguous=True`)
8. Null reference (unresolved, `method="null_ref"`)

```json
{
  "confidence_breakdown": {
    "high": 19302,
    "medium": 531,
    "low": 64,
    "unresolved": 2609
  },
  "method_breakdown": {
    "exact_id": 16798,
    "exact_hostname": 738,
    "ci_hostname": 721,
    "exact_ip": 727,
    "exact_email": 318,
    "display_name_unique": 531,
    "display_name_ambiguous": 64,
    "null_ref": 2609
  }
}
```

> [!IMPORTANT]
> **Preservation of Ambiguity:** When two identities share a display name within a scenario (64 instances observed), the resolver produces a candidate list containing both asset IDs with `confidence="low"` and `ambiguous=True`. **Nodes are never physically merged in the graph.** All merge decisions are recorded in the export's `merges` array with `reversible=True`.

---

## 6. Evidence Ledger and Coverage Limitations

### 6.1 Evidence Ledger Linking
The evidence ledger binds normalized events to candidate edges sharing the resolved `(source_asset, target_asset)` endpoints.
- **Exported Ledger Rows:** 8,284 rows across 60 scenarios.
- **Candidate Ambiguity:** 66 rows (0.80%) carry `link="pair_match_ambiguous"` due to multiple candidate edges or ambiguous entity resolutions.
- **Duplicate Rows:** 292 predicted near-duplicate rows are retained with `weight_hint = 0.0` to preserve auditability without inflating evidence counts.

### 6.2 Candidate-Link Evaluation Against Ground Truth (`EVAL ONLY`)
Evaluating candidate ledger links against the ground-truth support annotations (`ground_truth.jsonl`):

| Split | Candidate Links | True Supports (Union) | True Positives (TP) | False Positives (FP) | Missed (FN) | Precision | Recall |
|---|---:|---:|---:|---:|---:|:---:|:---:|
| **Validation** | 1,644 | 492 | 492 | 1,152 | 0 | **29.93%** | **100.0%** |
| **Train** | 4,887 | 1,480 | 1,480 | 3,407 | 0 | **30.28%** | **100.0%** |
| **Test** | 1,753 | 522 | 522 | 1,231 | 0 | **29.78%** | **100.0%** |

> [!WARNING]
> **What Candidate Precision Means:**
> - Recall is **100%**: every true event-support relationship is captured by candidate pairing.
> - Precision is **~29.9%**: 70.1% of candidate links are false positives. In real enterprises, benign network traffic, routine logins, and decoy activity occur between assets on candidate attack edges.
> - **Ledger links are candidate associations, NOT proof of attack progress.** Downstream models must weigh ledger links as noisy features rather than ground truth.

### 6.3 Telemetry Coverage & Blind Spots
For every potential node and edge, the twin computes `n_events`, `source_diversity`, and `blind_spot`:
- **Blind-Spot Potential Edges:** **804 / 3,589 (22.4%)** have 0 linked non-duplicate events.
- **Blind-Spot Potential Nodes:** **52 / 1,576 (3.3%)** have 0 associated events.
- **Rule of Evidence Invariance:** Telemetry absence **never** lowers an edge's probability. An unmonitored edge retains its `prior_probability`; missing telemetry is recorded as a visibility blind spot so downstream Monte Carlo preserves wider uncertainty intervals.

### 6.4 Near-Duplicate Detection Limitations
The near-duplicate detector evaluates events within a sliding window of $|ts_1 - ts_2| \le 20\text{ seconds}$ matching on resolved entity pairs:
- **Validation Precision:** **95.08%** (58 TP, 3 FP).
- **Validation Recall:** **85.29%** (58 TP, 10 FN).
- **Across All Splits:** 44 true duplicates were missed; **43 of the 44 missed duplicates have null targets**.
- **Impact:** When an event lacks a target entity, the current heuristic cannot reliably establish cross-sensor pairing without domain-specific payload matching. As a result, approximately 15% of true duplicates remain unflagged and may slightly inflate evidence counts.

---

## 7. Known Issues and Limitations Inventory

Each identified limitation is tracked with priority, impact, recommended action, and status:

| # | Limitation / Issue | Priority | Impact | Recommended Action | Status |
|:---:|---|:---:|---|---|:---:|
| **1** | **Ground-Truth Label Semantics & Leakage** | **P0** | Downstream ML could train on invalid labels or leak answers into runtime inference. | Explicitly separate `structural_truth` (edge exists) vs. `feasible_in_scenario` (exploitable) vs. `on_feasible_path` (critical path). Freeze a whitelist of permitted potential-layer features. Never allow `ground_truth/` in inference code. | **BLOCKED on ML Owner** |
| **2** | **Low Candidate-Ledger Precision (~29.9%)** | **P1** | Naive rule-based updating would treat benign traffic as confirmed attacks. | Downstream updater must weight events using `event_class`, `polarity`, `strength`, and `source_reliability` rather than raw event counts. | **DOCUMENTED** |
| **3** | **Missed Near-Duplicates on Null Targets** | **P2** | 44 duplicates missed (43 with null targets), causing slight evidence count inflation. | Implement fallback duplicate matching on `(scenario_id, event_type, actor, ts)` for events where target is null. | **DIAGNOSED** |
| **4** | **Plan Vocabulary Mismatch** | **P2** | Canonical plan types currently use coarse lowercase categories (`identity`, `host`) rather than Decision D1 names. | Maintain dual typing (`plan_type` + `dataset_type`). Agree on final canonical vocabulary with frontend/API owners before altering `twin.py`. | **PARTIAL** |
| **5** | **Temporal Validation Deferred** | **P3** | Temporal prerequisite checking was skipped; impossible event sequences are not filtered. | Zero temporal warnings must not be cited as verified temporal correctness. Implement causal ordering checks once prerequisite graphs are formalized. | **SKIPPED** |
| **6** | **Zero Secret Nodes** | **P3** | 343 secret exposure events exist in telemetry but 0 `Secret` nodes are placed. | Secret scanner `location` fields are categories (`build_log`), not asset IDs. Retain Event-only fallback until location-to-asset mapping is provided. | **DOCUMENTED** |
| **7** | **Unpopulated Edge Probabilities** | **P1** | Graph exports contain `p: null` and `variance: null`. | Train calibrated ensemble prior (logistic regression / gradient boosting) to populate prior probabilities before Monte Carlo reachability. | **PENDING ML** |
| **8** | **Synthetic Generator Overfitting** | **P3** | High evaluation scores reflect calibration to the synthetic data generator, not real-world transfer. | Retain test split as a strict holdout. Benchmark future models on unseen scenario templates. | **DOCUMENTED** |
| **9** | **Undeclared Notebook Dependencies** | **P2** | `nbformat`, `nbclient`, and `ipykernel` are present in local environment but missing from `pyproject.toml`. | Add a `[tool.poetry.group.dev.dependencies]` or `requirements-dev.txt` declaring exact notebook execution packages. | **DIAGNOSED** |
| **10** | **Static Audit Reporting Artifacts** | **P3** | Audit report generator contains some static section headers and boilerplate descriptions. | Verify claims against raw execution JSON (`data_model/model/phase_a_audit/execution.json`) rather than generated prose. | **DOCUMENTED** |

---

## 8. Planned ML and Probabilistic Risk Integration

The intended integration sequence for subsequent phases must proceed in strict order:

```
[Phase A: Digital Twin] ──> [Phase B: Prior Head] ──> [Phase C: Evidence Updater] ──> [Phase D: Monte Carlo]
```

1. **Freeze Label Semantics & Feature Whitelist:**
   - Define whether the edge prior predicts `structural_truth` or `feasible_in_scenario`.
   - Feature whitelist: potential edge attributes (`relationship_type`, `evidence_basis`, `prior_probability`), source/target node attributes (`asset_type`, `zone`, `exposure`, `criticality`, `n_controls`, `identity_confidence`, `configuration_confidence`, `evidence_coverage`).
   - Exclude observed-layer telemetry and ground truth labels from the feature vector.
2. **Train First Baseline Prior Model:**
   - Fit simple, interpretable baselines: Logistic Regression and Gradient Boosted Decision Trees (LightGBM/XGBoost).
   - Fit preprocessing and scalers strictly on training scenarios (36 scenarios).
   - Evaluate calibration (Brier score, ECE) and log-loss on validation scenarios (12 scenarios).
3. **Benchmark Heterogeneous GNN (Stretch Goal):**
   - Implement a minimal HeteroGNN (e.g. PyG `HeteroConv` or `RGCN`) using `plan_type` node/edge relations.
   - Benchmark against the gradient boosting baseline on the identical splits. If the GNN does not beat the ensemble baseline in calibration and AUC, discard it in favor of the ensemble.
4. **Evidence-Based Probability Updating:**
   - Combine prior probability $p$ with non-duplicate evidence ledger weights.
   - Attenuate updates using `source_reliability` and `collection_confidence`.
   - Update epistemic uncertainty/variance based on coverage metrics.
5. **Monte Carlo Reachability Simulation:**
   - Feed updated edge traversal probabilities and variances into Monte Carlo forward sampling.
   - Simulate attacker progression from `entry_points` to `critical_targets`.
   - Compute reachability probability distributions per target.
6. **Remediation Optimization:**
   - Evaluate candidate interventions (`interventions.jsonl`) on graph edges.
   - Rank interventions by risk reduction per cost unit (`Delta Risk / Cost`).
7. **Strict Separation of Concerns:**
   - Formal Bayesian posterior updates or MCMC sampling must not be claimed unless explicitly implemented, tested, and calibrated.

---

## 9. Integration Contract and Coordination Points

Downstream consumers (ML Prior Head, Monte Carlo Risk Engine, Backend API, Frontend Visualizer) must coordinate on the following interface points:

1. **Graph Filtering Requirement:**
   - Consumers seeking the attack movement graph **must filter** `nodes` and `edges` where `layer == "potential"`.
   - Observed nodes (`layer == "observed"`) must be ignored during reachability path search.
2. **Field Preservation Contract:**
   - In `twin_out/{scenario_id}.json`:
     - `edge.prior_probability`: Ingested prior from configuration.
     - `edge.p`: Reserved for ML prior output (currently `null`).
     - `edge.variance`: Reserved for epistemic uncertainty (currently `null`).
     - `edge.cost_actions`: List of intervention IDs affecting this edge.
     - `edge.evidence`: List of non-duplicate event IDs linked to this edge.
   - **Do not rename these fields** without coordinated changes across all workstreams.
3. **Scenario Context Scoping:**
   - API endpoints and ML datasets must never use bare `asset_id` or `edge_id` as global keys. Always join on `(scenario_id, entity_id)`.
4. **Source of Truth for Reusable Code:**
   - The tested, standalone digital twin module is [`backend/app/twin/twin.py`](../../backend/app/twin/twin.py).
   - Changes to the twin pipeline must be verified through the notebook suite (`00` to `05`) and re-emitted via Prompt 4.

---

## 10. Next Actions Ordered by Priority

### Priority 0 (Immediate Gates)
- [ ] **Coordinate with ML Owner:** Formally agree on the target label (`feasible_in_scenario` vs `structural_truth`) and approve the feature whitelist for the edge-prior model.
- [ ] **Contract Approval:** Confirm with Backend and Risk owners whether `plan_type` should remain coarse lowercase (`identity`, `host`) or migrate to title-case D1 names (`Identity`, `Endpoint`).

### Priority 1 (Core Integration)
- [ ] **Build ML Prior Baseline:** Create `notebooks/06_edge_prior_baseline.ipynb` training Logistic Regression and Gradient Boosting on train scenarios and evaluating calibration on validation scenarios.
- [ ] **API Adapter Integration:** Wire [`backend/app/twin/twin.py`](../../backend/app/twin/twin.py) into `backend/app/api/` so the backend can serve validated Phase A scenario graphs dynamically.

### Priority 2 (Downstream Simulation & GNN Benchmark)
- [ ] **Benchmark HeteroGNN:** Implement minimal heterogeneous graph neural network benchmark on the identical feature set.
- [ ] **Monte Carlo Integration:** Connect exported graph probabilities and candidate interventions to the forward-sampling risk engine.

### Priority 3 (Refinement & Hardening)
- [ ] **Null-Target Deduplication:** Improve duplicate detection for events with null targets to recover the 44 missed duplicate references.
- [ ] **Declare Dev Dependencies:** Add `nbformat`, `nbclient`, `ipykernel` to `pyproject.toml` or `requirements-dev.txt`.
- [ ] **Temporal Analysis:** Prototype causal event order checks using token issue and login sequencing.

---

## 11. Verification Status Legend

Throughout this document and project reports, verification claims are categorized as follows:

| Status Label | Criteria |
|---|---|
| **VERIFIED** | Directly demonstrated and confirmed by code inspection, executed assertion, or live Python-kernel test against actual data. |
| **PARTIALLY VERIFIED** | Mechanically executes and passes structural checks, but underlying semantic alignment, naming convention, or consumer agreement remains pending. |
| **PLANNED / UNVERIFIED** | Proposed design feature, upcoming ML architecture, or downstream integration that has not yet been implemented or benchmarked. |
