# BUILD REPORT — LAUNCH SIGNAL (token-radar-01)

Audited revision: working tree at the time of this report, no commit yet. Sealed input SHA-256 `42a71213519479f3a180cc5010cbbf6bd18a2447fa0ad29e4c5122b6c9184393`.

Machine-readable results: `tests/build-audit.json` (schema `launch-signal/build-audit/v1`), produced by `node tests/build-audit.mjs`.
Browser evidence: `tests/browser-evidence.json`, produced by the real-browser QA in Phase 4.

## 1. Test layers (kept separate on purpose)

| layer | artifact | actual result |
| --- | --- | --- |
| Unit/integration (Node `node:test`) | `tests/*.test.ts`, `tests/*.test.mjs` | 21 tests, 21 pass, 0 fail (re-run 2026-11-17 on Node v22.22.0) |
| Build audit (independent script) | `tests/build-audit.mjs` | 24 checks, 24 pass, 0 fail, 403 ms |
| Real browser QA | `tests/browser-checks.js` via Chromium | 16 checks pass, 0 console/page errors (revised 2026-11-17: adds one-cell-per-column and separate range-cell checks) |
| Server-side scoring / judge | not available locally | UNVERIFIED — cannot be claimed |

Stack: standard library only, no install step. Grading-runtime check (2026-11-17): tests and `tests/build-audit.mjs` were re-run with an official Node v22.22.0 linux-arm64 binary (SHA-256 1bf1eb9ee63ffc4e5d324c0b9b62cf4a289f44332dfef9607cea1a0d9596ba6f) and passed; earlier Node-22 claims in this report were made before that binary existed and were UNVERIFIED at the time. The entrypoint uses no TypeScript syntax, and the vendored helper is the official erasable-TS file; compatibility is expected but not measured here. The editor's automatic `npx` lint hook times out, so "lint passed" is not claimed.

## 2. Defects found and fixed in this phase

1. **Output path truncation (real, fixed).** `copyTree` derived directories with `fileURLToPath(new URL('.', 'file://' + target))`. Any destination containing `#` or `?` was parsed as a URL fragment/query, so files were written to a truncated path and the build failed mid-write. A test using `hash#and?query dir/out` was written first and failed with ENOENT; replacing the URL round-trip with `dirname()` from `node:path` made it pass. This also removes a percent-encoding hazard for unusual but legitimate output directories.
2. **Stale test precondition (fixed, not a product bug).** The CLI test asserted that final packaging must refuse while no screenshots existed. After genuine captures landed, that precondition no longer held; the test was split into determinism, success-with-assets, and refusal-on-asset-less-copy cases so the guard is still proven.
3. **Wrong test fixture (fixed).** An adversarial fixture declared a watchlist of slugs it had just renamed, and then expected a 2-row board to validate. `parseSnapshot` correctly rejected the fixture, and `validateBoard` correctly enforced the 100-row floor; the fixture was corrected to assert that refusal instead of weakening the product.
4. Earlier-phase fixes that remain in force: filter reset via native form reset, sort toggle state, footer overflow, misleading "in view" label, box-like arrow glyphs, favicon 404, and the below-the-fold farm plan in the detail drawer.

## 3. What was adversarially reviewed

- **Untrusted snapshot text.** Generated `data.js` escapes `<`, U+2028 and U+2029, so `</script>` and `<img onerror>` payloads cannot break out; the payload survives intact as data. Dashboard scripts contain no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` or `eval`, and all rendered snapshot strings go through `textContent`.
- **Missing/partial data.** Both token identifiers null → "no token recorded"; a single identifier → "token recorded"; market cap never decides token status. Nonpositive market caps and zero TVL are excluded from peer calibration, not from coverage. Missing growth and missing/future tracking dates are neutral with disclosed reasons; a future date is never turned into negative age.
- **Category fallback.** Log-space R7 quantiles, global p10/p90 winsorization, category shrinkage `n/(n+6)`, explicit global fallback and an assumed 1x when no peers exist. The target asset is excluded from its own calibration by slug and by shared CoinGecko id.
- **Ordering determinism.** Rows sort by value then slug; ranks are assigned after the sort, so input order and equal values cannot change the ranking. Reversing snapshot input reproduces the identical board.
- **Chronology.** Age is computed only against `as_of`; no wall clock, `Date.now()` or timezone dependence exists in generated artifacts.
- **No-network policy.** Dashboard loads `../data.js` and local classic scripts only; no `fetch`, no module imports, no remote fonts, images or `@import`. The only URL in the product is the DefiLlama provenance string shown as visible text, which the rules permit.

## 4. Output checks on two clean trees

`main.ts --input <sealed> --out <empty dir>` run twice; complete path→SHA-256 manifests compared.

- 12 files per tree, manifests byte-identical across runs.
- Copied `dashboard/` equals the repository source; all three copied screenshots equal the repository images; capture-time dashboard source is byte-identical to the audited source.
- `board.json` 2,282,548 bytes; `data.js` 2,282,572 bytes at output root (never under `dashboard/`).
- 758 unique real slugs, ranks exactly 1..758, positive integer values in range and nonincreasing, 5,306 farm steps all 3-12 strings of 20-600 characters, full 40/40 watchlist coverage.
- Dashboard: 5 files, 58,542 bytes (< 65,536), dossier-safe names, index.html plus CSS and JS, no forbidden network context, no unsafe DOM sink.
- Screenshots: `01-board.jpg` 150,893 B, `02-detail.jpg` 196,849 B, `03-filtered.jpg` 142,590 B — all 1440×900 JPEG, whole files by SOI/EOI, far under 512 KiB.
- `vendor/makefun-board.ts` SHA-256 `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e`, identical to the official kit file.
- `dossier.json` 714,073 B (≤ 1.5 MiB), SHA-256 `f46be647d14eecc89cf1dba3bd0a3606457a3cff1cef81a1480cd1284779efa9`, byte-identical to an independent `buildDossier` rebuild, with 58,951 bytes of source text and no `[Cut at` marker.

## 5. Known limitations (not claimed as passing)

- No Node 22 run, no server-side gate/score, no judge verdict, no official `makefun check`, no submission.
- Screenshots are single frozen viewports; content below each fold is not depicted.
- Small support labels are 9-11px; the desktop two-column drawer depends on a 1101px media query.
- Screenshot dimensions are validated by parsing JPEG SOF markers here, not by the official scorer.
- Provenance/bundle eligibility is outside this repository; the parent owns the privacy-filtered export, README badges, About metadata, commit and submission.
- `tests/build-audit.json` is regenerated on every run, so its `generated_at_utc` changes even when all checks pass; check results, not the timestamp, are the stable signal.