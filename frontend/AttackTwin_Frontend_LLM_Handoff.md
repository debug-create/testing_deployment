# AttackTwin AI — Frontend LLM Handoff & Completion Audit

**Purpose:** Give an LLM the project context it needs to inspect the current frontend repository, compare implementation against the intended product, and report exactly how close the frontend is to demo-ready.

**Important evidence boundary:** The supplied materials contain a detailed frontend specification and backend/system design notes, but they do **not** include the current frontend repository/source tree or a live deployed site. Therefore this document defines the target and the audit method; it does not pretend to know which screens are already implemented. The LLM must inspect the actual repo before assigning completion percentages.

## 1. Product in one minute

**AttackTwin AI — The Attack Path Compiler** is a cybersecurity operations interface that turns fragmented security telemetry into explainable, evidence-backed attack paths, estimates reachability risk with uncertainty, and recommends cost-aware defensive interventions. It should make the underlying system understandable to a judge in a three-minute demo.

The UI is not the risk engine. **The backend is the source of truth** for risk, probability, ranking, evidence attribution, trust, and fixes. The frontend validates and presents backend data, handles selection/filtering/replay, and visualizes changes; it must not quietly calculate its own risk scores.

### The six things the UI must prove
1. Weak signals from multiple sources combine into one attack path.
2. Severity is not the same as path risk: a critical isolated alert can rank below several weak but connected signals.
3. Risk and uncertainty are visible together (intervals, not bare percentages).
4. The optimizer can beat an intuitive fix; applying the selected fix collapses paths and reveals residual reroutes.
5. The system exposes what it does not know (coverage gaps, trust vector, next-best check).
6. Every important claim is traceable to source events and evidence.

## 2. Product demo story

The intended three-minute sequence is:
- Calm graph with a streaming event feed.
- Five low-severity alerts arrive; related edges thicken and nodes illuminate.
- A path assembles toward a crown-jewel asset; risk and uncertainty update; a verified narrative explains the evidence.
- A decoy scenario shows a critical printer-VLAN alert ranking below a connected path of lower-severity events.
- Selecting a node/edge/path opens the same underlying selection everywhere and exposes evidence.
- Fix Lab compares an intuitive action with the compiler's recommendation.
- Human approval is required before simulated application; the selected paths collapse, ghost attacker flow stops, and any residual route is surfaced.
- Trust/coverage/next-best-check and pipeline/evaluation views support the explanation.

## 3. Intended frontend stack and architecture

The specification calls for:
- React 18 + TypeScript strict mode, Vite, React Router.
- Zustand (+ immer) for client/view/replay/preferences state.
- TanStack Query for REST request/response; WebSocket for live deltas.
- Tailwind CSS with CSS-variable design tokens; Radix UI primitives.
- Cytoscape.js with `cytoscape-dagre` fallback for the attack graph.
- Custom canvas overlay for ghost-attacker particles.
- Recharts plus custom SVG charts (slopegraph, waterfall, funnel).
- Framer Motion for interface transitions; requestAnimationFrame for graph/canvas animation.
- `react-window` for large event/evidence lists; `lucide-react` icons.
- Zod validation at REST/WebSocket boundaries; date-fns for dates.
- Vitest, Testing Library, Playwright, Storybook, MSW.
- Self-hosted Inter and JetBrains Mono; no CDN fonts, remote icons, or analytics. Offline demo is a hard requirement.

**Expected modes:** live API mode; deterministic mock/replay mode (`?mock=1&scenario=A`); automatic offline fallback after repeated WebSocket failure; chaos mode is optional/P2.

## 4. Design direction

Desktop-first, dark, high-contrast, projector-safe operations console. Minimum target 1280×720, preferred 1920×1080. Motion must explain a data change, not act as decoration. Show numbers with uncertainty where available. Keep one shared selection model: selecting an entity in the graph, a path list, an event, or a narrative citation should synchronize highlights/inspector state.

Core token palette in the source spec:
- Backgrounds: `#0B0F17`, `#111827`, `#172033`, `#1E2A42`
- Text: `#E6EDF7`, `#9AA9C2`, `#66758F`
- Cyan `#22D3EE` live/selection; violet `#8B5CF6` probabilistic/AI-derived; amber `#F59E0B` inferred/warning; red `#F43F5E` compromised/critical; green `#10B981` mitigated; gold `#FBBF24` crown jewel; blue `#3B82F6` informational.
- Risk thresholds: low <25, medium 25–49, high 50–74, critical ≥75 (editable in settings).
- Every changing number should use tabular numerals. Never rely on color alone.

A separate recent design direction says: preserve the existing flower visual signature unchanged; fix seamless scroll first, then refine the professional dashboard. Preserve existing 3D graph geometry while refining text/data, make the threat map meaningfully dynamic, make the SOC view informational/actionable, and make Human Intervention a credible evidence/approval workflow. Work one page at a time; do not casually replace the visual identity or graph geometry.

## 5. Screen inventory and priority

| Screen | Route / surface | Priority | Core job |
|---|---|---:|---|
| S-01 Command Center | `/` | P0 | Status, top risk, live activity, demo entry point |
| S-02 Graph Workspace | `/graph` | P0 | Hero attack graph, events, path assembly, shared selection |
| S-03 Paths & Severity Inversion | `/paths` | P0 | Ranked paths and severity-vs-risk contrast |
| S-04 Fix Lab | `/fixes` | P0 | Fix Duel, preview, approval, simulated apply, residual paths |
| S-05 Trust & Next-best Checks | `/trust` | P1 | Trust vector and decision-relevant verification |
| S-06 Evidence Ledger | `/evidence` plus global drawer | Drawer P0; full page P1 | Trace claims to raw events |
| S-07 Coverage & Blind Spots | `/coverage` | P1 | Visibility and unmodelled-route gaps |
| S-08 Crown Jewels | `/jewels` | P1 | Critical assets and impact context |
| S-09 ATT&CK & STRIDE | `/attack` | P2 | Technique/tag context |
| S-10 Compiler Pipeline | `/pipeline` | P1 | Stage health, delay, latency, staleness |
| S-11 Evaluation Dashboard | `/eval` | P1 | Honest benchmark/ablation results |
| S-12 Model & Settings | `/settings` | P1 | Thresholds and model/config information |
| S-13 Presenter Mode | Global | P0 | One-key scripted three-minute walkthrough |

### P0 definition
P0 is not “a page exists.” It must work end-to-end in deterministic mock mode, show meaningful data, support its key interaction, handle loading/empty/error states, and survive the scripted demo without manual repair.

## 6. Backend/system model the frontend is representing

The solution design describes:
- A typed directed attack graph with identities, service accounts, endpoints, servers, applications/APIs, secrets, roles, cloud assets, databases, vulnerabilities, external-entry nodes, and zone hubs.
- Normalized events from identity provider, cloud audit, EDR, secret scans, vulnerability scans, network flow, and API gateway.
- An immutable evidence ledger and provenance-linked Attack IR.
- Shared latent causes (e.g. one credential or permission can enable several edges together), rather than assuming all edges are independent.
- Separate **assume-breach** (evidence-conditioned incident) and **pre-breach** (configuration/exposure) views. Do not merge these into one headline number.
- Bayesian/log-odds evidence updates, nested Monte Carlo uncertainty, reachability risk to crown jewels, path ranking, coverage allowances for unmodelled routes, and a cost-aware intervention optimizer.
- Next-best-check / value-of-information, a measured trust vector, and a time-to-impact/data-at-risk layer.
- A structural prior head: Bayesian logistic baseline; a Bayesian GNN is only allowed if it passes the stated held-out-family gate.
- LangGraph as thin orchestration: resolver proposals, narrate-verify loop, human approval interrupt, checkpoint replay. The LLM narrates verified facts and may propose ambiguous merges; it never decides risk scores or applies fixes without approval.
- Seeded demo simulator and an independently coded attacker emulator for evaluation. Never present simulated benchmark results as real-world validation.

### Important UI implications
- Show provenance and uncertainty wherever available.
- Distinguish observed steps from inferred/possible future steps.
- Label simulated fixes as simulated; never imply real production remediation.
- Human approval is mandatory for a fix action.
- If backend data is missing, degrade gracefully and disclose it; do not invent values.
- Use the backend-provided ranking and scores; never hard-code fixture values as production truth.

## 7. Contract and runtime expectations

The full frontend spec contains the detailed TypeScript contract, REST endpoints, WebSocket envelopes, sequence/resync rules, state stores, fixtures, and screen-by-screen requirements. Treat that spec as authoritative for field names and payload shapes. Before changing types, compare them with the backend contract and flag mismatches explicitly.

Expected client stores:
- `live`: server snapshot and deltas
- `view`: selection, filters, mode, panel layout
- `replay`: cursor, live/replay mode, snapshot cache
- `prefs`: UI preferences

Expected behaviors:
- Validate incoming REST/WS data with Zod.
- WebSocket reconnect, sequence ordering, duplicate/late message handling, resync/snapshot recovery.
- URL state supports deep links for demo/team reproduction.
- Deterministic replay and offline fallback must work without external services.
- Missing optional fields hide optional features instead of crashing screens.
- All screens/components provide loading, empty, and error states.

## 8. What counts as frontend completion?

Use evidence from the actual repository, not assumptions from the spec. Mark each item `Done`, `Partial`, `Missing`, or `Blocked`, and cite the relevant file path, test, screenshot, or command output.

### Foundation and reliability
- [ ] App starts from documented clean install/build commands.
- [ ] Routes and shell match the screen inventory.
- [ ] TypeScript strict checks and production build pass.
- [ ] Zod schemas validate REST and WS boundaries.
- [ ] Live/mock modes and deterministic fixture replay work.
- [ ] WebSocket reconnect, sequence/resync, and offline fallback are tested.
- [ ] No required CDN assets; app can run offline.
- [ ] Loading/empty/error states exist for every meaningful panel.

### P0 demo path
- [ ] Command Center makes status and scenario entry clear.
- [ ] Graph Workspace renders stable, readable topology at demo resolution.
- [ ] Event feed drives graph changes in the demo scenario.
- [ ] Path assembly animation is data-driven and can be replayed.
- [ ] Paths page demonstrates severity/risk inversion.
- [ ] Evidence drawer links graph/path/narrative to actual fixture events.
- [ ] Fix Lab compares fixes, previews effects, requires approval, applies simulated action, and exposes residual route.
- [ ] Presenter mode runs the entire demo sequence with deterministic controls.
- [ ] One selection model synchronizes graph, lists, inspector, and evidence.
- [ ] No critical console errors, broken links, dead controls, or layout overflow.

### P1 judging depth
- [ ] Trust vector and next-best-check have backend/fixture provenance.
- [ ] Coverage view communicates blind spots and model uncertainty.
- [ ] Crown-jewel view explains impact weights.
- [ ] Pipeline displays stage health, latency, source delay, and staleness without fabricated measurements.
- [ ] Evaluation page distinguishes measured results from targets/placeholders.
- [ ] Settings expose only supported configuration.
- [ ] Accessibility: keyboard focus, labels, reduced motion where appropriate, non-color-only status.
- [ ] Graph and long lists remain responsive on realistic fixtures.

### P2 / polish
- [ ] ATT&CK/STRIDE exploration is useful rather than decorative.
- [ ] Chaos mode exercises drops, duplicates, delays and resync.
- [ ] Additional animation polish does not obscure data or hurt performance.

## 9. How to assess “how far have we come”

The inspecting LLM should:
1. Inventory the repo and read `package.json`, README, route definitions, app shell, stores, API client, schema/types, graph renderer, each screen, mocks/fixtures, and tests.
2. Run the documented install/build/typecheck/lint/test commands where safe. Report commands actually run and exact outcomes.
3. Map every spec requirement to implementation evidence. Do not mark a screen done merely because a component file exists.
4. Test the P0 demo sequence in mock/offline mode, using Playwright or a manual walkthrough if available.
5. Capture screenshots at 1280×720 and 1920×1080 if the environment permits; note overlap, density, hierarchy, readability, scrolling, graph clipping, and interaction feedback.
6. Identify frontend/backend contract mismatches and mocked or hard-coded values.
7. Give a weighted score: Foundation 20%, P0 demo 45%, P1 features 20%, QA/offline/resilience 10%, polish/accessibility 5%. Explain evidence for every score and mark unknowns separately.
8. Produce a prioritized punch list: **P0 blockers first**, then high-value P1 work, then polish. Each item must name files/components, expected behavior, acceptance criteria, and dependencies.
9. Never claim a feature is implemented unless repository evidence or a reproducible test supports it. If the repo cannot be accessed, state that the completion score is unassessable.

### Required output format from the audit LLM
- **Executive verdict:** demo-ready / close but blocked / not demo-ready / unable to assess.
- **Completion score:** weighted percentage, with evidence and confidence; do not score unknowns as done.
- **Scorecard:** Foundation, P0 demo, P1, QA/offline, polish/accessibility.
- **Implemented / partial / missing / blocked:** with paths and evidence.
- **Build/test results:** exact commands and pass/fail.
- **P0 blockers:** sorted by demo impact.
- **Next 5 actions:** each with files, acceptance criteria, and effort estimate.
- **Visual critique:** layout hierarchy, typography, contrast, density, animation purpose, graph legibility, responsive behavior at target desktop sizes.
- **Backend contract gaps:** payload/type mismatches, invented values, missing error handling.
- **Demo rehearsal:** walk through all beats and list where the flow breaks.
- **Unknowns:** what could not be verified.

## 10. Guardrails for the coding/audit LLM

- Do not rewrite the whole app before auditing it.
- Preserve the flower visual signature and existing 3D graph geometry unless explicitly asked to change them.
- Fix seamless scroll/section transitions before broad dashboard redesign.
- Improve one page at a time; do not silently remove existing features.
- Do not use AI-generated filler, fake telemetry, fabricated performance claims, or decorative charts without data provenance.
- Do not expose evaluation-only ground truth to the UI. Keep `data/ground_truth/` evaluation-only.
- Do not commit secrets, local absolute paths, or generated build artifacts.
- Prefer small, verifiable changes with screenshots/tests over sweeping redesigns.

## 11. Known data/context from project discussions

Recent working context reports a dataset/evaluation context of **60 scenarios, 11,253 events, 1,576 assets, 3,589 candidate relationships, and 258 candidate fixes**. Treat these as project-reported dataset figures, not as proof the current UI renders them correctly. Keep `data/ground_truth/` evaluation-only and never expose it to the UI.

The current visual direction is a desktop-first dark operations console, but the flower signature should remain unchanged. Preserve the 3D graph geometry; refine its surrounding typography, labels and data presentation. Make the threat map meaningfully dynamic, the SOC view actionable, and Human Intervention a credible evidence/approval workflow.

## 12. Source documents included

This handoff was assembled from:
- The four supplied Claude PDF-build source fragments (`part1.py` through `part4.py` excerpts). They contain technical solution design and PDF-generation code, not a finished PDF.
- The supplied **AttackTwin AI: Frontend Specification (v1)** text file, which is included in full in the Markdown after this handoff.

**Important:** The four Claude fragments look like partial Python source used to generate a larger solution document. They are not themselves the rendered PDF. This handoff gives the frontend LLM the architecture and acceptance criteria it needs, while preserving the full detailed frontend specification below.

---

# Appendix: Complete Frontend Specification (source text)

The following is the full supplied frontend specification. Treat it as the detailed implementation reference; use the summary above for the audit workflow.

# AttackTwin AI: Frontend Specification (v1)

Frontend-only spec for the mhash "Attack Path Compiler" build. It is written so that it can be cut into work packages (Section 18), handed to different people, and built against a mock backend without waiting for the real one.

---

## 0. How to use this doc

**Conventions**

| Tag | Meaning |
|---|---|
| `P0` | Must exist for the demo to work. Build first. |
| `P1` | Strongly improves the demo / judging story. Build after P0 is stable. |
| `P2` | Polish or stretch. Cut freely. |
| `S-xx` | Screen. Section 8. |
| `C-xx` | Reusable component. Section 9. |
| `FE-x` | Work package. Section 18. |
| `Contract` | The data types and message formats in Section 6 and Appendix A. Frozen early; everyone codes against it. |

**Golden rules for everyone building a part**

1. Code only against the Contract and the fixtures (Section 13). Never wait for the real backend.
2. Never hard-code a number, label or ranking that the backend should supply. Fixture numbers are placeholders.
3. Every component must have: a loading state, an empty state, an error state, and a Storybook story fed by a fixture.
4. Server is the source of truth. The UI never computes risk, probabilities or rankings. It only formats, filters and animates what it receives.
5. The app must run fully offline (no CDN fonts, no remote icons, no analytics). Hackathon Wi-Fi will fail.

---

## 1. What the UI must prove (the reason every screen exists)

The backend is an evidence-weighted attack graph with Bayesian belief, Monte Carlo risk, and a cost-aware fix optimizer. A judge cannot see any of that unless the UI makes it visible. The UI has exactly six jobs:

| # | Job | The "moment" it must deliver |
|---|---|---|
| 1 | Show weak signals becoming one path | Five low alerts light up, then snap into one red path to a crown jewel |
| 2 | Show severity is the wrong ranking | A critical alert ranks low by path risk; three low alerts rank first |
| 3 | Make probability and uncertainty visible | Thick/thin edges, intervals on every number, moving "ghost attacker" flow |
| 4 | Show the optimizer beating intuition | Fix Duel: obvious fix vs compiler's pick, then paths collapse on apply |
| 5 | Show the system knows what it does not know | Trust vector, coverage blind spots, "next-best check" |
| 6 | Make every claim traceable | Click anything, see the raw events and how they combined |

Anything that does not serve one of these six jobs is `P2`.

### 1.1 The 3-minute demo, as UI beats

| Beat | What the audience sees | Screen |
|---|---|---|
| B0 | Calm graph, noise streaming in the feed | S2 |
| B1 | 5 low alerts arrive; edges thicken, nodes glow | S2 |
| B2 | Path snaps together; risk gauge counts up; narrative streams | S2 |
| B3 | Decoy: critical alert on printer VLAN; slopegraph shows the rank inversion | S3 |
| B4 | Click an edge; evidence ledger drawer opens with raw events | S2 / S6 |
| B5 | Fix Duel; intuitive fix vs compiler's pick | S4 |
| B6 | Approval gate; Apply; paths collapse; ghost attackers die at the cut | S4 + S2 |
| B7 | Residual path appears; second cheap fix proposed; "next-best check" | S4 / S5 |
| B8 | Pipeline funnel and evaluation summary | S10 / S11 |

Presenter mode (S-13) steps through these beats with one key.

---

## 2. Principles and non-goals

**Principles**

- **Dark, high-contrast, projector-safe.** Target 1920×1080 projector. Text readable from the back of a room.
- **Show the number and its uncertainty together.** Never a bare percentage if an interval exists.
- **One selection model.** Clicking a path, edge, node, event or narrative citation selects the same underlying thing everywhere (graph, lists, inspector all highlight in sync).
- **Motion explains, never decorates.** Every animation maps to a data change (Section 11).
- **Graceful degradation.** Missing optional fields hide the feature, they do not crash the screen.

**Non-goals**

- No authentication, multi-tenant, or user management.
- No mobile layout. Desktop only (1280×720 minimum, 1920×1080 target, up to 2560×1440).
- No computation of risk/ranking in the browser.
- No real remediation actions. "Apply" calls the backend, which updates simulated state.
- No internationalisation. English only, but keep strings in one file (Appendix D).

---

## 3. Tech stack and project structure

### 3.1 Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | React 18 + TypeScript (strict) | |
| Build | Vite | Output is a static bundle served by FastAPI |
| Routing | React Router | URL carries view state (Section 7.4) |
| State | Zustand (+ immer) | Four stores (Section 7) |
| REST | TanStack Query | Only for request/response data; live data comes via WS |
| Styling | Tailwind CSS + CSS variables (tokens) | Tokens in Section 4 |
| Primitives | Radix UI | Dialog, Tabs, Tooltip, Popover, Slider, Switch, DropdownMenu |
| Graph | Cytoscape.js (+ `cytoscape-dagre` as fallback layout) | Preset positions are primary (Section 10.1) |
| Particles | Custom `<canvas>` overlay | Section 10.6 |
| Charts | Recharts (radar, bar, scatter, area) + custom SVG (slopegraph, waterfall, funnel) | |
| Animation | framer-motion (UI) + requestAnimationFrame (graph/canvas) | |
| Lists | react-window | Event feed and ledger (10k+ rows) |
| Icons | lucide-react | Bundled, no CDN |
| Validation | zod | Validate every incoming WS/REST payload at the boundary |
| Dates | date-fns | Display UTC by default, toggle to local |
| Tests | Vitest, Testing Library, Playwright, Storybook, MSW | |

**Fonts:** Inter (UI) and JetBrains Mono (IDs, numbers), self-hosted via `@fontsource`. No Google Fonts.

### 3.2 Project structure

```
frontend/
  src/
    app/                 routes, shell layout, providers, error boundary
    api/
      rest.ts            typed REST client
      ws.ts              WebSocket client (reconnect, seq, resync)
      types.ts           Contract types (Appendix A)
      schemas.ts         zod schemas mirroring types
    store/
      live.ts            server truth (snapshot + deltas)
      view.ts            selection, filters, mode, panel layout
      replay.ts          cursor, isLive, snapshot cache
      prefs.ts           persisted UI prefs (localStorage)
      selectors.ts       derived data (visible graph, top path, etc.)
    graph/
      CytoscapeCanvas.tsx
      styles.ts          node/edge style mapper (Section 10.2, 10.3)
      layout.ts          preset + fallback layout
      zones.tsx          swimlane underlay
      particles/         GhostAttackerLayer + engine
      animations/        pathSnap, fixCollapse, mergeAnim, pulse
      overlays/          coverage, preview, selection halo
    features/
      command-center/    S-01
      workspace/         S-02
      paths/             S-03
      fixlab/            S-04
      trust/             S-05
      evidence/          S-06
      coverage/          S-07
      jewels/            S-08
      attack/            S-09
      pipeline/          S-10
      eval/              S-11
      settings/          S-12
      presenter/         S-13
    components/
      atoms/             Chip, Badge, Stat, Kbd, Skeleton, EmptyState
      charts/            TrustRadar, Waterfall, Slopegraph, Pareto, Funnel
      domain/            EventCard, PathCard, FixCard, EvidenceChip, ...
    mocks/
      fixtures/          JSON snapshots, deltas, scenarios
      replay-engine.ts   plays scenario scripts over a fake WS
      msw-handlers.ts    fake REST
      scenarios/         A..E scripts (Section 13)
    styles/              tokens.css, tailwind config
    utils/               format.ts (prob, risk, time), ids.ts
  .storybook/
  e2e/                   Playwright demo-script tests
```

### 3.3 Build and run modes

| Mode | How | Use |
|---|---|---|
| Live | `VITE_API=http://localhost:8000` | Real backend |
| Mock | `?mock=1&scenario=A` | Replay engine plays fixtures locally. Default during development. |
| Auto-fallback | WS fails 3 times | Switch to bundled fixture replay, show a small "Offline replay" chip. Demo-day insurance. |
| Chaos (P2) | `?chaos=1` | Randomly drops/delays/duplicates messages to test resync |

---

## 4. Design system

### 4.1 Color tokens

```css
:root {
  /* surfaces */
  --bg-0: #0B0F17;   /* app background */
  --bg-1: #111827;   /* panels */
  --bg-2: #172033;   /* raised cards */
  --bg-3: #1E2A42;   /* hover */
  --border: #243049;
  --border-strong: #34456A;

  /* text */
  --text-1: #E6EDF7;
  --text-2: #9AA9C2;
  --text-3: #66758F;

  /* semantic accents */
  --cyan:   #22D3EE;  /* live / system / selection */
  --violet: #8B5CF6;  /* probabilistic / AI-derived */
  --amber:  #F59E0B;  /* inferred / warning */
  --red:    #F43F5E;  /* compromised / critical */
  --green:  #10B981;  /* mitigated / safe */
  --gold:   #FBBF24;  /* crown jewel */
  --blue:   #3B82F6;  /* informational */

  /* risk scale */
  --risk-low: #10B981;
  --risk-medium: #F59E0B;
  --risk-high: #F97316;
  --risk-critical: #F43F5E;
}
```

**Risk level thresholds (default, editable in S-12):** low `< 25`, medium `25-49`, high `50-74`, critical `>= 75`.

### 4.2 Source-type colors (event feed chips, waterfall bars)

| Source | Color |
|---|---|
| `idp` | `#60A5FA` |
| `cloud_audit` | `#A78BFA` |
| `edr` | `#F472B6` |
| `secret_scan` | `#FBBF24` |
| `vuln_scan` | `#FB923C` |
| `netflow` | `#34D399` |
| `api_gw` | `#22D3EE` |

### 4.3 Typography

| Use | Font | Size / weight |
|---|---|---|
| Page title | Inter | 24 / 600 |
| Panel title | Inter | 14 / 600, uppercase tracking +4% |
| Body | Inter | 14 / 400 |
| Small / meta | Inter | 12 / 400 |
| IDs, numbers, hashes | JetBrains Mono | 12-13 |
| Hero numbers (risk gauge) | Inter tabular-nums | 48-72 / 700 |
| Presenter mode | All sizes +20% | |

Use `font-variant-numeric: tabular-nums` for every changing number so tickers do not jitter.

### 4.4 Spacing, radius, elevation

Spacing scale 4/8/12/16/24/32. Radius: 6 (controls), 10 (cards), 14 (modals). Panels use 1px `--border`; elevation is shown with border + slightly lighter background, not heavy shadows. Glows (risk, selection) use `box-shadow: 0 0 0 1px color, 0 0 18px color/40%`.

### 4.5 Motion tokens

```css
--dur-fast: 120ms;  --dur-base: 220ms;  --dur-slow: 420ms;  --dur-hero: 900ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-emphasized: cubic-bezier(0.3, 0, 0, 1.15);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

Reduced motion (`prefers-reduced-motion` or a Settings toggle): no particles (replace with static directional chevrons on edges), no marching ants, no path-snap sequence (instant state), transitions shortened to 0-80ms.

### 4.6 Never rely on color alone

| Meaning | Color | Second cue |
|---|---|---|
| Edge: observed | red-orange | solid line, glow |
| Edge: inferred | amber | solid line, no glow |
| Edge: potential | slate | thin, solid |
| Edge: mitigated | green-gray | dashed, "cut" mark at midpoint |
| Edge: unknown / unmodelled | violet | dotted |
| Node type | per-type tint | distinct shape + icon |
| Severity | chip color | text label always shown |

### 4.7 Number formatting rules (one `format.ts`, used everywhere)

| Value | Rule | Example |
|---|---|---|
| Probability | Percent, 0 decimals above 10%, 1 decimal 1-10%, `<1%` below | `73%`, `4.2%`, `<1%` |
| Interval | `mean (lo-hi)` | `73% (58-84%)` |
| Risk score | Integer 0-100 plus level chip | `92 Critical` |
| Cost | Integer 1-10 with bar | `3/10` |
| Time | `HH:mm:ss` UTC; tooltip shows date and local | `02:14:09` |
| Counts | Thousands separator | `2,540` |
| Delta | Signed with arrow | `-88%` |

---

## 5. App shell and information architecture

### 5.1 Routes

| Route | Screen | Priority |
|---|---|---|
| `/` | S-01 Command Center | P0 |
| `/graph` | S-02 Graph Workspace (hero) | P0 |
| `/paths` | S-03 Paths and Severity Inversion | P0 |
| `/fixes` | S-04 Fix Lab | P0 |
| `/trust` | S-05 Trust and Next-best Checks | P1 |
| `/evidence` | S-06 Evidence Ledger | P0 (drawer) / P1 (full page) |
| `/coverage` | S-07 Coverage and Blind Spots | P1 |
| `/jewels` | S-08 Crown Jewels | P1 |
| `/attack` | S-09 ATT&CK / STRIDE | P2 |
| `/pipeline` | S-10 Compiler Pipeline | P1 |
| `/eval` | S-11 Evaluation Dashboard | P1 |
| `/settings` | S-12 Model and Settings | P1 |
| overlay | S-13 Presenter mode and Scenario controller | P0 |

### 5.2 Shell layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◈ AttackTwin   [Assume-breach | Pre-breach]   Active 78 · Exposure 31   ● Live │  <- TopBar (48px)
├────┬─────────────────────────────────────────────────────────────────────────┤
│ ⌂  │                                                                         │
│ ◎  │                                                                         │
│ ⛓  │                    ROUTE CONTENT                                        │
│ ✚  │                                                                         │
│ ◐  │                                                                         │
│ ≣  │                                                                         │
│ …  │                                                                         │
├────┴─────────────────────────────────────────────────────────────────────────┤
│ ▶ Scenario A · Beat 3/8 · [⏮ ⏯ ⏭] 1×    ━━━━●━━━━━━━━  02:14:09      (ScenarioBar, 40px)│
└──────────────────────────────────────────────────────────────────────────────┘
```

Left rail (56px, icons with tooltips, expands to 200px on hover or pin). Bottom ScenarioBar is hidden in presenter mode unless hovered.

### 5.3 Global components

| ID | Component | Priority | Behavior |
|---|---|---|---|
| G-1 | TopBar | P0 | Logo, **ViewToggle** (assume-breach / pre-breach), two RiskChips (active, exposure) always visible, ConnectionStatus, presenter toggle, settings gear |
| G-2 | LeftRail | P0 | Route icons with badges (e.g. unread alerts on Graph, pending approval on Fixes) |
| G-3 | ConnectionStatus | P0 | `● Live` (green), `● Reconnecting…` (amber), `● Offline replay` (violet), `● Viewing past` (cyan, when replay cursor not live) |
| G-4 | ScenarioBar | P0 | Scenario picker, play/pause/step, speed, timeline scrubber (full spec S-13) |
| G-5 | ToastHost | P0 | Short event toasts ("Attack path assembled: 5 signals → 1 path"). Max 3 stacked. `aria-live="polite"`. |
| G-6 | CommandPalette (`Ctrl/Cmd+K`) | P2 | Jump to node/path/event by ID or name, run actions (toggle ghost attackers, go to page) |
| G-7 | ApprovalHost | P0 | Listens for `approval_request` and opens the ApprovalModal from any screen |
| G-8 | ErrorBoundary | P0 | Per-panel boundary. A crash in one panel shows a small retry card, not a white screen |
| G-9 | ViewToggle | P0 | Segmented control. Subtitle on hover: *Assume-breach: what the attacker has likely already done. Pre-breach: what the attacker could do from today's exposure.* Changing it re-subscribes to the other view and cross-fades the graph |
| G-10 | HelpOverlay (`?`) | P2 | Keyboard shortcuts and legend |

---

## 6. Data contract (summary; full TypeScript types in Appendix A)

### 6.1 Transport

- **REST** (`/api/v1/...`) for request/response and for anything the user triggers.
- **WebSocket** (`/ws`) for live updates, one connection per tab.
- All timestamps ISO-8601 UTC. All probabilities in `[0,1]`. All risk scores `0-100`. All intervals are **90% credible intervals** `{lo, hi}`.
- IDs are opaque strings. Never parse them; the UI may display them in mono font.

### 6.2 WebSocket envelope

```ts
interface WsEnvelope<T = unknown> {
  v: 1;
  seq: number;          // strictly increasing per connection
  ts: string;           // server time
  type: ServerMsgType;
  view?: 'assume_breach' | 'pre_breach';   // present on view-scoped messages
  payload: T;
}
```

### 6.3 Server → client messages

| `type` | Payload | UI reaction |
|---|---|---|
| `hello` | `{serverVersion, scenarioId, viewDefault, features}` | Init stores; `features` toggles optional UI (e.g. `bgnn`, `llm`, `coverage`, `voi`) |
| `snapshot` | Full `Snapshot` (graph, paths, risk, trust, fixPlans, voi, narrative, coverage, pipeline) | Replace live store. Sent on connect, resync, view change, scenario reset |
| `event_batch` | `{events: SecEvent[]}` | Append to feed; pulse touched nodes |
| `graph_delta` | `{nodesAdded, nodesUpdated, nodesRemoved, edgesAdded, edgesUpdated, edgesRemoved}` | Patch graph; tween changed edge widths/colors |
| `entity_merge` | `{id, canonicalId, mergedIds, confidence, signals[]}` | Merge animation (10.8) |
| `merge_proposal` | `{id, aId, bId, confidence, signals[]}` | Dashed "?" link + Accept/Reject card |
| `paths_update` | `{paths: AttackPath[], newTopPathId?}` | Replace path list; if `newTopPathId` is new, trigger path-snap (10.7) |
| `risk_update` | `RiskSummary` | Tween gauges and chips |
| `trust_update` | `TrustVector` (for selected/top path) | Morph radar |
| `fix_plan_update` | `{plans: FixPlan[], pareto: ParetoPoint[]}` | Refresh Fix Lab |
| `voi_update` | `{checks: VoICheck[]}` | Refresh next-best-check cards |
| `attribution_update` | `{pathId, steps: AttributionStep[]}` | Refresh waterfall |
| `narrative_chunk` | `{pathId, sentence: NarrativeSentence}` | Stream sentences in |
| `narrative_state` | `{pathId, status, mode}` | Update drafting/verifying/verified/fallback badge |
| `approval_request` | `ApprovalRequest` | Open ApprovalModal (G-7) |
| `fix_applied` | `{planId, actionIds, appliedAt}` | Trigger collapse animation (10.9) then expect `snapshot` or deltas |
| `coverage_update` | `CoverageModel` | Refresh coverage views |
| `pipeline_stats` | `PipelineStats` | Update funnel counters |
| `scenario_state` | `{scenarioId, beat, beatCount, playing, speed, cursor}` | Sync ScenarioBar |
| `replay_state` | `{cursor, isLive, min, max}` | Sync replay scrubber |
| `error` | `{code, message, recoverable}` | Toast; if not recoverable, error card |
| `ping` | `{}` | Keep-alive; client replies `pong` |

### 6.4 Client → server messages

| `type` | Payload |
|---|---|
| `subscribe` | `{view, scenarioId?, selectedPathId?}` |
| `set_view` | `{view}` |
| `select_path` | `{pathId}` (so server sends trust/attribution/narrative for it) |
| `resync` | `{lastSeq}` |
| `pong` | `{}` |

### 6.5 Sequence, ordering and resync (P0)

1. Reducers are **idempotent** and keyed by ID; applying the same delta twice must not change the result.
2. If `seq` jumps by more than 1, discard the gap, send `resync`, and wait for a `snapshot`. Buffer messages that arrive while waiting; drop those with `seq <= snapshot.seq`.
3. Reconnect uses exponential backoff 0.5s → 4s (max), then `subscribe` again. After 3 consecutive failures, switch to offline replay (Section 3.3).
4. Coalesce messages: apply all queued deltas once per animation frame (never one React render per message).

### 6.6 REST endpoints

| Method + path | Purpose | Notes |
|---|---|---|
| `GET /scenarios` | List scenarios (A-E, "full demo") | |
| `POST /scenarios/{id}/start` · `/pause` · `/step` · `/reset` · `/speed` | Scenario control | Body for speed: `{speed: 0.5\|1\|2\|4}` |
| `GET /snapshot?view=` | Full snapshot | Used for initial load and replay |
| `GET /replay?cursor=` | Snapshot at a past event index | Server uses checkpoints |
| `GET /paths/{id}` | Path detail | Includes steps, next moves |
| `GET /edges/{id}/evidence` | Evidence for an edge | Events plus LLR contributions |
| `GET /nodes/{id}` | Node detail | Attributes, linked events, aliases |
| `GET /events?cursor=&limit=&source=&relevant=` | Paged ledger | Cursor pagination |
| `POST /whatif` | Preview actions without committing | `{actionIds[]}` → hypothetical `Snapshot` |
| `POST /optimize` | Re-run optimizer with new costs/lambda | `{costs: Record<actionId, number>, lambda}` → `{plans, pareto}` |
| `POST /approvals/{id}` | Decision on a fix | `{decision: 'approve'\|'reject'\|'defer', note?}` |
| `POST /entities/merge/{id}/decision` | Accept/reject a merge proposal | `{decision}` |
| `POST /checks/{id}/resolve` | Simulate the outcome of a next-best check (demo) | `{outcome: 'confirmed'\|'not_confirmed'}` |
| `GET /coverage` | Coverage model | |
| `GET /eval/results` | Evaluation harness results | |
| `POST /eval/run` (P2) | Run mini-harness live | Streams progress via WS |
| `GET /settings` · `PUT /settings` | LLR table, priors, costs, flags, thresholds | PUT triggers recompute; UI shows "Recomputing…" until next `risk_update` |
| `POST /qa` (P2) | Grounded Q&A | `{question, pathId?}` → `{answer: NarrativeSentence[]}` |

Error shape: `{ "error": { "code": "string", "message": "string" } }`. HTTP 4xx = user-fixable, 5xx = server. The UI shows `message` in a toast and never shows stack traces.

### 6.7 Validation and missing fields

- Parse every payload with zod at the boundary. Invalid messages are dropped, logged to the console, and increment a dev-only "bad messages" counter in the status area.
- **Optional fields and what the UI does when they are absent:**

| Missing | UI behavior |
|---|---|
| `ci` on probabilities | Hide interval bands and "(lo-hi)" text; show point value only |
| `edge.flow` | Disable ghost attackers; show static directional chevrons |
| `node.pos` | Fall back to auto layout (dagre) |
| `zones` | Compute swimlanes from node bounding boxes per `zone` |
| `trust` | Show "Trust not available" card; hide risk-trust matrix |
| `voi` | Hide next-best-check cards |
| `coverage` | Hide coverage chips and overlay |
| `narrative` | Show template-free "No narrative yet" empty state |
| `features.bgnn=false` | Hide BGNN toggle; show "Fixed priors" label in Settings |

---

## 7. State management

### 7.1 Stores

| Store | Contains | Persisted |
|---|---|---|
| `live` | `snapshot` (graph, paths, risk, trust, fixPlans, pareto, voi, attribution, narrative, coverage, pipeline), `events[]` (ring buffer, 20k cap), `pendingApproval`, `mergeProposals`, `connection`, `lastSeq` | No |
| `view` | `mode` (view), `selected` (see 7.2), `hovered`, `filters`, `panels` (open/closed/size), `overlay` (`none\|coverage\|preview`), `previewPlanId`, `ghostEnabled`, `focusPathId`, `presenter` | URL + partly localStorage |
| `replay` | `cursor`, `isLive`, `min`, `max`, `cache` (LRU 50 snapshots) | No |
| `prefs` | reduced motion, UTC/local, density, ghost default, panel sizes | localStorage |

### 7.2 Selection model (P0)

```ts
interface Selection {
  pathId?: string;
  nodeId?: string;
  edgeId?: string;
  eventId?: string;
  fixPlanId?: string;
  checkId?: string;
}
```

Rules:
- Selecting a **path** also sets `focusPathId`, dims everything else on the graph, and loads that path's trust/attribution/narrative (send `select_path`).
- Selecting an **edge** opens the Edge inspector tab and highlights its `evidenceIds` in the feed and ledger.
- Selecting an **event** highlights every edge listing it in `evidenceIds` and scrolls the graph to the first one.
- Hovering shows a lightweight highlight (no inspector change). Hover state is never persisted.
- `Esc` clears selection. Clicking empty graph canvas clears node/edge selection but keeps `pathId`.
- Only one of `nodeId`/`edgeId` is set at a time; `pathId` may coexist with either.

### 7.3 Derived data (selectors, memoized)

| Selector | Returns |
|---|---|
| `selectVisibleGraph` | Nodes/edges after filters (relevant-only, node types, zones, search), with overlay and preview applied |
| `selectTopPath` | Highest-ranked path in the current view |
| `selectPathById(id)` | Path plus resolved nodes/edges/events |
| `selectEventsForEdge(id)` | Events from `evidenceIds` |
| `selectSeverityRankings` | Pairs `(severityRank, pathRank)` for the slopegraph |
| `selectJewelRisk` | Crown jewels sorted by risk |
| `selectRecommendedPlan` | Plan with `label === 'compiler_pick'` |
| `selectIntuitivePlan` | Plan with `label === 'intuitive'` |

### 7.4 URL state (deep links for demo and teammates)

`?view=assume_breach&scenario=A&path=p1&node=n12&panel=path&overlay=none&ghost=1&mock=1&present=1`

On load, parse into `view` store. On change, `replaceState` (not push) for filters; push for route changes.

### 7.5 Replay semantics

- `isLive=true`: the UI reflects the WS stream.
- Scrubbing sets `isLive=false`, fetches `GET /replay?cursor=`, and renders that snapshot read-only.
- While not live: show the cyan **Viewing past · 02:14:09 · [Return to live]** banner; disable Apply, Accept/Reject, cost sliders; keep inspection, selection and evidence drill-down working.
- Incoming WS messages while viewing past are still buffered into `live` so "Return to live" is instant.

---

## 8. Screens and features

Every screen below lists: purpose, layout, components, data, interactions, states, acceptance criteria. Wireframes are ASCII; proportions are indicative.

### S-01 Command Center (`/`) · P0

**Purpose:** the opening shot. One screen that says "here is the situation, here is what to do."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ACTIVE-INCIDENT RISK        EXPOSURE RISK       CROWN JEWELS AT RISK        │
│  ┌──────────────┐            ┌────────┐          ● customer-db-prod   92 ▮▮▮▮ │
│  │     92       │ Critical   │   31   │ Medium   ● payments-signing    18 ▮   │
│  │  (78-96)     │            │ (24-40)│          ○ salary-db            4     │
│  └──────────────┘            └────────┘                                      │
├──────────────────────────────────┬──────────────────────────────────────────┤
│  TOP ATTACK PATH                 │  RECOMMENDED FIX                         │
│  public_repo → key → ci_role →   │  Restrict CI role from prod secrets      │
│  prod_secret → customer_db       │  Risk 92 → 24  (-88%, 79-94%)            │
│  3/5 steps observed · Trust 86   │  Cost 3/10 · breaks 3 of 3 paths         │
│  [Open in graph]                 │  [Preview] [Apply…]                      │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  NOISE → SIGNAL FUNNEL           │  LIVE ALERT FEED (compact)               │
│  2,540 → 14 → 3 paths → 1 fix    │  02:14:09  cloud_audit  AssumeRole  LOW  │
│  ▇▇▇▇▇▇▇▇▇▇▇▇▇▁▁▁▁▁▁▁▁▁          │  02:13:51  secret_scan  KeyExposed  LOW  │
├──────────────────────────────────┴──────────────────────────────────────────┤
│  NARRATIVE (verified 6/6 claims cite evidence)                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Components:** RiskGauge ×2 (C-01), JewelRiskList (C-14), TopPathCard (C-04), RecommendedFixCard (C-06), FunnelMini (C-19), EventFeedCompact (C-03), NarrativeBlock (C-12).

**Interactions**
- Gauge hover → tooltip with formula note: *"Expected share of crown-jewel impact reachable. Interval = 90% credible."*
- "Open in graph" → `/graph` with `path` selected and path-snap replay available.
- "Preview" → `/graph` with preview overlay on; "Apply…" opens ApprovalModal.
- Jewel row click → `/jewels` focused on that jewel.

**States:** pre-incident (no top path): TopPathCard shows "No active attack path. Exposure risk 31." Recommended Fix card shows exposure-mode fix if any, else empty state.

**Acceptance:** gauge numbers tween (no jumps) on `risk_update`; all counters tabular; no layout shift when numbers change digit count; works with only `snapshot` loaded.

---

### S-02 Graph Workspace (`/graph`) · P0 (hero screen)

**Purpose:** the living map. Most demo time is spent here.

```
┌─────────────┬──────────────────────────────────────────────┬────────────────┐
│ EVENT FEED  │  [Noise: off] [Types ▾] [Zones ▾] [🔍 search]   │ INSPECTOR      │
│ (collapsible│  [Ghost ◉] [Coverage ○] [Layout ⟳] [Fit] [PNG] │ [Path|Node|Edge│
│  280px)     │ ┌────────────────────────────────────────────┐ │  |Fix|Story]   │
│             │ │  Internet │ CI/CD │ Prod cloud │ Data tier │ │                │
│ 02:14 LOW   │ │   ★ ──► 🔑 ──► ◇ role ──► ▭ secret ──► ▤ DB│ │ (tab content)  │
│ 02:13 LOW   │ │   ... zone swimlanes, ghost particles ...   │ │                │
│ 02:12 CRIT  │ │                                  [minimap]  │ │                │
│  …          │ └────────────────────────────────────────────┘ │                │
├─────────────┴──────────────────────────────────────────────┴────────────────┤
│ TIMELINE  ▁▂▁▁▃▁▁▁▇▁▁ ━━━━━━●━━━━  [Live]     PIPELINE: 2,540 → 14 → 3 → 1     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Panels**

| Panel | Priority | Content |
|---|---|---|
| EventFeed (left, collapsible) | P0 | Virtualized, newest on top. Chips: source color, severity, tactic. `Noise: off` filter (relevant-only). Click event → select event. New events slide in with a 200ms highlight. |
| GraphCanvas (center) | P0 | Section 10 in full |
| Toolbar (above canvas) | P0 | Filters, overlays, layout, fit, export |
| Inspector (right) | P0 | Tabs below |
| Timeline strip (bottom) | P1 | Event-density histogram, key-moment markers, scrubber (same component as S-13) |
| Pipeline strip (bottom right) | P1 | FunnelMini |

**Toolbar controls**

| Control | Behavior |
|---|---|
| Noise filter | Default **off** (relevant-only). Shows only nodes/edges within the scored subgraph plus evidence-bearing nodes. Toggle on to show everything, dimmed. |
| Node types / Zones | Multi-select checkboxes; hidden types leave dim "ghost" stubs only if they would orphan an edge |
| Search | Matches node label/ID; Enter focuses and selects. Highlights matches. |
| Ghost attackers | Switch (P0). Auto-disables if FPS < 30 for 3s with a toast |
| Coverage overlay | Switch (P1). Colors nodes by telemetry coverage, hatches blind spots |
| Layout | "Reset to curated layout" and "Auto-layout (dagre)" |
| Fit | Fit all, or fit to focused path |
| Export PNG | `cy.png({scale:2, full:true, bg:'#0B0F17'})` |

**Inspector tabs**

| Tab | Content |
|---|---|
| **Path** (P0) | PathDetail (C-05): header (rank, risk with interval, likelihood, impact), KillChainBar, step list (observed vs projected), "Attacker's next moves" (top 2-3 projected hops with probability), Attribution waterfall (C-10), actions: *Play path*, *Focus*, *Copy link* |
| **Node** (P0) | Type icon, label, zone, criticality, compromise probability with interval, coverage %, aliases (with merge confidence), attributes table, linked events, "Paths through this node" |
| **Edge** (P0) | Edge type and meaning in plain English, probability with interval, state, `latents` (shared causes, e.g. "depends on: key_03 compromised"), evidence list (EvidenceChips) with LLR contribution each, MITRE tag, fixes that cut it |
| **Fix** (P0) | Mini FixDuel (C-07) and Apply/Preview buttons |
| **Story** (P0) | NarrativeBlock (C-12) |

**Graph interactions**
- Click node/edge → select. Double-click node → focus (fit to node plus neighbors).
- Hover node → tooltip card (label, type, compromise p). Hover edge → tooltip (type, p, interval, evidence count).
- Box-select is not needed. Pan/zoom with wheel and drag; zoom limits 0.3×-3×.
- `Play path` runs the path-snap sequence again (10.7).

**Preview mode:** when `overlay=preview`, a yellow banner pins at canvas top: **Previewing: "Restrict CI role from prod secrets" · risk 92 → 24 · [Apply…] [Exit preview]**. Edges that would be cut show the mitigated style; particles on them stop. Nothing is committed until Apply.

**States:** loading skeleton graph (grey nodes pulsing); empty ("No events yet. Press ▶ to start scenario."); error card with retry.

**Acceptance:** 150 nodes / 400 edges at 60 fps with ghost attackers on; selecting anything updates feed, inspector and graph highlight within one frame; path-snap sequence is skippable with `Esc`; layout never jumps when a delta arrives.

---

### S-03 Paths and Severity Inversion (`/paths`) · P0

**Purpose:** prove "severity is not risk" and give a ranked list of paths.

```
┌─────────────────────────────────────┬───────────────────────────────────────┐
│ SEVERITY RANK            PATH RISK  │ RANKED PATHS                          │
│  1 ● Malware printer-VLAN ─╲╱─ 1 ■ Leaked key→CI→DB      92 (78-96)      │
│  2 ● Brute force VPN      ──╲─ 2 ■ Dev laptop→CI→DB       71 (55-83)      │
│  3 ○ New ASN login        ─╱╲─ 3 ■ Stale VPN cred→…        9 (3-18)       │
│  4 ○ Key in public repo   ╱  ╲ …  ■ Printer malware…       <1 (no known route)│
│  (lines connect the same item; crossing lines = inversion) │               │
├─────────────────────────────────────┴───────────────────────────────────────┤
│ TABLE: Alert/cluster | Source severity | Path-risk rank | Risk (interval) | Reaches jewel? | Verdict │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Components:** Slopegraph (C-09, hero), PathList (C-04 stacked), SeverityRiskTable (C-08).

**Slopegraph spec**
- Left column: items ordered by **source severity** (`maxSourceSeverity`, ties by time). Right column: same items ordered by **path-risk rank**.
- One line per item. Line color = verdict (red = elevated by path risk, grey = unchanged, green = demoted). Line weight = |rank change|.
- Hover a line highlights the row in both columns and in the table. Click selects the path (or cluster).
- On load, lines **draw from left to right** over 700ms (stroke-dashoffset). If a new `paths_update` re-orders items, lines **tween** to new positions (400ms).
- Items with no route show right-column label `No known route · coverage 92%` and an info icon: *"Absence of a route means no route in the modeled graph. Telemetry coverage for this zone is 92%."* Coverage comes from `path.coverage`.

**Table columns:** alert/cluster title · source severity chip · severity rank · path-risk rank · risk bar with interval · "Reaches crown jewel?" (Yes/No/Unknown) · verdict chip (`Elevated`, `Deprioritized`, `Unchanged`).

**Acceptance:** with fixture Scenario B the critical printer alert visibly crosses down while three low items cross up; slopegraph is legible at 1920×1080 from a distance; every row is keyboard-focusable (the table is the accessible equivalent).

---

### S-04 Fix Lab (`/fixes`) · P0

**Purpose:** the money shot: the optimizer beating human intuition, applied live.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FIX DUEL                                                                    │
│ ┌──────────────────────────┐   VS    ┌──────────────────────────────────┐  │
│ │ HUMAN INTUITION          │         │ ★ COMPILER'S PICK                │  │
│ │ Disable contractor acct  │         │ Restrict CI role from prod       │  │
│ │ Breaks 1 of 3 paths      │         │ secrets                          │  │
│ │ Risk 92 → 63 (-32%)      │         │ Breaks 3 of 3 paths              │  │
│ │ ▮▮▮▮▮▮▮▮▮▯ → ▮▮▮▮▮▮▯▯▯▯  │         │ Risk 92 → 24 (-88%, 79-94%)      │  │
│ │ Cost 5/10 (used by 41    │         │ Cost 3/10 (used by 3 pipelines,  │  │
│ │ benign events/30d)       │         │ 12 benign events/30d)            │  │
│ │ Side effects: contractor │         │ Side effects: nightly deploy     │  │
│ │ loses access to 2 repos  │         │ needs a new scoped secret        │  │
│ │ [Preview] [Apply…]       │         │ [Preview] [Apply…]               │  │
│ └──────────────────────────┘         └──────────────────────────────────┘  │
├────────────────────────────────────────┬────────────────────────────────────┤
│ COST MODEL (drag to re-plan)           │ COST vs RISK REDUCTION (Pareto)    │
│ revoke_key         ▬▬▬●▬▬▬▬▬▬▬  3      │   100%│        ●─●●                │
│ disable_account    ▬▬▬▬▬●▬▬▬▬▬  5      │       │    ●─●                      │
│ remove_role_bind   ▬▬▬●▬▬▬▬▬▬▬  3      │       │ ●                           │
│ patch_cve          ▬▬▬▬▬▬▬●▬▬▬  8      │       └───────────── total cost     │
│ λ (cost weight)    ▬▬▬▬●▬▬▬▬▬▬ 0.4     │  ◉ = current recommendation         │
├────────────────────────────────────────┴────────────────────────────────────┤
│ RESIDUAL AFTER FIX: 1 path remains (stale VPN credential, risk 9)  [Show]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Components:** FixDuel (C-07) with two FixCards (C-06), CostSliders (C-16), ParetoChart (C-17), ResidualBanner (C-18), ApprovalModal (C-15), MiniGraphPreview (C-20, P1).

**FixCard fields:** label chip, action(s) text, `pathsBroken/pathsTotal`, risk before → after with interval (two bars), reduction % with interval, disruption cost (bar + **basis text** from `cost.basis` and `benignUsage`), side effects list, recommendation chip (`Best`, `Not best`, `Later`), rationale bullets, buttons.

**Flows**

1. **Preview:** `POST /whatif` → returns hypothetical snapshot → store as `previewSnapshot`, set `overlay=preview`, navigate to `/graph` (or show MiniGraphPreview inline). Exit restores live.
2. **Apply:** button opens ApprovalModal (C-15). Modal content: action summary, risk before/after, trust mini-vector, decision hint from the risk-trust matrix (e.g. *"High risk, high trust: prioritize immediately"* or *"High risk, medium trust: human approval required"*), side effects, buttons **Approve and apply** / **Reject** / **Defer**. Disabled when not live. On approve → `POST /approvals/{id}`.
3. **After approve:** pending state "Applying…" (spinner, buttons disabled) → `fix_applied` arrives → run collapse animation (10.9) → new snapshot → Residual banner if `residualPaths.length > 0`.
4. **Cost sliders:** on change, debounce 250ms → `POST /optimize` → new plans + Pareto. When the recommended plan changes, flash the new card border (violet pulse 600ms) and show a toast: *"Recommendation changed: disable_account is now cheaper than restricting CI role."* Reset button restores server defaults.
5. **Pareto chart:** x = total disruption cost, y = risk reduction %. Points on the frontier connected by a step line. Hover → tooltip with the action set. Click → select that plan (becomes "Preview"-able). Marker `◉` for current recommendation, `●` for others.

**Acceptance:** fixture Scenario C shows 32% vs 88% side by side; applying the compiler's pick collapses the graph and lowers the headline risk with a ticker; Apply is impossible without passing the modal; dragging a slider re-plans in under ~500ms against the mock.

---

### S-05 Trust and Next-best Checks (`/trust`) · P1

**Purpose:** show the system knows what it doesn't know, and what to verify next.

```
┌───────────────────────────────┬─────────────────────────────────────────────┐
│ TRUST VECTOR (radar, 8-9 axes)│ AXIS DETAILS                                │
│        Evidence               │ ▸ Path stability        0.87  [formula ⓘ]   │
│   Coverage   Source           │ ▸ Entity resolution     0.42  ⚠ weakest      │
│  Freshness     Stability      │ ▸ …                                          │
│  ER conf.   Action safety     │                                              │
│  OVERALL (weakest link): 42   │                                              │
├───────────────────────────────┴─────────────────────────────────────────────┤
│ RISK × TRUST MATRIX    (3×3, current position ●)   Decision: Collect evidence│
├─────────────────────────────────────────────────────────────────────────────┤
│ NEXT-BEST CHECKS                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ ① Confirm gh:priya-dev ≡ priya@corp  · changes best fix in 38% of     │   │
│ │    worlds · expected value of info +14 risk-pts                       │   │
│ │    [Show on graph]  [Resolve: ✔ confirmed | ✖ not confirmed]          │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Components:** TrustRadar (C-11), TrustAxisCard, RiskTrustMatrix (C-13), VoICard (C-21).

**Rules**
- Axis count is dynamic (take `trust.axes.length`). Radar normalizes each axis 0-1.
- **Overall trust is the weakest link**, shown as `overall` from the server, with the weakest axis highlighted (amber outline on radar vertex and card). Never compute it client-side.
- Each axis card: label, value (2 decimals), mini bar, `formula` text (small mono), `detail`, and `improveHint` as a link-style action that triggers the matching VoI card highlight.
- Risk × Trust matrix: rows = risk (Low, Med, High), columns = trust (Low, Med, High). Cell text = decision label; current cell has a pulsing dot. Cell labels come from the server `decision`; the grid copy comes from the static table in Appendix D.
- VoICard shows: title, instruction, `decisionChangeProb` (as "changes the best fix in X% of scenarios"), `evpi` (risk points), `uncertaintyBefore` interval on the target edge, buttons **Show on graph** (focus the edge) and **Resolve** (demo-simulated outcomes).
- On **Resolve**, call `POST /checks/{id}/resolve`. Expect `voi_update`, `risk_update`, `trust_update`. UI animates: the uncertainty interval on that edge collapses to a point (400ms), the radar morphs, a toast says *"Uncertainty on this edge dropped from ±31% to ±4%."*

**Acceptance:** radar morphs smoothly between updates; weakest axis is obvious; Scenario D fixture shows a high-risk/low-trust state with the ER check as the top VoI card; resolving it raises trust and changes the decision label.

---

### S-06 Evidence Ledger (`/evidence` and global drawer) · P0 drawer, P1 full page

**Purpose:** "every claim is traceable."

**Drawer (P0):** opens on the right (480px) when an edge/event citation is clicked, from any screen. Shows event cards for the evidence list, each with: id, time, source chip, actor → target, action, severity chip, confidence, ATT&CK tactic chip, STRIDE chip, LLR contribution (e.g. `+1.8 log-odds`), and an expandable **Raw JSON** block with copy button.

**Full page (P1):** virtualized table.

| Column | Notes |
|---|---|
| Time | UTC, sortable |
| Event ID | mono, copyable |
| Source | colored chip |
| Actor → Target | with entity icons; click selects node |
| Action | |
| Severity | chip |
| Tactic / STRIDE | chips |
| Relevant | dot (relevant to a scored path) |
| Linked edges | count; click selects edge |

Filters: source (multi), severity (multi), relevant-only (default on), time range, free-text search. Paging via cursor from `GET /events`. **Export CSV** exports the *currently filtered* list.

**Claim ↔ Evidence cross-link (P0):** any `[evt_102]` citation chip anywhere (narrative, step list) opens the drawer scrolled to that event.

**Acceptance:** 10k rows scroll at 60 fps; selecting an event highlights its edges on the graph even when the graph is on another route (via the shared selection).

---

### S-07 Coverage and Blind Spots (`/coverage`) · P1

**Purpose:** answer "what if the graph is missing something?"

**Layout:** top: a **zone × source heatmap** (rows = zones, columns = source types; cell = % of nodes in that zone with that telemetry). Middle left: **blind-spot list** (nodes with no telemetry, sorted by criticality), each with a "Show on graph" action. Middle right: **Unmodelled-route allowance** card: shows the small residual probability added for routes the model cannot see, per zone, and its contribution to total risk. Bottom: banner with the caveat text from Appendix D.

**Graph overlay:** Coverage overlay (S-02 toolbar) recolors nodes from red (0%) to green (100%) and hatches nodes with `coverage = 0`. Unknown/unmodelled edges (`state: 'unknown'`) render dotted violet and only appear with the overlay on.

**Acceptance:** the decoy's "No known route" label always links here; coverage numbers on the slopegraph match this page.

---

### S-08 Crown Jewels (`/jewels`) · P1

One card per crown jewel: name, impact weight, **P(reachable)** with interval, risk contribution, top 3 paths into it (click → select path), risk **sparkline** over time (from `risk_update` history kept client-side, last 200 points), number of independent entry points. Selecting a card focuses the graph on that jewel when navigating to `/graph`.

---

### S-09 ATT&CK and STRIDE (`/attack`) · P2

- **ATT&CK strip:** columns = tactics in kill-chain order (Initial Access → … → Impact). For the selected path, place event chips and edges in their tactic column. A badge says **Ordering plausible ✓** or **Ordering inconsistent ⚠** (from `path.killChain.consistent`).
- **STRIDE bar:** counts of events per STRIDE category for the selected path or all relevant events.
- Both are read-only views. Clicking a chip selects the event.

---

### S-10 Compiler Pipeline (`/pipeline`) · P1

**Purpose:** make the "compiler" metaphor tangible.

```
 Telemetry ─► Normalize ─► Resolve ─► Relevant ─► Edges ─► Paths ─► Fix
   2,540        2,540       2,498        14        37        3        1
   -            4 ms        11 ms       3 ms      9 ms     210 ms   95 ms
```

- Horizontal pipeline of 7 stage nodes (counts from `pipeline_stats.stages`). Each stage pulses (scale 1→1.08, 300ms) when its count changes.
- Between stages, small dots flow along the connector at a rate proportional to message rate.
- Under each stage: latency in ms. At the end: **Final event → ranked path: 1.8 s** (`finalEventToPathMs`).
- Clicking a stage opens a side panel with a short description (Appendix D) and the relevant live detail (e.g. under *Resolve*: list of recent merges and their confidences).
- The same strip appears compact (FunnelMini) on S-01 and S-02.

---

### S-11 Evaluation Dashboard (`/eval`) · P1

**Purpose:** prove it generalizes beyond the hand-built demo. Read-only, from `GET /eval/results`.

| Card | Chart |
|---|---|
| Top-3 path recall | Big number with interval, plus per-variant dot strip |
| Risk reduction vs baselines | Box plot or beeswarm: compiler vs severity-rank, highest-CVSS, betweenness, disable-user. Show the median and a count of variants where the compiler lost or tied |
| Greedy vs exact gap | Histogram of `greedy / ILP` ratio |
| Calibration | Reliability diagram (predicted vs observed) with diagonal; Brier score |
| Latency | Distribution (p50/p95) of event → ranked path |
| LLR sensitivity | Rank stability (Kendall tau) under ±30% LLR perturbation |
| Ablation | Table: with vs without BGNN (or "fixed priors") on calibration and recall |
| Failure analysis | Table of variants where the compiler lost: scenario params, why |

Header shows "N variants · seed 42 · held-out attack families: X". A "What this does not prove" note (Appendix D) is always visible. P2: **Run mini-harness live** button with a progress bar (WS `eval_progress`).

---

### S-12 Model and Settings (`/settings`) · P1

| Section | Controls |
|---|---|
| Evidence model | **LLR table**: rows = signal type, columns = mean LLR, σ, description; inline-editable numeric inputs with reset-to-default; changes mark the row "modified" |
| Priors | Edge-type prior table (read/edit) |
| Costs | Per-action disruption cost 1-10 (same data as Fix Lab sliders) |
| Thresholds | Risk-level cut-offs (4 numbers) |
| Feature flags | BGNN on/off (if `features.bgnn`), LLM narrative on/off, ghost attackers default, reduced motion, UTC/local |
| Danger zone | Reset scenario, clear local prefs |

Saving sends `PUT /settings`. Show a top banner **Recomputing…** until the next `risk_update`; after that, a toast with the headline change (e.g. *"Active risk 92 → 88 after LLR change"*). While not live, controls are read-only.

---

### S-13 Presenter mode and Scenario controller (global) · P0

**ScenarioBar (bottom, always available)**

| Control | Behavior |
|---|---|
| Scenario picker | A-E and "Full demo" (A→B→C→D→E in order) |
| ▶/⏸ | Start/pause the stream |
| ⏭ Step | Advance to the next **beat** (not the next event) |
| ⏮ | Restart current scenario |
| Speed | 0.5×, 1×, 2×, 4× |
| Skip to money shot | Jump to beat B2 (path assembled) |
| Reset | Clear state, back to B0 |
| Timeline | Density histogram of events by time, key-moment markers (first evidence, path assembled, fix applied), draggable playhead (see 7.5) |

**Presenter mode (`F` or `?present=1`)**
- Hides left rail, TopBar controls except RiskChips and ConnectionStatus; scales type +20%; hides dev chips.
- Shows a small **Beat HUD** bottom-left: *"Beat 3/8 · Decoy alert · press Space"*.
- Mouse idle for 3s hides the cursor and the ScenarioBar.
- **Keyboard (Appendix C):** `Space` next beat, `←/→` scrub ±1 beat, `P` pause, `R` reset, `G` ghost attackers, `1-5` jump pages, `F` toggle presenter, `Esc` skip animation / clear selection.
- Beat scripts are data (Section 14), not code, so the demo can be re-cut without a rebuild.

**Acceptance:** a full 3-minute demo can be run with only `Space`, plus clicks on the two or three intentional interactions (edge click, Apply, Approve).

---

## 9. Component catalog (reusable)

Each component: props (simplified), behavior, priority. All take data from props (never directly from the store) unless marked "connected", so they can be Storybooked with fixtures.

| ID | Component | Props (key) | Behavior / notes | Pri |
|---|---|---|---|---|
| C-01 | `RiskGauge` | `score`, `ci?`, `level`, `label`, `size: 'hero'\|'md'\|'sm'` | Semicircle or ring. Number tweens 600ms (`--ease-standard`). Interval shown as a lighter arc segment behind the needle. Color from risk scale. `aria-label="Risk 92 of 100, Critical, interval 78 to 96"`. | P0 |
| C-02 | `EventCard` | `event`, `density`, `highlight?`, `onSelect` | Time, source chip, actor → target, action, severity chip, tactic chip. 200ms background highlight on arrival. | P0 |
| C-03 | `EventFeed` (connected) | `compact?`, `relevantOnly` | Virtualized, newest first, pauses auto-scroll when user scrolls up (shows "N new ↑" pill). Keeps 20k ring buffer. | P0 |
| C-04 | `PathCard` | `path`, `selected`, `onSelect`, `variant: 'compact'\|'full'` | Rank badge, mini chain of node icons, risk (interval), trust dot, observed progress `3/5`. | P0 |
| C-05 | `PathDetail` (connected) | `pathId` | Header, KillChainBar, steps list, next moves, attribution waterfall, actions. | P0 |
| C-06 | `FixCard` | `plan`, `variant`, `onPreview`, `onApply`, `disabled` | See S-04 fields. Violet star for compiler's pick. | P0 |
| C-07 | `FixDuel` | `intuitive`, `compiler` | Two FixCards plus a center "VS" and synchronized before/after bars. Bars animate on mount (600ms stagger). | P0 |
| C-08 | `SeverityRiskTable` | `rows` | Sortable, keyboard accessible. | P0 |
| C-09 | `Slopegraph` | `items: {id,label,severityRank,pathRank,verdict}[]` | Custom SVG; draw-in and re-tween animations; hover sync. | P0 |
| C-10 | `AttributionWaterfall` | `steps`, `onSelectEvents` | Horizontal waterfall. First bar = prior log-odds, then one bar per evidence cluster colored by source, last bar = posterior. Right axis shows cumulative probability. Hover bar → highlight its events. Shows leave-one-out delta (`-12 pts if removed`) as a small label. | P1 |
| C-11 | `TrustRadar` | `axes`, `weakestKey` | Recharts radar, N axes, morph between updates (transition 400ms). | P1 |
| C-12 | `NarrativeBlock` (connected) | `pathId` | Streams sentences in with a 40ms fade stagger. Each sentence ends with citation chips. Header badge: `Drafting…` → `Verifying…` → `✓ Verified: 6/6 claims cite evidence`; fallback badge `Template summary (LLM unavailable)`. Copy button copies text with citations as `[evt_102]`. | P0 |
| C-13 | `RiskTrustMatrix` | `riskLevel`, `trustLevel`, `decision` | 3×3 grid, current cell highlighted with pulsing dot. | P1 |
| C-14 | `JewelRiskList` | `jewels` | Row: name, P(reach) bar with interval, score. Click navigates. | P1 |
| C-15 | `ApprovalModal` (global) | `request`, `onDecision` | Radix Dialog, focus-trapped. Contains: action summary, risk before → after, trust mini bars, decision hint, side effects, three buttons. `Esc` = Defer. Disabled in replay. | P0 |
| C-16 | `CostSliders` | `actions`, `costs`, `lambda`, `onChange`, `onReset` | One slider per action (1-10) plus λ. Debounced onChange (250ms). Shows basis text under each slider. | P1 |
| C-17 | `ParetoChart` | `points`, `selectedId`, `onSelect` | Recharts scatter plus step line; tooltip lists actions. | P1 |
| C-18 | `ResidualBanner` | `paths`, `onShow` | Amber banner: "1 path remains…" with Show action. Hidden when none. | P0 |
| C-19 | `FunnelMini` | `stages` | Proportional bars with counts: `2,540 → 14 → 3 → 1`. | P1 |
| C-20 | `MiniGraphPreview` | `snapshot`, `highlightEdgeIds` | Small read-only Cytoscape (no overlays). Used inside FixCards. | P1 |
| C-21 | `VoICard` | `check`, `onShow`, `onResolve` | See S-05. | P1 |
| C-22 | `KillChainBar` | `steps`, `observedUpTo` | Segmented bar of tactics, observed filled, projected hatched. | P1 |
| C-23 | `EvidenceChip` | `eventId` | Small mono chip `evt_102`; hover card with event summary; click opens drawer. | P0 |
| C-24 | `ProbabilityBar` | `p`, `ci?`, `tone` | Horizontal bar with interval whisker. Used everywhere probabilities appear. | P0 |
| C-25 | `MergeProposalCard` | `proposal`, `onDecide` | Shows both identities, confidence, signals, Accept/Reject. Appears in the feed and in the Node inspector. | P0 |
| C-26 | `GraphLegend` | `collapsed?` | Explains shapes, edge styles, glow, halo, crown marker. Collapsible, bottom-left of canvas. | P1 |
| C-27 | `ChangeToast` | `title`, `detail` | Used for recommendation changes, uncertainty drops, merges. | P0 |
| C-28 | `Stat` | `label`, `value`, `delta?`, `ci?` | Standard KPI tile with tabular numbers. | P0 |

---

## 10. Graph rendering specification (Cytoscape)

### 10.1 Layout

- **Primary: preset positions.** Each node carries `pos {x,y}` (from fixture/backend). The demo topology is small and curated; hand-placed positions look far better than auto layout. Lanes run left → right: Internet → Corp/SaaS → CI/CD → Prod cloud → Data tier, with an "OT / Printer VLAN" lane at the bottom.
- **Fallback:** if any node lacks `pos`, run `cytoscape-dagre` (`rankDir: 'LR'`, `nodeSep: 40`, `rankSep: 120`) once.
- **Never re-run global layout on deltas.** New nodes get placed at the mean of their neighbors plus small jitter (or `pos` if provided) and animate in (opacity 0→1, scale 0.6→1, 300ms). "Reset layout" reapplies preset.
- **Zones:** rendered as swimlane bands in an SVG layer *behind* Cytoscape (Cytoscape canvas background transparent). Band = rounded rect from `zones[]` or from node bbox per zone plus 32px padding; label top-left in `--text-3`. Do not use Cytoscape compound nodes.

### 10.2 Node encoding

| Property | Encoding |
|---|---|
| Shape | `identity` ellipse · `service_account` hexagon · `endpoint` round-rectangle · `server` rectangle · `application` round-rectangle (thicker) · `api` octagon · `secret` diamond · `role` round-tag · `cloud_asset` round-rectangle (dashed border) · `database` barrel · `vulnerability` triangle · `external_entry` star · `merged_identity` ellipse with stack badge |
| Icon | lucide icon rasterised to an SVG data-URI as `background-image`, fitted inside the node |
| Size | base 36px; jewels 56px; secrets 28px; vulnerabilities 26px |
| Fill | per-type tint at 20% on `--bg-2` |
| Border color | by compromise probability `p`: `<0.2` slate, `0.2-0.5` amber, `0.5-0.8` orange, `>=0.8` red |
| Border width | `2 + 4·p` px |
| Glow | `underlay-color` red, `underlay-opacity = 0.45·p`, `underlay-padding = 6 + 10·p` |
| Crown jewel | gold double border + crown glyph badge (top-right, drawn on overlay) |
| Label | below node, 11px, max 90px, ellipsis; hidden under zoom 0.6 except jewels and selected |
| Selected | cyan overlay ring (`overlay-color`, `overlay-opacity: 0.18`, `overlay-padding: 8`) |
| Dimmed | class `.dim`, opacity 0.18 |
| Uncovered | with Coverage overlay: hatched fill; coverage 0 = red outline |

### 10.3 Edge encoding

| Property | Encoding |
|---|---|
| Width | `1 + 7·p` px, clamped 1-8 |
| Color | state: `observed #FF5A3C`, `inferred #F59E0B`, `potential #5B6B8C`, `mitigated #3C4A5E`, `unknown #8B5CF6` |
| Line style | observed/inferred/potential solid, mitigated dashed, unknown dotted |
| Opacity | potential `0.35 + 0.65·p`; others 1 |
| Uncertainty halo | `underlay-color` = edge color, `underlay-opacity: 0.18`, `underlay-padding = clamp(ci.hi - ci.lo, 0, 1)·14` px (wide halo = high uncertainty). Hidden if `ci` is missing |
| Arrow | `triangle` at target, scale 0.9 |
| Curve | `straight`; parallel edges between the same pair use `bezier` with `control-point-step-size: 28` |
| Label | none by default; on hover, selected, or in a selected path: `73%` at midpoint with a dark text background |
| Cut mark | mitigated edges show a small ✕ at the midpoint (overlay layer) |
| Projected | edges in the selected path beyond `observedUpTo` use animated "marching ants" (dash offset animation on the overlay copy, not Cytoscape style) |

### 10.4 Selection and focus

- Selecting a path adds `.focus` to its nodes/edges and `.dim` to everything else (use `cy.batch`). Selecting a node focuses it plus first-order neighbors. Clearing removes both classes.
- Hover: neighbor edges brighten to opacity 1 (no `.dim` change).
- The **selection halo** is Cytoscape overlay styling; the **path highlight** is classes. Keep them independent so they compose.

### 10.5 Tooltips

Radix Popover anchored to a virtual element at the node/edge rendered position (`renderedPosition`, `renderedMidpoint`), updated on pan/zoom. Delay 150ms, close on mouseout. Content: label, type, probability with interval, evidence count.

### 10.6 Ghost attacker particle layer (the "wow")

**Purpose:** make probability visible as moving flow. Particle density along an edge is proportional to `edge.flow`, the fraction of Monte Carlo worlds in which an attacker passes through that edge toward a crown jewel (computed by the server).

**Layers**

```
[ SVG zones ]  <-  [ Cytoscape canvas ]  <-  [ Overlay <canvas> (particles + decorations, pointer-events: none) ]
```

The overlay canvas is sized to the container × `min(devicePixelRatio, 2)` and redrawn every animation frame. It reads the Cytoscape viewport transform (pan, zoom) and rendered endpoints; it never mutates Cytoscape.

**Engine (pseudo-code)**

```ts
const MAX_PARTICLES = 400;
const SPAWN_K = 6;           // particles/sec at flow = 1
const SPEED = 140;           // px/sec on screen

function frame(dt) {
  for (const e of edgesWithFlow) {                  // flow > 0.02, state != 'mitigated'
    e.acc += e.flow * SPAWN_K * dt;
    while (e.acc >= 1 && particles.length < MAX_PARTICLES) {
      particles.push({ edgeId: e.id, t: 0, speed: SPEED * (0.8 + Math.random() * 0.4) });
      e.acc -= 1;
    }
  }
  for (const p of particles) {
    const L = edgeLengthPx(p.edgeId);                // from rendered endpoints
    p.t += (p.speed * dt) / L;
    if (p.t >= 1) {
      if (isCutEdge(p.edgeId)) emitSparks(cutMarkPos(p.edgeId));
      remove(p);
    }
  }
  draw();                                            // small glowing dots, color = edge state, alpha fades in/out at ends
}
```

**Rules**
- Particles follow the straight segment between rendered endpoints (quadratic approximation through `renderedMidpoint` for `bezier` parallel edges).
- Dot radius 2.5px at zoom 1, scales with zoom (clamp 1.5-4). Color = edge state color, with a 6px soft glow (`shadowBlur`) only when under 150 particles.
- When a fix is applied, spawning stops on cut edges immediately; in-flight particles keep moving and **burst into 6 sparks** (200ms, fade) at the cut mark.
- `flow` updates from deltas change spawn rates smoothly (lerp the rate over 400ms).
- Pause the loop when the tab is hidden. If measured FPS < 30 for 3s: halve `MAX_PARTICLES`; if still < 30: auto-disable with a toast.
- Reduced motion: replace with static chevrons along high-flow edges.

### 10.7 Path-snap sequence (event → path assembly)

Triggered when `paths_update.newTopPathId` is new (or via the **Play path** button). Duration ≈ `n·180ms + 900ms`.

1. Dim non-path elements to 0.25 (150ms).
2. Starting from the entry node, for each edge in order every 180ms: tween width from its current value to the target width, color to observed/projected style, pulse the next node (underlay spike 400ms). Observed edges draw solid; projected edges start as marching ants.
3. Jewel flash: gold ring expands once (500ms).
4. Risk gauge ticks up to the new number; toast **"Attack path assembled: 5 signals → 1 path"**.
5. Leave the dim state in place until the user clears selection (`Esc`) or after 4s auto-relax to 0.5.

`Esc` during the sequence jumps to the final state.

### 10.8 Identity merge animation

On `entity_merge`: alias nodes (if present on canvas) move to the canonical node position over 600ms (`--ease-standard`), scale pulse 1→1.15→1, then a "stack ×N" badge appears and a ChangeToast shows *"Identities merged (94%): gh:priya-dev, priya@corp"*. Popover on the badge lists `signals[]` (e.g. same email prefix, same source IP).

On `merge_proposal`: draw a dashed violet line between the two nodes with a "?" chip at the midpoint (overlay). Clicking the chip (or the card in the feed) opens MergeProposalCard with Accept/Reject. Reject: line fades (300ms). Accept: normal merge animation. In both cases expect `paths_update` and `risk_update` next.

### 10.9 Fix-collapse sequence

On `fix_applied` (also played in Preview, reversible):

1. The action's target node/edge pulses green (300ms).
2. Cut edges animate to mitigated style (width → 1.5, color → mitigated grey-green, dashed) over 400ms; the ✕ cut mark scales in.
3. Particles in flight on those edges burst into sparks; spawning stops.
4. Downstream node glows tween to their new probabilities over 600ms.
5. Gauges count down to the new risk (hero ticker, 900ms).
6. If `residualPaths` exist: after 800ms pulse the residual path amber twice and show ResidualBanner.
7. Toast: **"Risk 92 → 24 (-88%)"**.

Total about 2s. Fully skippable with `Esc`.

### 10.10 Minimap and legend

- Minimap (P2): custom canvas bottom-right 160×100 showing nodes as dots (red = high compromise) and a viewport rectangle; click/drag to pan.
- GraphLegend (P1): bottom-left, collapsible.

### 10.11 Performance rules

- All class/style changes inside `cy.batch()`.
- Particles and decorations never touch Cytoscape each frame.
- Delta application ≤ 8ms for typical deltas (< 50 elements).
- Use `textureOnViewport: true` while panning/zooming above 300 elements.
- Keep Cytoscape instance stable across route changes (mount once in the shell, hide with CSS when off-route) to avoid re-initialising layout and animations.
- `ResizeObserver` → `cy.resize()` and overlay canvas resize, debounced 50ms.

---

## 11. Motion and animation catalog

| Name | Trigger | What moves | Duration / easing | Reduced-motion fallback |
|---|---|---|---|---|
| `eventArrive` | `event_batch` | Feed row slides down 8px + bg highlight; touched nodes' glow spikes | 200ms / standard; 400ms glow | Highlight only, no slide |
| `edgeTween` | `graph_delta` changes `p` | Edge width/color/halo tween | 400ms / standard | Instant |
| `pathSnap` | New top path | Sequence 10.7 | `n·180 + 900`ms | Instant final state |
| `gaugeTick` | `risk_update` | Number counts, arc sweeps | 600ms (900ms hero) / standard | Instant |
| `ghostFlow` | Always when enabled | Particles along edges | continuous | Static chevrons |
| `marchingAnts` | Projected edges | Dash offset loops | 1.2s linear loop | Static dashed |
| `mergeAnim` | `entity_merge` | Node move + pulse + badge | 600ms | Instant |
| `fixCollapse` | `fix_applied` | Sequence 10.9 | ~2s | Instant final state |
| `radarMorph` | `trust_update` | Polygon interpolates | 400ms | Instant |
| `uncertaintyCollapse` | Check resolved | Interval whisker shrinks to a point | 400ms | Instant |
| `recommendationFlip` | Plan changes after slider | Card border violet pulse + toast | 600ms | Border change only |
| `slopeDraw` | S-03 mount | Lines draw left → right; re-tween on reorder | 700ms / 400ms | Instant |
| `panelSlide` | Inspector/drawer | Translate 16px + fade | 220ms | Fade only |

All durations come from motion tokens (Section 4.5). Any animation can be skipped with `Esc`. Animations never block interaction (use non-blocking overlays, not modal states).

---

## 12. Real-time behavior and performance budgets

| Item | Budget / rule |
|---|---|
| Message coalescing | Queue incoming messages; apply once per `requestAnimationFrame` |
| Delta apply | ≤ 8ms for < 50 elements |
| Graph restyle | ≤ 16ms |
| Feed insertion | O(1) (ring buffer + virtualized list) |
| Particles | ≤ 400 active; auto-throttle below 30 FPS |
| Catch-up | If queue > 200 messages: apply the final state per ID and skip intermediate animations; show a brief "Catching up…" chip |
| Initial load | Interactive within 2s locally; JS ≤ 1 MB gzip total, Cytoscape in a lazy chunk |
| Memory | Events ring buffer 20k; replay cache 50 snapshots; risk history 200 points per jewel |
| Non-critical work | Histograms, sparklines, ledger indexing in `requestIdleCallback` |
| Visibility | Pause animation loops and WS processing of animations when the tab is hidden; still keep state current |

---

## 13. Mock server and fixtures (so the frontend ships independently)

### 13.1 What to build

| Piece | Description |
|---|---|
| `fixtures/world.json` | Northwind topology: ~70-120 nodes, edges, zones, curated `pos`, crown jewels |
| `fixtures/noise.ts` | Seeded generator of benign events (`makeNoise(n, seed)`) used by all scenarios |
| `scenarios/A..E.ts` | Typed beat scripts (13.2) |
| `replay-engine.ts` | Plays a scenario over a fake WS: speed scaling, pause, step-to-beat, seek, reset |
| `msw-handlers.ts` | Fake REST: `/whatif`, `/optimize`, `/approvals`, `/entities/merge`, `/checks/resolve`, `/events`, `/replay`, `/eval/results`, `/settings` |
| `fixtures/eval.json` | Canned evaluation results for S-11 |

### 13.2 Scenario script format

```ts
interface Beat {
  id: string;                         // 'B2'
  title: string;                      // 'Path assembles'
  hint?: string;                      // presenter hint
  autoRoute?: string;                 // route to show when entering the beat
  messages: { atMs: number; msg: WsEnvelope }[];   // relative to beat start
  onEnterUi?: UiAction[];             // e.g. select_path, toggle_ghost
}
type UiAction =
  | { kind: 'goto'; route: string }
  | { kind: 'select_path'; pathId: string }
  | { kind: 'select_edge'; edgeId: string }
  | { kind: 'open_drawer'; eventId: string }
  | { kind: 'toggle_ghost'; on: boolean }
  | { kind: 'toast'; text: string };
interface Scenario { id: 'A'|'B'|'C'|'D'|'E'; title: string; beats: Beat[]; snapshots: Record<string, Snapshot>; }
```

### 13.3 Scenarios and what the frontend must handle in each

| Scenario | Beats (summary) | Messages exercised |
|---|---|---|
| **A, Quiet Chain** | calm → 5 low events → path assembles → narrative → evidence click | `snapshot`, `event_batch`, `graph_delta`, `paths_update`, `risk_update`, `trust_update`, `attribution_update`, `narrative_chunk`, `narrative_state` |
| **B, Decoy** | critical EDR alert on printer VLAN; ranking inversion | `event_batch`, `paths_update` (reordered), `coverage_update` |
| **C, Fix Duel + Apply** | plans arrive; approval; apply; collapse | `fix_plan_update`, `approval_request`, `fix_applied`, `graph_delta`, `risk_update`, `paths_update` |
| **D, Ambiguous identity** | merge proposal; user decision; merge; trust change; VoI | `merge_proposal`, `entity_merge`, `trust_update`, `voi_update` |
| **E, Reroute** | residual path after fix; second fix; check resolve | `paths_update`, `fix_plan_update`, `voi_update` |

### 13.4 Mock REST behavior (deterministic)

- `POST /whatif` → returns a precomputed snapshot keyed by sorted `actionIds`.
- `POST /optimize` → canned logic: if `costs.disable_account <= 2` return plan set where `disable_account` becomes best; otherwise baseline. Include a 6-point Pareto set.
- `POST /approvals/{id}` approve → replay engine emits `fix_applied` (+300ms) then the post-fix deltas.
- `POST /checks/{id}/resolve` → emits `voi_update`, `risk_update`, `trust_update` with narrowed intervals.
- Add optional latency (`?latency=300`) to exercise loading states.

---

## 14. Presenter script as data

Beats for the full demo live in `scenarios/full-demo.ts`. Each beat has `title`, `hint`, `onEnterUi`, and message timing so the whole 3-minute run can be re-cut by editing data.

| Beat | Title | Route | `onEnterUi` | Key messages |
|---|---|---|---|---|
| B0 | Calm network | `/graph` | none | `snapshot`, noise `event_batch` |
| B1 | Weak signals | `/graph` | none | 5 × `event_batch` + `graph_delta` (p rising) |
| B2 | Path assembles | `/graph` | `select_path p1` | `paths_update(newTopPathId=p1)`, `risk_update`, `narrative_*` |
| B3 | Severity is not risk | `/paths` | none | critical decoy `event_batch`, `paths_update` |
| B4 | Click the evidence | `/graph` | `select_edge e3`, `open_drawer evt_147` | none (user interaction) |
| B5 | Fix duel | `/fixes` | none | `fix_plan_update`, `trust_update` |
| B6 | Approve and apply | `/fixes` then `/graph` | none | `approval_request`, `fix_applied`, deltas |
| B7 | Reroute and next check | `/fixes` | none | `paths_update` (residual), `voi_update` |
| B8 | Pipeline and proof | `/pipeline` then `/eval` | none | `pipeline_stats` |

Note: Scenario D (ambiguous identity) can be inserted between B4 and B5 if time allows.

---

## 15. Accessibility, responsiveness, browser support

**Accessibility (P1, cheap if done from the start)**

- Contrast ≥ 4.5:1 for text, ≥ 3:1 for graph strokes against `--bg-0`.
- Focus ring: 2px `--cyan` outline, 2px offset, on every interactive element.
- The graph container is `role="application"` with an `aria-label`. It is not the only way to reach information: the **path list, ledger table and inspector are the accessible equivalents** and must expose every fact the graph shows.
- A visually hidden `aria-live="polite"` region announces key moments (*"Attack path assembled, risk 92, critical"*, *"Fix applied, risk now 24"*).
- Tooltips open on focus as well as hover. Esc closes popovers and drawers.
- Never encode meaning by color only (Section 4.6).
- Respect `prefers-reduced-motion` (Section 4.5).

**Responsive / display**

| Width | Behavior |
|---|---|
| ≥ 1920 | Default layout; feed 280px, inspector 400px |
| 1440-1919 | Feed collapsed by default; inspector 360px |
| 1280-1439 | Inspector 320px; feed becomes an overlay drawer |
| < 1280 | Banner: "Best viewed at 1280px or wider" (no layout changes) |

**Browser:** latest Chrome/Edge (primary demo browser). Firefox/Safari best effort. No IE.

---

## 16. State catalog (loading / empty / error for every panel)

| Panel | Loading | Empty | Error |
|---|---|---|---|
| GraphCanvas | Grey pulsing skeleton nodes | "No events yet. Press ▶ to start a scenario." | Card with Retry; keep last good graph dimmed if available |
| EventFeed | 6 skeleton rows | "Waiting for telemetry…" | Inline retry |
| PathList / TopPath | 3 skeleton cards | "No active attack path. Exposure risk X." | Retry |
| Slopegraph | Skeleton lines | "Nothing to compare yet." | Retry |
| FixDuel | Two skeleton cards | "No fix needed right now." | Retry |
| Pareto | Skeleton axes | "Not enough plans to chart." | Retry |
| TrustRadar | Skeleton polygon | "Trust not available for this view." | Retry |
| VoI cards | Skeleton | "Nothing worth checking right now." | Retry |
| NarrativeBlock | Shimmer lines | "No narrative yet." | "Narrative unavailable" with template fallback label |
| Evidence ledger | Skeleton rows | "No events match these filters." | Retry |
| Coverage | Skeleton heatmap | "Coverage data not provided." | Retry |
| Eval | Skeleton cards | "No evaluation results found. Run the harness." | Retry |
| ConnectionStatus | n/a | n/a | After 3 fails: switch to **Offline replay** with a visible chip |

Each panel is wrapped in its own `ErrorBoundary`. A failing panel never takes down the screen.

---

## 17. Testing and QA

| Layer | Tooling | What to test |
|---|---|---|
| Unit | Vitest | `format.ts` (probability/interval/time rules), reducers (delta apply is idempotent, seq gap triggers resync), selectors, style mappers (`p` → width/color/halo), particle spawn math |
| Component | Testing Library + Storybook | Every component renders loading/empty/error/normal from fixtures; a11y checks (axe) in Storybook |
| Contract | zod + fixtures | Every fixture validates against the zod schemas; a CI step fails if a fixture drifts from `types.ts` |
| E2E | Playwright | **Demo-script test:** `?mock=1&scenario=full`, press Space through B0-B8 and assert key facts: path card appears with risk ≥ 75 (placeholder threshold), slopegraph reorders, Fix Duel shows two plans, Apply needs the modal, post-fix risk lower than pre-fix, residual banner appears |
| Resilience | Playwright + `?chaos=1` | Dropped/duplicated/out-of-order messages recover via resync; offline fallback engages after 3 WS failures |
| Performance | Playwright trace / Chrome DevTools | 60 fps with 150 nodes, 400 edges, 400 particles; no long tasks > 50ms during a delta |
| Visual | Manual (P2: Playwright screenshots) | One screenshot per beat at 1920×1080 for review |

**Browser smoke before every demo rehearsal:** run the Playwright demo-script test and the offline-fallback test.

---

## 18. Work packages (split points for the team)

Sizes are relative (S/M/L), not time estimates. Every package ends with its acceptance criteria met and Storybook stories for new components.

### Day-0 freeze (before anyone starts)

1. `api/types.ts` and `api/schemas.ts` from Appendix A.
2. Fixtures from Appendix B (expanded by FE-0 into full scenarios).
3. Design tokens (Section 4) and the shared atoms list (`Chip`, `Badge`, `Stat`, `ProbabilityBar`, `EvidenceChip`).
4. Selection model and URL params (Sections 7.2 and 7.4).

With types and fixtures frozen, lanes B and C can build in Storybook while FE-0 finishes the platform.

---

### FE-0 Foundation and mock engine · size L · blocks integration, not Storybook work

**Deliverables:** Vite+TS scaffold, Tailwind and tokens, app shell (TopBar, LeftRail, routes, ErrorBoundary, ToastHost), `api/rest.ts`, `api/ws.ts` (envelope, seq, resync, backoff, offline fallback), zod schemas, the four stores and selectors, `mocks/replay-engine.ts` and MSW handlers, Scenario A skeleton, Storybook setup, ESLint/Prettier/Vitest.
**Depends on:** Day-0 freeze.
**Acceptance:** `?mock=1&scenario=A` loads, streams messages through the store, and renders a debug JSON view; killing the WS triggers reconnect then offline replay; reducers are idempotent (unit tested).

### FE-1 Graph canvas core · size L

**Deliverables:** `CytoscapeCanvas`, style mappers (10.2, 10.3), preset layout plus dagre fallback, zone swimlanes (SVG underlay), selection and focus classes, tooltips, toolbar (filters, search, fit, layout reset, PNG export), GraphLegend, delta patching without layout jumps.
**Depends on:** FE-0 (store) or fixtures directly.
**Acceptance:** Section S-02 acceptance for the canvas; changing `p` in a fixture tweens edge width/color/halo; selection syncs with the store.

### FE-2 Event stream and ingestion UI · size M

**Deliverables:** `EventFeed` (virtualized, ring buffer, auto-scroll pause), `EventCard`, relevant-only filter, merge proposal cards (C-25), `ChangeToast`, event → node pulse hook.
**Depends on:** FE-0 store; FE-1 for node pulse (can stub).
**Acceptance:** 10k events scroll at 60 fps; new events animate in; merge proposals appear and accept/reject through the mock REST.

### FE-3 Paths, risk and severity inversion · size L

**Deliverables:** `RiskGauge`, `ProbabilityBar`, `PathCard`, `PathDetail` (without waterfall), `KillChainBar`, `Slopegraph`, `SeverityRiskTable`, S-01 Command Center, S-03 Paths page, TopBar RiskChips, ViewToggle behavior (resubscribe, cross-fade).
**Depends on:** FE-0; selection model.
**Acceptance:** S-01 and S-03 acceptance; Scenario B shows the visible inversion; gauges tween without layout shift.

### FE-4 Graph animations and overlay engine · size L

**Deliverables:** overlay canvas (particles + decorations), `GhostAttackerLayer` with FPS auto-throttle, decorations (crown badge, merge badges, "?" chips, cut marks, marching ants), `pathSnap`, `mergeAnim`, `fixCollapse`, event pulse, skip-with-Esc, reduced-motion fallbacks.
**Depends on:** FE-1.
**Acceptance:** Sections 10.6-10.9; 400 particles at 60 fps; collapse plays correctly from both Apply and Preview; `Esc` jumps to final state.

### FE-5 Fix Lab · size L

**Deliverables:** `FixCard`, `FixDuel`, `ApprovalModal` + `ApprovalHost`, `CostSliders`, `ParetoChart`, `ResidualBanner`, preview flow (`/whatif`, overlay=preview banner), apply flow, recommendation-flip feedback, `MiniGraphPreview` (P1).
**Depends on:** FE-0 (REST/WS), FE-1 (preview overlay), FE-4 (collapse; can integrate last).
**Acceptance:** S-04 acceptance; Apply impossible without modal; sliders re-plan against the mock; replay mode disables mutation.

### FE-6 Trust, value of information and attribution · size M

**Deliverables:** `TrustRadar`, trust axis cards, `RiskTrustMatrix`, `VoICard`, resolve flow with uncertainty collapse animation, `AttributionWaterfall`, S-05 page, trust mini-bars for the approval modal.
**Depends on:** FE-0; selection model.
**Acceptance:** S-05 acceptance; Scenario D shows high-risk/low-trust, resolving the check raises trust and changes the decision.

### FE-7 Evidence, narrative and ATT&CK · size M

**Deliverables:** evidence drawer (global), `EvidenceChip` hover cards, full ledger page (virtualized table, filters, CSV export), `NarrativeBlock` with streaming and verification badge, S-09 ATT&CK/STRIDE (P2).
**Depends on:** FE-0; shared selection.
**Acceptance:** S-06 acceptance; any citation chip opens the drawer at the right event; narrative states cycle drafting → verifying → verified and the fallback label works.

### FE-8 Coverage and crown jewels · size S-M

**Deliverables:** S-07 heatmap, blind-spot list, unmodelled-route card, coverage graph overlay, S-08 jewel cards with sparklines.
**Depends on:** FE-1 (overlay), FE-0.
**Acceptance:** coverage numbers match across slopegraph, S-07 and node inspector; overlay toggles without layout change.

### FE-9 Scenario control, replay and presenter mode · size M

**Deliverables:** `ScenarioBar`, timeline histogram and scrubber, replay store and banner, beat HUD, presenter mode (layout scaling, idle cursor hide), keyboard shortcuts (Appendix C), beat scripts as data, `Esc` skip-animation handling.
**Depends on:** FE-0 (engine); integrates with every screen.
**Acceptance:** S-13 acceptance; scrubbing shows past state read-only; Space runs the whole demo.

### FE-10 Pipeline, evaluation and settings · size M

**Deliverables:** S-10 pipeline view and `FunnelMini`, S-11 evaluation dashboard (all cards), S-12 settings (LLR table editor, thresholds, flags, recompute banner).
**Depends on:** FE-0; mock eval fixture.
**Acceptance:** S-10, S-11, S-12 acceptance; editing an LLR shows "Recomputing…" then a change toast.

### FE-11 Polish, resilience and demo hardening · size M

**Deliverables:** accessibility pass, empty/error states from Section 16, performance pass against Section 12, chaos mode, offline fallback verification, Playwright demo-script test, one-screenshot-per-beat review, final bundle build served by FastAPI, kiosk mode flag.
**Depends on:** all.
**Acceptance:** Definition of Done (Section 20).

---

### Parallel lanes (for a 4-person split)

| Lane | Packages in order | Shared risk |
|---|---|---|
| A, Graph | FE-0 (co-own) → FE-1 → FE-4 → FE-11 (graph perf) | Animation and particle performance |
| B, Data views | FE-2 → FE-3 → FE-7 → FE-8 | Selection sync across panels |
| C, Decision UI | FE-5 → FE-6 → FE-10 | Preview/apply flow ties to graph overlay |
| D, Platform and demo | FE-0 (owner) → FE-9 → FE-10 (pipeline) → FE-11 (e2e, build) | Contract drift with backend |

With 3 people: merge C and D. With 2 people: lane A+D and lane B+C, and drop `P2` items.

### Integration order

1. FE-0 + FE-1: graph renders from the store.
2. FE-3: paths and risk shown; selection syncs with the graph.
3. FE-2 + FE-7: feed and evidence drawer tie into selection.
4. FE-4: animations on top of working data flow.
5. FE-5 + FE-6: decision screens, preview overlay uses FE-1/FE-4.
6. FE-9: scenario controller and presenter mode wrap everything.
7. FE-10, FE-8, FE-11: remaining pages and hardening.

---

## 19. Open contract questions to settle with the backend

| # | Question | Frontend default if unanswered |
|---|---|---|
| 1 | Does the backend provide `pos` for nodes and `zones[]`? | Fixtures carry them; fallback to dagre |
| 2 | Is `edge.flow` computed from Monte Carlo and delivered per delta? | If absent, ghost attackers disabled; static chevrons |
| 3 | Are `ci` intervals available on edges, paths and risk? | Hide interval UI when missing |
| 4 | What is the granularity of `GET /replay?cursor=` (per event or per beat)? | Per beat |
| 5 | Is narrative streamed sentence by sentence or sent whole? | Handle both; whole narrative animates in as if streamed |
| 6 | How is "simulated check resolution" implemented for the demo? | `POST /checks/{id}/resolve` returns updated states via WS |
| 7 | Who decides `decision` labels (risk-trust matrix)? | Server; UI renders what it receives |
| 8 | Are risk-level thresholds server-defined or UI-defined? | UI-defined default (Section 4.1); server `level` wins if present |
| 9 | How are node merges represented in the graph (alias nodes removed, or flagged)? | Alias nodes removed; canonical node has `aliases[]` |
| 10 | Rate limits / max message rate? | Assume ≤ 10 messages/sec |
| 11 | CORS and hosting: will FastAPI serve the built bundle? | Yes; relative URLs `/api/v1` and `/ws` |
| 12 | Time zone for event times | UTC in contract; UI toggles display |

---

## 20. Definition of done and demo-day checklist

**Definition of done (frontend)**

- [ ] Full demo (B0-B8) runs end-to-end in mock mode and live mode with `Space` only (plus the 2-3 intentional clicks).
- [ ] No console errors during the demo run; zod rejects nothing from the real backend.
- [ ] 60 fps on the demo laptop at 1920×1080 with ghost attackers on; auto-throttle verified.
- [ ] Every number that has an interval shows it; no hard-coded numbers in the source (grep fixtures vs `src/`).
- [ ] Every panel has loading, empty, and error states (Section 16).
- [ ] Offline fallback proven: kill the backend mid-demo, the replay takes over with the chip visible.
- [ ] Reduced-motion mode works and loses no information.
- [ ] Playwright demo-script test and resilience test pass.
- [ ] Production bundle built and served by FastAPI; works with no internet.

**Demo-day checklist**

- [ ] Browser: Chrome, 100% zoom, display at 1920×1080, notifications off, bookmarks bar hidden.
- [ ] Open `/?present=1&scenario=full` and verify Beat HUD is visible only to the presenter (not mirrored if using a second screen).
- [ ] Rehearse beats B4 (click the edge) and B6 (approve) so the two interactions are muscle memory.
- [ ] Pre-load Scenario A once, then Reset (warms caches, fonts).
- [ ] Have the recorded screen capture of the full demo on the desktop as the last-resort fallback.
- [ ] Verify the `● Live` / `● Offline replay` chip is understandable if it appears mid-demo ("this is the recorded replay of the same scenario").

---

## Appendix A: Contract types (TypeScript)

```ts
// api/types.ts
export type View = 'assume_breach' | 'pre_breach';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type SourceType = 'idp' | 'cloud_audit' | 'edr' | 'secret_scan' | 'vuln_scan' | 'netflow' | 'api_gw';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type NodeType =
  | 'identity' | 'service_account' | 'endpoint' | 'server' | 'application' | 'api'
  | 'secret' | 'role' | 'cloud_asset' | 'database' | 'vulnerability' | 'external_entry';

export type EdgeType =
  | 'USES' | 'ACCESSES' | 'STORES' | 'GRANTS_ACCESS_TO' | 'CAN_ASSUME' | 'CAN_REACH' | 'RUNS_ON'
  | 'HAS_PERMISSION' | 'EXPOSED_IN' | 'EXPLOITS' | 'TRUSTS' | 'CAN_AUTH_WITH' | 'UNMODELLED';

export type EdgeState = 'observed' | 'inferred' | 'potential' | 'mitigated' | 'unknown';

export interface Interval { lo: number; hi: number }           // 90% credible interval
export interface Prob { p: number; ci?: Interval }

export interface Zone {
  id: string; label: string;
  rect?: { x: number; y: number; w: number; h: number };
}

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  zone: string;
  isCrownJewel: boolean;
  impact?: number;                       // 0..1, jewels only
  compromise?: Prob;                     // probability node is attacker-controlled
  coverage?: number;                     // 0..1 telemetry coverage
  aliases?: string[];                    // merged identities
  mergeConfidence?: number;
  relevant: boolean;                     // part of scored subgraph or evidence-bearing
  pos?: { x: number; y: number };
  attrs: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  state: EdgeState;
  p: number;
  ci?: Interval;
  flow?: number;                         // 0..1 share of MC worlds passing through (impact-weighted)
  relevant: boolean;
  evidenceIds: string[];
  latents?: { id: string; label: string }[];  // shared causes this edge depends on
  mitre?: string;                        // e.g. 'T1078'
  cutBy?: string[];                      // fix action ids that cut or weaken it
}

export interface SecEvent {
  id: string;
  ts: string;
  source: SourceType;
  action: string;
  actor: { type: string; id: string; label: string };
  target: { type: string; id: string; label: string };
  severity: Severity;
  confidence: number;                    // 0..1 source confidence
  tactic?: string;                       // MITRE tactic
  stride?: 'S' | 'T' | 'R' | 'I' | 'D' | 'E';
  relevant: boolean;
  llr?: number;                          // contribution (log-odds), if event is evidence
  context?: Record<string, unknown>;
  raw?: unknown;
}

export interface PathStep {
  edgeId: string;
  state: EdgeState;
  p: number; ci?: Interval;
  tactic?: string;
  evidenceIds: string[];
  ts?: string;                           // when observed
}

export interface AttackPath {
  id: string;
  rank: number;
  view: View;
  nodeIds: string[];
  edgeIds: string[];
  entry: string;
  jewel: string;
  likelihood: Prob;
  impact: number;                        // 0..1
  risk: { score: number; ci?: Interval };   // 0..100
  shareOfTotalRisk: number;              // 0..1
  observedUpTo: number;                  // number of leading steps that are observed
  steps: PathStep[];
  nextMoves?: { edgeId: string; p: number; label: string }[];
  killChain: { tactics: string[]; consistent: boolean };
  stability?: number;                    // share of samples where path stays top-K
  maxSourceSeverity: Severity;
  severityRank: number;
  coverage?: number;
  noKnownRoute?: boolean;                // for decoy items (no path to a jewel)
  title: string;                         // used by slopegraph rows
}

export interface JewelRisk { jewelId: string; p: number; ci?: Interval; impact: number; score: number }

export interface RiskSummary {
  view: View;
  total: { score: number; ci?: Interval };
  level: RiskLevel;
  byJewel: JewelRisk[];
  updatedAt: string;
}

export interface TrustAxis {
  key: string; label: string;
  value: number;                         // 0..1
  formula: string; detail: string;
  improveHint?: { label: string; checkId?: string };
}
export type Decision =
  | 'prioritize' | 'approve' | 'collect_evidence' | 'schedule'
  | 'investigate' | 'monitor' | 'deprioritize';
export interface TrustVector {
  pathId: string;
  axes: TrustAxis[];
  overall: number;                       // 0..100, weakest-link
  weakestKey: string;
  riskLevel: RiskLevel;
  trustLevel: 'low' | 'medium' | 'high';
  decision: Decision;
}

export interface FixAction {
  id: string;
  kind: 'revoke_key' | 'rotate_secret' | 'disable_account' | 'remove_role_binding'
      | 'restrict_trust_policy' | 'patch_cve' | 'close_port' | 'require_mfa';
  label: string;
  description: string;
  target: { type: NodeType; id: string; label: string };
  cost: { score: number; basis: string; benignUsage?: { events30d: number; dependents: string[] } };
  cuts: { edgeIds: string[]; latentIds: string[] };
  sideEffects: string[];
}
export interface FixPlan {
  id: string;
  label: 'compiler_pick' | 'intuitive' | 'alternative';
  actions: FixAction[];
  pathsBroken: number; pathsTotal: number;
  riskBefore: { score: number; ci?: Interval };
  riskAfter: { score: number; ci?: Interval };
  reductionPct: number; reductionCi?: Interval;
  totalCost: number;
  residualPathIds: string[];
  requiresApproval: boolean;
  recommendation: 'best' | 'not_best' | 'later';
  rationale: string[];
}
export interface ParetoPoint {
  planId: string; lambda: number; totalCost: number; reductionPct: number;
  actionIds: string[]; isRecommended: boolean;
}

export interface VoICheck {
  id: string; title: string; instruction: string;
  targetEdgeId?: string; targetNodeId?: string;
  evpi: number;                          // expected value of information, in risk points
  decisionChangeProb: number;            // 0..1
  uncertaintyBefore?: Interval;
  resolves: string;
  status: 'open' | 'resolved';
}

export interface AttributionStep {
  kind: 'prior' | 'evidence' | 'posterior';
  label: string;
  logOdds: number;                       // prior: starting value; evidence: delta; posterior: final
  cumulativeP: number;
  eventIds: string[];
  source?: SourceType;
  leaveOneOutDelta?: number;             // risk points lost if removed
}

export interface NarrativeSentence { id: string; text: string; citations: string[] }   // only verified sentences are sent
export interface Narrative {
  pathId: string;
  status: 'drafting' | 'verifying' | 'verified' | 'fallback';
  mode: 'llm' | 'template';
  sentences: NarrativeSentence[];
  claimsTotal?: number; claimsCited?: number;
}

export interface ApprovalRequest {
  id: string; planId: string; summary: string;
  trust?: TrustVector; decisionHint: string; createdAt: string;
}

export interface MergeProposal {
  id: string; aId: string; bId: string; confidence: number;
  signals: { label: string; weight: number }[];
}
export interface EntityMerge {
  id: string; canonicalId: string; mergedIds: string[]; confidence: number;
  signals: { label: string; weight: number }[];
}

export interface PipelineStats {
  stages: { key: 'ingested' | 'normalized' | 'resolved' | 'relevant' | 'edges_updated' | 'paths' | 'fix';
            count: number; latencyMs: number }[];
  finalEventToPathMs: number;
}

export interface CoverageModel {
  zones: string[]; sources: SourceType[];
  matrix: number[][];                    // zones × sources, 0..1
  blindSpots: { nodeId: string; zone: string; criticality: number }[];
  unmodelled: { zone: string; probability: number; riskContribution: number }[];
  overall: number;
}

export interface Snapshot {
  seq: number; view: View; asOf: string; cursor: number;
  graph: { nodes: GraphNode[]; edges: GraphEdge[]; zones: Zone[] };
  paths: AttackPath[];
  risk: { assume_breach: RiskSummary; pre_breach: RiskSummary };
  trust?: TrustVector;
  fixPlans: FixPlan[]; pareto: ParetoPoint[];
  voi?: VoICheck[];
  attribution?: { pathId: string; steps: AttributionStep[] };
  narrative?: Narrative;
  coverage?: CoverageModel;
  pipeline?: PipelineStats;
  pendingApproval?: ApprovalRequest;
  mergeProposals: MergeProposal[];
  recentEvents: SecEvent[];
}

export interface GraphDelta {
  nodesAdded: GraphNode[]; nodesUpdated: Partial<GraphNode>[]; nodesRemoved: string[];
  edgesAdded: GraphEdge[]; edgesUpdated: Partial<GraphEdge>[]; edgesRemoved: string[];
}

export interface EvalResults {
  n: number; seed: number; heldOutFamilies: string[];
  top3Recall: { value: number; ci?: Interval; perVariant: boolean[] };
  riskReduction: { method: 'compiler' | 'severity_rank' | 'highest_cvss' | 'betweenness' | 'disable_user'; values: number[] }[];
  compilerLost: { variantId: string; params: Record<string, unknown>; reason: string }[];
  greedyVsIlp: number[];
  calibration: { bins: { pred: number; obs: number; n: number }[]; brier: number };
  latencyMs: { p50: number; p95: number; samples: number[] };
  llrSensitivity: { tau: number[]; mean: number };
  ablation: { name: string; brier: number; top3Recall: number }[];
}

export interface Settings {
  llr: { signal: string; mean: number; sigma: number; description: string; modified?: boolean }[];
  priors: { edgeType: EdgeType; prior: number }[];
  costs: Record<string, number>;
  lambda: number;
  thresholds: { medium: number; high: number; critical: number };
  flags: { bgnn: boolean; llmNarrative: boolean };
}
```

---

## Appendix B: Sample fixtures (Scenario A, abbreviated)

All numbers are placeholders. They exist to let the frontend run before the backend does.

```json
{
  "graph": {
    "zones": [
      { "id": "internet", "label": "Internet" },
      { "id": "cicd", "label": "CI/CD" },
      { "id": "prod", "label": "Prod cloud" },
      { "id": "data", "label": "Data tier" }
    ],
    "nodes": [
      { "id": "n_repo", "type": "external_entry", "label": "public_repo", "zone": "internet", "isCrownJewel": false,
        "compromise": { "p": 0.9 }, "relevant": true, "pos": { "x": 80, "y": 220 }, "attrs": {} },
      { "id": "n_key", "type": "secret", "label": "api_key_03", "zone": "internet", "isCrownJewel": false,
        "compromise": { "p": 0.81, "ci": { "lo": 0.66, "hi": 0.9 } }, "relevant": true, "pos": { "x": 240, "y": 220 }, "attrs": {} },
      { "id": "n_role", "type": "role", "label": "ci_cd_role", "zone": "cicd", "isCrownJewel": false,
        "compromise": { "p": 0.7, "ci": { "lo": 0.5, "hi": 0.84 } }, "relevant": true, "pos": { "x": 420, "y": 220 }, "attrs": {} },
      { "id": "n_secret", "type": "secret", "label": "prod_db_secret", "zone": "prod", "isCrownJewel": false,
        "compromise": { "p": 0.62, "ci": { "lo": 0.4, "hi": 0.8 } }, "relevant": true, "pos": { "x": 600, "y": 220 }, "attrs": {} },
      { "id": "n_db", "type": "database", "label": "customer_db_prod", "zone": "data", "isCrownJewel": true, "impact": 1.0,
        "compromise": { "p": 0.55, "ci": { "lo": 0.32, "hi": 0.76 } }, "relevant": true, "pos": { "x": 780, "y": 220 }, "attrs": {} }
    ],
    "edges": [
      { "id": "e1", "source": "n_repo", "target": "n_key", "type": "EXPOSED_IN", "state": "observed",
        "p": 0.92, "ci": { "lo": 0.8, "hi": 0.97 }, "flow": 0.6, "relevant": true, "evidenceIds": ["evt_102"], "mitre": "T1552" },
      { "id": "e2", "source": "n_key", "target": "n_role", "type": "CAN_AUTH_WITH", "state": "observed",
        "p": 0.81, "ci": { "lo": 0.66, "hi": 0.9 }, "flow": 0.6, "relevant": true, "evidenceIds": ["evt_147", "evt_151"],
        "latents": [{ "id": "L_key03", "label": "api_key_03 compromised" }], "cutBy": ["act_revoke_key", "act_restrict_role"] },
      { "id": "e3", "source": "n_role", "target": "n_secret", "type": "CAN_READ", "state": "inferred",
        "p": 0.72, "ci": { "lo": 0.5, "hi": 0.86 }, "flow": 0.58, "relevant": true, "evidenceIds": ["evt_160"], "cutBy": ["act_restrict_role"] },
      { "id": "e4", "source": "n_secret", "target": "n_db", "type": "GRANTS_ACCESS_TO", "state": "potential",
        "p": 0.55, "ci": { "lo": 0.32, "hi": 0.76 }, "flow": 0.5, "relevant": true, "evidenceIds": [] }
    ]
  },
  "path": {
    "id": "p1", "rank": 1, "view": "assume_breach",
    "nodeIds": ["n_repo", "n_key", "n_role", "n_secret", "n_db"], "edgeIds": ["e1", "e2", "e3", "e4"],
    "entry": "n_repo", "jewel": "n_db",
    "likelihood": { "p": 0.55, "ci": { "lo": 0.32, "hi": 0.76 } }, "impact": 1.0,
    "risk": { "score": 92, "ci": { "lo": 78, "hi": 96 } }, "shareOfTotalRisk": 0.7,
    "observedUpTo": 3, "killChain": { "tactics": ["Credential Access", "Privilege Escalation", "Collection"], "consistent": true },
    "stability": 0.87, "maxSourceSeverity": "medium", "severityRank": 4, "title": "Leaked key → CI role → DB secret → customer DB",
    "steps": []
  },
  "fixPlans": [
    { "id": "plan_intuitive", "label": "intuitive",
      "actions": [{ "id": "act_disable_user", "kind": "disable_account", "label": "Disable contractor account",
        "description": "Disables the contractor identity that owns the leaked key",
        "target": { "type": "identity", "id": "n_contractor", "label": "contractor_017" },
        "cost": { "score": 5, "basis": "41 benign events in 30 days across 2 repos", "benignUsage": { "events30d": 41, "dependents": ["repo_a", "repo_b"] } },
        "cuts": { "edgeIds": ["e2"], "latentIds": [] }, "sideEffects": ["Contractor loses access to 2 repos"] }],
      "pathsBroken": 1, "pathsTotal": 3,
      "riskBefore": { "score": 92 }, "riskAfter": { "score": 63 }, "reductionPct": 32, "totalCost": 5,
      "residualPathIds": ["p2", "p3"], "requiresApproval": true, "recommendation": "not_best", "rationale": ["Breaks 1 of 3 paths"] },
    { "id": "plan_compiler", "label": "compiler_pick",
      "actions": [{ "id": "act_restrict_role", "kind": "remove_role_binding", "label": "Restrict CI role from prod secrets",
        "description": "Removes the binding that lets ci_cd_role read prod secrets",
        "target": { "type": "role", "id": "n_role", "label": "ci_cd_role" },
        "cost": { "score": 3, "basis": "12 benign events in 30 days across 3 pipelines", "benignUsage": { "events30d": 12, "dependents": ["deploy_nightly"] } },
        "cuts": { "edgeIds": ["e3"], "latentIds": ["L_binding_ci_secret"] }, "sideEffects": ["Nightly deploy needs a new scoped secret"] }],
      "pathsBroken": 3, "pathsTotal": 3,
      "riskBefore": { "score": 92, "ci": { "lo": 78, "hi": 96 } }, "riskAfter": { "score": 24, "ci": { "lo": 14, "hi": 38 } },
      "reductionPct": 88, "reductionCi": { "lo": 79, "hi": 94 }, "totalCost": 3,
      "residualPathIds": ["p4"], "requiresApproval": true, "recommendation": "best",
      "rationale": ["Breaks all 3 paths", "Lowest cost per risk removed"] }
  ],
  "trust": {
    "pathId": "p1", "overall": 71, "weakestKey": "action_safety", "riskLevel": "critical", "trustLevel": "medium", "decision": "approve",
    "axes": [
      { "key": "evidence", "label": "Evidence strength", "value": 0.89, "formula": "sum LLR / cap", "detail": "5 events across 4 sources" },
      { "key": "stability", "label": "Path stability", "value": 0.87, "formula": "share of 5,000 samples with path in top-3", "detail": "" },
      { "key": "er", "label": "Entity resolution", "value": 0.81, "formula": "min merge confidence on path", "detail": "" },
      { "key": "coverage", "label": "Graph coverage", "value": 0.92, "formula": "mean telemetry coverage on path", "detail": "" },
      { "key": "action_safety", "label": "Action safety", "value": 0.71, "formula": "1 - normalized disruption cost", "detail": "Nightly deploy affected" }
    ]
  },
  "narrative": {
    "pathId": "p1", "status": "verified", "mode": "llm", "claimsTotal": 3, "claimsCited": 3,
    "sentences": [
      { "id": "s1", "text": "An API key owned by a contractor was exposed in a public repository.", "citations": ["evt_102"] },
      { "id": "s2", "text": "The key was then used once from an unfamiliar network and assumed the CI/CD role.", "citations": ["evt_147", "evt_151"] },
      { "id": "s3", "text": "That role can read the production database secret, which grants access to the customer database.", "citations": ["evt_160"] }
    ]
  }
}
```

Teammates: expand these into full scenario fixtures (more nodes, noise events, the decoy path, residual path, merge proposal) rather than inventing new shapes.

---

## Appendix C: Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Next beat (presenter) |
| `←` / `→` | Previous / next beat |
| `P` | Pause / resume stream |
| `R` | Reset scenario |
| `G` | Toggle ghost attackers |
| `F` | Toggle presenter mode |
| `1`-`5` | Jump: Command, Graph, Paths, Fixes, Trust |
| `Esc` | Skip current animation, clear selection, close drawer or modal (Defer on approval) |
| `/` | Focus graph search |
| `Ctrl/Cmd + K` | Command palette (P2) |
| `?` | Help overlay (P2) |

Shortcuts are ignored while typing in an input.

---

## Appendix D: Copy and microcopy

**View toggle**
- Assume-breach: *What the attacker has likely already done, based on observed evidence.*
- Pre-breach: *What the attacker could do from today's exposure, with no incident assumed.*

**Risk gauge tooltip:** *Expected share of crown-jewel impact an attacker can reach. The range is a 90% credible interval.*

**Coverage caveat (S-07, slopegraph):** *"No known route" means no route in the modeled graph. Telemetry coverage for this zone is {coverage}%. A small residual probability is added for routes the model cannot see.*

**Risk × Trust matrix labels**

| | Trust low | Trust medium | Trust high |
|---|---|---|---|
| **Risk high** | Collect more evidence first | Human approval required | Prioritize fix immediately |
| **Risk medium** | Investigate uncertainty | Investigate | Schedule remediation |
| **Risk low** | Deprioritize or collect more data | Monitor | Monitor |

**Pipeline stage descriptions**

| Stage | Text |
|---|---|
| Telemetry | Raw events from 7 simulated source types |
| Normalize | Each source mapped to one common event schema |
| Resolve | Identities and assets merged across sources, with confidence |
| Relevant | Events that touch an attack path or shift a probability |
| Edges | Edge probabilities updated from evidence |
| Paths | Likely routes to crown jewels ranked by risk |
| Fix | Cheapest action set that removes the most risk |

**Evaluation page note (always visible):** *Results come from simulated environments and a separately coded attacker emulator. They show how the system behaves across attack variants, not performance against real-world attackers.*

**Empty states:** see Section 16. **Toasts:** *"Attack path assembled: {n} signals → 1 path"*, *"Risk {a} → {b} ({delta}%)"*, *"Recommendation changed: {action} is now the best fix"*, *"Uncertainty on this edge dropped from ±{x}% to ±{y}%"*, *"Identities merged ({c}%): {names}"*.

---

## Appendix E: Style mapper starter (reference)

```ts
// graph/styles.ts (shape of the mapping, not final code)
const RISK_RAMP = [
  { max: 0.2, color: '#475569' },
  { max: 0.5, color: '#F59E0B' },
  { max: 0.8, color: '#F97316' },
  { max: 1.01, color: '#F43F5E' },
];
const EDGE_COLOR: Record<EdgeState, string> = {
  observed: '#FF5A3C', inferred: '#F59E0B', potential: '#5B6B8C', mitigated: '#3C4A5E', unknown: '#8B5CF6',
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const nodeStyle = (n: GraphNode) => {
  const p = n.compromise?.p ?? 0;
  return {
    shape: SHAPE[n.type],
    width: n.isCrownJewel ? 56 : BASE_SIZE[n.type],
    height: n.isCrownJewel ? 56 : BASE_SIZE[n.type],
    'border-width': 2 + 4 * p,
    'border-color': RISK_RAMP.find(r => p < r.max)!.color,
    'underlay-color': '#F43F5E',
    'underlay-opacity': 0.45 * p,
    'underlay-padding': 6 + 10 * p,
  };
};

export const edgeStyle = (e: GraphEdge) => ({
  width: clamp(1 + 7 * e.p, 1, 8),
  'line-color': EDGE_COLOR[e.state],
  'target-arrow-color': EDGE_COLOR[e.state],
  'line-style': e.state === 'mitigated' ? 'dashed' : e.state === 'unknown' ? 'dotted' : 'solid',
  opacity: e.state === 'potential' ? 0.35 + 0.65 * e.p : 1,
  'underlay-color': EDGE_COLOR[e.state],
  'underlay-opacity': e.ci ? 0.18 : 0,
  'underlay-padding': e.ci ? clamp(e.ci.hi - e.ci.lo, 0, 1) * 14 : 0,
});
```