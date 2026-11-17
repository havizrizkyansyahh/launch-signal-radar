import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import '../dashboard/model.js';
const model = globalThis.LaunchModel;
import { sealedInput } from './kit.js';
const sealed = JSON.parse(readFileSync(sealedInput, 'utf8'));

test('all sealed rows form a deterministic varied ranked board with complete watchlist and concrete plans', () => {
  assert.equal(typeof model.buildRadar, 'function', 'full ranked board is missing');
  const board = model.buildRadar(sealed);
  assert.equal(board.rows.length, 758);
  assert.equal(board.coverage.watchlist_covered, 40);
  assert.equal(board.coverage.token_recorded, 416);
  assert.equal(board.coverage.no_token_recorded, 342);
  assert.equal(new Set(board.rows.map((r) => r.slug)).size, 758);
  for (const [i, row] of board.rows.entries()) {
    assert.equal(row.rank, i + 1);
    assert.ok(Number.isSafeInteger(row.implied_value_usd) && row.implied_value_usd > 0 && row.implied_value_usd <= 1e14);
    if (i) assert.ok(board.rows[i - 1].implied_value_usd >= row.implied_value_usd);
    assert.ok(row.uncertainty.low_usd <= row.implied_value_usd && row.implied_value_usd <= row.uncertainty.high_usd);
    assert.ok(row.farm_steps.length >= 3 && row.farm_steps.length <= 12);
    row.farm_steps.forEach((step) => assert.ok(step.trim().length >= 20 && step.trim().length <= 600));
  }
  assert.ok(new Set(board.rows.map((r) => r.implied_value_usd)).size > 1);
  assert.deepEqual(model.validateBoard(board, sealed), { rows: 758, watchlist_covered: 40 });
  assert.deepEqual(model.buildRadar({ ...sealed, protocols: [...sealed.protocols].reverse(), watchlist: [...sealed.watchlist].reverse() }), board);
  const forged = structuredClone(board); forged.rows[0].farm_steps = ['too short'];
  assert.throws(() => model.validateBoard(forged, sealed), /farm/i);
  const tied = { as_of: sealed.as_of, source: 'Synthetic tie test', floor_usd: 0, watchlist: [], protocols:
    ['z', 'a'].map((slug) => ({ ...sealed.protocols[0], slug, name: 'Synthetic', gecko_id: null, symbol: null, mcap_usd: null })) };
  assert.deepEqual(model.buildRadar(tied).rows.map((r) => r.slug), ['a', 'z']);
  const context = vm.createContext({});
  vm.runInContext(model.dataScript({ text: '</script>\u2028\u2029', board }), context);
  assert.equal(JSON.stringify(context.LAUNCH_DATA), JSON.stringify({ text: '</script>\u2028\u2029', board }));
  assert.ok(!model.dataScript({ text: '</script>' }).includes('</script>'));
});
