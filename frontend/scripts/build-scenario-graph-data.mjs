import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const datasetRoot = process.argv[2];

if (!datasetRoot) {
  throw new Error('Usage: node scripts/build-scenario-graph-data.mjs <attack_path_dataset root>');
}

const modelInput = path.join(datasetRoot, 'data', 'model_input');
const outputDir = path.resolve('src', 'data', 'model_input', 'scenario_graph');

async function readJsonLines(fileName) {
  const text = await readFile(path.join(modelInput, fileName), 'utf8');
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const [scenarios, assets, relationships, events, evidence] = await Promise.all([
  readJsonLines('scenarios.jsonl'),
  readJsonLines('assets.jsonl'),
  readJsonLines('relationships.jsonl'),
  readJsonLines('events.jsonl'),
  readJsonLines('evidence.jsonl'),
]);

const evidenceByEvent = new Map(evidence.map((item) => [item.event_id, item]));
const byScenario = (rows, scenarioId) => rows.filter((row) => row.scenario_id === scenarioId);

await mkdir(outputDir, { recursive: true });

for (const scenario of scenarios) {
  const scenarioId = scenario.scenario_id;
  const payload = {
    scenario_id: scenarioId,
    synthetic: true,
    graph_version: scenario.graph_version,
    entry_points: scenario.entry_points,
    critical_targets: scenario.critical_targets,
    time_window_start: scenario.time_window_start,
    time_window_end: scenario.time_window_end,
    assets: byScenario(assets, scenarioId),
    relationships: byScenario(relationships, scenarioId),
    events: byScenario(events, scenarioId).map((event) => {
      const eventEvidence = evidenceByEvent.get(event.event_id);
      return {
        ...event,
        collection_confidence: eventEvidence?.collection_confidence,
        collection_method: eventEvidence?.collection_method,
        source_reliability: eventEvidence?.source_reliability,
      };
    }),
  };

  await writeFile(
    path.join(outputDir, `${scenarioId}.json`),
    `${JSON.stringify(payload)}\n`,
    'utf8',
  );
}

console.log(`Bundled ${scenarios.length} scenarios from data/model_input into ${outputDir}`);
