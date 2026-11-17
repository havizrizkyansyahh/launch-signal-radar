# Phase 2 — partial engine checkpoint

Status: INCOMPLETE. The execution window ended after three real RED/GREEN slices. This is not a complete Phase 2 delivery and not an entry ready for acceptance. Resume genuine work in the same recorded session; do not reconstruct messages.

## Implemented and exercised

- Fresh dashboard/model.js: shared classic-script engine, usable without module-network loading; lib/model.ts imports and re-exports the same implementation for Node. No production UI was authored.
- Token classification uses either recorded identifier, independent of missing/nonpositive market cap.
- Snapshot parser validates finite numeric/schema/date constraints, unique slugs and watchlist membership, preserving null/partial facts and rejecting invalid/duplicate data. Zero TVL is retained as an explicit boundary case.
- Peer calibration excludes identifier-free observations, nonpositive or missing market caps and zero TVL denominators. Repeated CoinGecko identifiers aggregate by median log ratio; symbol-only rows are not presumed to share a token. Actual sealed peers have distinct identifiers.
- R7 interpolated quantiles in log-ratio space; global p10/p90 winsorization; category shrinkage n/(n+6); explicit global fallback and labelled ratio=1 assumption when no peers exist. The calibration API accepts an excluded slug and its shared identifier for future leave-one-out valuation.
- All source is original, except no vendor file has been copied yet. The helper remains a next dependency, not a verified repository asset.

## Real tests and results

1. Re-ran Phase 1 classification test: failed because model was absent. Wrote minimal classification implementation, then test passed.
2. Added schema preservation/rejection test: failed because parseSnapshot was missing. Implemented it, then both tests passed.
3. Added sparse/outlier/invalid-denominator calibration test: failed because calibratePeers was missing. Implemented it, then the complete current suite passed.

Final actual command: node --test tests/*.test.ts
Result: 3 tests, 3 passes, 0 failures. The automatic TypeScript editor lint hook repeatedly timed out while invoking npx; that is not a successful lint or a compiler diagnostic. No dependency installation was intentionally invoked. Runtime verification used the installed Node v26.12.1, not Node 22.

Real sealed-input parse/calibration command imported lib/model.ts and read the official input/snapshot.json. It returned:

- Protocols: 758; official watchlist: 40.
- Valid distinct positive-cap peers: 128.
- Excluded nonpositive market-cap observations: 16.
- Global log-median implied-cap/TVL calibration: 0.2136179968867636.
- Global winsorization bounds: 0.014535063271230091 to 2.955480859632963.
- Categories: 53; categories with fewer than five peers: 44.

The log-median differs from Phase 1's arithmetic median of ratios by design. These are calibration outputs, not token prices, board valuations, launch predictions or yield claims.

## Remaining work / next dependency

Phase 2 has NOT yet implemented or tested protocol valuation, bounded growth/tracking-age factors, uncertainty scenarios, category farming plans, complete board ranking/validation, safe data.js generation, deterministic main.ts, immutable helper copy/hash verification, or data-only build mode. No board/data output, screenshots or dossier has been generated. Do not report 758 ranked rows from a 758-record parse.

Next vertical slice: write and observe a failing single-protocol valuation test covering snapshot-relative age, missing/future dates and bounded growth, then implement transparent factors/ranges. Continue with category plans, full board validation, actual source helper verification and main.ts data-only integration. Final packaging must fail honestly until real dashboard assets/screenshots exist in their intended phases. Full two-run output determinism and final provenance acceptance remain unverified.

No submission, transcript upload, delegation, fund operation, global configuration change or other profile modification was performed.
