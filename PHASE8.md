# PHASE 8 — method-first dashboard (polish applied; two captures still stale)

## Phase 8b — polish pass and capture status

Applied to the frozen source:

- Validation table is now `table-layout: fixed` with a 46% model column and three right-aligned 18% numeric columns, a one-line caption ("Holdout: market cap predicted from TVL") and tighter line-height, so `2x` is no longer crushed against `ρ`.
- Desktop density rule added for the fifth metric: intro/metrics/board-footer spacing reduced and the table height recalculated, so the provenance footer measures **880.125 px** inside a 900 px viewport (it was 918.5 px in phase 4 and ~894 px after the earlier fix).

Measured after the polish:

- Source **64,983 B** (< 65,536); dossier text **65,393 B**, `CUT: false`; dossier **724,326 B**, SHA-256 `cf715228ccf765ce43e6da39e011f73a8297b1a391e2c852454dc4dcf812e21e`, byte-identical to an independent `buildDossier` rebuild.
- `node --test`: **20/20 pass**. `node tests/build-audit.mjs`: **24/24 pass**, two clean trees with identical 12-file manifests.
- Browser (fresh session): page ready, 196 rows, zero page errors, footer bottom 880.125 px; detail drawer renders **5 section headings** (scenario + 01–04) with zero errors.
- `screenshots/01-board.jpg` recaptured on the polished build: **149,185 B**, 1440×900.

Blocked work:

- `02-detail.jpg` (191,281 B) and `03-filtered.jpg` (152,602 B) are from the immediately previous build. Their *content* matches the current UI (same table, badges, economics block), but the rail typography, caption and footer density differ, so they must be recaptured before shipping.
- Recapture kept failing at the tooling layer, not the page: `Page.captureScreenshot` returned `-32000 Unable to capture screenshot` once and then timed out at 10–25 s across four browser sessions (including fresh ones). Memory was not the cause (1.8 GB used of 7.9 GB, 6.1 GB available); JS evaluation and DOM reads kept working while capture stalled, so it is the capture path that degraded, not the dashboard.
- Node 22 remains unverified; audit records `node22_verified: false`.

## Next dependency

Recapture 02 and 03 on this exact build (one capture per fresh browser session works), re-inspect visually, rerun `node --test` and `tests/build-audit.mjs`, then commit and let the parent regenerate the bundle. Do not ship the stale captures.

## Earlier status (kept for the record)

Status: the 65,536-byte overflow blocker from the earlier attempt is fixed. Tests 20/20, audit 24/24, dossier untruncated. Remaining gaps are visual polish and the Node 22 runtime check.

## What changed in the UI

- `dashboard/view.js`: `verdict()` maps `farm / thin / skip` to a shape plus label (`●● FARM`, `● THIN`, `○ SKIP`) so greyscale still separates them; `net()` renders signed USD (2dp under $1,000, compact above); `band()` renders the low–high range; the sorter gained `net` (reads `economics.net_usd`); `selectRows` gained a `verdict` filter that composes with scope, token state, category, chain and search.
- `dashboard/index.html`: fifth top metric **HELDOUT MdAPE** (chosen family + within-2x), a **Verdict** filter, a **NET / FARM** column sorted by net, a separate **VERDICT** column, and a validation table (`MODEL / MdAPE / ρ / 2x`) with winner and stability lines.
- `dashboard/app.js`: renders the validation table, winner and stability text from `data.validation`; renders net value plus colour+shape badge per row; the drawer now shows `03 / NET FARM ECONOMICS`: steps × tx, gas, bridge, total cost, capital, TVL share, gross, net, breakeven, weeks/risk and the verdict reason, then the plan (`04`). Every number comes from the generated row's `economics`, not hardcoded prose.
- Farm plans folded from 7 to 6 steps: still inside the 3–12 gate, and it frees source bytes.

## Bugs found and fixed in this phase

1. Stale DOM writes — app.js still wrote `peer-count`, `peer-multiple`, `sparse-count` after that markup became the validation table. The page booted with `Cannot set properties of null` and rendered **0 rows**. Found in the real browser, fixed by deleting the dead writes.
2. Broken helper reference — a byte-saving edit removed the `fixed()` helper while detail code still called it; the drawer rendered only its first two sections. Found from the recorded page error `Uncaught ReferenceError: fixed is not defined` plus `sections: 2` in the DOM; restored, and the drawer now renders all four sections.
3. Source overflow — the first redesign cut pushed source to 65,298 B and dossier text to 65,516 B with a `[Cut at …]` marker. Trimming dead CSS, dead JS helpers, duplicated prose and one plan step reached **64,587 B** source / **64,997 B** text with no cut.

## Measured results (executed)

- `node --test tests/*.test.ts tests/*.test.mjs`: **20 tests, 20 pass, 0 fail** (new `tests/ui-verdict.test.mjs` covers verdict mapping, farm-count filter, net-descending sort, combined filters, empty result, net/band formatting).
- `node tests/build-audit.mjs`: **24 checks, 24 pass**; two clean trees, 12 files each, identical path→SHA-256 manifests.
- Dashboard source **64,587 B** (< 65,536). Dossier text **64,997 B**, `CUT: false`.
- Dossier **727,701 B**, SHA-256 `53b7ef98ea4b0d64405de6e89e2803cac1e5baa140df4b06771513326e95f1ce`, byte-identical to an independent `buildDossier` rebuild.
- Screenshots 1440×900 JPEG: `01-board.jpg` 152,016 B, `02-detail.jpg` 191,281 B, `03-filtered.jpg` 152,602 B — all far under 350 KB.
- Browser run on the frozen build: boot ready, 196 rows, `HELDOUT MdAPE 85.8%`, winner "global (holdout n=49)", stability "Unstable: the second split picks category", 4 validation rows, 196 badges, zero page errors after the fixes; filtered `verdict=farm` + `Risk Curators` → **34 results** with the count visible.

## What the screenshots show (vision inspection)

- Board: snapshot date, 758 / 342 / 416, 40/40 watchlist, `HELDOUT MDAPE 85.8% · 29% within 2x`, validation rows naive-tvl 324%, global 86%, category 90%, cat+growth+age 91%, winner and instability note, per-row net (Steakhouse +$25.48, Gauntlet +$26.36) with FARM/THIN badges.
- Detail: scenario $151.28M / $886.1M / $5.19B, recorded facts, four factors with the full equation, economics block (6×2=12 tx, gas $4.20, bridge $2.50, total $6.70, gross $32.18, net +$25.48, breakeven 1×, verdict FARM) and steps 1–6.
- Filtered: verdict=farm + Risk Curators with "34 of 758 protocols · 12 official watchlist in results".

## Remaining gaps

- The right-rail validation table is dense: the `2x` column and its caption are hard to read at 1440×900, and the board footer line is partially clipped. No SKIP badge appears among the first five rows (all FARM/THIN), so the shape distinction is demonstrated through the filter and the code rather than the board shot.
- The browser daemon became unresponsive right after the capture run, so a second polish/inspection cycle was not possible here.
- Node 22 runtime remains unverified (no Node 22 binary on this machine); the audit records `node22_verified: false`.
- Not committed: the working tree is ahead of published commit `25319d5`.

## Next dependency

Widen the `2x` column and shorten its caption, fix the footer clipping, recapture the three screenshots, rerun tests + audit, then commit and let the parent regenerate the bundle. No submission, transcript upload or history rewrite occurred.

No submission, transcript upload, deletion or history rewrite was performed.