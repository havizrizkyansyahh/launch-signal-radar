/* LAUNCH SIGNAL shared deterministic engine. Classic script: works offline via file://.
 * Also loaded unchanged by Node through lib/model.ts; model source remains in the dossier.
 * All synthetic tests live outside this dashboard directory. */
(function (root) {
  'use strict';
  function classifyTokenRecord(protocol) {
    return protocol.gecko_id != null || protocol.symbol != null ? 'token-recorded' : 'no-token-recorded';
  }
  const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const finite = (n) => typeof n === 'number' && Number.isFinite(n);
  const text = (s) => typeof s === 'string' && s.trim().length > 0;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  function dayNumber(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const ms = Date.parse(s + 'T00:00:00Z');
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s ? ms / 86400000 : null;
  }
  function parseSnapshot(input) {
    let s;
    try { s = typeof input === 'string' ? JSON.parse(input) : input; }
    catch { throw new Error('Invalid snapshot: malformed JSON'); }
    const require = (ok, why) => { if (!ok) throw new Error('Invalid snapshot: ' + why); };
    require(s && typeof s === 'object', 'object required');
    require(dayNumber(s.as_of) !== null && text(s.source), 'date/source');
    require(Number.isSafeInteger(s.floor_usd) && s.floor_usd >= 0, 'floor');
    require(Array.isArray(s.protocols) && s.protocols.length > 0 && s.protocols.length <= 4000, 'protocol count');
    const slugs = new Set();
    const protocols = s.protocols.map((p) => {
      require(p && typeof p === 'object', 'protocol object');
      require(typeof p.slug === 'string' && /^\S{1,128}$/.test(p.slug) && !slugs.has(p.slug), 'unique slug');
      slugs.add(p.slug);
      require(text(p.name) && (p.category === null || text(p.category)), p.slug + ': name/category');
      require(Array.isArray(p.chains) && p.chains.every(text), p.slug + ': chains');
      require(Number.isSafeInteger(p.tvl_usd) && p.tvl_usd >= 0, p.slug + ': TVL');
      require(p.change_7d === null || finite(p.change_7d), p.slug + ': growth');
      require(p.mcap_usd === null || Number.isSafeInteger(p.mcap_usd), p.slug + ': market cap');
      require(p.listed_at === null || dayNumber(p.listed_at) !== null, p.slug + ': tracking date');
      require([p.gecko_id, p.symbol].every((x) => x === null || text(x)), p.slug + ': token identifiers');
      return { slug: p.slug, name: p.name, category: p.category, chains: [...p.chains],
        tvl_usd: p.tvl_usd, change_7d: p.change_7d, mcap_usd: p.mcap_usd,
        listed_at: p.listed_at, gecko_id: p.gecko_id, symbol: p.symbol };
    });
    require(Array.isArray(s.watchlist) && s.watchlist.every((slug) => slugs.has(slug)) &&
      new Set(s.watchlist).size === s.watchlist.length, 'watchlist membership/uniqueness');
    return { as_of: s.as_of, source: s.source, floor_usd: s.floor_usd, protocols, watchlist: [...s.watchlist] };
  }
  // R7 quantiles: linear interpolation at (n-1)*p. Work in log ratio space.
  function quantile(values, p) {
    const xs = [...values].sort((a, b) => a - b);
    if (!xs.length) return 0;
    const at = (xs.length - 1) * p, lo = Math.floor(at), hi = Math.ceil(at);
    return xs[lo] + (xs[hi] - xs[lo]) * (at - lo);
  }
  function calibratePeers(snapshot, excludeSlug = null) {
    const excluded = snapshot.protocols.find((p) => p.slug === excludeSlug);
    const candidates = snapshot.protocols.filter((p) => p.slug !== excludeSlug &&
      !(excluded?.gecko_id && p.gecko_id === excluded.gecko_id)).sort((a, b) => compare(a.slug, b.slug));
    const recorded = candidates.filter((p) => classifyTokenRecord(p) === 'token-recorded');
    const valid = recorded.filter((p) => finite(p.mcap_usd) && p.mcap_usd > 0 && p.tvl_usd > 0);
    const groups = new Map();
    for (const p of valid) {
      const id = p.gecko_id ? 'gecko:' + p.gecko_id : 'slug:' + p.slug;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(p);
    }
    const grouped = [...groups.values()];
    const groupLogs = grouped.map((ps) => quantile(ps.map((p) => Math.log(p.mcap_usd / p.tvl_usd)), 0.5));
    const lower = groupLogs.length ? quantile(groupLogs, 0.1) : Math.log(0.25);
    const upper = groupLogs.length ? quantile(groupLogs, 0.9) : Math.log(4);
    const clipped = groupLogs.map((x) => clamp(x, lower, upper));
    const center = quantile(clipped, 0.5);
    const global = { peer_count: grouped.length, level: grouped.length ? 'global-peers' : 'assumed-no-peers',
      multiple: Math.exp(center), log_center: center,
      log_low: clipped.length ? quantile(clipped, 0.25) : lower,
      log_high: clipped.length ? quantile(clipped, 0.75) : upper };
    const categories = [...new Set(snapshot.protocols.map((p) => p.category))]
      .sort((a, b) => compare(a ?? '', b ?? '')).map((category) => {
        const logs = grouped.map((ps) => ps.filter((p) => p.category === category))
          .filter((ps) => ps.length).map((ps) => clamp(quantile(ps.map((p) => Math.log(p.mcap_usd / p.tvl_usd)), 0.5), lower, upper));
        const n = logs.length, weight = n / (n + 6);
        const mix = (p) => weight * quantile(logs, p) + (1 - weight) *
          (p === 0.5 ? global.log_center : p === 0.25 ? global.log_low : global.log_high);
        return { category, peer_count: n, category_weight: weight,
          level: !n ? global.level : n < 5 ? 'sparse-category-shrunk' : 'category-shrunk',
          multiple: Math.exp(mix(0.5)), log_center: mix(0.5), log_low: mix(0.25), log_high: mix(0.75) };
      });
    return { peer_count: grouped.length, raw_peer_rows: valid.length,
      duplicate_identifier_rows: valid.length - grouped.length,
      invalid_mcap_count: recorded.filter((p) => p.mcap_usd !== null && p.mcap_usd <= 0).length,
      missing_mcap_count: recorded.filter((p) => p.mcap_usd === null).length,
      zero_tvl_count: recorded.filter((p) => p.mcap_usd > 0 && p.tvl_usd <= 0).length,
      identifier_free_mcap_count: candidates.filter((p) => classifyTokenRecord(p) === 'no-token-recorded' && p.mcap_usd !== null).length,
      clip_low: Math.exp(lower), clip_high: Math.exp(upper), global, categories,
      peers: valid.map((p) => ({ slug: p.slug, name: p.name, category: p.category,
        gecko_id: p.gecko_id, raw_ratio: p.mcap_usd / p.tvl_usd,
        clipped_ratio: Math.exp(clamp(Math.log(p.mcap_usd / p.tvl_usd), lower, upper)) })) };
  }
  const VALUE_CAP = 100000000000000;
  const dollars = (n) => Math.round(clamp(n, 1, VALUE_CAP));
  function valueProtocol(protocol, snapshot, calibration = calibratePeers(snapshot)) {
    // Leave the target asset out: an observed market cap must not price itself.
    const selfExcluded = calibration.peers.some((p) => p.slug === protocol.slug);
    const c = selfExcluded ? calibratePeers(snapshot, protocol.slug) : calibration;
    const peer = c.categories.find((x) => x.category === protocol.category) ||
      { ...c.global, category_weight: 0, peer_count: 0 };
    const reasons = [];
    if (c.peer_count === 0) reasons.push('assumed-no-peers');
    if (peer.peer_count < 5) reasons.push('sparse-category');
    const growth = protocol.change_7d === null ? null : clamp(protocol.change_7d, -75, 100);
    if (growth === null) reasons.push('missing-growth');
    if (growth !== null && growth !== protocol.change_7d) reasons.push('growth-clipped');
    const growthFactor = growth === null ? 1 : Math.exp(0.35 * Math.log1p(growth / 100));
    const rawAge = protocol.listed_at === null ? null : dayNumber(snapshot.as_of) - dayNumber(protocol.listed_at);
    const age = rawAge === null || rawAge < 0 ? null : rawAge;
    if (rawAge === null) reasons.push('missing-tracking-date');
    if (rawAge !== null && rawAge < 0) reasons.push('future-tracking-date');
    const ageFactor = age === null ? 1 : clamp(1 + 0.08 * Math.log2((age + 30) / 395), 0.8, 1.2);
    if (protocol.tvl_usd === 0) reasons.push('zero-tvl-floor');
    const watchlist = snapshot.watchlist.includes(protocol.slug);
    if (!watchlist) reasons.push('lineage-unobservable');
    // A modelling scenario, not a calibrated confidence interval or launch probability.
    const spread = Math.max(Math.log(2), peer.log_center - peer.log_low, peer.log_high - peer.log_center);
    let width = spread + (peer.peer_count < 5 ? Math.log(1.5) : 0);
    if (c.peer_count === 0) width += Math.log(2);
    if (growth === null || growth !== protocol.change_7d) width += Math.log(1.25);
    if (age === null) width += Math.log(1.25);
    if (!watchlist) width += Math.log(1.2);
    const base = protocol.tvl_usd * peer.multiple;
    const unrounded = base * growthFactor * ageFactor;
    const value = dollars(unrounded);
    if (unrounded > VALUE_CAP) reasons.push('value-cap');
    return { ...protocol, token_status: classifyTokenRecord(protocol), watchlist,
      implied_value_usd: value,
      factors: { peer_multiple: peer.multiple, category_weight: peer.category_weight,
        category_peers: peer.peer_count, global_peers: c.peer_count, calibration_level: peer.level,
        self_excluded: selfExcluded, clip_low: c.clip_low, clip_high: c.clip_high,
        growth_used_pct: growth, growth_factor: growthFactor, age_days: age, age_factor: ageFactor,
        base_value_usd: base, unrounded_value_usd: unrounded },
      uncertainty: { label: 'Heuristic scenario range, not statistical confidence',
        low_usd: Math.min(value, dollars(unrounded * Math.exp(-width))),
        high_usd: Math.max(value, dollars(unrounded * Math.exp(width))),
        log_width: width, reasons } };
  }
  function productRisks(p) {
    const flags = [];
    if (['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX',
      'Cross Chain Bridge', 'Stablecoin Wrapper'].includes(p.category)) flags.push('product-category');
    if (/\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/.test(p.name)) flags.push('versioned-product');
    if (/\b(wrapped|staked|staking)\b/i.test(p.name)) flags.push('wrapped-staked-name');
    if (/^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/i.test(p.name)) flags.push('exchange-prefix');
    return flags;
  }
  function farmPlan(p) {
    const cat = p.category || 'Unclassified';
    let family = 'general-research';
    if (/Lending|Collateral|^CDP/.test(cat)) family = 'lending';
    else if (/Dexs|Liquidity Manager/.test(cat)) family = 'liquidity';
    else if (/Curators|Allocator|Yield|Basis Trading|Indexes|Farm|Restaking|Staking Pool/.test(cat)) family = 'vault';
    else if (/Derivatives|Options|Leveraged|Synthetics/.test(cat)) family = 'derivatives';
    else if (/RWA|CEX|CeDeFi|Card|Privacy|Uncollateralized/.test(cat)) family = 'restricted';
    if (/Leveraged/.test(cat)) family = 'derivatives';
    if (/Uncollateralized/.test(cat)) family = 'restricted';
    const risks = productRisks(p);
    const research = risks.length > 0 || ['general-research', 'restricted', 'derivatives'].includes(family);
    const mode = research ? 'research-only' : 'conditional-small-test';
    const budget = { label: 'Illustrative assumptions, not live fees or required spending',
      capital_usd: research ? 0 : 100, fees_usd: research ? 0 : 10,
      active_minutes: research ? 60 : 90, horizon_days: 14, slippage_cap_pct: research ? 0 : 1 };
    const actions = {
      lending: ['If independently verified and eligible, inspect collateral, liquidation thresholds and available withdrawal liquidity. For a supply interface, test a small unlevered supply; for debt-only CDPs, simulate mint/redeem first without opening debt.',
        'Use only a verified supported asset; inspect allowances and redemption limits. Test the smallest permitted withdrawal before considering any longer exposure. Stop if principal cannot be redeemed within the stated budget.'],
      liquidity: ['If independently verified, inspect a supported pool, depth, fee tier and asset risk. Test a small swap within the illustrative 1% slippage cap; do not assume LP activity earns incentives.',
        'Before any LP test, quantify impermanent-loss exposure and range risk. Preview removing liquidity and a return swap; stop if the round trip exceeds the fee cap or the exit cannot be verified.'],
      vault: ['Locate a verified accessible vault or strategy rather than assuming the manager itself accepts deposits. Read manager permissions, assets, loss exposure, lockups and redemption queues before any conditional small deposit.',
        'If the vault is eligible, first test its smallest supported deposit and redeem. Record share conversion, exit delay and asset received; do not loop deposits, borrow to farm or assume any points campaign exists.'],
      derivatives: ['Research-only: inspect margin, liquidation, funding and settlement rules in documentation or a verified simulation. No leveraged position, premium payment or live trade is required by this plan.',
        'Record a simulated entry and adverse-price exit, including funding and liquidation sensitivity. Stop research if settlement rules or contract identity cannot be independently verified.'],
      restricted: ['Research-only: check jurisdiction, eligibility, custody, asset backing and redemption documentation. Do not bypass access restrictions or assume a public deposit interface exists.',
        'Map the legal/technical redemption path and counterparty risks without depositing. Stop if eligibility, custody segregation or withdrawal rights remain unverifiable.'],
      'general-research': ['Research-only: identify what the product actually permits using verified documentation. Map supported assets, permissions and exit mechanisms; no deposit, trade or approval is needed.',
        'Write a candidate interaction and its failure/exit conditions on paper. Stop if the category, official interface or redemption path cannot be independently established.'],
    };
    const name = p.name.slice(0, 90), chain = [...p.chains].sort(compare)[0]?.slice(0, 70) || 'an independently verified supported chain';
    const status = classifyTokenRecord(p) === 'token-recorded' ?
      'Token recorded: this is post-token product research, not proof of a future token launch.' :
      'No token recorded in the snapshot: verify current token status independently; absence of a record is not proof of no token.';
    const actionSteps = risks.length ? [
      'Research-only product-risk exclusion: inspect whether this is a bridge, wrapper, staked asset, versioned product or exchange-related instrument. Do not treat its TVL as evidence of an independent pre-token opportunity.',
      'Trace the underlying asset and verified redemption/custody mechanism in official documentation. No bridge transfer, staking transaction or deposit is required; stop if lineage or exit rights cannot be established.',
    ] : actions[family];
    return { family, mode, budget, steps: [
      `Verify ${name}: independently establish the official domain and contract addresses on ${chain} using trusted primary references. The sealed snapshot supplies neither an official URL nor a contract address; stop on any mismatch.`,
      `${status} Recorded category: ${cat}. Verify that any proposed operation is currently available and eligible. This plan asserts no live points, rewards, fees or airdrop campaign.`,
      `Illustrative assumptions, not live quotes: capital at risk up to $${budget.capital_usd}; separate nonrecoverable network/gas/transaction fees up to $${budget.fees_usd}; ${budget.active_minutes} active minutes over ${budget.horizon_days} days. Principal is not a fee and may be lost. These are ceilings, not required spending.`,
      ...actionSteps,
      'Over the illustrative 14-day research window, log verified documentation, transaction receipts only if a conditional test is chosen, and actual costs. Review once per week; do not manufacture volume or expect a reward from repeated activity.',
      'Stop for unverified domain/contracts, ineligibility, unsafe approvals, missing exit liquidity, or any capital, gas or slippage ceiling breach. Revoke unnecessary approvals if any were granted, record withdrawal results and stop rather than chase sunk costs.',
    ] };
  }
  function buildRadar(input) {
    const snapshot = parseSnapshot(input), calibration = calibratePeers(snapshot);
    const rows = snapshot.protocols.map((p) => {
      const row = valueProtocol(p, snapshot, calibration), risk = productRisks(p);
      const { steps, ...plan } = farmPlan(p);
      return { ...row, risk_flags: risk,
        candidate: row.token_status === 'no-token-recorded' && (!risk.length || row.watchlist),
        lineage_status: row.watchlist ? 'official-watchlist-rule' : 'parent-lineage-not-supplied',
        farm_steps: steps, plan };
    }).sort((a, b) => b.implied_value_usd - a.implied_value_usd || compare(a.slug, b.slug))
      .map((row, i) => ({ ...row, rank: i + 1 }));
    return { schema: 'launch-signal/v1', as_of: snapshot.as_of, source: snapshot.source,
      floor_usd: snapshot.floor_usd,
      disclaimer: 'Sealed snapshot, no live data. Hypothetical token market capitalization, not a token price, FDV, issuance forecast or promised airdrop. No token recorded does not prove no token exists.',
      methodology: {
        formula: 'TVL x robust category/global peer multiple x bounded 7-day growth factor x bounded tracking-history factor',
        peers: 'Positive recorded market cap / positive TVL only; R7 log-space quantiles; global p10/p90 winsorization; category log-median shrinkage n/(n+6). Repeated CoinGecko IDs aggregate once. Target asset excluded from its own calibration.',
        growth: 'exp(0.35 * log1p(clamp(reported growth,-75,100)/100)); missing = 1. Raw reported growth is preserved.',
        age: 'clamp(1 + 0.08*log2((snapshot-relative tracking days+30)/395),0.8,1.2); missing/future = 1. Tracking date is not launch date or proof of token-free age.',
        uncertainty: 'Heuristic scenarios from peer log-quartile dispersion, minimum factor 2; wider for sparse/no peers, missing/clipped growth, missing/future age and unobservable lineage. Not calibrated confidence or launch probabilities.',
        fallback: 'No category peers: global. No peers anywhere: explicitly assumed 1x TVL with wide uncertainty. Zero TVL: $1 validity floor, not economic value. All values rounded to integer dollars, capped at $100 trillion.',
        limitations: 'TVL may overlap; market cap is not FDV or exit liquidity. Parent relationships, official domains/contracts, live fees, token supply, points, eligibility and actual rewards are absent. Outside-watchlist lineage is unknown. All farming budgets are illustrative ceilings, not live quotes.',
      },
      coverage: { protocols: rows.length, watchlist_total: snapshot.watchlist.length,
        watchlist_covered: rows.filter((r) => r.watchlist).length,
        token_recorded: rows.filter((r) => r.token_status === 'token-recorded').length,
        no_token_recorded: rows.filter((r) => r.token_status === 'no-token-recorded').length,
        default_candidates: rows.filter((r) => r.candidate).length,
        product_risk: rows.filter((r) => r.risk_flags.length).length,
        missing_growth: rows.filter((r) => r.change_7d === null).length,
        missing_tracking_date: rows.filter((r) => r.listed_at === null).length },
      calibration, rows };
  }
  function validateBoard(board, snapshot) {
    const require = (ok, why) => { if (!ok) throw new Error('Invalid board: ' + why); };
    require(board && Array.isArray(board.rows), 'rows array');
    const rows = board.rows;
    require(rows.length >= 100 && rows.length <= 4000, 'row count');
    require(new TextEncoder().encode(JSON.stringify(board)).length <= 8388608, '8 MiB size cap');
    const known = new Map(snapshot.protocols.map((p) => [p.slug, p])), seen = new Set();
    let previous = Infinity;
    for (const [i, r] of rows.entries()) {
      require(known.has(r.slug) && !seen.has(r.slug), 'unknown/duplicate slug'); seen.add(r.slug);
      require(text(r.name) && r.rank === i + 1, 'name/sequential rank');
      require(Number.isSafeInteger(r.implied_value_usd) && r.implied_value_usd >= 1 && r.implied_value_usd <= VALUE_CAP, 'value bounds');
      require(r.implied_value_usd <= previous, 'nonincreasing values'); previous = r.implied_value_usd;
      require(Array.isArray(r.farm_steps) && r.farm_steps.length >= 3 && r.farm_steps.length <= 12 &&
        r.farm_steps.every((s) => typeof s === 'string' && s.trim().length >= 20 && s.trim().length <= 600), 'farm steps');
      require(r.uncertainty && Number.isSafeInteger(r.uncertainty.low_usd) && Number.isSafeInteger(r.uncertainty.high_usd) &&
        r.uncertainty.low_usd >= 1 && r.uncertainty.low_usd <= r.implied_value_usd &&
        r.uncertainty.high_usd >= r.implied_value_usd && r.uncertainty.high_usd <= VALUE_CAP, 'scenario bounds');
      require(r.token_status === classifyTokenRecord(known.get(r.slug)), 'token status');
    }
    require(new Set(rows.map((r) => r.implied_value_usd)).size > 1, 'nontrivial ranking');
    require(snapshot.watchlist.every((slug) => seen.has(slug)), 'watchlist coverage');
    return { rows: rows.length, watchlist_covered: snapshot.watchlist.length };
  }
  function dataScript(data) {
    return 'globalThis.LAUNCH_DATA=' + JSON.stringify(data).replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + ';\n';
  }
  root.LaunchModel = Object.freeze({ classifyTokenRecord, parseSnapshot, calibratePeers, valueProtocol,
    productRisks, farmPlan, buildRadar, validateBoard, dataScript });
})(globalThis);
