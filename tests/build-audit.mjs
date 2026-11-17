// Reproducible end-to-end audit of the entry artifacts. Writes tests/build-audit.json.
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildDossier } from '../vendor/makefun-board.ts';

const root = resolve(import.meta.dirname, '..');
import { sealedInput, kitRoot, missingInputNote } from './kit.js';
const kit = kitRoot;
if (!sealedInput || !kit) { console.error(missingInputNote); process.exit(2); }
const input = sealedInput;
const results = [];
const T0 = Date.now();
const record = (name, pass, detail) => { results.push({ name, pass: Boolean(pass), detail }); };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const manifest = (dir, base = dir) => Object.fromEntries(readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))
  .flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? Object.entries(manifest(p, base)) : [[relative(base, p), { bytes: statSync(p).size, sha256: sha(readFileSync(p)) }]];
  }));

const snapshot = JSON.parse(readFileSync(input, 'utf8'));
const slugs = new Set(snapshot.protocols.map((p) => p.slug));
const tmp = mkdtempSync(join(root, 'audit-'));
const trees = [join(tmp, 'run-a'), join(tmp, 'run-b')];
try {
  const runs = trees.map((out) => spawnSync(process.execPath, ['main.ts', '--input', input, '--out', out], { cwd: root, encoding: 'utf8', timeout: 60000 }));
  record('main.ts exits 0 twice', runs.every((r) => r.status === 0), runs.map((r) => ({ status: r.status, stdout: r.stdout.trim(), stderr: r.stderr.trim() })));
  const [a, b] = trees.map((t) => manifest(t));
  record('two clean trees are byte-identical', JSON.stringify(a) === JSON.stringify(b), { files: Object.keys(a).length });

  // Every copied source and screenshot must match the repository working tree.
  const repoDash = manifest(join(root, 'dashboard'));
  const copiedDash = Object.fromEntries(Object.entries(a).filter(([k]) => k.startsWith('dashboard/')).map(([k, v]) => [k.slice('dashboard/'.length), v]));
  record('copied dashboard matches repository source', JSON.stringify(repoDash) === JSON.stringify(copiedDash), { files: Object.keys(repoDash).length });
  const shots = ['01-board.jpg', '02-detail.jpg', '03-filtered.jpg'];
  record('copied screenshots match repository images', shots.every((n) => a['screenshots/' + n]?.sha256 === sha(readFileSync(join(root, 'screenshots', n)))), shots.length);

  // Immutable helper.
  record('vendor helper is byte-identical to official kit', sha(readFileSync(join(root, 'vendor/makefun-board.ts'))) === sha(readFileSync(join(kit, 'starter/vendor/makefun-board.ts'))),
    sha(readFileSync(join(root, 'vendor/makefun-board.ts'))));

  // Board schema, coverage, ordering and farm-plan lengths.
  const board = JSON.parse(readFileSync(join(trees[0], 'board.json'), 'utf8'));
  const rows = board.rows;
  const seen = new Set();
  let prev = Infinity, sorted = true, ranksOk = true, farmOk = true, valueOk = true;
  for (const [i, r] of rows.entries()) {
    if (r.rank !== i + 1) ranksOk = false;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd < 1 || r.implied_value_usd > 1e14) valueOk = false;
    if (r.implied_value_usd > prev) sorted = false;
    prev = r.implied_value_usd;
    if (seen.has(r.slug) || !slugs.has(r.slug) || typeof r.name !== 'string' || !r.name.trim()) valueOk = false;
    seen.add(r.slug);
    if (!Array.isArray(r.farm_steps) || r.farm_steps.length < 3 || r.farm_steps.length > 12 ||
      r.farm_steps.some((s) => typeof s !== 'string' || s.trim().length < 20 || s.trim().length > 600)) farmOk = false;
  }
  record('board holds 100-4000 real unique slugs', rows.length >= 100 && rows.length <= 4000 && seen.size === rows.length, rows.length);
  record('ranks are exactly 1..N', ranksOk, rows.length);
  record('values positive, in range, nonincreasing and varied', valueOk && sorted && new Set(rows.map((r) => r.implied_value_usd)).size > 1, { min: Math.min(...rows.map((r) => r.implied_value_usd)), max: Math.max(...rows.map((r) => r.implied_value_usd)) });
  record('every farm_steps entry is 3-12 strings of 20-600 chars', farmOk, rows.reduce((n, r) => n + r.farm_steps.length, 0));
  record('every official watchlist member is ranked', snapshot.watchlist.every((s) => seen.has(s)), snapshot.watchlist.length);
  record('board.json is under 8 MiB', statSync(join(trees[0], 'board.json')).size <= 8388608, statSync(join(trees[0], 'board.json')).size);

  // Dashboard contract.
  const dashRoot = join(trees[0], 'dashboard');
  const dashFiles = manifest(dashRoot);
  const names = Object.keys(dashFiles);
  const totalBytes = Object.values(dashFiles).reduce((n, f) => n + f.bytes, 0);
  record('dashboard has index.html plus css and js', existsSync(join(dashRoot, 'index.html')) && names.some((n) => n.endsWith('.css')) && names.some((n) => n.endsWith('.js')), names);
  record('dashboard file count and total bytes within caps', names.length <= 400 && totalBytes <= 4194304, { files: names.length, bytes: totalBytes });
  record('dashboard source text is under 65536 bytes', totalBytes < 65536, totalBytes);
  record('dashboard file names are dossier-safe', names.every((n) => /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(n)), names);
  const offenders = names.filter((n) => {
    const text = readFileSync(join(dashRoot, n), 'utf8');
    return /(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//i.test(text) || /@import\s+(?:url\()?["']?https?:/i.test(text) ||
      /url\(\s*["']?(?:https?:)?\/\//i.test(text) || /\bimport\s*(?:\(\s*)?["']https?:/i.test(text) || /\bfetch\s*\(/.test(text);
  });
  record('no network addresses in prohibited HTML/CSS/JS contexts', offenders.length === 0, offenders);
  record('no unsafe DOM sinks in dashboard scripts', names.filter((n) => n.endsWith('.js')).every((n) => !/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(readFileSync(join(dashRoot, n), 'utf8'))), names.filter((n) => n.endsWith('.js')));
  record('root data.js exists and stays outside dashboard/', existsSync(join(trees[0], 'data.js')) && !existsSync(join(dashRoot, 'data.js')), statSync(join(trees[0], 'data.js')).size);

  // Screenshot bytes and dimensions parsed from JPEG SOF markers (no image library dependency).
  const jpegSize = (buf) => {
    if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf.at(-2) !== 0xff || buf.at(-1) !== 0xd9) return null;
    for (let i = 2; i < buf.length - 9;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1], len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
    return null;
  };
  const images = [];
  let imagesOk = true;
  for (const name of readdirSync(join(trees[0], 'screenshots')).sort()) {
    const buf = readFileSync(join(trees[0], 'screenshots', name));
    const size = jpegSize(buf);
    const ok = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}\.(jpg|jpeg|png)$/i.test(name) && buf.length <= 524288 && size && Math.max(size.width, size.height) <= 1440 && Math.min(size.width, size.height) >= 800;
    images.push({ name, bytes: buf.length, ...size, ok });
    imagesOk &&= Boolean(ok);
  }
  record('three valid screenshots within count, byte and dimension caps', imagesOk && images.length === 3, images);

  // Dossier: independent rebuild must match byte for byte, be under 1.5 MiB and hold untruncated source.
  const onDisk = readFileSync(join(trees[0], 'dossier.json'));
  const rebuilt = buildDossier(trees[0], { text_max_bytes: 65536, screenshots: { max: 3, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } });
  const doc = JSON.parse(onDisk.toString('utf8'));
  record('dossier.json equals an independent buildDossier rebuild', Buffer.compare(onDisk, Buffer.from(rebuilt)) === 0, { bytes: onDisk.length, sha256: sha(onDisk) });
  record('dossier is at most 1.5 MiB', onDisk.length <= 1572864, onDisk.length);
  record('dossier text is complete (no cut marker)', !doc.text.includes('[Cut at '), { text_bytes: Buffer.byteLength(doc.text) });
  record('dossier carries exactly three images', Array.isArray(doc.images) && doc.images.length === 3, doc.images?.map((i) => i.name));

  record('no secrets or private paths embedded in shipped artifacts', !JSON.stringify(a).includes('/home/agent') && !onDisk.toString('utf8').includes('/home/agent'), 'path scan');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.pass);
const audit = {
  schema: 'launch-signal/build-audit/v1',
  generated_at_utc: new Date().toISOString(),
  duration_ms: Date.now() - T0,
  node_version: process.version,
  node22_verified: false,
  node22_note: 'No Node 22 executable was found on this machine; grader-runtime compatibility remains unverified.',
  input_sha256: sha(readFileSync(input)),
  checks: results,
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, failed_names: failed.map((f) => f.name) },
};
writeFileSync(join(root, 'tests', 'build-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit.summary));
if (failed.length) { for (const f of failed) console.error('FAIL', f.name, JSON.stringify(f.detail)); process.exitCode = 1; }