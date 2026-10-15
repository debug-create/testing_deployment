export interface EvaluationArtifact {
  id: string;
  modelVersion: string;
  datasetVersion: string;
  evaluatedAt: string;
  provenance: string;
  split: { train?: number; validation?: number; test: number };
  classification?: { precision: number; recall: number; f1: number; falsePositiveRate?: number };
  ranking?: { ndcgAt5?: number; recallAt5?: number };
  calibration?: Array<{ predicted: number; observed: number }>;
}

const artifactModules = import.meta.glob('./artifacts/*.json', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

function isEvaluationArtifact(value: unknown): value is EvaluationArtifact {
  if (!value || typeof value !== 'object') return false;
  const artifact = value as Partial<EvaluationArtifact>;
  return Boolean(artifact.id && artifact.modelVersion && artifact.datasetVersion && artifact.evaluatedAt && artifact.provenance && artifact.split && typeof artifact.split.test === 'number');
}

export async function loadLatestEvaluationResult(): Promise<EvaluationArtifact | null> {
  const entries = Object.entries(artifactModules);
  if (!entries.length) return null;
  const artifacts = (await Promise.all(entries.map(async ([, load]) => JSON.parse(await load()) as unknown))).filter(isEvaluationArtifact);
  return artifacts.sort((a, b) => Date.parse(b.evaluatedAt) - Date.parse(a.evaluatedAt))[0] || null;
}
