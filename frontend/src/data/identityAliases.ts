/**
 * Central presentation aliases for the seeded IKORI demo.
 *
 * Compiler identifiers and source aliases are never changed in the bundled
 * model_input data. This registry only supplies consistent human-readable
 * presentation names across the graph, matrix, map, access workflow and results.
 */
export const IKORI_PERSONAS = {
  priya: 'Priya Ramesh',
  devraj: 'Devraj Malhotra',
  alex: 'Alex Thorne',
  sarah: 'Sarah Sterling',
  elena: 'Elena Rostova',
  neha: 'Neha Sharma',
  arjun: 'Arjun Patel',
  marcus: 'Marcus Vance',
  maya: 'Maya Lin',
  oliver: 'Oliver Brown',
} as const;

export const SCENARIO_IDENTITY_ALIASES: Record<string, string> = {
  identity_001: IKORI_PERSONAS.alex,
  identity_002: IKORI_PERSONAS.priya,
  identity_003: IKORI_PERSONAS.neha,
  identity_004: IKORI_PERSONAS.sarah,
  identity_005: IKORI_PERSONAS.elena,
  identity_admin_001: IKORI_PERSONAS.marcus,
  identity_admin_002: IKORI_PERSONAS.oliver,
  identity_admin_003: IKORI_PERSONAS.devraj,
  cloud_identity_001: IKORI_PERSONAS.maya,
  cloud_identity_002: IKORI_PERSONAS.arjun,
};

export interface AliasableScenarioAsset {
  asset_id: string;
  display_name?: string;
  hostname?: string;
  ip_address?: string;
}

export function resolveScenarioAssetName(asset: AliasableScenarioAsset): string {
  return SCENARIO_IDENTITY_ALIASES[asset.asset_id]
    || asset.display_name
    || asset.hostname
    || asset.ip_address
    || asset.asset_id;
}

export function sourceScenarioAssetName(asset: AliasableScenarioAsset): string | undefined {
  const resolved = resolveScenarioAssetName(asset);
  const source = asset.display_name || asset.hostname || asset.ip_address;
  return source && source !== resolved ? source : undefined;
}
