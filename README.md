# launch-signal-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/havizrizkyansyahh/launch-signal-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/havizrizkyansyahh/launch-signal-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

LAUNCH SIGNAL is an offline research workstation that ranks every protocol in one sealed DefiLlama snapshot (758 protocols, 40 on the official watchlist) by a hypothetical token market capitalization, and gives each protocol a conditional farm-research plan. The value model multiplies TVL by a robust category/global market-cap-to-TVL calibration, a bounded seven-day growth factor and a bounded tracking-history factor, then reports a heuristic scenario range. It is not a price, FDV, issuance forecast or airdrop promise, and "no token recorded" is never presented as proof that no token exists.

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