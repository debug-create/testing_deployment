# HANDOFF: AttackTwin AI / Attack Path Compiler, dataset folder and project context

*Status as of 14 Oct 2026, 12:40 IST. Written for teammates and for the AI assistants they use. Paste this file first, then ask your question.*

---

## 0. Rules for any AI reading this

1. **Do not assume the plan is correct.** Section 7 lists known doubts. Before writing code, name your top 3 doubts about the part you were given.
2. **Label claims** as (a) verified, (b) plausible, (c) guess. Never state MITRE technique IDs, dataset facts or numbers from memory as fact.
3. **Never let the engine read `data/ground_truth/`.** That folder is answer keys, for the evaluation harness only.
4. **Do not invent hackathon rules.** Section 3 is what the rulebook says. Anything not there is unknown, so ask.
5. **Say when something doesn't fit the time budget.** Cutting scope is a valid answer.
6. Every file you write is submitted work that **the team must be able to explain, modify and debug** (rulebook). Keep code simple and commented.

---

## 1. What the project is

**AttackTwin AI** (also called **Attack Path Compiler**) for **Manipal Hackathon 2026, Round 2** ("The Butterfly Effect"). It must:

- convert heterogeneous security events (logins, privileges, exposed services, API calls, compromised credentials) into one schema
- correlate identities, permissions, applications, endpoints, secrets, services and events into a typed graph
- continuously update attack paths, ranked by likelihood and impact
- recommend the smallest defensive intervention that breaks the most dangerous paths
- explain incident propagation, using **simulated events**

**Pitch:** treat telemetry like source code. Compile events into an attack graph, score it probabilistically with uncertainty, then optimize to emit the cheapest "patch" that breaks the most risk.

**Core design rule:** the LLM never decides what is dangerous. It only narrates and answers questions about results the deterministic engine already computed. Turning the LLM off must not change any score.

**v1 plan (PDF) pipeline:** simulator → normalize → entity resolution → graph update → edge probability (Bayesian GNN prior × evidence update) → paths (Yen's K-paths) + risk (Monte Carlo reachability) → intervention optimizer (greedy + ILP + lazy re-check) → explainer + verifier → human approval gate → recompute.

**v2 architecture (diagram) changes:** coverage map for blind spots, clustered likelihood ratios, shared latents (key/host/CVE/role), nested Monte Carlo, two risk views (pre-breach vs assume-breach), value-of-information, `do(latent)` fixes, and held-out scenario families.

**Prototype `chokepoint.py`** (from another AI session, **not in this folder, unverified**) claims: Bayesian GNN, next-hop top-1 0.40 vs CVSS-only 0.33 vs random 0.24 with an oracle ceiling of 0.41, 90% coverage after widening the posterior (possibly tuned on held-out data), greedy = exhaustive on one demo. Its path risk is a *sum over overlapping paths*, which is the flaw Monte Carlo is meant to fix.

---

## 2. What this folder is

`attack_path_dataset/` contains a **seeded synthetic data generator** and its **output**: three related datasets.

| Dataset | Folder | Purpose |
|---|---|---|
| A. Digital twin | `data/model_input/` (scenarios, assets, relationships, interventions, what_if) | build the graph |
| B. Telemetry | `data/model_input/` (events, evidence) | ingest, normalise, score |
| C. Ground truth | `data/ground_truth/` | **evaluation only** |

**Everything is synthetic.** Names are invented syllables, IPs are documentation/private ranges, geo codes are reserved user-assigned codes, CVE-like ids start with `SYN-`. This satisfies the rulebook's "clearly labelled synthetic data" requirement, but the README must still say so.

### Setup (about 2 minutes)

```bash
unzip attack_path_dataset.zip && cd attack_path_dataset
python3 --version            # 3.9+ needed; built and tested on 3.13 only. No pip installs.
python3 generate_dataset.py --validate-only --out .     # prints VALID if the shipped data is intact
python3 tests/test_dataset.py                            # 4 PASS lines
```

Regenerate (**this deletes and rewrites `data/model_input` and `data/ground_truth`**):

```bash
python3 generate_dataset.py --preset standard --out .    # 60 scenarios, ~11k events, ~2 s
python3 generate_dataset.py --preset smoke --out /tmp/x  # 6 scenarios, for fast dev
python3 generate_dataset.py --preset standard --seed 7 --out /tmp/y   # a different realisation
python3 generate_dataset.py --verify-repro --preset standard          # same seed twice -> same checksums
```

Other flags: `--noise-pct 0.15`, `--decoy-pct 0.10`, `--difficulty controlled|mixed|hard`, `--preset extended` (240 scenarios). Checksums depend on the Python minor version (recorded in `manifest.json`), so teammates on different Python versions may see different bytes for the same seed. That is expected. Use the shipped data as the shared reference.

### Standard dataset, validated numbers (from `validation_report.json`)

60 scenarios (6 templates × 10), 1,576 assets, 3,589 candidate edges, 11,253 events, 258 candidate fixes, 125 true feasible paths in total, 20 what-if requests (S6 only). Event classes: relevant 22%, benign 37%, ambiguous 16%, decoy 9.5%, defensive 10%, other 5%. Edges: 54% exist-and-feasible, 24% exist-but-not-feasible, 23% don't exist. Split: 36 train / 12 validation / 12 test, stratified by template.

### The six scenario templates (their family is hidden from the engine on purpose)

| ID | Name | Tests | Feasible paths |
|---|---|---|---|
| S1 | benign baseline | no false alarm | 0 |
| S2 | direct exposure | reachability | 1–2 |
| S3 | multi-hop compromise | weak signals fused over ≥2 hops | 1–3 |
| S4 | loud decoy | a high/critical alert on a host with no route to the target must rank below the real path | 1–3 |
| S5 | alternate routes | choke points over multiple routes | 2–5 |
| S6 | intervention + what-if | a fix removes paths; a hypothetical change may restore a route | 2–5 |

Template mapping is only in `data/ground_truth/scenario_index.jsonl`. Scenario ids are opaque (`scn_0001`…) and shuffled.

---

## 3. Hackathon rules (from the rulebook PDF; contact numbers are on its page 15)

**Schedule (IST):** coding began 14 Oct 10:00. Judging R1 15 Oct 8:30–11:00. **Checkpoint 1: 15 Oct 13:00.** Judging R2 15 Oct 18:30–20:30. **Checkpoint 2: 15 Oct 21:30.** **Bug bounty attack 16 Oct 00:00–02:00, fixing 02:00–03:30.** Judging R3 + bug bounty evaluation 16 Oct 8:30–10:00. Shortlisting 10:00–10:30. Finals 10:30–13:00. Valedictory 15:00–16:00. ("Day 2" = 15 Oct, "Day 3" = 16 Oct.)

**Development:** problem statement released at start; do not reuse pre-event code, designs, schemas, prompts or completed features. Public libraries/APIs/pretrained models allowed with licence and attribution. **Generative AI allowed; disclose each tool and its purpose in the README.** Cite third-party code, datasets and models. Similarity checks may run. Mentors may advise but must not write code or do your bug-bounty testing.

**GitHub:** use the official repo. Merge into `main` before each evaluation deadline. **One meaningful commit at least every 120 minutes** (empty/cosmetic/split commits don't count). No force-push, no history rewriting. No secrets in the repo; provide `.env.example`.

**Data:** only licensed public, organizer-provided, anonymised or clearly labelled synthetic data. No real sensitive personal data.

**Deployment and docs:** at least one valid delivery method (public URL, LAN, reproducible Docker build, or mobile build) kept working until the hackathon ends. README must include: project and team details, solution summary, architecture and stack, supported environments, dependencies, install and run commands, deployment/access details, env vars, database setup, test instructions, known limitations, **AI tools used, third-party resources and synthetic data disclosure**, Dockerfile and commands if containerised. Provide a test account or safe account creation. Evaluators must test without admin credentials and without you paying for quota.

**Objectives document** before Judging R1 and again before R2 (format announced during the event). It is scored for completion; missing it can forfeit those points.

**Checkpoint 1 (15 Oct 13:00):** working deployment, backend/API reachable, **one working end-to-end functionality**. For ML/AI solutions: a working **Jupyter notebook** showing the trained model and inference on sample inputs, plus deployment/container instructions.

**Checkpoint 2 (15 Oct 21:30):** substantially functional; **at least five major APIs or equivalent core operations**; databases/models/auth working; for ML/AI, the **trained model artifact (.pkl/.pt/.h5/.onnx) committed to the repo and the deployed API wired to it**; **real inputs produce real outputs, not hardcoded results**; evaluators can test without private help.

**Bug bounty:** single repo with branches `main`, `bugbounty`, `fixing`. `bugbounty` freezes read-only at 16 Oct 00:00 and is what gets deployed for peers to attack. Fixes go on `fixing` (branch off `bugbounty`) during 02:00–03:30, then merge into `main`. Each team may file at most 10 bugs, at most 4 against one team. No DoS, destructive testing, phishing or malware; stop and report critical findings privately. **Missing setup documentation disqualifies a team from bug bounty.** Bypassing the freeze is immediate disqualification.

**Not stated in the rulebook (still unknown, ask organizers/teammates):** team size and roles, the judging rubric, number of finalists, presentation/Q&A limits, final submission deadline, whether the demo is live or recorded, which LLM/API access the team has.

---

## 4. Dataset schema, field by field

All files are JSONL (one JSON object per line) except the `.json` files. Every row has `scenario_id`; ids like `edge_007` and `identity_003` repeat across scenarios, so **always key by `(scenario_id, id)`**. Event ids (`evt_000001`…) are globally unique.

### 4.1 `data/model_input/` (the engine may read these)

**scenarios.jsonl**: `scenario_id`, `graph_version` ("v1_baseline"), `entry_points` (external entry assets), `critical_targets` (always exactly one database, criticality 5), `time_window_start/end` (120 h window), `trust_zones`, counts, `synthetic: true`.

**assets.jsonl**: `asset_id`, `asset_type`, `zone` (external/dmz/corporate/server/restricted), `exposure` (public/internal/restricted/isolated), `criticality` 1–5, `security_controls`, and **noisy** `identity_confidence`, `configuration_confidence`, `evidence_coverage` (true values are hidden). Identities (user, privileged, cloud) carry `display_name` and `email`; everything else carries `hostname` and `ip_address`. Asset types: `user_identity`, `privileged_identity`, `endpoint`, `server`, `application`, `database`, `cloud_identity`, `security_infrastructure`, `external_entry`. Ids look like `identity_003`, `identity_admin_001`, `host_004`, `server_002`, `app_001`, `db_001`, `cloud_identity_001`, `security_gateway_001`, `external_entry_001`.

**relationships.jsonl** (candidate attacker moves, directed): `edge_id`, `source_id`, `target_id`, `relationship_type` (NETWORK_REACHABILITY, AUTHENTICATES_TO, CAN_ASSUME_IDENTITY, HAS_PRIVILEGE, CAN_ACCESS_DATA, DEPLOYS_TO, TRUSTS_SERVICE, ADMINISTERS, CAN_MODIFY_CONFIGURATION), `evidence_basis` (configured / inferred / weak / unsupported), `prior_probability`. **Candidates are not all real.** About 23% don't exist and about 24% exist but don't enable the attack step. The engine's job is to estimate which are real and usable. `prior_probability` is sampled from a range set by `evidence_basis` (configured 0.70–0.95, inferred 0.25–0.60, weak 0.10–0.30, unsupported 0.02–0.10). It carries no information about whether the edge is on a true path (checked by the validator).

**interventions.jsonl** (candidate fixes, 3–6 per scenario): `intervention_id`, `category` (restrict_permission, tighten_network_rule, enforce_strong_auth, isolate_endpoint, replace_shared_identity, reconfigure_service), `name`, `cost_units` (relative; ranges 1–3 up to 6–12 by category; invented, not real costs), `affected_edge_ids`, `side_effects`, `requires_approval`.

**what_if.jsonl** (S6 only): `what_if_id`, `apply_interventions` (the fix that was deployed), `change` (`enable_relationship` with `edge_id`, or `add_relationship` with source/target/type), `base_graph_version` ("v1_baseline"), `result_graph_version` ("v3_hypothetical"). The question for the engine: after applying the fix and this change, does a feasible route to the target exist? There is no materialised "v2_post_fix" file; compute it.

**events.jsonl** (raw telemetry, time-ordered within each scenario): `event_id`, `source`, `timestamp`, `event_type`, `source_entity_raw`, `target_entity_raw` (may be null), `severity_raw`, `observed_fields`, `payload_version`.
- Seven sources: `synthetic_idp_logs`, `synthetic_cloud_audit`, `synthetic_edr`, `synthetic_secret_scan`, `synthetic_vuln_scan`, `synthetic_netflow`, `synthetic_api_gateway`.
- **Timestamp formats differ by source:** ISO `YYYY-MM-DDTHH:MM:SSZ` (idp, cloud_audit, vuln_scan, secret_scan); epoch **seconds** (netflow); epoch **milliseconds** (api_gateway); `YYYY-MM-DD HH:MM:SS` UTC (edr).
- **Severity scales differ by source:** idp `info|warn|alert|critical`; cloud_audit `LOW..CRITICAL`; api_gateway `notice|warning|error|critical`; secret_scan `low|medium|high`; edr integer 1–10 (≤3 low, ≤6 medium, ≤8 high, else critical); vuln_scan CVSS-like float (<4 low, <7 medium, <9 high, else critical); netflow `null` (normalise to low). The mapping is lossy by design.
- **Entity references:** about 15% of events refer to an asset by alias (display name, email, hostname, IP, or upper-case variant) instead of its id. In some scenarios two identities share the same display name (emails differ by domain), so the bare name is genuinely ambiguous.
- About 3% of events are **near-duplicates** from a different sensor within 1–20 s. Do not count them as independent evidence.
- Event types: login_success, login_failure, authentication_anomaly, admin_login, mfa_challenge, token_issued, role_assigned, privilege_change, connection_observed, connection_denied, port_exposure_change, service_exposed, api_access, unusual_request_rate, service_error, policy_changed, acl_updated, policy_enforced, access_blocked, database_read, sensitive_resource_access, health_check, malware_detected, suspicious_process, secret_exposure_detected, vulnerability_detected. Names deliberately do not reveal whether an event is benign, a decoy or an attack.
- `observed_fields` hold enumerated values and numbers only, **no free-text attacker-controlled strings**. Prompt-injection testing is therefore **not covered** by this dataset.

**evidence.jsonl**: per event `source_reliability`, `collection_confidence` (use as `c_i` in the evidence-update formula), `collection_method`, `ingest_delay_seconds`.

### 4.2 `data/ground_truth/` (evaluation only)

**ground_truth.jsonl**, with `entity_type` one of:
- `relationship`: `structural_truth` (exists), `feasible_in_scenario` (exists **and** usable by the attacker), `on_feasible_path`, `observable_from_telemetry`, `supporting_event_ids`
- `path`: `path_id`, `node_ids`, `edge_ids`, `entry_id`, `target_id`, `hop_count`, `observed_edge_ids`, `observable_fraction`, `fully_observable`, `feasible_after_single_intervention` (map of fix id → still feasible?)
- `event`: `event_class` (relevant / benign / ambiguous / decoy / defensive / other), `evidence_polarity` (+1 supports an edge, −1 argues against, 0 none), `supports_edge_ids`, `against_edge_ids`, `duplicate_of`, `alias_ambiguous`, `strength`, `tags` (`stale`, `duplicate`, `control_change`, `control_effect`, `cause`)
- `trust`: per asset `identity_reliability`, `configuration_reliability`, `relationship_confidence`, `evidence_coverage`, `freshness` (exp(−age/72 h)), `last_seen`

**expected_outcomes.jsonl**:
- `intervention_outcomes`: all 2^k subsets of that scenario's fixes (`intervention_ids`, `total_cost`, `remaining_path_ids`, `paths_removed`, `all_paths_cut`), plus `min_cost_to_cut_all`, `optimal_complete_cuts`, `pareto_frontier`, `deployed_intervention_id` (S6)
- `what_if`: `creates_feasible_route` (bool) and `new_path_edge_lists`

**normalized_events.jsonl**: the answer key for your normaliser (ISO timestamp, canonical entity ids, canonical severity). **mapping_annotations.jsonl**: STRIDE categories and ATT&CK technique ids per event with status (`confirmed_in_simulation`, `supported`, `candidate`, `unmapped`); **technique ids were written from memory and `attack_version` is UNPINNED, so verify before citing**. **scenario_index.jsonl**: template, decoy host ids, alias-collision ids. **template_holdout_splits.json**: leave-one-template-out splits. `data/splits.json` (train/validation/test) is at the top of `data/`.

### 4.3 What "true" means here (read this before building metrics)

- Ground truth is a **deterministic hidden graph**. Feasible paths are entry → the single critical target over edges that exist and are usable, up to 8 hops, found by graph search and re-derived independently by the validator.
- Decoy hosts are verified to have no usable route to the target.
- Intervention outcomes are **path cuts, not probabilities**. "Risk reduction" in ground truth means paths removed and whether all are cut.
- Telemetry: true-path evidence is spread over roughly 20–78% of the window with jitter and some stale or reordered observations. About 20% of true-path edges deliberately get **no** telemetry (so some real paths are only partly observable). In S6 the deployed fix appears as `policy_changed`/`acl_updated` events around 80–88% of the window and `access_blocked` events around 90–98%; the deployed fix id is only in ground truth.
- Event fields are **correlated with relevance by a generator assumption** (for example `new_source_for_identity`, `success_after_failures`, `first_seen_pair`, `first_access_by_principal`, `bulk` reads). The classes overlap heavily on purpose (ambiguous events look much like weak evidence). Any score you get measures fit to this generator, not real attackers.

---

## 5. How to use it, by workstream

Load helpers (stdlib only):

```python
import json, collections
def rows(p):
    with open(p) as f: return [json.loads(l) for l in f if l.strip()]
def by_s(rs):
    d = collections.defaultdict(list)
    for r in rs: d[r["scenario_id"]].append(r)
    return d
MI, GT = "data/model_input/", "data/ground_truth/"
assets, rels, events = (by_s(rows(MI + n + ".jsonl")) for n in ("assets", "relationships", "events"))
sid = "scn_0001"        # replay events[sid] in file order to simulate a live feed
```

**Engine / graph (W2).** Build a typed graph per scenario from assets and relationships. Replay events in order. Write your own normaliser (using `normalized_events.jsonl` only as a labelled development stand-in or to score yours: the deployed system must process real inputs). Dedupe near-duplicates, resolve aliases (soft merges; leave ambiguous ones unresolved or low-confidence), update edge probabilities as `logit(p) = logit(prior) + Σ LLR·c_i·decay`, then Monte Carlo reachability from `entry_points` to `critical_targets`. Fit your LLR table on the **train split only**, using event labels from ground truth (a legitimate offline training step); ship the fitted table as a data file and never read ground truth at run time. Handle duplicates and correlated evidence explicitly. Start with fixed priors from `evidence_basis`; that is your baseline.

**Optimizer (W3).** Inputs: engine risk plus `interventions.jsonl`. Evaluate against `expected_outcomes.jsonl`: did your chosen fix set cut all paths, at what cost compared with `min_cost_to_cut_all`, and how close is your cost-vs-removed curve to `pareto_frontier`? Implement baselines (severity sort, highest betweenness, disable-the-user-in-the-alert) and compare. Look up a subset by `set(intervention_ids)`. Remember ground truth is deterministic path cuts, while your engine reasons probabilistically; report both.

**BGNN (W4).** The training label is `feasible_in_scenario` per edge on the **train** split; features come from assets and relationships. Baseline to beat: `prior_probability` itself (and a fixed table by `evidence_basis`). The labels come from our own generator, so be explicit that this shows learning of *this* generator. If you claim ML at Checkpoint 1/2 you need the notebook, the committed model file, and an API that actually loads it. If it doesn't beat the baselines, drop it cleanly.

**LangGraph / LLM (W5).** Use events and aliases for the identity-resolution branch; generate narrative only from engine outputs; a verifier must check numbers and edges against engine output, not just that cited event ids exist. The dataset has no hostile free text, so add your own injection probes before bug bounty.

**Frontend / API (W6).** Replay a scenario by streaming `events[sid]` in order. Candidate API surface for Checkpoint 2's "five major operations" (suggestion only): `GET /scenarios`, `POST /ingest` (event batch), `GET /graph`, `GET /paths`, `GET /risk`, `POST /optimize`, `POST /what-if`, `GET /evidence/{edge_id}`. Deployed demo data should be `data/model_input` only.

**Evaluation harness (everyone).** Run the engine on the **validation split** to tune and the **test split** once. Suggested metrics, all computable from ground truth:

```python
truth = {(r["scenario_id"], r["entity_id"]): r for r in rows(GT + "ground_truth.jsonl")
         if r["entity_type"] == "relationship"}
def brier(pred):   # pred: {(scenario_id, edge_id): probability}
    return sum((p - truth[k]["feasible_in_scenario"]) ** 2 for k, p in pred.items()) / len(pred)
```

| Metric | Against |
|---|---|
| Edge Brier / log loss / reliability | `relationship.feasible_in_scenario` (floor: Brier of raw `prior_probability`) |
| Path recall@k, precision | `path` rows (per scenario) |
| S1 false-alarm rate | S1 scenarios have zero paths |
| Decoy demotion (S4) | `scenario_index.decoy_asset_ids`; rank by path risk vs by severity |
| Normaliser accuracy | `normalized_events.jsonl` |
| Entity resolution | `normalized_events` ids; report `alias_ambiguous` events separately |
| Dedup precision/recall | `event.duplicate_of` |
| STRIDE/ATT&CK | `mapping_annotations` (status-aware; IDs unverified) |
| Fix quality | `intervention_outcomes` (cost vs `min_cost_to_cut_all`) |
| What-if | `what_if.creates_feasible_route` |
| Trust vector | `trust` rows |
| Latency | last event → ranked paths + fix plan |

Report generalisation honestly: `data/splits.json` tests new **instances** of known templates; `template_holdout_splits.json` tests an unseen **family**.

---

## 6. Suggested plan from now (my recommendation; challenge it)

**Before Judging R1 (15 Oct 08:30), about 20 h away:** pydantic contracts; loader + normaliser + dedup + alias resolution; graph with fixed priors and the evidence update; Monte Carlo reachability; optimizer with baselines and the evaluation harness on the validation split; a minimal UI replaying one scenario; the first objectives document (check the format with organizers). **Before Checkpoint 1 (13:00):** Dockerfile, deployed backend reachable, one end-to-end path (scenario in → ranked paths + fix out), README with AI-tool disclosure, and the notebook if you claim ML. **Before Checkpoint 2 (21:30):** five working operations, model artifact committed and wired if ML is claimed, no hardcoded outputs, setup docs complete. **Then:** freeze a `bugbounty` branch by 16 Oct 00:00 that anyone can run from the README, sanitise inputs, and prepare for peer attacks.

**First to cut if short:** value-of-information, attribution waterfall, BGNN (fall back to evidence-basis priors), nested Monte Carlo, public-data check, time-travel. **Never cut:** Monte Carlo reachability, optimizer with apply-and-recheck, evidence ledger, severity-vs-path-risk view.

---

## 7. Known doubts about the solution (please challenge)

**Method.** (1) Circular evaluation: generator, labels and tests share assumptions. (2) Oracle ceiling is low in the prototype, so a small gain over CVSS may be simulator-specific. (3) Independent edge sampling understates shared-credential risk; shared latents need a written factorisation (edge active = all gating latents on AND an edge-specific Bernoulli), and **this dataset has no latent layer, so that can't be scored yet**. (4) How evidence changes variance is unspecified, and value-of-information depends on it. (5) Assume-breach treats an alert as certain compromise; use P(compromised | evidence). (6) Hand-set LLRs; additive LLRs assume independence. (7) Coverage map must widen uncertainty, not lower probability. (8) ATT&CK tactic order as a prior can leak the simulator's kill chain. (9) No temporal-consistency check on paths. (10) Attribution waterfalls are order-dependent. (11) `do(latent)` is graph surgery, not learned causality; MFA is a soft intervention. (12) Costs are invented slider values; side effects are only partly modelled.

**Security of our own tool.** Prompt injection via log fields into the resolver/narrator; a verifier that checks citations but not truth; false identity merges creating phantom paths (keep merges soft, reversible and logged).

**Engineering.** About 25 boxes in v2 for under two days; nested Monte Carlo cost multiplies (use vectorised reachability, fixed budgets, common random numbers, cached samples for the UI); LangGraph checkpoints and in-memory graph can drift; LANL/OpTC mapping is large and tests detection, not fix quality (dataset details unverified).

**This dataset specifically.** Some event types are concentrated in one class (health_check, admin_login, mfa_challenge, policy_enforced, access_blocked, connection_denied, login_failure, privilege_change), which a model can exploit as a shortcut. Edges that exist but aren't usable run about 24% vs the 10–20% target. Fix costs and ATT&CK ids are unverified inventions/recollections. Replicas of a template share logic. The generator was written with an AI assistant: **disclose that in the README, and read `generate_dataset.py` so you can explain it** (it is a single file; the main steps are `build_world` → `generate_events` → `generate` → `validate`).

---

## 8. What exists and what doesn't

| Done and checked | Not done |
|---|---|
| Generator, standard + smoke datasets, validator (0 errors), 4 tests, reproducibility (same seed ⇒ same checksums) on the Python used, seed sweep | The engine, optimizer, API, UI, Dockerfile, notebook, README, objectives document |
| Opaque ids, hidden-label separation, computed (not asserted) paths | Shared-latent layer; prompt-injection probe set; hand-verified fixture; ATT&CK pinning; LANL/OpTC mapping |

**Nothing has been trained or run against this data yet**, so no performance number exists. Treat every claim above about what the dataset "tests" as a design intention until your harness shows it.



I built the three datasets with a seeded generator, and the standard preset passed my validator and a regeneration check (same seed, same checksums) with 0 errors. The standard run has 60 scenarios (6 templates × 10 replicas), 11,253 events, 1,576 assets, 3,589 candidate edges and 258 candidate fixes, and takes about 2 seconds. It is stdlib-only Python and ships in attack_path_dataset.zip.

Digital twin: assets, candidate relationships, fixes, and what-if requests for the S6 scenarios, in data/model_input/.
Telemetry: raw events from 7 sources, with different severity scales and timestamp formats, about 15% entity aliases, 3% duplicates and decoys. Evidence records are alongside, also in data/model_input/.
Ground truth: hidden edge state, feasible paths, event classes, the normalised-event answer key, STRIDE/ATT&CK annotations, trust truth, and the outcome of every subset of fixes, with the minimum-cost full cut. This is in data/ground_truth/, evaluation only.

Feasible paths are computed by graph search over the hidden edge state, not asserted. The validator re-derives them from the files on disk and checks them against the stored paths. It also checks leakage, intervention outcomes, no-op fixes, and S1–S6 invariants. Smoke runs with 10 different seeds all validate. One check failed at first. It was a false alarm: the prior-leak test used a fixed threshold that was too tight for tiny datasets, and I made it sample-size aware.

Where I changed your spec

Opaque scenario ids: scn_0001 replaces S3_replica_004, which tells the model the scenario family.
Decoy event types: decoys use ordinary event types (malware_detected, suspicious_process) and differ only in severity and placement. Your high_severity_unrelated_alert and benign_alert label themselves.
Hidden state kept separate: edge exists and exploitable, and intervention ground_truth_effect, live only in ground truth. Your example records put them in the model-facing record.
Shuffled edge ids: numbering doesn’t reveal which edges are on true paths.

Limitations

Event-type concentration: some event types sit almost entirely in one class (health_check benign, login_failure ambiguous, privilege_change ambiguous). A model could learn that shortcut, and the validator warns about it.
No shared-credential layer: each edge is a fixed hidden state, so the v2 shared-latent Monte Carlo can’t be scored against this data yet.
Edge composition: exists-but-infeasible edges come out at about 24%, above your 10–20% target.
Split scope: with only 6 templates, splits.json tests generalisation across instances, not new scenario families. I added leave-one-template-out splits for that.
ATT&CK IDs: written from memory and unpinned. Verify them before they go on a slide.
Not built: the hand-verified fixture from your Stage 1.