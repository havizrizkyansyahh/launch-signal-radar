import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';
const root = resolve(import.meta.dirname, '..');
import { sealedInput } from './kit.js';
const input = sealedInput;
const hashTree = (dir, prefix = '') => Object.fromEntries(readdirSync(dir).sort().flatMap((name) => {
  const path = join(dir, name), rel = prefix + name;
  return statSync(path).isDirectory() ? Object.entries(hashTree(path, rel + '/')) : [[rel, createHash('sha256').update(readFileSync(path)).digest('hex')]];
}));

test('data-only mode is deterministic and honours explicit and environment destinations', () => {
  const dir = mkdtempSync(join(root, 'out-cli-test-'));
  try {
    const invoke = (args, env = {}) => spawnSync(process.execPath, ['main.ts', '--input', input, ...args],
      { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 10000 });
    const a = join(dir, 'a'), b = join(dir, 'b');
    const first = invoke(['--out', a, '--data-only']);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /NONFINAL/);
    const second = invoke(['--data-only'], { MAKEFUN_OUTPUT_DIR: b });
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(hashTree(a), hashTree(b));
    const board = JSON.parse(readFileSync(join(a, 'board.json'), 'utf8'));
    assert.equal(board.rows.length, 758);
    assert.equal(board.coverage.watchlist_covered, 40);
    const context = vm.createContext({});
    vm.runInContext(readFileSync(join(a, 'data.js'), 'utf8'), context);
    assert.equal(JSON.stringify(context.LAUNCH_DATA), JSON.stringify(board));
    assert.equal(existsSync(join(a, 'dashboard/data.js')), false);
    assert.equal(existsSync(join(a, 'dossier.json')), false);
    assert.equal(JSON.parse(readFileSync(join(a, 'build-status.json'))).complete, false);
    const invalid = invoke(['--out']);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /value|argument/i);
    const reuse = invoke(['--out', a, '--data-only']);
    assert.notEqual(reuse.status, 0, 'a nonempty destination must be refused so stale files cannot survive');
    assert.match(reuse.stderr, /empty/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('final packaging succeeds only with genuine assets and refuses an assetless source copy', () => {
  const dir = mkdtempSync(join(root, 'out-final-test-'));
  try {
    // Real final packaging on the repository itself: three genuine screenshots now exist.
    const out = join(dir, 'packed');
    const final = spawnSync(process.execPath, ['main.ts', '--input', input, '--out', out],
      { cwd: root, encoding: 'utf8', timeout: 20000 });
    assert.equal(final.status, 0, final.stderr);
    assert.match(final.stdout, /Final packaging: 758 ranked rows, 40\/40 watchlist/);
    const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
    assert.equal(dossier.images.length, 3);
    assert.ok(!dossier.text.includes('[Cut at '), 'dashboard source text must not be truncated');
    assert.ok(statSync(join(out, 'dossier.json')).size <= 1572864);
    assert.equal(JSON.parse(readFileSync(join(out, 'build-status.json'))).complete, true);

    // An isolated copy without screenshots must fail rather than invent evidence.
    const bare = join(dir, 'bare');
    mkdirSync(join(bare, 'vendor'), { recursive: true });
    mkdirSync(join(bare, 'dashboard'), { recursive: true });
    copyFileSync(join(root, 'main.ts'), join(bare, 'main.ts'));
    copyFileSync(join(root, 'vendor/makefun-board.ts'), join(bare, 'vendor/makefun-board.ts'));
    for (const name of readdirSync(join(root, 'dashboard'))) copyFileSync(join(root, 'dashboard', name), join(bare, 'dashboard', name));
    const refused = spawnSync(process.execPath, ['main.ts', '--input', input, '--out', join(dir, 'refused')],
      { cwd: bare, encoding: 'utf8', timeout: 20000 });
    assert.notEqual(refused.status, 0, 'final mode must refuse without genuine screenshots');
    assert.match(refused.stderr, /missing.*screenshots/i);
    assert.equal(existsSync(join(dir, 'refused', 'dossier.json')), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});