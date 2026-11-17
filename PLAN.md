# LAUNCH SIGNAL — contract and build plan

Status: Phase 1 only. This document establishes the contract, observed input, design and verification plan. No production entrypoint, valuation model or dashboard has been implemented. All numerical input findings below were computed from the supplied sealed snapshot, not fetched from a live protocol service. Proposed model constants and budgets are assumptions, not protocol facts.

## Scope and provenance

- Build the first competition in the ordered batch: token-radar-01. Do not work on the later entries in this repository.
- Author main.ts, lib/model.ts and dashboard files afresh. The starter entrypoint was inspected only for the output contract. Do not reuse the starter model, UI or screenshots, or legacy competition entries.
- The sole reusable code is the byte-identical official vendor/makefun-board.ts. Copy and verify it in an implementation phase; it has not been copied in Phase 1.
- Work resumes in the same recorded build session. Keep real edits, test output, timestamps and provider usage. Do not synthesize provenance, usage, transcript turns, protocol observations or browser evidence.
- Parent handles privacy-safe exports, publication and intake. This worker does not submit, upload transcripts, change accounts/configuration, launch coins or move money.
- Keep private logs, protected instructions, reasoning, credentials and unrelated conversations outside repository artifacts. A derived privacy-filtered bundle must be accurately disclosed and officially checked by the parent; do not upload raw native logs.

## Inspected contract sources

Official kit: token-radar-01-kit supplied to this build. Inspected RULES.txt sections: task, snapshot, dashboard, gate, dossier, judge, runtime/submitting, prerequisites, pre-submit, and the later authoritative "The transcript gate" section. Inspected starter/main.ts, vendor/makefun-board.ts API/implementation, input/README.md and the supplied requirements JSON. The kit manifest verification was reported complete by the parent; Phase 1 does not claim to have repeated that 20-file verification.

The supplied requirements snapshot says:

- Competition opens 2026-11-14T10:00:00.000Z; entries close 2026-12-14T10:00:00.000Z. The later 10:10 UTC final-window/escrow time is not the entry deadline.
- GitHub repository must be public, newly created within the window, owned by the linked account (or carry the required ownership proof), with the exact submitted commit fetchable and an OSI license.
- README requires three live make.fun badges, including repository-specific rank/reward badges, and a make.fun link. These belong in the repository README, not in the offline dashboard.
- GitHub About requires a make.fun homepage and topic makefun. External metadata/publication remains the parent's responsibility.
- No entry fee is listed. Account/wallet permissions, signature, quota and external repository ownership are separate intake checks; this phase does not exercise them.
- Transcript bundle accepted; live witnessed recordings check does not apply in this requirements snapshot.
- At least five substantive public assistant turns; tool-only turns do not establish compliance. Reach this through real build phases, not filler.
- At least 30% reproduced counted code and authored main.ts lines; at least two contributing assistant-message writes/edits to a counted final code file. Revising this plan alone does not satisfy the code revision check.
- Timestamps/tool links must be genuine and in-window; pricing must use actual recorded provider usage, never estimates or redistributed session totals.
- Complete truthful run record: original human prompt as handed off by the parent, actual harness/version/provider/model/effort, actual integrations, and explicit withholding reasons. The run-record required-from threshold is 2026-11-17T00:00:00Z. A real clock probe during Phase 1 returned 2026-11-17T00:01:16.762403+00:00, so treat it as required for subsequent intake rather than assuming the conversation's start date still applies.
- Final provenance eligibility remains unverified until the parent inspects and checks the exact filtered final bundle. Passing local code tests is not proof of transcript eligibility.

## Hard runtime/output contract

1. Root main.ts runs directly on Node 22.18+ with erasable TypeScript and Node standard library only. No install, build dependency, network, runtime browser invocation or writes to the read-only /bot. Runtime: 1 CPU, 1024 MB, 64 processes, 120 seconds per run.
2. Default input /input/snapshot.json; explicit --input path for development. Default writable destination /output; explicit --output and/or MAKEFUN_OUTPUT_DIR for clean local verification. Do not use the current date, random numbers, machine paths, nondeterministic ordering or local timezone in generated artifacts.
3. Write board.json, root-level data.js, dashboard/, screenshots/ and dossier.json. Root data.js contains the bulky sealed-data payload and is loaded as a relative classic script from the dashboard; it must not be placed under dashboard/ or require fetch, so file:// remains usable.
4. board.json: 100–4000 unique actual protocol slugs, at most 8 MiB. Each row: nonempty name, positive integer rank, positive integer implied_value_usd at most 100000000000000, and 3–12 trimmed farm_steps strings of 20–600 characters. Ranks exactly 1..N; values nonincreasing by rank and not all equal; every official watchlist member present. Resolve equal-value order by slug code-unit comparison.
5. dashboard/: index.html plus at least one CSS and one JS file, regular safe-named files, at most 400 files/4 MiB. No HTTP(S) in HTML attributes, style bodies, CSS or JS import/require specifiers. No remote fonts, logos, CDN libraries or external anchors. Source-size target <=48 KiB, including disclosure content, to leave dossier wrapper space below 65536 UTF-8 bytes; verify actual full text has no truncation.
6. Exactly three new genuine JPEG screenshots: board, an actual protocol's expanded detail, and an actual filtered state on the frozen implementation. Target 1440x900, each <=330000 bytes where legible, hard cap 524288 bytes; long side <=1440 and short side >=800. Mobile testing is separate from the three required desktop images. No starter images, synthetic screenshots, compositing or padding.
7. Write dossier.json last using the immutable helper buildDossier(output, {text_max_bytes:65536,...caps}). Recompute byte-for-byte independently. Competition dossier cap 1.5 MiB is stricter than the helper's general 4 MiB constant; enforce the competition cap separately. The helper alone does not establish full image decode, dimensions, dashboard execution or UI quality.
8. Two clean sandbox-equivalent runs must produce identical bytes for every output path, including data.js, images and dossier. Screenshots are captured during development and copied unchanged by the runtime; do not recapture them during the two deterministic packaging runs.

## Observed snapshot and edge cases

Sealed file: 247940 bytes.
SHA-256: 42a71213519479f3a180cc5010cbbf6bd18a2447fa0ad29e4c5122b6c9184393
as_of: 2026-11-14.
Source fetch: DefiLlama protocols, 2026-11-14T01:18:33.201Z.
Watchlist floor: USD 50000000.

- 758 protocols, 758 unique slugs, ten fields in every record; 40 unique watchlist members, all found in protocols. No empty chains or null categories in these bytes, but parsing and display should tolerate documented null categories.
- 342 records have both gecko_id and symbol null: label "No token recorded", never "No token exists". 416 have at least one token identifier: label "Token recorded", not proof of present trading or liquidity. 258 have only one identifier. No identifier-free record has a non-null market cap.
- 614 market caps are null. Of the non-null observations, 16 are nonpositive, including autofinance at -1; exclude these from peer calibration, not from board coverage. Token classification must not depend on market cap.
- 128 positive-market-cap token records qualify as raw peers; all 128 have distinct non-null gecko_id values. Thus shared-token double counting was checked and is not observed in this sealed peer set. Maintain an explicit shared-identifier policy and avoid treating reused symbols alone as proof of a shared token.
- 53 categories; 19 have no positive-market-cap peer, 44 have fewer than five. Raw peer mcap/TVL spans approximately 0.000252–400.204474. Exact sample median is 0.21380325885644053 (an even-sample median, not a nearest-index percentile). Risk Curators has one peer; Onchain Capital Allocator and Derivatives each have two. Never present these as strong category samples.
- TVL ranges USD 5007171–116083653379, all positive in this input. No missing names/slugs/chains/TVL.
- Four change_7d values are null: contango-v2, estate-protocol, kinetiq-elysium-bridge and swan-dao. Reported growth ranges -72.7093% to +4448.4747% (shift-defi at the high end). Clip model influence, preserve the raw observation in detail, and disclose clipping.
- 113 listed_at values are null. Available tracking ages relative to as_of span 2–1851 days. No future listed_at dates were observed. Lightning Network and Noble are watchlist members with missing dates. Missing age must not silently become zero or exclude them.
- listed_at is the first tracking date, not launch date and not evidence of time without a token. Age factor must be called a tracking-history proxy.
- Applying only the visible category/name exclusions identifies 144 product-risk records among the 342 identifier-free records, leaving 198 without those visible flags. All 40 watchlist members pass those visible checks. This is not a reconstructed official eligibility list: parentProtocol is absent from the snapshot.
- Twenty nonwatchlist records at/above the floor pass those visible checks. Do not infer why the official list omitted them, assert parent relationships, or call the 198 proven independent launch candidates. Label unobservable lineage as unknown outside the official list.

## Product and coverage decisions

Original workstation: LAUNCH SIGNAL. Ink/navy base, restrained mint/amber, compact editorial system fonts, strong numeric hierarchy and deliberate whitespace. Desktop target 1440x900, usable narrow view without clipped controls.

Default view: no token recorded, obvious product-risk categories/names excluded, with official watchlist membership shown distinctly. Label this a research candidate view with lineage limitations, not verified tokenlessness. Preferred board coverage is all 758 snapshot records, while token-recorded and risk-flagged products are separate explicit views. Never hide a watchlist member from underlying board output. Provide a watchlist-only control, category/chain/token-status filters, search, numeric sorting, reset and a clear result count/empty state. Global model ranks remain distinguishable from filtered display position.

Hero must say sealed date, no live data, hypothetical implied token market cap, and no token-issuance/airdrop certainty. Do not conflate market cap with FDV, a token price, realizable exit liquidity or expected user reward. Header coverage should show both current result count and complete snapshot/watchlist coverage.

Detail drawer: actual protocol identity/category/chains and raw observations; observed vs assumed labels; watchlist/product-risk/lineage status; point estimate and low/high scenario range; factor decomposition; peer count, calibration level and uncertainty reasons; category-appropriate farm research plan and illustrative budgets. Keyboard open/close, Escape, focus return, meaningful labels, visible focus, accessible sort state, sufficient contrast, reduced-motion support and safe DOM text rendering.

Methodology/coverage panel: formula, assumptions, missingness, robust peer treatment, counts, limitations, snapshot provenance as visible text without network links, and acknowledgement that TVL may overlap across products. Avoid yield or campaign claims unsupported by the input.

## Proposed transparent model (to be tested, not implemented here)

- Validate sealed schema and preserve original facts. classifyTokenRecord uses either identifier, independently of mcap. Keep official watchlist membership directly from input.
- Calibration observations: token-recorded rows with finite strictly positive mcap and TVL. Compute ratio mcap/TVL, robust quantiles/medians in log space, and winsorize extreme influence using documented global bounds. Exclude invalid observations with explicit counts. Provide peer summaries and actual comparison examples without implying independence of overlapping protocol TVL.
- Category calibration shrinks toward global calibration: proposed weight n/(n+6), with n the valid category peer count. Zero peers falls back fully to global; tiny groups remain global-dominated. Define the quantile interpolation and median consistently and expose sample sizes. Constants are transparent modelling assumptions, not measurements.
- Point estimate = TVL x shrunk peer multiple x bounded growth factor x bounded tracking-history factor, rounded/clamped to the allowed positive integer dollar range. Show every factor and the unrounded calculation so a reader can audit it. Never branch on protocol names/slugs for valuation.
- Proposed growth factor: exp(0.35 x log1p(clamp(reported change_7d,-75,100)/100)); null gives neutral 1 with missing-data flag. This bounds the observed extreme without erasing the original growth display. Test boundary effects and sensitivity before finalizing constants.
- Proposed tracking factor: bounded monotonic log-age multiplier, normalized to one year, within [0.8,1.2]; age uses UTC snapshot date only. Missing tracking date gives neutral 1 and wider uncertainty. A future date in another input must be flagged and safely neutralized, not interpreted as negative history.
- Low/high scenarios use robust peer dispersion, with a minimum uncertainty width, larger width for sparse categories/missing growth/missing age and uncertain product lineage. Label as heuristic scenarios, not calibrated statistical confidence or launch probabilities. Enforce finite positive low <= point <= high.
- Token-recorded rows may have observed market cap beside hypothetical comparable value, but do not mix observed mcap into the ranking as though it is the model output. Excluded-product rows still get honest valuation limitations and a research-only/no-action pathway.
- Stable slug tie-break, order-independent peer aggregation and tests with reordered input establish deterministic results. No wall-clock time, randomness, live prices or hidden protocol-name overrides.

## Farming-plan design

Produce 3–12 concrete steps per row, preferably six or seven. Plans are conditional research checklists, not claims an interaction or points campaign currently exists. Each step meets the gate's 20–600 character rule. Mention snapshot category and an actual available chain only as recorded facts. Do not fabricate URLs, pools, collateral lists, points multipliers, emissions, eligibility, fees or APY.

- Shared start: independently verify official interface/contracts and current token/campaign status; verify supported chain/assets/eligibility and withdrawal path. Do not link to an invented official domain.
- Illustrative research budgets, capital at risk, gas/transaction-cost cap and time must be explicitly assumptions, not live quotes or required spending. State principal separately from nonrecoverable fees. No wallet execution occurs in this project.
- Lending: only if verified, small supply/withdraw test, check collateral/liquidity and avoid leverage as a default. DEX/liquidity: verify pool/depth and fee tier; small swap or liquidity round trip only within slippage/IL limits. Curators/allocators/yield: identify an accessible verified vault/strategy, inspect manager/risk/withdrawal rules, test minimal deposit/redeem; do not imply a curator itself accepts deposits.
- Derivatives/options/leveraged farming: prefer observation, documentation or verified simulation; no mandatory leveraged trade. RWA, custodial, privacy or restricted products: eligibility/custody checks first; research-only where access or redemption cannot be verified. Bridge/staking/wrapper/token-recorded products: explicitly not independent pre-token proof; do not suggest farming a nonexistent new launch.
- Stop on unverified contracts, unavailable withdrawal route, eligibility restriction, budget/slippage breach, inadequate liquidity or unsafe permissions; revoke unnecessary approvals and document the test. No invented points campaign and no promised airdrop, profit or recovery of principal.

## Implementation phases (same recorded session)

1. Contract/data audit, plan, MIT SPDX license, git hygiene, and one focused RED test. This phase stops before production code.
2. Classification tracer bullet RED -> GREEN, then schema/missing-data cases; peer calibration and single-protocol factor breakdown in subsequent vertical RED/GREEN steps. Revisit sparse-category/outlier findings with actual computed model output.
3. Add category plans, stable all-protocol ranking and output validation through tests before the fresh main.ts packager. Copy only the immutable helper and compare its SHA-256 against the kit. Fail clearly for invalid input/missing assets; never fake screenshots to unblock packaging.
4. Author original offline dashboard with real data.js integration. Exercise search/filter/sort/detail/keyboard/narrow view in a real browser. Make substantive contributing revisions to final code in response to tests and observations; document findings publicly.
5. Freeze source, capture and inspect three genuine states, package twice into empty output roots, verify complete manifest equality and repository-to-output identity. Parent then independently checks exact final source and privacy-filtered provenance before publication/intake.

## Real verification strategy and evidence boundaries

- Unit tests via Node built-in node:test/assert; no dependencies or test-network calls. Start with the symbol-only missing-market-cap classification boundary. Later cover no identifiers, gecko-only, invalid mcap, null category/growth/date, zero peers, one-peer categories, growth clipping, tracking-date UTC arithmetic, finite ranges, monotonic factors, schema rejection and safe data serialization.
- Integration: parse the actual sealed file, compute coverage with code, count unique slugs and ranks, validate every farm step length, positive/nonincreasing varied integer values, board bytes and official watchlist inclusion. Test shuffled input stability and no hardcoded protocol valuations. Synthetic adversarial fixtures must remain labelled as tests, never represented as protocol facts.
- CLI/runtime: no npm install and no dependency imports; exercise the authored entrypoint with explicit paths. Recheck Node 22 compatibility if an actual Node 22 executable is available; current local Node is v26.12.1, so Node 22 runtime execution must not be claimed from that alone.
- Browser: file:// output load; inspect console errors and resource requests to prove no network; compare displayed counts/ranks/details with board/data.js; perform actual controls, keyboard and empty-state tests. A static gate is not browser execution. Capture fresh board, detail and filtered screenshots from the same final source/data; visually inspect the images, independently decode JPEGs and measure dimensions/bytes.
- Packaging: immutable helper hash, source text wrapper/no-cut check, full dossier byte regeneration, dossier <=1572864 bytes, image caps, filename/symlink checks, CSS/JS presence, no forbidden external references and board <=8388608 bytes. Helper checks and custom local checks are not a claim of official server grade.
- Determinism: two clean output trees; compare programmatically sorted path->SHA-256 manifests and each copied source/image with frozen repository files. Record input/source/image hashes, actual commands, exit statuses, durations and limitations outside sensitive logs. If a final source/image changes, invalidate and rerun the affected verification.
- Provenance: parent counts the exact privacy-filtered bundle's substantive turns and contributing final code writes, verifies timestamps/usage/authorship/run record and official check results, then binds the reviewed bundle hash and exact commit. Do not call entry ready while any applicable check fails or is unknown.

## Phase 1 verification status

- PASS: actual snapshot structure/statistical audit above; no invented protocol facts.
- PASS: actual Node v26.12.1; existing local Git identity was inspected without change; repository initially contained no commits or production files.
- PASS: a real HeadlessChrome/145 browser responded on about:blank and WebGL2 creation returned true. This is a browser prerequisite probe, not dashboard execution.
- NOT YET RUN: production model, main.ts, dashboard, valid build, screenshots, two-run audit, official final bundle checks or remote publication/intake.
- PASS (expected RED): `node --test tests/token-record.test.ts` exited 1 with one test, zero passes and one failure. The assertion was "Missing model behavior: implement lib/model.ts classification before valuation". This proves the intended missing behavior boundary is exposed; it is not a passing classification test and must become GREEN in Phase 2.
- PASS: the same browser opened the repository LICENSE via file:// and confirmed its SPDX line. Local-file loading is exercised; dashboard execution remains untested because no dashboard exists.
- BLOCKED/UNKNOWN for later acceptance, not Phase 1 completion: actual Node 22 execution, production packaging, genuine dashboard screenshots and final provenance eligibility. Local Node 26 is adequate to begin development but is not evidence of a Node 22 run. Parent-reported account/kit checks are not repeated or represented as worker-verified account checks.
- A heredoc-form analysis command was rejected by the execution control before running. The equivalent read-only audit succeeded through an ordinary python3 -c invocation. No protection, configuration or approval policy was modified.
- Phase 1 stops with documentation, license, ignore rules and the single failing test only. No main.ts, production lib/model.ts, dashboard, vendor copy or screenshots have been authored/copied. No delegation, account operation, publication, submission, trading or payment was performed.
