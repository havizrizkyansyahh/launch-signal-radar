import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

// Synthetic boundary fixture: no assertion about an actual protocol or campaign.
// A missing market-cap observation must not erase a recorded token identifier.
test('a symbol-only record remains token-recorded when market cap is missing', async () => {
  const modelUrl = new URL('../lib/model.ts', import.meta.url);
  assert.ok(existsSync(modelUrl), 'Missing model behavior: implement lib/model.ts classification before valuation');
  const { classifyTokenRecord } = await import(modelUrl.href);
  assert.equal(typeof classifyTokenRecord, 'function', 'The model must expose classifyTokenRecord');
  const protocol = { gecko_id: null, symbol: 'SYNTHETIC', mcap_usd: null };
  assert.equal(classifyTokenRecord(protocol), 'token-recorded');
});
