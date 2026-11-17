// LAUNCH SIGNAL entrypoint. Node 22.18+, standard library only, no network or installation.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import './dashboard/model.js';
import { buildDossier } from './vendor/makefun-board.ts';

const engine = globalThis.LaunchModel;
const sourceRoot = fileURLToPath(new URL('.', import.meta.url));
const SAFE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

function options(args) {
  const opt = { input: '/input/snapshot.json', out: process.env.MAKEFUN_OUTPUT_DIR || '/output', dataOnly: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--data-only') { opt.dataOnly = true; continue; }
    if (token === '--help') { opt.help = true; continue; }
    const split = token.indexOf('='), flag = split < 0 ? token : token.slice(0, split);
    if (!['--input', '--out', '--output'].includes(flag)) throw new Error('Unknown argument: ' + token);
    const value = split < 0 ? args[++i] : token.slice(split + 1);
    if (!value || value.startsWith('--')) throw new Error('Argument requires a value: ' + flag);
    opt[flag === '--input' ? 'input' : 'out'] = value;
  }
  return opt;
}

function regularTree(root, prefix = '') {
  if (!lstatSync(root).isDirectory()) throw new Error('Not a regular directory: ' + root);
  const files = [];
  for (const name of readdirSync(root).sort()) {
    if (!SAFE_NAME.test(name)) throw new Error('Unsafe artifact name: ' + name);
    const path = join(root, name), stat = lstatSync(path), rel = prefix + name;
    if (stat.isDirectory()) files.push(...regularTree(path, rel + '/'));
    else if (stat.isFile()) files.push({ path, rel, bytes: stat.size });
    else throw new Error('Nonregular artifact refused: ' + path);
  }
  return files;
}

function outputPath(value) {
  const out = resolve(value), rel = relative(sourceRoot, out);
  if (!rel || (!isAbsolute(rel) && !rel.startsWith('..') &&
      ['dashboard', 'screenshots', 'vendor', 'lib', 'tests', '.git'].includes(rel.split('/')[0]))) {
    throw new Error('Output must not overwrite repository source');
  }
  if (existsSync(out) && (!lstatSync(out).isDirectory() || readdirSync(out).length)) {
    throw new Error('Output must be an empty regular directory or a new path');
  }
  return out;
}

function finalAssets() {
  const dashboard = regularTree(join(sourceRoot, 'dashboard'));
  if (!dashboard.some((f) => f.rel === 'index.html') || !dashboard.some((f) => f.rel.endsWith('.css')) ||
      !dashboard.some((f) => f.rel.endsWith('.js'))) throw new Error('Missing final dashboard index.html/CSS/JS; use --data-only for NONFINAL development');
  if (dashboard.length > 400 || dashboard.reduce((n, f) => n + f.bytes, 0) > 4194304) throw new Error('Dashboard file/byte cap exceeded');
  const imageRoot = join(sourceRoot, 'screenshots');
  if (!existsSync(imageRoot)) throw new Error('Missing genuine screenshots; final dossier cannot be built');
  const screenshots = regularTree(imageRoot);
  if (screenshots.length !== 3 || screenshots.some((f) => f.rel.includes('/') || !/\.(jpe?g|png)$/i.test(f.rel) || f.bytes > 524288)) {
    throw new Error('Exactly three genuine capped screenshot images are required');
  }
  return { dashboard, screenshots };
}

function copyTree(files, destination) {
  for (const file of files) {
    const target = join(destination, file.rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(file.path, target);
  }
}

function run() {
  const opt = options(process.argv.slice(2));
  if (opt.help) {
    process.stdout.write('LAUNCH SIGNAL: node main.ts [--input file-or-directory] [--out directory] [--data-only]\n--data-only is NONFINAL: real board/data only, no screenshots or dossier. Final mode requires genuine dashboard and screenshot assets.\n');
    return;
  }
  const out = outputPath(opt.out);
  const input = resolve(opt.input);
  const snapshotPath = lstatSync(input).isDirectory() ? join(input, 'snapshot.json') : input;
  const snapshot = engine.parseSnapshot(readFileSync(snapshotPath, 'utf8'));
  const board = engine.buildRadar(snapshot);
  const checked = engine.validateBoard(board, snapshot);
  const assets = opt.dataOnly ? null : finalAssets();
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'board.json'), JSON.stringify(board) + '\n');
  writeFileSync(join(out, 'data.js'), engine.dataScript(board));
  copyTree(assets?.dashboard || regularTree(join(sourceRoot, 'dashboard')), join(out, 'dashboard'));
  if (assets) {
    copyTree(assets.screenshots, join(out, 'screenshots'));
    const dossier = buildDossier(out, { text_max_bytes: 65536,
      screenshots: { max: 3, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } });
    if (dossier.byteLength > 1572864) throw new Error('Competition dossier cap of 1.5 MiB exceeded');
    writeFileSync(join(out, 'dossier.json'), dossier);
  }
  writeFileSync(join(out, 'build-status.json'), JSON.stringify({ mode: opt.dataOnly ? 'data-only' : 'final',
    complete: !opt.dataOnly, snapshot_as_of: board.as_of, rows: checked.rows,
    watchlist_covered: checked.watchlist_covered,
    note: opt.dataOnly ? 'NONFINAL: no screenshot/dossier acceptance claimed' : 'Packaged artifacts; browser and official acceptance are separate checks' }) + '\n');
  process.stdout.write(`${opt.dataOnly ? 'NONFINAL data-only' : 'Final packaging'}: ${checked.rows} ranked rows, ${checked.watchlist_covered}/${snapshot.watchlist.length} watchlist; sealed ${board.as_of}\n`);
}

try { run(); }
catch (error) { process.stderr.write('LAUNCH SIGNAL: ' + error.message + '\n'); process.exitCode = 1; }
