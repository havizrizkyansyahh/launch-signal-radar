# PHASE 7 — out-of-sample validation and netted farm economics

Status: engine, board data and tests are done and measured. The **page does not yet render the new validation and net-value blocks**, so the three screenshots were recaptured for the changed budget/code but still show only the earlier UI. That is the main remaining gap before this phase can be called judge-ready.

## (a) Out-of-sample validation — measured on the sealed snapshot

Ground truth is restricted to traded peers (recorded positive market cap and positive TVL). Deterministic split by FNV-1a hash of `salt + ':' + slug`, 70/30. Parameters are fitted on the fit split only; every number below is a holdout number.

- Eligible traded peers: **128**; fit 79; holdout 49.
- Chosen family: **global multiple** (lowest holdout MdAPE).

| family | holdout n | MdAPE | MAPE | Spearman | within 2x |
| --- | --- | --- | --- | --- | --- |
| naive TVL (predict mcap = TVL) | 49 | 323.74% | 3119.88% | 0.53 | 16% |
| global multiple | 49 | **85.80%** | 626.30% | 0.53 | **29%** |
| category multiple + global fallback | 49 | 90.04% | 1839.45% | 0.48 | 20% |
| category + growth + age | 49 | 90.58% | 2112.77% | 0.46 | 20% |

Stability: on the second deterministic split the winner is **category** (MdAPE 98.75%) with global at 99.27%, so `stability.stable` is **false**. Honest weakness: the family choice is not stable across splits, the two models are within ~0.5 percentage points, and absolute error is large (a median 86% over/undershoot). The page must not claim a validated edge that the data does not show; it should print this row of numbers and the instability flag.

## (b) Netted farm economics

Per row the engine now computes: steps, transactions (`steps x tx_per_step` by plan family), gas at a stated 0.35 USD/tx, bridge 2.5 USD when a protocol spans more than one chain, total costs, weeks (horizon/7), principal-risk score, TVL share, expected gross, net, breakeven multiple and a verdict.

Expected gross is not invented per protocol: `hypothetical implied value x capital/(TVL+capital) x 0.02 reward share`. The 2% share and the gas/bridge constants are labelled assumptions in `economics_summary.assumptions`, never a forecast.

Verdicts on the sealed board (758 rows): **farm 197, thin 121, skip 440**. Skipped rows include every research-only family with zero capital at risk and any row whose net falls at or below zero. Example farmable rows: `ethena-usde` gross 43.31 / costs 4.90 / net 38.41; `steakhouse-financial` gross 32.18 / costs 7.40 / net 24.78.

## (c) Wiring and tests

- `board.json` keeps every required field and adds `validation`, `economics_summary` and per-row `economics` (costs, gross, net, breakeven, verdict, risk, weeks).
- New tests in `tests/oos-economics.test.mjs` were written first and failed (5/5) before implementation: deterministic/disjoint ~70/30 split, winner-by-holdout rule, no-holdout-leakage fit, net arithmetic with boundary verdicts and zero-capital/zero-reward skips, and sealed-board determinism with consistent verdict counts.
- Full suite: **19 tests, 19 pass** (was 14).
- Audit: **24 checks, 24 pass**; two clean trees byte-identical; dossier 696,750 bytes; dossier text 65,289 bytes with no cut; dashboard source 64,880 bytes (< 65,536); screenshots 148,849 / 180,115 / 143,553 bytes at 1440x900.

Source budget forced prose trimming across farm actions and methodology strings (64,880 now). Wording is terser than the previous phase; no numeric claim was changed.

## Honest weaknesses found

1. Family selection is unstable across splits (global vs category), and holdout MdAPE around 86% is a weak absolute fit. Reporting it as "validated" would overstate the model.
2. Growth and age adjustments **hurt** holdout accuracy in this snapshot (90.58% vs 90.04%), so the shipped board still uses them only as bounded, disclosed multipliers rather than as proven predictors.
3. The economics scenario is dominated by assumed constants; with 2,000-5,000 USD caps, verdicts flip between thin and farm on small changes of the reward share. Treat the verdict as a screening label, not advice.
4. UI gap: the new validation table and net-value/verdict display are not yet in `dashboard/app.js`; the recaptured screenshots therefore show the old layout. Sources and data carry the numbers, so the page and the board currently disagree in what a judge can see without scrolling into the JSON.

## Next dependency

Wire `validation`, `economics_summary` and per-row `economics` into the dashboard (verdict column, validation panel, detail cost breakdown), keep total source under 65,536 bytes, then recapture all three screenshots and rerun tests + audit before the parent regenerates the bundle and submits.