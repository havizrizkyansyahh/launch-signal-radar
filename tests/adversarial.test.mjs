import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import '../dashboard/model.js';
const root = resolve(import.meta.dirname, '..');
const engine = globalThis.LaunchModel;
import { sealedInput } from './kit.js';
const input = sealedInput;

test('output destination names with URL-significant characters are honoured literally', () => {
  const base = mkdtempSync(join(root, 'out-edge-'));
  try {
    const nested = join(base, 'hash#and?query dir', 'out');
    mkdirSync(join(base, 'hash#and?query dir'), { recursive: true });
    const run = spawnSync(process.execPath, ['main.ts', '--input', input, '--out', nested, '--data-only'],
      { cwd: root, encoding: 'utf8', timeout: 15000 });
    assert.equal(run.status, 0, run.stderr);
    assert.ok(existsSync(join(nested, 'board.json')), 'board.json must land in the requested directory');
    assert.ok(existsSync(join(nested, 'dashboard', 'index.html')), 'dashboard must be copied into the requested directory');
    assert.ok(!existsSync(join(base, 'board.json')), 'nothing may leak into a truncated path');
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('snapshot text cannot escape the generated data script or the rendered DOM', () => {
  const hostile = '</script><img src=x onerror="globalThis.__pwned=1"><!--';
  const snapshot = {
    as_of: '2026-11-14', source: 'Synthetic injection fixture only ' + hostile, floor_usd: 0,
    protocols: [{ slug: 'synthetic-hostile', name: hostile + ' Vault', category: 'Lending', chains: ['Test Chain'],
      tvl_usd: 1000000, change_7d: null, mcap_usd: null, listed_at: null, gecko_id: null, symbol: null }],
    watchlist: ['synthetic-hostile'],
  };
  const board = engine.buildRadar(engine.parseSnapshot(snapshot));
  const script = engine.dataScript(board);
  assert.ok(!script.includes('</script'), 'a literal closing script tag must never appear');
  assert.ok(!script.includes('<img'), 'raw markup must not appear unescaped');
  const context = vm.createContext({});
  vm.runInContext(script, context);
  assert.equal(context.LAUNCH_DATA.rows[0].name, hostile + ' Vault');
  assert.ok(context.LAUNCH_DATA.rows[0].farm_steps.length >= 3 && context.LAUNCH_DATA.rows[0].farm_steps.length <= 12);
  const ui = ['app.js', 'view.js', 'model.js'].map((f) => [f, readFileSync(join(root, 'dashboard', f), 'utf8')]);
  for (const [file, source] of ui) {
    for (const sink of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(']) {
      assert.ok(!source.includes(sink), file + ' must not use the unsafe DOM sink ' + sink);
    }
  }
});

test('model boundary facts stay inside the board contract', () => {
  const sealed = JSON.parse(readFileSync(input, 'utf8'));
  const extreme = engine.parseSnapshot({
    ...sealed, floor_usd: 0, watchlist: ['synthetic-zero', 'synthetic-huge'],
    protocols: [
      { ...sealed.protocols[0], slug: 'synthetic-zero', name: 'Synthetic Zero', tvl_usd: 0, mcap_usd: null, gecko_id: null, symbol: null },
      { ...sealed.protocols[0], slug: 'synthetic-huge', name: 'Synthetic Huge', tvl_usd: 900000000000000, category: 'Unseen Category', listed_at: '2099-01-01', change_7d: null, mcap_usd: null, gecko_id: null, symbol: null },
    ],
  });
  const board = engine.buildRadar(extreme);
  assert.equal(board.rows.length, 2);
  for (const row of board.rows) {
    assert.ok(row.implied_value_usd >= 1 && row.implied_value_usd <= 1e14);
    assert.ok(row.uncertainty.low_usd <= row.implied_value_usd && row.implied_value_usd <= row.uncertainty.high_usd);
  }
  const huge = board.rows.find((r) => r.slug === 'synthetic-huge');
  assert.equal(huge.factors.age_days, null);
  assert.ok(huge.uncertainty.reasons.includes('future-tracking-date'));
  assert.ok(huge.uncertainty.reasons.includes('missing-growth'));
  assert.equal(huge.factors.calibration_level !== undefined, true);
  // The gate requires 100+ rows, so a two-row fixture must be refused rather than silently accepted.
  assert.throws(() => engine.validateBoard(board, extreme), /row count/i);
});