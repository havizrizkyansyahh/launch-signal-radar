import assert from 'node:assert/strict';
import test from 'node:test';
import '../dashboard/model.js';
const model = globalThis.LaunchModel;
// Synthetic boundary fixtures; never shipped as protocol observations.
const p = (patch = {}) => ({ slug: 'synthetic', name: 'Synthetic', category: 'Lending', chains: ['Test Chain'],
  tvl_usd: 10000000, change_7d: 0, mcap_usd: null, listed_at: '2025-11-14', gecko_id: null, symbol: null, ...patch });
const s = (row) => ({ as_of: '2026-11-14', source: 'Synthetic tests only', floor_usd: 50000000,
  protocols: [row, p({ slug: 'peer', gecko_id: 'synthetic-peer', mcap_usd: 20000000 })], watchlist: [row.slug] });

test('valuation exposes bounded snapshot-relative factors and honest missing-data scenarios', () => {
  assert.equal(typeof model.valueProtocol, 'function', 'per-protocol valuation is missing');
  const row = p(), input = s(row), v = model.valueProtocol(row, input);
  assert.equal(v.factors.age_days, 365);
  assert.equal(v.factors.age_factor, 1);
  assert.equal(v.factors.growth_factor, 1);
  assert.ok(Math.abs(v.factors.peer_multiple - 2) < 1e-12);
  assert.equal(v.implied_value_usd, 20000000);
  assert.ok(v.uncertainty.low_usd < v.implied_value_usd && v.uncertainty.high_usd > v.implied_value_usd);
  assert.match(v.uncertainty.label, /heuristic/i);
  const valued = (patch) => model.valueProtocol(p(patch), input);
  assert.ok(valued({ change_7d: -40 }).implied_value_usd < v.implied_value_usd);
  assert.equal(valued({ change_7d: 4448 }).factors.growth_factor, valued({ change_7d: 100 }).factors.growth_factor);
  assert.equal(valued({ change_7d: -200 }).factors.growth_used_pct, -75);
  const missing = valued({ change_7d: null, listed_at: null });
  assert.equal(missing.factors.growth_factor, 1);
  assert.equal(missing.factors.age_factor, 1);
  assert.equal(missing.factors.age_days, null);
  assert.ok(missing.uncertainty.high_usd > v.uncertainty.high_usd);
  assert.ok(missing.uncertainty.reasons.includes('missing-tracking-date'));
  const future = valued({ listed_at: '2026-11-15' });
  assert.equal(future.factors.age_days, null);
  assert.equal(future.factors.age_factor, 1);
  assert.ok(future.uncertainty.reasons.includes('future-tracking-date'));
  assert.ok(valued({ listed_at: '2000-01-01' }).factors.age_factor <= 1.2);
  assert.ok(valued({ listed_at: '2026-11-14' }).factors.age_factor >= 0.8);
  const zero = valued({ tvl_usd: 0 });
  assert.equal(zero.implied_value_usd, 1);
  assert.ok(zero.uncertainty.reasons.includes('zero-tvl-floor'));
  const otherName = valued({ name: 'Another synthetic name', slug: 'another' });
  assert.equal(otherName.implied_value_usd, v.implied_value_usd);
  const peer = input.protocols[1], leaveOut = model.valueProtocol(peer, input);
  assert.equal(leaveOut.factors.self_excluded, true);
  assert.equal(leaveOut.factors.global_peers, 0);
  assert.equal(leaveOut.factors.calibration_level, 'assumed-no-peers');
});
