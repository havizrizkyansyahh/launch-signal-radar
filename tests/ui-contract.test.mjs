import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
const dir = new URL('../dashboard/', import.meta.url);
test('original UI has accessible local entrypoints, controls, dialogs and a complete source budget', () => {
  for (const file of ['index.html', 'app.css', 'app.js']) assert.ok(existsSync(new URL(file, dir)), 'missing authored UI ' + file);
  const html = readFileSync(new URL('index.html', dir), 'utf8');
  for (const id of ['search', 'scope', 'category', 'chain', 'token', 'reset', 'result-count', 'rows', 'detail', 'methodology', 'empty'])
    assert.ok(html.includes('id="' + id + '"'), 'missing accessible UI target: ' + id);
  assert.match(html, /src="\.\.\/data.js"/);
  assert.match(html, /<dialog/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<label/);
  assert.match(html, /<caption/);
  const app = readFileSync(new URL('app.js', dir), 'utf8');
  assert.ok(!app.includes('innerHTML'), 'render snapshot facts as text, not HTML');
  const files = readdirSync(dir).filter((f) => statSync(new URL(f, dir)).isFile());
  const bytes = files.reduce((n, f) => n + statSync(new URL(f, dir)).size, 0);
  assert.ok(bytes < 65000, 'leave space for dossier source wrappers: ' + bytes);
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    assert.ok(!/(?:src|href)\s*=\s*["']https?:|@import|url\(\s*["']?https?:|fetch\s*\(/i.test(source), file + ': offline contract');
  }
});
