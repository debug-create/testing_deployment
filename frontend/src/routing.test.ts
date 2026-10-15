import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePageRoute, parseProductView, productViewPath, routePath } from './routing';

test('parses product, results, home and case routes', () => {
  assert.deepEqual(parsePageRoute('/'), { path: 'home' });
  assert.deepEqual(parsePageRoute('/product'), { path: 'product' });
  assert.deepEqual(parsePageRoute('/results'), { path: 'results' });
  assert.deepEqual(parsePageRoute('/product/case/104'), { path: 'case', caseId: '104' });
});

test('builds encoded route and product-view paths', () => {
  assert.equal(routePath({ path: 'case', caseId: 'case / 104' }), '/product/case/case%20%2F%20104');
  assert.equal(productViewPath('matrix'), '/product?view=matrix');
});

test('parses product view aliases and preserves the fallback', () => {
  assert.equal(parseProductView('?view=matrix'), 'matrix');
  assert.equal(parseProductView('?view=jit'), 'access-requests');
  assert.equal(parseProductView('?view=unknown', 'threat-map'), 'threat-map');
});
