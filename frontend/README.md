# IKORI — The Butterfly Effect of Cybersecurity

> *"Insider threats never look like attacks. They look like work."*

**IKORI** is an enterprise-grade insider-threat intelligence and intent-correlation platform (product domain formerly referred to as FABLE in internal APIs). Traditional SIEM and UEBA tools generate hundreds of false-positive alarms by flagging every anomalous telemetry blip. IKORI solves this with **Deterministic Context Attenuation**: isolating true malicious deviation by mathematically subtracting verified organizational context (RFC change records, on-call schedules, manager attestations, and compliance tickets) from raw telemetry drift.

---

## 🌟 Key Highlights & Architectural Principles

### 1. Three-Number Risk Calculus
Every observed operational deviation is computed using a rigorous mathematical formula:

$$\text{Residual Risk} = \text{Raw Deviation Score} \times (1 - \text{Context Coverage Factor})$$

- **Raw Deviation Score ($0 - 100$):** Multi-modal telemetry deviation combining rule-based heuristics and weighted sensors across IAM, VPC flow logs, Vault reads, and egress volumes.
- **Context Coverage Factor ($0.0 - 1.0$):** Verified authorization from organizational repositories.
- **Residual Risk Score ($0 - 100$):** The final score driving SOC triage and automated containment policies.

### 2. Strict Alert-Budget Discipline & "Calm Nodes"
- Baseline operational activity and benign deviations matching approved context remain calm in the background, preventing SOC alert fatigue.
- Elevated incidents trigger real-time escalation notifications, prioritized badges, and automated protective holds on sensitive data assets.

### 3. Separation of Duties Context Ledger
- Operators can propose context revisions to explain observed drift.
- **Dual-Control Gate:** A proposer cannot approve their own context revision. Peer approval from an authorized manager is required before risk scores are attenuated.

### 4. Deterministic Proof Isolation from Generative AI
- The **Investigator Brief** feature leverages LLM synthesis for rapid natural language briefings.
- **Strict Guardrail:** LLM generative layers summarize verified facts but **never** calculate, mutate, or override deterministic mathematical risk scores.

### 5. Sparse Baseline & Indeterminate Handling
- Identities with short operational tenures ($< 14$ days) are classified as **Indeterminate**, deferring covariance calculations to avoid penalizing new hires during routine onboarding.

---

## 🖥️ Application Features & User Interfaces

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           IKORI Web Platform                            │
├──────────────────┬─────────────────────────────┬────────────────────────┤
│  IKORI Landing   │   SOC Console (/product)    │ Case Dossier (/case)   │
├──────────────────┼─────────────────────────────┼────────────────────────┤
│ • Three.js Moon  │ • D3 Threat Radar Map       │ • ShiftMap Causal DAG  │
│ • Shader Terrain │ • Org Topology Grid         │ • Risk Waterfall       │
│ • Interactive CTA│ • Symmetric Compare Strip   │ • Context Ledger       │
│ • Principles     │ • Real-Time Alert Toast     │ • LLM Brief Synthesis  │
└──────────────────┴─────────────────────────────┴────────────────────────┘
```

### 1. Landing Experience (`/`)
- **Interactive IKORI Flower:** Procedural WebGL sculpture with preserved staged scroll and pointer interaction.
- **Dynamic Typographic Entry:** Oxblood, crimson, and warm-ivory editorial art direction.
- **One-Click SOC Handoff:** Direct transition into the live SOC console.

### 2. Global Threat & Intercept Map (`/product`)
- **D3 Geographic Radar:** High-precision SVG world projection using `d3-geo` and TopoJSON.
- **Pulsing Targets & Egress Arcs:** Quadratic Bézier telemetry streams tracking egress hops from global office hubs (Bangalore, London, SF, NYC, Singapore, Berlin, Stockholm, Sydney) to external destinations.
- **Symmetric Profile Comparison:** Quick side-by-side review of escalated, cleared, and indeterminate profiles.
- **Direct Operational Actions:** Instant **Investigate** and **Revoke Access** actions with dual-confirmation blast-radius modals.

### 3. Deep Forensic Case Dossier (`/product/case/:caseId`)
- **Three-Number Risk Banner:** Live calculation formula breakdown.
- **Sparse Baseline Warning:** Distinct visual banner for onboarding accounts.
- **Constituent Signals Breakdown:** Telemetry decomposition with explicit *Rule-Based* vs. *Weighted* attribution.
- **Shift Map Causal Graph:** SVG Directed Acyclic Graph mapping `Identity` $\to$ `Ingress IP` $\to$ `Bastion` $\to$ `Target Resource` $\to$ `Egress Destination`.
- **Counterfactual Risk Waterfall:** Stepped reduction waterfall simulating what happens if unapproved actions are granted context coverage.
- **Context Revision Workflow:** Submission, status tracking, and peer review with built-in separation of duties.
- **Investigator Brief Generator:** Automated forensic narrative synthesis with anchored citations and compliance disclaimers.

---

## 🛠️ Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Framework & Core** | React 19, TypeScript, Vite 6 |
| **Styling & Design System** | Tailwind CSS v4, Lucide React, Custom Dark Palette (`#08080c`, `#C6613F`) |
| **3D Graphics & Canvas** | Three.js, `@react-three/fiber`, `@react-three/drei` |
| **Data Visualization & GIS** | `d3-geo`, `d3-scale`, `topojson-client`, `world-atlas`, Recharts |
| **Motion & Micro-interactions** | `motion` (Motion for React), GSAP |
| **Architecture** | Client-side SPA with resilient dual-mode API client (Live HTTP + In-Memory Fallbacks) |

---

## 📁 Repository Structure

```
.
├── FRONTEND_CONTEXT.md             # Comprehensive LLM specification & system status file
├── README.md                       # Product documentation (this file)
├── index.html                      # Entry HTML with JetBrains Mono + Outfit typography
├── package.json                    # Dependencies and npm scripts
├── metadata.json                   # App capabilities and permissions
├── vite.config.ts                  # Vite 6 configuration
├── components/
│   └── ui/
│       └── (legacy hero components removed)
└── src/
    ├── App.tsx                     # Top-level routing, IKORI landing & URL synchronization
    ├── components/IkoriHero.tsx    # Procedural metallic-flower hero
    ├── types.ts                    # Shared domain models & TypeScript interfaces
    ├── constants.ts                # Application constants & color variables
    ├── caseHooks.ts                # Custom React hooks for data fetching
    ├── useEntities.ts              # Global entity state management
    ├── caseData.ts                 # Local deterministic case data engine
    ├── data.ts                     # Enterprise personnel seeds & office hubs
    ├── api/
    │   └── client.ts               # Resilient API client (Live + Demo modes)
    ├── data/
    │   └── demoDataset.ts          # Comprehensive 4-actor scenario data
    └── components/
        ├── ThreatMap.tsx           # Interactive D3 globe with radar pulses & egress arcs
        ├── OrgOverview.tsx         # SOC console dashboard & entity cards
        ├── ComparisonStrip.tsx     # Symmetric comparison bar
        ├── CaseDetailDrawer.tsx    # Slide-in quick forensic drawer
        ├── CaseDetailPage.tsx      # Full-page deep forensic dossier
        ├── ConstituentSignalsView.tsx # Rule-based & weighted signal breakdown
        ├── ContextRevisionWorkflow.tsx# Proposal ledger with Separation of Duties
        ├── InvestigatorBriefModal.tsx # LLM Forensic Brief with strict disclaimers
        ├── CounterfactualWaterfall.tsx# Risk reduction what-if waterfall
        ├── ShiftMapGraph.tsx       # SVG Causal DAG linking identity to targets
        ├── ContextualizedDrawer.tsx# Silent blip / under-review drawer
        ├── CalmNodeModal.tsx       # Inspector for baseline/cleared actors
        ├── EscalationToast.tsx     # Real-time incident notification alert
        ├── StatusBadge.tsx         # Color-coded status & classification badges
        └── Sparkline.tsx           # Micro SVG trajectory sparklines
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher (or Bun / Yarn / pnpm)

### 1. Installation
```bash
git clone <repository-url>
cd frontff-main
npm install --legacy-peer-deps
```

### 2. Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to interact with the live application.

### 3. Typechecking & Linting
```bash
npm run lint
```

### 4. Production Build
```bash
npm run build
```
Build outputs are generated in the `dist/` directory.

---

## 👥 Demo Personas & Pre-Seeded Cases

| Case | Subject | Role | Raw Score | Context | Residual Risk | Status | Core Narrative |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **#107** | **Arjun Patel** | Staff Data Platform Eng | 85.6 | 96% | **3.0** | `Cleared` | Off-hours KMS rotation & GCS Parquet export validated by RFC-3982 and FIN-AUDIT-2026. |
| **#104** | **Devraj Malhotra** | Lead DevOps Eng | 98.4 | 0% | **98.4** | `Revoked` | Unauthorized Vault read from Singapore IP + 4.8 GB exfiltration. Active insider attack. |
| **#101** | **Priya Ramesh** | Principal Backend Eng | 38.1 | 99% | **0.3** | `Cleared` | Emergency off-hours bastion access during active Sev-1 payment webhook outage. |
| **#112** | **Neha Sharma** | Junior Frontend Dev | 24.0 | 0% | **24.0** | `Indeterminate` | New hire onboarding (<14d tenure). Observed baseline deferred without penalty. |

---

## 🔒 Security & Separation of Duties Invariants

1. **Self-Review Prevention:** Proposers of context revisions cannot approve their own requests.
2. **Deterministic Integrity:** LLM responses are strictly informative and cannot tamper with calculated risk scores.
3. **Blast-Radius Verification:** Revoking credentials requires an explicit confirmation modal listing active sessions and tokens.
4. **No Destructive Overrides:** Telemetry logs and context ledgers are immutable audit trails.
