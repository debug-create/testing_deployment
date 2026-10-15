import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const catalog = JSON.parse(readFileSync(resolve('src/data/model_input/interventions.json'), 'utf8')) as {
  source: string;
  synthetic: boolean;
  records: Array<{ scenario_id: string; intervention_id: string; affected_edge_ids: string[]; cost_units: number; requires_approval: boolean }>;
};

test('bundled interventions preserve model-input provenance and required decision fields', () => {
  assert.equal(catalog.source, 'data/model_input/interventions.jsonl');
  assert.equal(catalog.synthetic, true);
  assert.ok(catalog.records.length > 0);
  for (const fix of catalog.records) {
    assert.match(fix.scenario_id, /^scn_\d{4}$/);
    assert.ok(fix.intervention_id);
    assert.ok(fix.affected_edge_ids.length > 0);
    assert.ok(Number.isFinite(fix.cost_units));
    assert.equal(typeof fix.requires_approval, 'boolean');
  }
});

test('default scenario exposes multiple fixes for comparison', () => {
  const fixes = catalog.records.filter((record) => record.scenario_id === 'scn_0001');
  assert.ok(fixes.length >= 2);
  assert.notEqual(fixes[0].intervention_id, fixes[1].intervention_id);
});
