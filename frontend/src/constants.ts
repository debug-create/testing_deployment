// src/constants.ts
// Shared system-wide constants and contract specifications for FABLE (v2.0.0)

export const DEMO_CONTRACT_VERSION = '2.0.0';
export const SCORING_VERSION = 'fable-scoring-v2.0.0';

export const RECORDING_MODE_BADGE = 'DEMO SIMULATION · SYNTHETIC DATA';
export const LIVE_MODE_BADGE = 'LIVE BACKEND';
export const SIMULATED_ENFORCEMENT_LABEL = 'Simulated enforcement';

export const FORMULA_EXPLANATION =
  'Residual risk is fused from event-level unexplained contributions. Context is applied before case fusion.';

export const FIXED_CLOCK_ISO = '2026-09-12T04:35:00Z';
export const FIXED_CLOCK_DISPLAY = '2026-09-12 04:35 UTC';

export const MIN_PERSONAL_HISTORY_DAYS = 14;
export const MIN_PERSONAL_HISTORY_HOURS = MIN_PERSONAL_HISTORY_DAYS * 24; // 336 hours

export const ESCALATION_RISK_THRESHOLD = 70;
export const ELEVATED_RISK_THRESHOLD = 40;

export const DEFAULT_API_URL = 'http://127.0.0.1:8000';

