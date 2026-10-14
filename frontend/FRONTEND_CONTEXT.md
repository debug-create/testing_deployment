# FABLE Frontend Architecture & LLM Context Specification

> **Target Audience:** LLMs, Autonomous Coding Agents, and Security Engineers continuing development on the FABLE frontend.
> **Last Updated:** 2026-09-15
> **Status:** Production-Ready / Fully Integrated with Dual-Mode (Live Backend API + Robust Deterministic Demo Fallbacks).

---

## 1. Executive System Overview

**FABLE** is an insider threat intelligence platform designed to eliminate alert fatigue. Instead of treating every telemetry spike as an immediate incident, FABLE computes three deterministic metrics:

$$\text{Residual Risk} = \text{Raw Deviation} \times (1 - \text{Context Coverage})$$

1. **Raw Deviation Score ($0 - 100$):** Telemetry variance across IAM events, egress byte counters, Vault reads, and abnormal ingress ASNs.
2. **Context Coverage Factor ($0.0 - 1.0$):** Mathematical coverage derived from approved organizational records (RFC maintenance windows, PagerDuty on-call rotations, manager attestations, and Jira audit tickets).
3. **Residual Risk Score ($0 - 100$):** The attenuated risk score determining real-world operational response.

### Core Philosophy & Rules of Engagement
- **Alert-Budget Discipline:** Operational drift matching verified context is attenuated silently into the background without triggering audible or visual alerts.
- **Deterministic Risk Isolation:** Large Language Models (LLMs) synthesize forensic briefing narratives but **never** compute, alter, or backfill deterministic risk numbers or classification boundaries.
- **Separation of Duties:** Operational context proposals cannot be approved by the same user who authored them.
- **Explicit Human Gate for Destructive Actions:** Revoking credentials or isolating credentials requires blast-radius verification and dual confirmation.

---

## 2. Directory Structure & Key Files

```
/
├── index.html                      # Root HTML entry with custom typography (Outfit + JetBrains Mono)
├── metadata.json                   # App capabilities, frame permissions, and metadata
├── vite.config.ts                  # Vite 6 config with React & Tailwind CSS plugins
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Project dependencies (React 19, Motion, Lucide, D3, Three.js)
├── components/
│   └── ui/
│       ├── fable-hero.tsx          # 3D interactive hero canvas with Drei particle/terrain shaders
│       └── demo.tsx                # Visual reference playground
├── src/
│   ├── main.tsx                    # React DOM root entry point and IKORI theme provider
│   ├── components/IkoriHero.tsx    # IKORI procedural metallic flower landing experience
│   ├── App.tsx                     # Top-level routing, URL history management, layout state
│   ├── types.ts                    # Canonical TypeScript interfaces and domain models
│   ├── index.css                   # Tailwind CSS imports and custom radar/glow utilities
│   ├── constants.ts                # Application constants, theme colors, and endpoints
│   ├── useEntities.ts              # Global entity state management hook & local updates
│   ├── caseHooks.ts                # React hooks for API interaction (`useCase`, `useCases`, etc.)
│   ├── caseData.ts                 # Local deterministic case data generators and seed states
│   ├── data.ts                     # Enterprise personnel seeds and global office coordinates
│   ├── api/
│   │   └── client.ts               # Resilient API client (Live HTTP + Demo Store Fallbacks)
│   ├── data/
│   │   └── demoDataset.ts          # Canonical multi-actor scenarios (Arjun, Devraj, Priya, Neha)
│   └── components/
│       ├── ThreatMap.tsx           # Interactive D3 globe with radar pulses, egress arcs & telemetry
│       ├── OrgOverview.tsx         # SOC console dashboard, category filters & entity grid
│       ├── ComparisonStrip.tsx     # Symmetric comparative profile strip (Escalated vs Cleared vs Indeterminate)
│       ├── CaseDetailDrawer.tsx    # Slide-in quick forensic drawer
│       ├── CaseDetailPage.tsx      # Full-screen deep forensic dossier (`/product/case/:caseId`)
│       ├── ConstituentSignalsView.tsx # Mathematical signal breakdown (Rule-Based vs Weighted)
│       ├── ContextRevisionWorkflow.tsx# Proposal ledger with Separation of Duties & Approver Switcher
│       ├── InvestigatorBriefModal.tsx # LLM Forensic Brief with strict non-deterministic disclaimer
│       ├── CounterfactualWaterfall.tsx# Stepped factor reduction waterfall for what-if simulation
│       ├── ShiftMapGraph.tsx       # SVG Causal DAG linking identity -> ingress -> hop -> target
│       ├── ContextualizedDrawer.tsx# Silent blip / under-review drawer
│       ├── CalmNodeModal.tsx       # Inspector for baseline/cleared actors
│       ├── EscalationToast.tsx     # Real-time incident notification alert
│       ├── StatusBadge.tsx         # High-contrast status and classification badges
│       └── Sparkline.tsx           # Micro SVG trajectory sparkline for drift trends
```

---

## 3. Route & View Hierarchy

| Route Path | View Component | Description |
| :--- | :--- | :--- |
| `/` (`home`) | `IkoriHero` + Landing | Interactive procedural flower, context-intelligence narrative, launch CTA. |
| `/product` | `OrgOverview` + `ThreatMap` | Main SOC console, global geographic radar, comparison strip, filterable grid. |
| `/product/case/:caseId` | `CaseDetailPage` | Deep-dive forensic dossier, ShiftMap causal graph, counterfactual waterfall, signals breakdown, context revision ledger, LLM brief modal. |

---

## 4. Canonical State Models (`src/types.ts`)

### `Entity`
Represents an observed enterprise identity.
- `id`: Unique identifier (e.g. `'107'`, `'104'`, `'101'`, `'112'`)
- `name`, `role`, `department`, `avatar`
- `status`: `'open'` | `'reviewing'` | `'cleared'` | `'revoked'`
- `classification`: `'confirmed_threat'` | `'benign_deviation'` | `'unexplained_anomaly'` | `'indeterminate'`
- `rawScore`: Raw deviation number ($0 - 100$)
- `contextScore`: Coverage ratio ($0 - 100$)
- `residualRisk`: Attenuated residual risk ($0 - 100$)
- `tenure_days`: Number of days since onboarding (tenure $< 14$ days triggers Indeterminate state)
- `location`: `{ city, country, lat, lng }`
- `constituentSignals`: Array of `ConstituentSignal`

### `ConstituentSignal`
Telemetry input into the anomaly model.
- `id`, `name`, `category`: `'rule-based'` | `'weighted'`
- `value`: $0 - 100$ raw signal score
- `weight`: Fractional importance ($0.0 - 1.0$)
- `signal_source`: Sensor origin (e.g. `IAM-LogStream`, `VPC-Flow-Aggregator`, `Vault-Audit-Log`)
- `description`: Plain-text explanation of observed telemetry

### `ContextRevision`
Ledger entry for organizational context approvals.
- `id`: e.g. `'REV-2026-089'`
- `case_id`: Target case
- `proposer_id`, `proposer_name`, `proposer_role`
- `reason`: Justification or ticket reference
- `validity_window`: Temporal validity (e.g. `2026-09-12 04:00 to 08:00 UTC`)
- `allowed_resources`: Array of asset strings (e.g. `['GCS finance-archive-lake']`)
- `allowed_actions`: Array of authorized verbs (e.g. `['ParquetExport', 'KMSDecrypt']`)
- `status`: `'pending'` | `'approved'` | `'rejected'`
- `reviewed_by_id`, `reviewed_by_name`, `reviewed_at`, `review_notes`

### `InvestigatorBrief`
Forensic summary output generated by LLM synthesis.
- `executive_summary`: High-level paragraph
- `synthesized_narrative`: Full narrative timeline
- `key_evidence_citations`: Array of anchored telemetry events
- `context_grant_correlation`: Array of linked approvals
- `recommended_next_steps`: Triage recommendations
- `model_version`, `generated_at`, `is_live`

---

## 5. Key Frontend Components & Interaction Specs

### 1. `ThreatMap.tsx`
- **Engine:** D3 Geo (`geoOrthographic` / `geoNaturalEarth1`), TopoJSON Client, SVG.
- **Rendering:** Responsive canvas showing world landmasses, global tech hubs, and pulsing radar targets.
- **Egress Arcs:** Quadratic Bézier curves showing active data egress streams (e.g. Singapore to external S3 buckets).
- **Protection Guard:** Kept completely intact and isolated to preserve precision radar transforms.

### 2. `CaseDetailPage.tsx`
- **Header:** Back to product navigation, identity avatar, classification badge, status selector, and operational action buttons:
  - **Investigator Brief:** Opens `InvestigatorBriefModal`.
  - **Investigate:** Shifts status to `reviewing`.
  - **Revoke Access:** Triggers blast-radius verification modal before terminating sessions.
- **Risk Calculus Card:** Visual formula rendering Raw Score $\times$ (1 - Context Coverage) = Residual Risk.
- **Sparse Baseline Banner:** Displays when `tenure_days < 14` or classification is `indeterminate`, explicitly informing analysts that lack of history is not malicious intent.
- **Constituent Signals Breakdown:** Renders `ConstituentSignalsView` with Rule-Based vs. Weighted labels.
- **Shift Map:** Renders SVG causal graph mapping Ingress IP $\to$ Bastion $\to$ Service $\to$ Bucket with drift flags.
- **Counterfactual Waterfall:** Visual bar chart simulating the reduction in residual risk if unapproved items are approved.
- **Evidence Timeline:** Filterable timeline (All, High Severity, Unexplained Anomaly, System Automated Hold).
- **Context Ledger & Revision Workflow:** Renders active RFCs, PagerDuty shifts, and `ContextRevisionWorkflow`.

### 3. `ContextRevisionWorkflow.tsx`
- **Separation of Duties:** Enforces that Alex (Proposer) cannot approve their own submissions.
- **Demo Identity Switcher:** Allows testing both personas in demo mode:
  - *Alex Thorne* (Proposer / SOC Analyst)
  - *Sarah Sterling* (Approver / VP Data Platform)
- **Workflow:** Proposing a revision adds a `pending` entry. Approving it triggers residual risk re-attenuation and marks the item `approved`.

### 4. `InvestigatorBriefModal.tsx`
- **Forensic Synthesis:** Calls `generateInvestigatorBrief(caseId)` or `getInvestigatorBrief(caseId)`.
- **Anchored Disclaimers:** Features a top alert clarifying that the generative language layer synthesizes narrative summaries over deterministic data and **cannot** alter risk scores.

---

## 6. API Client & Dual-Mode Behavior (`src/api/client.ts`)

The API client automatically senses whether a backend server is listening or if it should operate in offline demo mode.

### Configuration
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const IS_DEMO_MODE = !API_BASE_URL || true; // Set to true by default for zero-friction demo resilience
```

### Endpoints Covered

| Function | Endpoint | Fallback Logic |
| :--- | :--- | :--- |
| `getCases()` | `GET /api/cases` | Returns `demoDataset` array. |
| `getCase(id)` | `GET /api/cases/:id` | Returns populated case from `demoDataset`. |
| `getContextRevisions(caseId)` | `GET /api/cases/:id/context-revisions` | Returns reactive in-memory revisions store. |
| `proposeContextRevision(caseId, data)` | `POST /api/cases/:id/context-revisions` | Creates new revision in demo store. |
| `reviewContextRevision(caseId, revId, data)` | `POST /api/cases/:id/context-revisions/:revId/review` | Updates status, reviewer details, and notes. |
| `getInvestigatorBrief(caseId)` | `GET /api/cases/:id/brief` | Returns deterministic forensic narrative based on case ID. |
| `updateCaseStatus(caseId, status)` | `PATCH /api/cases/:id/status` | Updates case status across session state. |

---

## 7. Demo Data Scenarios (`src/data/demoDataset.ts`)

The application contains four meticulously modeled cases:

1. **Case #107 — Arjun Patel (Staff Data Platform Engineer)**
   - *Scenario:* High raw deviation (85.6) due to off-hours KMS key rotation in `eu-west-1` and 1.2 GB GCS archive export.
   - *Attestation:* Covered by RFC-3982 and audit ticket FIN-AUDIT-2026.
   - *Resolution:* Context coverage reaches 96%, residual risk drops to **3.0 / 100** (Cleared).
2. **Case #104 — Devraj Malhotra (Lead DevOps Engineer)**
   - *Scenario:* Severe unapproved HashiCorp Vault read on `customer-pii-master-key` from unrecognized Singapore ASN, followed by 4.8 GB database export to `s3://archive-sync-sg-991`.
   - *Attestation:* 0% context coverage.
   - *Resolution:* Residual risk **98.4 / 100** (Confirmed Threat, Access Revoked).
3. **Case #101 — Priya Ramesh (Principal Backend Engineer)**
   - *Scenario:* Off-hours bastion access at 01:14 UTC.
   - *Attestation:* Correlated with active Sev-1 payment incident on PagerDuty (#88219) and RFC-4109.
   - *Resolution:* 99% context coverage, residual risk **0.3 / 100** (Cleared).
4. **Case #112 — Neha Sharma (Junior Frontend Developer)**
   - *Scenario:* Initial onboarding activity (SSO login, passkey enrollment, repo clone).
   - *Attestation:* HR-ONBOARD-2026.
   - *Classification:* **Indeterminate** due to $< 14$ days tenure. Non-punitive observation.

---

## 8. Development & Verification Guide

### Common Commands
- `npm run dev`: Starts the Vite dev server on port 3000.
- `npm run lint`: Executes `tsc --noEmit` to verify type safety across all files.
- `npm run build`: Bundles the React frontend into `dist/` with full production optimizations.

### Invariant Rules for AI Agents Modifying This Codebase
1. **Do Not Break ThreatMap.tsx**: The D3 geographic map relies on strict coordinate projections and SVG filters. Do not replace it with mock canvas placeholders.
2. **Preserve Deterministic Calculations**: Never create an AI route that overrides `residualRisk` or outputs random math. Always consume the mathematical formula: $\text{Raw} \times (1 - \text{Coverage})$.
3. **Maintain Dark Terracotta Aesthetic**:
   - Primary Accent: Terracotta (`#C6613F`, `#ff7e54`)
   - Backgrounds: Obsidian/Charcoal (`#08080c`, `#0c0c12`, `#120d0b`)
   - High-Risk Alerts: Crimson Red (`#E8342A`, `rose-500`)
   - Cleared / Attenuated: Emerald Green (`#10b981`, `emerald-400`)
   - Indeterminate: Amethyst Purple (`#a855f7`, `purple-400`)
