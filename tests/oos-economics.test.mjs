import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import '../dashboard/model.js';
import { sealedInput } from './kit.js';
const engine = globalThis.LaunchModel;
const sealed = JSON.parse(readFileSync(sealedInput, 'utf8'));
const anySealed = () => JSON.parse(JSON.stringify(sealed));

test('the holdout split is deterministic, disjoint and roughly 70/30', () => {
  assert.equal(typeof engine.splitPeers, 'function', 'deterministic split is missing');
  const a = engine.splitPeers(sealed, 'a'), b = engine.splitPeers(sealed, 'a'), c = engine.splitPeers(sealed, 'b');
  assert.deepEqual(a.fit.map((p) => p.slug), b.fit.map((p) => p.slug));
  assert.deepEqual(a.holdout.map((p) => p.slug), b.holdout.map((p) => p.slug));
  const fit = new Set(a.fit.map((p) => p.slug));
  assert.ok(a.holdout.every((p) => !fit.has(p.slug)), 'splits must not overlap');
  const total = a.fit.length + a.holdout.length;
  assert.equal(total, a.eligible);
  assert.ok(a.fit.length / total >= 0.6 && a.fit.length / total <= 0.8, 'fit share ' + a.fit.length / total);
  assert.notDeepEqual(a.fit.map((p) => p.slug), c.fit.map((p) => p.slug), 'a second salt must produce a different split');
});

test('model families are compared on holdout error and the winner is the best holdout', () => {
  assert.equal(typeof engine.validateModels, 'function', 'out-of-sample validation is missing');
  const v = engine.validateModels(sealed);
  assert.ok(v.families.length >= 4);
  const names = v.families.map((f) => f.id);
  for (const id of ['naive-tvl', 'global', 'category', 'category-growth-age']) assert.ok(names.includes(id), id);
  for (const f of v.families) {
    assert.ok(f.holdout.n >= 20 && f.holdout.n <= v.holdout_n, f.id + ' holdout size');
    assert.ok(Number.isFinite(f.holdout.mdape) && f.holdout.mdape >= 0);
    assert.ok(Number.isFinite(f.holdout.mape) && f.holdout.mape >= 0);
    assert.ok(f.holdout.spearman >= -1 && f.holdout.spearman <= 1);
    assert.ok(f.holdout.within_2x >= 0 && f.holdout.within_2x <= 1);
  }
  const best = [...v.families].sort((x, y) => x.holdout.mdape - y.holdout.mdape || x.holdout.mape - y.holdout.mape)[0];
  assert.equal(v.chosen, best.id, 'chosen family must be the minimum holdout MdAPE');
  assert.equal(typeof v.stability.stable, 'boolean');
  assert.equal(v.stability.stable, v.stability.second_split_chosen === v.chosen, 'stability flag must describe the second split');
});

test('fit statistics never see holdout rows', () => {
  const split = engine.splitPeers(sealed, 'a');
  const before = engine.fitFamilies(split.fit, sealed.as_of);
  const holdoutSlugs = new Set(split.holdout.map((p) => p.slug));
  const tampered = sealed.protocols.map((p) => holdoutSlugs.has(p.slug) ? { ...p, mcap_usd: p.tvl_usd * 1e6 } : p);
  const after = engine.fitFamilies(engine.splitPeers({ ...sealed, protocols: tampered }, 'a').fit, sealed.as_of);
  assert.deepEqual(before, after, 'changing holdout market caps must not move fitted parameters');
  assert.ok(!JSON.stringify(split.fit).includes('holdout'));
});

test('net farm economics use explicit costs and break at the stated thresholds', () => {
  assert.equal(typeof engine.economics, 'function', 'net economics are missing');
  const base = { family: 'lending', mode: 'conditional-small-test', capital_usd: 5000, fees_cap_usd: 10,
    active_minutes: 90, horizon_days: 14, tx_per_step: 2, steps: 7, chains: 1, principal_risk: 0.25,
    tvl_usd: 10000000, implied_value_usd: 3000000 };
  const e = engine.economics(base);
  assert.equal(e.tx_count, 14);
  assert.ok(e.gas_cost_usd > 0 && e.bridge_cost_usd === 0);
  assert.ok(e.costs_usd >= e.gas_cost_usd);
  assert.ok(Number.isFinite(e.expected_gross_usd) && e.expected_gross_usd >= 0);
  assert.equal(Math.round((e.net_usd + 0) * 100) / 100, Math.round((e.expected_gross_usd - e.costs_usd) * 100) / 100);
  assert.ok(e.breakeven_multiple >= 1);
  assert.equal(e.verdict, e.net_usd > 0 && e.net_usd >= 2 * e.costs_usd && e.principal_risk <= 0.4 ? 'farm' : e.net_usd > 0 ? 'thin' : 'skip');
  assert.equal(engine.economics({ ...base, capital_usd: 0 }).verdict, 'skip');
  assert.equal(engine.economics({ ...base, capital_usd: 0 }).reason, 'no-capital-at-risk');
  assert.equal(engine.economics({ ...base, chains: 3 }).bridge_cost_usd > 0, true);
  const boundary = engine.economics({ ...base, implied_value_usd: 0 });
  assert.equal(boundary.verdict, 'skip', 'a zero expected reward cannot be a farm');
});

test('the sealed board carries validation and net economics deterministically', () => {
  const board = engine.buildRadar(anySealed());
  assert.ok(board.validation && board.validation.chosen);
  assert.ok(board.economics_summary && typeof board.economics_summary.verdicts === 'object');
  let farm = 0, thin = 0, skip = 0;
  for (const row of board.rows) {
    assert.ok(['farm', 'thin', 'skip'].includes(row.economics.verdict), row.slug);
    assert.ok(row.farm_steps.length >= 3 && row.farm_steps.length <= 12);
    if (row.economics.verdict === 'farm') farm++;
    else if (row.economics.verdict === 'thin') thin++;
    else skip++;
    if (row.economics.capital_usd === 0) assert.equal(row.economics.verdict, 'skip');
  }
  assert.deepEqual(board.economics_summary.verdicts, { farm, thin, skip });
  assert.equal(farm + thin + skip, board.rows.length);
  assert.deepEqual(engine.buildRadar(JSON.parse(JSON.stringify(sealed))), board, 'sealed output must be deterministic');
});