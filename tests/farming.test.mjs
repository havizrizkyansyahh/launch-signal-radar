import assert from 'node:assert/strict';
import test from 'node:test';
import '../dashboard/model.js';
const model = globalThis.LaunchModel;
const p = (category, patch = {}) => ({ slug: 'synthetic', name: 'Synthetic', category, chains: ['Test Chain'],
  tvl_usd: 10000000, change_7d: 0, mcap_usd: null, listed_at: null, gecko_id: null, symbol: null, ...patch });

test('farm research plans adapt actions and budget to category without inventing campaigns', () => {
  assert.equal(typeof model.farmPlan, 'function', 'concrete category plans are missing');
  const lending = model.farmPlan(p('Lending'));
  const dex = model.farmPlan(p('Dexs'));
  assert.notDeepEqual(lending.steps, dex.steps);
  assert.match(lending.steps.join(' '), /supply|withdraw/i);
  assert.match(dex.steps.join(' '), /swap|liquidity/i);
  for (const category of ['Lending', 'Dexs', 'Risk Curators', 'RWA', 'Bridge', 'Derivatives', null]) {
    const plan = model.farmPlan(p(category));
    assert.ok(plan.steps.length >= 3 && plan.steps.length <= 12);
    for (const step of plan.steps) assert.ok(step.trim().length >= 20 && step.trim().length <= 600, step);
    const all = plan.steps.join(' ');
    for (const term of [/illustrative/i, /not live/i, /official domain/i, /contract/i, /stop/i, /minute/i, /day/i]) assert.match(all, term);
    assert.ok(!/https?:|guaranteed|earn points/i.test(all));
  }
  const bridge = model.farmPlan(p('Bridge'));
  assert.equal(bridge.mode, 'research-only');
  assert.equal(bridge.budget.capital_usd, 0);
  assert.equal(bridge.budget.fees_usd, 0);
  assert.equal(model.farmPlan(p('Derivatives')).mode, 'research-only');
  assert.match(model.farmPlan(p('Lending', { symbol: 'SYN' })).steps.join(' '), /token recorded/i);
  assert.ok(model.productRisks(p('Lending', { name: 'Synthetic V2' })).includes('versioned-product'));
});
