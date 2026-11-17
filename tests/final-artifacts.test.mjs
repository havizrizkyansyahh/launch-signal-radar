import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildDossier } from '../vendor/makefun-board.ts';
import { kitRoot } from './kit.js';
const root = new URL('../', import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
test('three genuine final screenshots and immutable helper are ready for dossier packaging', () => {
  assert.ok(existsSync(new URL('screenshots/', root)), 'genuine screenshot evidence is missing');
  const files = readdirSync(new URL('screenshots/', root)).sort();
  assert.deepEqual(files, ['01-board.jpg', '02-detail.jpg', '03-filtered.jpg']);
  for (const file of files) {
    const bytes = readFileSync(new URL('screenshots/' + file, root));
    assert.ok(bytes.length <= 524288 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217);
  }
  const official = kitRoot + '/starter/vendor/makefun-board.ts';
  assert.equal(sha(readFileSync(new URL('vendor/makefun-board.ts', root))), sha(readFileSync(official)));
  const dossier = buildDossier(root.pathname, { text_max_bytes: 65536 });
  assert.ok(dossier.length <= 1572864);
  const doc = JSON.parse(Buffer.from(dossier).toString('utf8'));
  assert.equal(doc.images.length, 3);
  assert.ok(!doc.text.includes('[Cut at '), 'dashboard source must be complete');
});
