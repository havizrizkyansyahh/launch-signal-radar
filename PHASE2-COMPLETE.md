# Phase 2 — engine and data delivery

Status: Phase 2 data-engine scope complete. Final dashboard, real screenshots, full dossier and official submission acceptance remain future-phase dependencies. This report supersedes the historical partial checkpoint in PHASE2.md.

## Actual source changes

- dashboard/model.js is the shared browser-visible/Node engine. No production UI was authored. Existing classification/schema/calibration was extended through observed RED/GREEN slices with valuation, conditional category plans, ranked board validation and script-safe data serialization.
- lib/model.ts re-exports the shared implementation; there is no second divergent valuation model.
- main.ts is original Node-standard-library code, defaulting to /input/snapshot.json and /output. It accepts --input, --out/--output, MAKEFUN_OUTPUT_DIR and --data-only. It refuses nonempty output directories to prevent stale artifacts. NONFINAL data-only mode writes genuine board/data/shared source with complete=false and no dossier. Final mode requires real dashboard and exactly three screenshot assets and uses buildDossier; it does not fabricate missing assets.
- vendor/makefun-board.ts was copied solely from the official helper, with SHA-256 verified equal: 9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e (19788 bytes). No starter main/model/UI/screenshots were copied.
- Tests added: valuation.test.mjs, farming.test.mjs, board.test.mjs and cli.test.mjs. Final shared model content includes genuine contributing revisions from multiple recorded writes.

## Model semantics

Point value is hypothetical token market capitalization, not actual price, FDV, issuance probability or a promised user reward. It combines TVL, robust category/global mcap/TVL calibration, bounded seven-day growth and UTC snapshot-relative tracking age. Raw observations are preserved alongside decomposed factors.

The target token asset is left out of its own peer calibration. Growth is clipped to [-75,100] percent before its bounded influence; missing growth is neutral. Tracking-age factor is bounded [0.8,1.2], neutral for missing/future dates, and explicitly not token-free age. Heuristic low/high ranges widen for sparse/no peers, missing/clipped growth, unknown/future age and unavailable lineage. Zero TVL gets a disclosed validity floor, not economic significance. Valuation does not branch on protocol names; name/category heuristics only affect product-risk labels/research plans.

Seven concrete conditional research steps per actual row include independent official-domain/contract verification, capital versus gas/transaction-fee ceilings, active-time/horizon assumptions, category actions, exit checks and stop conditions. Budgets are labelled illustrative and not live quotes. Product-risk, restricted and derivatives cases are research-only with zero capital/fee budget. Plans do not assert live points campaigns, airdrops, fees or yields. Product heuristics now conservatively include Cross Chain Bridge and Stablecoin Wrapper in addition to the official visible exclusion categories; this explains the default candidate count differing from Phase 1's narrower visible-rule audit.

## Executed tests

Each new production slice was preceded by a real failing test for its missing behavior, then exercised after implementation. Final command:

    node --test tests/*.test.ts tests/*.test.mjs

Actual result: 7 tests, 7 passes, 0 failures; runner duration 780.163448 ms on the installed Node v26.12.1. No claim of Node 22 execution or a successful TypeScript lint: the editor's automatic npx lint hook timed out. No dependency installation was intentionally run.

Covered: partial token identifiers, invalid schema, nonpositive market caps, zero denominators, category/global fallbacks, outliers, bounded negative/extreme/missing growth, UTC/missing/future tracking dates, heuristic ranges, name-independent valuation, self-exclusion, category plans, stable ties, input reversal, every actual row's rank/value/plan constraints, complete watchlist, safe serialized script round-trip, CLI/environment options, two-output byte equality, and honest rejection of final mode when assets are absent.

## Actual sealed-data generation

Ran original main.ts twice with the official input, --data-only, into clean out-phase2-a and out-phase2-b. Both exited 0 and printed NONFINAL with 758 ranked rows and 40/40 watchlist. Programmatic complete path-to-SHA-256 manifests were equal.

Observed output:

- All 758 unique actual protocol rows ranked; all 40 watchlist members covered.
- 416 token-recorded; 342 no-token-recorded.
- Default research candidates: 196. Product-risk-labelled rows across both token states: 323. These are model classifications, not verified launch eligibility.
- Missing growth: 4; missing tracking dates: 113.
- Every rank sequential, values positive varied integer dollars and nonincreasing; value range USD 400664–14780931658 across all token states.
- 5306 farm steps, seven per row; trimmed lengths 165–310 characters.
- board.json: 2282548 bytes. Root-level data.js: 2282572 bytes. No dashboard/data.js.
- Current dashboard source (shared engine only): 21711 bytes, leaving space under the 65536-byte source-text limit for the next UI phase.
- No screenshots or dossier emitted. build-status.json explicitly says mode=data-only, complete=false.

Identical manifests:

    board.json          36744efb8123645c0b7c26a8c19f7f8d2dfab8a0d78e44accccd59ed48facb8c
    build-status.json   cbd3f9271dd3c3ffc456510de808afa97d30398850e431fb2698a05ba57e9c72
    dashboard/model.js  943a4a5e06feedfcbc2ef3acd23da77fd3912d4587c779f5265aadfab5f098a3
    data.js             cab0f703b4829d4d4fb9efecf9a0d956875c6bba59678666d37a8475955a486a

Highest default-view hypothetical estimates on these exact bytes: Steakhouse Financial 886101045; Sentora Curator 874495089; Gauntlet 521508132; USDD 217936950; Veda 181457667. These are model outputs, not live financial facts.

## Remaining acceptance boundaries and next dependency

Phase 3 must author the actual offline accessible dashboard using root data.js and the shared engine, respecting the remaining source budget and factual/assumption separation. The page must show complete coverage, peer methodology, filters, sorting and detailed inputs/factors/plans. File:// browser execution, keyboard/mobile behavior and network-request observation have not been tested for that not-yet-written page.

Phase 4 must capture and visually inspect three genuine frozen-code states, verify image bytes/dimensions, run final packaging and independently rebuild exact dossier bytes under 1.5 MiB. The CLI's final branch is implemented but its successful path cannot honestly be exercised without those assets. Full final two-run manifests must be rerun after UI/images; the current equality proves only the stated data-only revision. Parent still handles exact final source/provenance/bundle checks, publication and intake. No submission, upload, delegation, funds, global configuration or profile changes occurred.
