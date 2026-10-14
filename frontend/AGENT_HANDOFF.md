# IKORI Frontend — Coding Agent Handoff

Last updated: 2026-10-14 (Asia/Calcutta)

## 1. Read this first

The application root is this repository directory:

```text
C:\Users\chira\OneDrive\Desktop\hashm\frontff-main
```

Use that directory as the working directory for installs, builds, linting, and development. The IKORI frontend lives at the repository root.

Prefer the local project Git repository (`.git` in this folder) over any parent Git root under the user home directory.

The development server runs at:

```text
http://localhost:3000
```

## 2. Product direction

The project is now branded **IKORI**. The intended visual language is:

- Near-black and oxblood surfaces.
- Warm ivory typography.
- Restrained crimson highlights.
- Premium editorial presentation rather than generic neon cybersecurity UI.
- High information density with clear hierarchy and breathing room.
- Functional interactions; controls must not be decorative or inert.
- Honest data presentation. Do not fabricate model metrics, evaluation claims, or live-system capabilities.

The exact brand tagline, when used, must remain:

```text
IKORI — The Butterfly Effect of Cybersecurity.
```

The landing hero and flower were explicitly approved in prior work. Do not regenerate or casually rewrite the flower geometry, shader, entrance sequence, pointer response, callouts, or scroll behavior.

## 3. What was merged

This application began as a FABLE-era product frontend and has been merged with the IKORI brand and hero while retaining the existing security product features.

Completed high-level work:

1. The previous FABLE landing hero was removed.
2. The IKORI WebGL flower hero was added as the root landing experience.
3. The existing product console remains available at `/product`.
4. Existing case-detail routes remain available at `/product/case/:caseId`.
5. A new Results & Evaluation page was added at `/results`.
6. The product console now contains a final `Results` navigation button.
7. Visible product branding was changed to IKORI where touched.
8. The deterministic seeded demo and case workflows were preserved.

Some internal identifiers, comments, types, scoring-version strings, local-storage keys, and API compatibility fields still use the legacy `FABLE` name. Treat those as compatibility debt, not proof that the visible brand should revert.

## 4. Current routes

Routing is intentionally lightweight and lives in `src/App.tsx`; React Router is not installed.

| URL | View | Main component |
| --- | --- | --- |
| `/` | IKORI landing hero and current below-hero bridge | `IkoriHero` rendered by `App` |
| `/product` | Security console / organisation overview | `OrgOverview` |
| `/product/case/:caseId` | Detailed investigation case | `CaseDetailPage` |
| `/results` | Results & Evaluation dashboard | `ResultsDashboard` |

`App.tsx` manages history with `window.history.pushState`, listens for `popstate`, and scrolls to the top after navigation.

When adding a route, update all three routing locations in `App.tsx`:

1. `PageRoute` type.
2. Initial pathname parsing and `popstate` parsing.
3. `navigateTo` URL construction and the render branch.

## 5. Architecture and stack

### Core runtime

- React 19
- TypeScript 5.8
- Vite 6
- Tailwind CSS 4 through `@tailwindcss/vite`
- npm is now usable because a `package-lock.json` exists

### Important visual/interaction dependencies

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/postprocessing`
- `gsap`
- `motion` (the package is named `motion`, not `framer-motion`)
- `recharts`
- `lucide-react`
- `d3-geo`
- `topojson-client`
- `world-atlas`

`react-is` was added because Recharts required it during the production build.

### Application state

The project primarily uses React state and local hooks rather than a global state library.

- `src/useEntities.ts`: entity state and case-status mutation entry point.
- `src/caseHooks.tsx`: demo/application mode, personas, and related local state.
- `src/useTheme.ts`: legacy product-console dark/light/system theme hook.
- `src/context/ThemeContext.tsx`: IKORI Royal Red/Professional theme context.

There are currently **two theme systems**. The hero and Results page use the IKORI theme context, while much of the retained product console uses the older dark/light hook. This is a known integration issue; see the risks section.

## 6. Important files

### App shell and route ownership

- `src/main.tsx`
  - Imports global CSS.
  - Wraps the app in the IKORI `ThemeProvider`.
- `src/App.tsx`
  - Owns all current routes.
  - Connects hero, product, case details, and Results.

### IKORI hero and brand

- `src/components/IkoriHero.tsx`
  - Large custom WebGL implementation.
  - Contains procedural flower geometry, GLSL shaders, materials, scene setup, animation timing, callouts, theme switcher, pointer behavior, and scroll-linked behavior.
  - This is sensitive, complex code. Make isolated changes and verify visually.
- `src/components/audio/AmbientSoundscape.ts`
  - Hero ambient audio behavior.
- `src/config/brandConfig.ts`
  - IKORI brand configuration.
- `src/context/ThemeContext.tsx`
  - Royal Red / Professional theme state.
- `src/index.css`
  - Tailwind import, IKORI CSS variables, global utilities, threat-map animation helpers, scrollbar, and reduced-motion rule.

### Product console

- `src/components/OrgOverview.tsx`
  - Product header and central view switcher.
  - Owns the visible navigation for:
    - 3D Graph
    - Threat Map
    - Org Matrix
    - Access Requests
    - Results
  - Owns search/filter UI, notifications, role switching, sound toggle, theme toggle, and product view selection.
- `src/components/Network3DGraph.tsx`
  - Existing interactive organisation topology / risk graph.
  - Uses deterministic node data and force-like positioning.
- `src/components/ThreatMap.tsx`
  - Geographic threat view.
- `src/components/AccessRequestsView.tsx`
  - JIT/sensitive access workflow.
- `src/components/CaseDetailPage.tsx`
  - Full case investigation view.
- `src/components/AssessmentComparison.tsx`
  - Immutable original-versus-current assessment comparison.

### Results page

- `src/components/ResultsDashboard.tsx`
  - New page component.
  - Contains working scenario filter, Risk/Confidence switch, chart, readiness state, model-comparison empty state, intervention comparison, ranking empty state, key findings, methodology disclosure, theme controls, and JSON fixture export.
- `src/components/ResultsDashboard.css`
  - Dedicated responsive design system for the Results page.
  - Uses IKORI CSS variables and contains desktop/tablet/mobile behavior.

### Domain types and deterministic data

- `src/types.ts`
  - Core entities, cases, assessment records, evidence, revisions, actions, and related domain types.
- `src/data/recordingSeed.ts`
  - Current deterministic recording fixture used by the app.
  - Contains fixed scenarios for Priya, Devraj, Arjun, Neha, and the supporting entity roster.
- `src/data/demoDataset.ts`
  - Larger demo dataset and older/parallel fixture definitions.
- `src/data/jitSeedData.ts`
  - Seeded JIT access requests.
- `src/caseData.ts`
  - Case-detail access and compatibility helpers.
- `src/constants.ts`
  - Fixed clock, scoring labels, thresholds, and visible synthetic-data badge.

### Existing project documentation

- `README.md`
- `FRONTEND_CONTEXT.md`

These predate some of the IKORI integration. Validate statements in them against the source before relying on them.

## 7. Results page: data-integrity decisions

The user requested a polished model-performance dashboard based on an attached analytics reference and a detailed specification. The repository does **not** contain:

- Held-out ground-truth labels.
- A prediction export.
- Baseline model runs.
- Precision, recall, F1, or false-positive rate outputs.
- Confusion matrices.
- PR or calibration curve data.
- Attack-path ranking labels or NDCG results.
- Inference latency measurements.

Therefore the page deliberately does not invent those values.

The page currently shows:

- Four canonical scenario assessments from `recordingSeed.ts`.
- Current entity count from the live entity state.
- Active seeded case count.
- Raw deviation, residual risk, and assessment confidence from immutable seeded assessment records.
- The recorded Case 107 reassessment from residual risk `100` to `8.2`, displayed as a `91.8` point decrease.
- Explicit professional empty states for missing held-out model and ranking evaluation artifacts.
- A banner stating that the displayed data is a deterministic synthetic recording fixture, not benchmark evidence.

Do not remove that disclosure or relabel the fixture charts as validated model performance unless real versioned evaluation data is added.

The page's `Export fixture report` button generates a local JSON download containing the scenario assessment values plus an explicit `benchmarkMetrics: null` field and explanation.

## 8. Current user priorities

The user repeatedly emphasized:

- Make the frontend visually striking, professional, dimensional, and uncluttered.
- Avoid dead controls.
- Make graphs more legible and use meaningful symbols.
- Ask for specifics if a major product decision cannot be inferred.
- Preserve the approved IKORI hero.
- Use the dashboard reference as visual direction, not as permission to invent data.

The last completed request was the Results page. The current request is this handoff file.

## 9. Visual behavior and responsive notes

### Landing page

The hero is a custom WebGL canvas with a DOM overlay. It has its own animation and cleanup lifecycle. When changing page structure around it, verify:

- Canvas still fills the intended viewport.
- Flower does not disappear after route transitions.
- Pointer interaction remains responsive.
- Entrance sequence runs once as intended.
- Scroll behavior is native and not blocked.
- Reduced motion remains usable.

### Product console

The central navigation is dense. Adding the Results button increases pressure at tablet widths. If continuing UI polish, prioritize a responsive overflow/menu treatment rather than shrinking labels until unreadable.

### Results

The Results page uses a two-column desktop grid and collapses to one column below 1050 px. KPI cards become a two-column grid at tablet/mobile sizes. At narrow widths, the route navigation hides and the Console return button remains.

The page was visually inspected in the in-app browser at a narrow viewport and showed no clipping in the inspected portion.

## 10. Functional interactions already implemented

### Root and product navigation

- Hero launch action opens `/product`.
- Product IKORI mark returns to `/`.
- Product Results tab opens `/results`.
- Results Console button returns to `/product`.
- Browser back/forward is handled by `popstate`.

### Results interactions

- Scenario cohort dropdown filters the chart:
  - All canonical cases
  - Context resolved
  - Escalated
  - Sparse baseline
- Risk/Confidence segmented control changes the displayed chart measure.
- Royal/Professional theme controls update the IKORI theme context.
- Methodology panel expands/collapses.
- Export button downloads a JSON fixture report.

### Product interactions

The retained console includes working search, filters, product view switching, drawers, notification behavior, JIT access controls, role persona switching, status mutations, and case navigation. Inspect the relevant component before changing behavior; several interactions depend on deterministic recording state.

## 11. Installation and commands

Run from the repository root:

```powershell
cd C:\Users\chira\OneDrive\Desktop\hashm\frontff-main
npm install --legacy-peer-deps
npm run dev
```

The lockfile now exists, so the next agent can normally use:

```powershell
npm ci --legacy-peer-deps
```

Verification commands:

```powershell
npm run lint
npm run build
```

There is no automated unit or end-to-end test script in `package.json` at this time.

## 12. Last verified state

The following checks passed after the Results page implementation:

```text
npm run lint   -> passed (tsc --noEmit)
npm run build  -> passed
```

Production build details from the last run:

```text
Vite 6.4.4
3334 modules transformed
CSS: approximately 121 KB / 19 KB gzip
JS: approximately 2.33 MB / 649 KB gzip
```

Vite reports a chunk-size warning because the JavaScript bundle exceeds 500 KB after minification. This is a warning, not a build failure.

Browser verification completed for `/results`:

- Page rendered.
- Risk/Confidence switching worked.
- Methodology disclosure worked.
- No browser console warnings or errors were observed.
- A visible mobile/narrow-layout check was performed.

## 13. Known risks and technical debt

### 13.1 Two theme systems

The app has:

- IKORI `royal-red | professional` theme state in `src/context/ThemeContext.tsx`.
- Legacy `dark | light | system` state in `src/useTheme.ts`.

They can diverge. A future cleanup should define one shared theme contract and migrate the product console carefully. Do not perform a blind search-and-replace because the hero depends on specific IKORI data-theme variables.

### 13.2 Large initial JavaScript bundle

The WebGL hero, Three.js product graph, geographic assets, and Recharts currently ship in one large bundle. A safe optimization path is route-level lazy imports in `App.tsx`, especially for:

- `IkoriHero`
- `OrgOverview`
- `CaseDetailPage`
- `ResultsDashboard`

Use `React.lazy`/`Suspense` and verify that route transitions, WebGL cleanup, and browser back/forward still work.

### 13.3 Manual routing

The routing implementation is small but duplicated across pathname parsing, navigation, and render branches. It works for current routes but becomes error-prone as pages grow. Either keep additions disciplined or introduce React Router in a dedicated change with regression testing.

### 13.4 Legacy naming

Internal `FABLE` names remain in comments, storage keys, types, score versions, and possibly API contract fields. Separate visible branding cleanup from backend-contract changes. Renaming API fields or persisted storage keys can break compatibility.

### 13.5 Seeded versus live data

The application is a deterministic demo/recording environment. Some components contain fixed timestamps and scenario-specific branches. Maintain visible synthetic-data disclosure. Do not describe it as live production telemetry.

### 13.6 No test harness

Only TypeScript and production-build checks currently exist. High-value future coverage:

- App route parsing and `popstate` behavior.
- Results scenario filtering.
- Results JSON export payload.
- Entity case-status transitions.
- JIT separation-of-duties flows.
- Hero mount/unmount cleanup.

### 13.7 Header density

The product console header contains many controls. At intermediate viewport widths the navigation can become crowded. Implement a deliberate responsive navigation pattern before adding more top-level buttons.

## 14. Safe next-agent workflow

1. Change into the nested application directory.
2. Read this file completely.
3. Read `src/App.tsx`, then the component directly responsible for the requested area.
4. Check for user changes before editing the same file.
5. Preserve unrelated behavior and deterministic seed provenance.
6. Use `apply_patch` or similarly scoped edits; avoid bulk rewriting large components.
7. Run `npm run lint` after implementation.
8. Run `npm run build` for any component, routing, dependency, or CSS change.
9. Open the exact affected route in a browser and inspect it visually.
10. Test every control that looks interactive.
11. Check browser console warnings/errors.
12. Verify at desktop and mobile/tablet widths for layout work.

## 15. Suggested continuation priorities

These are recommendations, not completed work:

### Priority A — finish shared product navigation

Create a reusable IKORI product header used by the console and Results page so navigation, branding, theme controls, and responsive behavior do not drift.

### Priority B — connect real evaluation artifacts

Define a typed evaluation-results schema, for example:

```ts
interface EvaluationRun {
  id: string;
  modelVersion: string;
  datasetVersion: string;
  evaluatedAt: string;
  split: { train?: number; validation?: number; test: number };
  classification?: {
    precision: number;
    recall: number;
    f1: number;
    falsePositiveRate: number;
  };
  ranking?: {
    ndcgAt5?: number;
    recallAt5?: number;
  };
  calibration?: Array<{ predicted: number; observed: number }>;
  provenance: string;
}
```

Only replace empty states when a validated artifact is present. Include version, timestamp, split, and provenance in the UI.

### Priority C — improve graph clarity

The user likes the graph direction but wants better symbols, clearer interpretation, and less clutter. Before changing it:

- Inspect `Network3DGraph.tsx` fully.
- Preserve node-selection and case-navigation behavior.
- Reduce simultaneous labels.
- Introduce semantic node glyphs by entity type.
- Add progressive detail by zoom/selection.
- Keep risk color and edge-state legends consistent.
- Verify pointer orbit, scrolling, resizing, and accessibility.

### Priority D — bundle splitting

Lazy-load route-heavy components and measure bundle output again. Do not compromise the hero entrance or create loading-layout shifts.

### Priority E — replace the temporary below-hero bridge

The current landing content below `IkoriHero` in `App.tsx` is a simple three-card bridge. A prior specification requested a data-driven, animated Attack Path Compiler architecture flowchart. That full architecture section is not represented by the current three-card content. If the user asks to continue the landing page, this is the main unfinished design area.

## 16. Data rules for future work

Use these labels consistently:

- `Synthetic recording data` for current fixed demo state.
- `Scenario assessment` for case-level seeded values.
- `Evaluation result` only for an actual evaluation artifact.
- `Live` only when backed by a real live integration and confirmed in the code.

Never derive precision, recall, F1, false-positive rate, or ranking quality from four hand-authored scenarios. Those require labelled predictions and a defined evaluation protocol.

If data is absent:

- Show an empty state.
- State exactly what artifact is missing.
- Explain the minimum input needed.
- Keep the rest of the page useful with real available data.

## 17. Definition of done for future frontend changes

A change is not complete until:

- The requested route/component is implemented rather than merely mocked.
- Visible controls have defined behavior.
- Data labels accurately describe provenance.
- Existing hero and product behavior remain intact unless explicitly in scope.
- TypeScript passes.
- Production build passes.
- The affected page is visually inspected.
- Desktop and narrow layouts remain usable.
- No new browser-console errors are introduced.
- Changed files and remaining limitations are reported clearly to the user.

## 18. Quick orientation checklist

If you only have a few minutes before coding, open these in order:

1. `AGENT_HANDOFF.md`
2. `src/App.tsx`
3. `src/index.css`
4. The specific page component in scope.
5. `src/types.ts`
6. `src/data/recordingSeed.ts`
7. `package.json`

For hero work, add `src/components/IkoriHero.tsx` and do not proceed without reading the relevant WebGL and animation sections.

For Results work, add `src/components/ResultsDashboard.tsx` and `src/components/ResultsDashboard.css`.

For graph work, add `src/components/Network3DGraph.tsx` and `src/components/OrgOverview.tsx`.

---

The application is currently in a buildable state. Preserve that baseline, keep the IKORI experience coherent, and prefer verified evidence over impressive-looking invented numbers.
