# launch-signal-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/havizrizkyansyahh/launch-signal-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/havizrizkyansyahh/launch-signal-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

LAUNCH SIGNAL is an offline research workstation over one sealed DefiLlama snapshot (758 protocols, 40 on the official watchlist). It ranks every protocol by a hypothetical token market capitalisation and nets each farm-research plan in dollars with an explicit **farm / thin / skip** verdict. It is not a price, FDV, issuance forecast or airdrop promise, and "no token recorded" is never presented as proof that no token exists.

## Method, measured on the sealed snapshot

- **Anchors.** Only traded protocols with a recorded positive market cap and positive TVL calibrate the model: 128 peers, deduplicated by CoinGecko id, target asset excluded from its own calibration.
- **Out-of-sample check.** A stable FNV-1a hash of `salt:slug` splits those 128 peers 70/30 into 79 fit and 49 holdout rows. Parameters are fitted on the fit split only; every number below is holdout:

| family | MdAPE | MAPE | Spearman | within 2x |
| --- | --- | --- | --- | --- |
| naive TVL (mcap = TVL) | 323.74% | 3119.88% | 0.53 | 16% |
| global multiple | **85.80%** | 626.30% | 0.53 | **29%** |
| category + global fallback | 90.04% | 1839.45% | 0.48 | 20% |
| category + growth + age | 90.58% | 2112.77% | 0.46 | 20% |

  The winner is chosen by holdout MdAPE, not by preference. On a second deterministic split the winner changes from `global` to `category` (MdAPE 99.27% vs 98.75%), so the dashboard prints that instability instead of claiming a validated edge.

  Two limits of that table, stated because they bound what it can support. First, the family is selected on the same 49 holdout rows it is reported on, so 85.80% is optimistic for an unseen protocol; a protocol-level nested split was not run. Second, the second split is not an independent replication: salt `b` puts 40 of those 49 holdout rows into its own fit set (100 fit / 28 holdout), so it only probes how much the choice moves. A 2026-11-17 attempt to beat `global` by tuning on the fit split alone (5-fold internal CV over log-space, ridge, growth/age interactions and robust losses) improved CV MdAPE from 88.31% to 82.04% but regressed on the untouched holdout to 88.11%, so it was rejected and the shipped model is unchanged.

- **Values.** TVL × shrunk peer multiple × bounded growth factor × bounded tracking factor, with a heuristic low/high range that widens for sparse samples, missing growth, missing or future tracking dates and unobservable lineage.
- **Farm economics.** Each plan is priced: transactions per step at an assumed 0.35 USD/tx, a 2.50 USD bridge assumption for multi-chain protocols, total cost, expected gross at a heavily discounted 2% reward share of the hypothetical value allocated by TVL share, net, breakeven multiple and a verdict. On this snapshot the board is **224 farm / 94 thin / 440 skip**; research-only families and zero-capital rows are `skip` by construction, not by guesswork.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

Place the sealed `snapshot.json` at `input/snapshot.json`, or pass `--input <file|dir>`; `--out <dir>` and `MAKEFUN_OUTPUT_DIR` choose the destination. Add `--data-only` for a NONFINAL data build without screenshots or a dossier. Then open `out/dashboard/index.html` directly from disk — the page loads `../data.js` beside the dashboard and needs no server, network or installation.

Node 22.18 or later runs `main.ts` as it is; there is no build step and no dependency. Tests and the reproducible artifact audit:

```sh
node --test tests/*.test.ts tests/*.test.mjs
node tests/build-audit.mjs
```

`tests/build-audit.mjs` builds the entry twice into clean directories, compares complete path-to-SHA-256 manifests, and re-checks the board contract, dashboard limits, screenshot bytes and dimensions, the immutable helper hash, and an independent `buildDossier` rebuild. Results land in `tests/build-audit.json`; browser evidence is in `tests/browser-evidence.json` and the release notes are in `BUILD-REPORT.md`.

## What is in here

- `main.ts` — standard-library entrypoint: reads the sealed snapshot, writes `board.json`, root-level `data.js`, `dashboard/`, `screenshots/` and `dossier.json`.
- `dashboard/` — the offline page (`index.html`, `app.css`, `app.js`) plus the shared engine (`model.js`) and pure selection logic (`view.js`). Snapshot text is rendered as text nodes only.
- `lib/model.ts` — re-exports the same shared engine for Node, so the model the judge reads is the model that runs.
- `vendor/makefun-board.ts` — the official dossier helper, byte-identical to the kit's copy.
- `screenshots/` — three real browser captures of this build: the board, a protocol dossier and a filtered state.

## Limits

Values are model outputs on one frozen snapshot, not live data; TVL may overlap between protocols, parent-protocol lineage is absent from the snapshot, and farming budgets are illustrative ceilings rather than quoted fees or yields. Verify official domains, contracts, eligibility and exit routes yourself before any interaction.

---

<sub>Entered on [make.fun](https://make.fun/?ref=6baap856&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>