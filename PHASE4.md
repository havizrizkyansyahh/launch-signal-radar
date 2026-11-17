# Phase 4 — real browser QA, genuine screenshots and final packaging

Status: Phase 4 deliverables produced and verified locally. Final submission, privacy-filtered bundle acceptance and official grading remain the parent's responsibility.

## UI fixes driven by real inspection (not page-state patching)

1. Visual inspection of the actual 1440x900 render found the provenance footer ending at 918.52px, below the 900px viewport, plus 8-9px micro-labels. A desktop media rule tightened footer/readout spacing and raised small table and range labels to 10-11px. Re-measured footer bottom: 895.21875px. Two browser assertions were added first and both failed before the fix, then passed.
2. The first detail capture showed only the farm-plan heading; the plan sat below the fold. The desktop drawer was widened to 1000px and its body switched to a two-column layout with break-inside guards. Re-measured at 1440x900: scenario and factors visible and all 7 real farm steps visible, first step at y=230.78.
3. The result label said "40 official watchlist in view" while only five rows were visible; it now reads "in results". A browser check was added and failed first.
4. Unresolved arrow glyphs (rendered as boxes) were removed from three buttons; the sort indicator now reads DESC/ASC instead of a small triangle pair.
5. An HTTP probe recorded one 404 `/favicon.ico`. An inline empty icon link was added; the final probe contains no favicon request and no non-200 responses.

## Real browser QA

Dedicated project-scoped `python3 -m http.server` on ephemeral 127.0.0.1 ports (45231, 43495, 39883) serving only generated output. No unrelated service was stopped or restarted. A page-error/console-error/unhandled-rejection hook and a PerformanceObserver were installed before navigation.

Final run, 14 of 14 persisted checks passed: reset restores 196 candidates and clears search; watchlist 40; token-recorded 416; no-token-recorded 342; combined category/chain/search selects the real Gauntlet row; drawer opens with the real protocol, 4 factor blocks and 7 steps; first value-header click reverses the default sort and sets aria-sort=ascending; unmatched query shows the honest empty state; empty-state reset restores 196; methodology dialog opens with the shrinkage formula; desktop footer fits; label distinguishes results; no page errors.

file:// probe on the same build: ready, 196 rows, sealed date 2026-11-14, zero resource entries, zero errors — classic local scripts, no fetch, no modules.

Keyboard: Escape closed the dialog and focus returned to the `steakhouse-financial` row button. Narrow 390x844: document width equals viewport (390), search 360px, table scrolls internally, all filter selects wider than 120px, drawer 390px with a 44px close target and no horizontal overflow.

Resource audit (observed, not source grep): every final HTTP request resolved to the same 127.0.0.1 origin with status 200 — index.html, app.css, model.js, view.js, app.js, data.js. No external host, CDN, font, image or analytics request appeared. This is a Chromium perf/resource observation, not a packet capture.

Two harness screenshot attempts through raw CDP timed out at the daemon IPC while a tab had silently reverted to `about:blank`; that was diagnosed from the page URL rather than assumed to be a page bug. Final captures used the harness screenshot helper on the live page at native 1440x900, converted to JPEG quality 86 — no compositing, retouching or synthetic state.

## Screenshot evidence

| file | bytes | dimensions | state |
| --- | --- | --- | --- |
| screenshots/01-board.jpg | 150893 | 1440x900 JPEG | default candidate board, 196 of 758, MODEL VALUE DESC |
| screenshots/02-detail.jpg | 196849 | 1440x900 JPEG | Steakhouse Financial drawer after a real row click |
| screenshots/03-filtered.jpg | 142590 | 1440x900 JPEG | Category=Lending + Chain=Ethereum, 4 results |

All are far below the 512 KiB cap and the 300-350 KB target. Vision inspection of each final image found no clipping, overlap, missing glyphs or unreadable region; the detail image shows recorded facts, low/base/high ($151.28M / $886.1M / $5.19B), four factors with the full equation, budget ceilings and all seven steps.

## Final packaging through main.ts

Two clean builds from the sealed snapshot: `out-final-a`, `out-final-b`, both "Final packaging: 758 ranked rows, 40/40 watchlist; sealed 2026-11-14". Sorted path-to-SHA-256 manifests of all 12 files were identical.

- dossier.json: 714073 bytes (cap 1572864) — contains 3 images.
- dossier text: 58951 UTF-8 bytes, no `[Cut at` marker, so the dashboard source is shown whole.
- dashboard source: 58542 bytes across 5 files (cap 65536).
- board.json: 36744efb8123645c0b7c26a8c19f7f8d2dfab8a0d78e44accccd59ed48facb8c.
- data.js sits at output root, not under dashboard/.
- vendor/makefun-board.ts SHA-256 9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e, byte-identical to the official kit file.
- dossier SHA-256 f46be647d14eecc89cf1dba3bd0a3606457a3cff1cef81a1480cd1284779efa9.

## Executed tests

`node --test tests/*.test.ts tests/*.test.mjs` — 11 tests, 11 passes, 0 failures, 1040.876988 ms on installed Node 26. During this phase one existing CLI test legitimately failed because it asserted that final mode must refuse while no screenshots existed; the precondition changed when real captures landed, so the test was split into data-only determinism plus a final-mode test that now proves both success with genuine assets and refusal on an isolated asset-less source copy. Evidence JSON: tests/browser-evidence.json.

## Known issues and remaining dependency

- Screenshots are single frozen viewports; content below the fold is not depicted.
- Small supporting labels are 9-11px: legible natively, small when scaled down.
- Two-column drawer depends on a 1101px media query.
- Node 22 grading-container execution was not reproduced locally; runtime here is Node 26, and the automatic TypeScript lint hook still times out rather than reporting a result.
- Phase 5 dependency: parent's privacy-filtered bundle, README badges/About, exact commit, official check and submission. No claim of official grade or prize eligibility is made here.

No transcript upload, submission, delegation, fund operation, Argus interaction, service/global configuration change or other profile edit occurred. The two project-local HTTP servers were stopped after captures.