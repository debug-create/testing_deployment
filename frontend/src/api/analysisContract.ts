/** Versioned boundary shared by the seeded frontend adapter and future ML API. */
export const ANALYSIS_CONTRACT_VERSION = 'attacktwin.analysis.v1' as const;

export interface AnalysisProvenance {
  mode: 'seeded_simulation' | 'backend';
  modelVersion: string;
  datasetVersion: string;
  generatedAt: string;
  contractVersion: typeof ANALYSIS_CONTRACT_VERSION;
}

export interface EdgeBelief {
  edgeId: string;
  priorProbability: number;
  posteriorProbability?: number;
  evidenceBasis: 'configured' | 'inferred' | 'weak' | 'unsupported';
  evidenceEventIds: string[];
  confidenceInterval?: [number, number];
}

export interface CompiledPathCandidate {
  pathId: string;
  edgeIds: string[];
  assetIds: string[];
  probability?: number;
  status: 'candidate' | 'supported' | 'unsupported';
}

export interface AnalysisIntervention {
  interventionId: string;
  affectedEdgeIds: string[];
  costUnits: number;
  requiresApproval: boolean;
  estimatedEffect?: { before: number; after: number; metric: string };
}

export interface LedgerEntry {
  id: string;
  occurredAt: string;
  kind: 'evidence' | 'belief_update' | 'path_update' | 'intervention' | 'approval';
  sourceIds: string[];
  summary: string;
}

export interface TrustAxis {
  axis: 'identity' | 'device_location' | 'operational_context' | 'requested_scope' | 'evidence_coverage';
  value?: number;
  status: 'measured' | 'proxy' | 'unavailable';
  evidenceIds: string[];
}

export interface ScenarioAnalysisResponse {
  scenarioId: string;
  provenance: AnalysisProvenance;
  edgeBeliefs: EdgeBelief[];
  compiledPaths: CompiledPathCandidate[];
  interventions: AnalysisIntervention[];
  ledger: LedgerEntry[];
  trustVectors: Array<{ assetId: string; axes: TrustAxis[] }>;
}

export function assertProbability(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${field} must be between 0 and 1`);
}

export function validateScenarioAnalysis(value: ScenarioAnalysisResponse): ScenarioAnalysisResponse {
  if (value.provenance.contractVersion !== ANALYSIS_CONTRACT_VERSION) throw new Error(`Unsupported analysis contract: ${value.provenance.contractVersion}`);
  value.edgeBeliefs.forEach((edge) => {
    assertProbability(edge.priorProbability, `${edge.edgeId}.priorProbability`);
    if (edge.posteriorProbability !== undefined) assertProbability(edge.posteriorProbability, `${edge.edgeId}.posteriorProbability`);
  });
  return value;
}
