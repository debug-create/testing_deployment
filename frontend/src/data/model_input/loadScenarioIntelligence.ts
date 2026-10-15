import catalog from './scenarioIntelligence.json';
import { resolveScenarioAssetName } from '../identityAliases';
import interventionCatalog from './interventions.json';

export interface ScenarioIntelligenceRecord {
  scenario_id: string;
  synthetic: boolean;
  schema_version?: string;
  graph_version?: string;
  event_count: number;
  asset_count: number;
  relationship_count: number;
  entry_point_count: number;
  critical_target_count: number;
  entry_points: string[];
  critical_targets: string[];
  time_window_start?: string;
  time_window_end?: string;
  source_type_count: number;
  candidate_fix_count: number;
  approval_required_count: number;
}

export interface ScenarioIntelligenceCatalog {
  source: string;
  synthetic_data_declaration: string;
  default_scenario_id: string;
  scenarios: ScenarioIntelligenceRecord[];
}

export type ScenarioAssetType =
  | 'user_identity'
  | 'privileged_identity'
  | 'cloud_identity'
  | 'endpoint'
  | 'application'
  | 'server'
  | 'database'
  | 'security_infrastructure'
  | 'external_entry';

export interface ScenarioGraphAsset {
  scenario_id: string;
  asset_id: string;
  asset_type: ScenarioAssetType;
  display_name?: string;
  email?: string;
  hostname?: string;
  ip_address?: string;
  zone: string;
  exposure: string;
  criticality: number;
  security_controls: string[];
  configuration_confidence: number;
  evidence_coverage: number;
  identity_confidence: number;
}

export type RelationshipEvidenceBasis = 'configured' | 'inferred' | 'weak' | 'unsupported';

export interface ScenarioGraphRelationship {
  scenario_id: string;
  edge_id: string;
  graph_version: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  evidence_basis: RelationshipEvidenceBasis;
  prior_probability: number;
}

export interface ScenarioGraphEvent {
  scenario_id: string;
  event_id: string;
  event_type: string;
  timestamp: string | number;
  source: string;
  source_entity_raw?: string;
  target_entity_raw?: string;
  severity_raw?: string | number | null;
  observed_fields: Record<string, string | number | boolean | null>;
  collection_confidence?: number;
  collection_method?: string;
  source_reliability?: number;
}

export interface ScenarioGraphData {
  scenario_id: string;
  synthetic: true;
  graph_version: string;
  entry_points: string[];
  critical_targets: string[];
  time_window_start?: string;
  time_window_end?: string;
  assets: ScenarioGraphAsset[];
  relationships: ScenarioGraphRelationship[];
  events: ScenarioGraphEvent[];
}

export interface ScenarioInterventionSideEffect {
  affected_asset_ids: string[];
  severity: 'low' | 'medium' | 'high';
  type: string;
}

export interface ScenarioIntervention {
  scenario_id: string;
  intervention_id: string;
  name: string;
  category: string;
  cost_units: number;
  requires_approval: boolean;
  affected_edge_ids: string[];
  side_effects: ScenarioInterventionSideEffect[];
}

interface InterventionCatalog {
  source: string;
  synthetic: boolean;
  records: ScenarioIntervention[];
}

export const SCENARIO_INTELLIGENCE_CATALOG = catalog as ScenarioIntelligenceCatalog;
const INTERVENTION_CATALOG = interventionCatalog as InterventionCatalog;

export function getScenarioInterventions(scenarioId: string): ScenarioIntervention[] {
  return INTERVENTION_CATALOG.records.filter((record) => record.scenario_id === scenarioId);
}

const scenarioGraphModules = import.meta.glob('./scenario_graph/*.json', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const scenarioGraphCache = new Map<string, Promise<ScenarioGraphData>>();

export function getScenarioIntelligence(
  scenarioId: string = SCENARIO_INTELLIGENCE_CATALOG.default_scenario_id
): ScenarioIntelligenceRecord {
  const match = SCENARIO_INTELLIGENCE_CATALOG.scenarios.find(
    (scenario) => scenario.scenario_id === scenarioId
  );
  return match ?? SCENARIO_INTELLIGENCE_CATALOG.scenarios[0];
}

export function loadScenarioGraphData(
  scenarioId: string = SCENARIO_INTELLIGENCE_CATALOG.default_scenario_id
): Promise<ScenarioGraphData> {
  const safeScenarioId = SCENARIO_INTELLIGENCE_CATALOG.scenarios.some(
    (scenario) => scenario.scenario_id === scenarioId
  )
    ? scenarioId
    : SCENARIO_INTELLIGENCE_CATALOG.default_scenario_id;

  const existing = scenarioGraphCache.get(safeScenarioId);
  if (existing) return existing;

  const modulePath = `./scenario_graph/${safeScenarioId}.json`;
  const importer = scenarioGraphModules[modulePath];
  if (!importer) {
    return Promise.reject(new Error(`Bundled graph data is missing for ${safeScenarioId}`));
  }

  const pending = importer().then((raw) => JSON.parse(raw) as ScenarioGraphData);
  scenarioGraphCache.set(safeScenarioId, pending);
  return pending;
}

export function formatScenarioAssetName(asset: ScenarioGraphAsset): string {
  return resolveScenarioAssetName(asset);
}

export function formatScenarioTimestamp(value: string | number): string {
  const date =
    typeof value === 'number'
      ? new Date(value > 10_000_000_000 ? value : value * 1000)
      : new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}
