import assert from 'node:assert/strict';
import test from 'node:test';
import * as model from '../lib/model.ts';

// Deliberately synthetic fixtures, never displayed as snapshot protocol facts.
export const protocol = (overrides = {}) => ({
  slug: 'synthetic-a', name: 'Synthetic A', category: 'Lending', chains: ['Test Chain'],
  tvl_usd: 10000000, change_7d: 0, mcap_usd: null, listed_at: '2025-11-14',
  gecko_id: null, symbol: null, ...overrides,
});
export const snapshot = (protocols = [protocol()], overrides = {}) => ({
  as_of: '2026-11-14', source: 'Synthetic fixture only', floor_usd: 50000000,
  protocols, watchlist: [protocols[0].slug], ...overrides,
});

test('schema preserves missing and partial facts and rejects ambiguous invalid records', () => {
  assert.equal(typeof model.parseSnapshot, 'function', 'snapshot validator is not implemented');
  const p = protocol({ category: null, change_7d: null, listed_at: null, symbol: 'SYN', mcap_usd: -1 });
  const actual = model.parseSnapshot(JSON.stringify(snapshot([p])));
  assert.deepEqual(actual.protocols[0], p);
  assert.equal(model.classifyTokenRecord(p), 'token-recorded');
  assert.equal(model.classifyTokenRecord(protocol({ gecko_id: 'synthetic-id' })), 'token-recorded');
  assert.equal(model.classifyTokenRecord(protocol()), 'no-token-recorded');
  for (const bad of [
    snapshot([p, p]), snapshot([p], { watchlist: ['missing'] }),
    snapshot([p], { watchlist: [p.slug, p.slug] }), snapshot([p], { as_of: '2026-02-30' }),
    snapshot([protocol({ tvl_usd: -1 })]), snapshot([protocol({ change_7d: Infinity })]),
    snapshot([protocol({ listed_at: 'not-a-date' })]), snapshot([protocol({ gecko_id: '' })]),
    snapshot([protocol({ chains: [''] })]), snapshot([protocol({ name: '  ' })]),
  ]) assert.throws(() => model.parseSnapshot(bad), /snapshot/i);
  assert.equal(model.parseSnapshot(snapshot([protocol({ tvl_usd: 0 })])).protocols[0].tvl_usd, 0);
});

test('peer calibration rejects invalid denominators and shrinks outlier sparse categories', () => {
  assert.equal(typeof model.calibratePeers, 'function', 'robust peer calibration is missing');
  const ps = Array.from({ length: 10 }, (_, i) => protocol({
    slug: 'peer-' + i, gecko_id: 'asset-' + i, category: 'Lending', mcap_usd: (i + 1) * 10000000,
  }));
  ps.push(protocol({ slug: 'outlier', gecko_id: 'outlier-asset', category: 'Synthetic Sparse', mcap_usd: 10000000000000 }));
  ps.push(protocol({ slug: 'zero', symbol: 'ZERO', mcap_usd: 0 }));
  ps.push(protocol({ slug: 'negative', symbol: 'NEG', mcap_usd: -1 }));
  ps.push(protocol({ slug: 'zero-tvl', symbol: 'ZTVL', tvl_usd: 0, mcap_usd: 100 }));
  ps.push(protocol({ slug: 'unidentified-cap', mcap_usd: 200 }));
  const s = model.parseSnapshot(snapshot(ps));
  const c = model.calibratePeers(s);
  assert.equal(c.peer_count, 11);
  assert.equal(c.invalid_mcap_count, 2);
  assert.equal(c.zero_tvl_count, 1);
  assert.equal(c.identifier_free_mcap_count, 1);
  assert.ok(c.global.multiple >= 4 && c.global.multiple <= 7);
  assert.ok(c.clip_high <= 10.000000001);
  const sparse = c.categories.find((x) => x.category === 'Synthetic Sparse');
  assert.equal(sparse.peer_count, 1);
  assert.equal(sparse.category_weight, 1 / 7);
  assert.ok(sparse.multiple < 10);
  assert.deepEqual(model.calibratePeers({ ...s, protocols: [...s.protocols].reverse() }), c);
  const empty = model.calibratePeers(model.parseSnapshot(snapshot([protocol({ category: null })])));
  assert.equal(empty.peer_count, 0);
  assert.equal(empty.global.multiple, 1);
  assert.equal(empty.global.level, 'assumed-no-peers');
});
