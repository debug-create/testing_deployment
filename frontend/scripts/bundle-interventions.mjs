import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const datasetRoot = process.argv[2];
if (!datasetRoot) {
  throw new Error('Usage: node scripts/bundle-interventions.mjs <attack_path_dataset root>');
}

const source = resolve(datasetRoot, 'data/model_input/interventions.jsonl');
const destination = resolve('src/data/model_input/interventions.json');
const records = readFileSync(source, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

writeFileSync(destination, `${JSON.stringify({ source: 'data/model_input/interventions.jsonl', synthetic: true, records })}\n`);
console.log(`Bundled ${records.length} interventions into ${destination}`);
