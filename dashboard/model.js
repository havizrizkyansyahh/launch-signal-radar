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
      capital_usd: research ? 0 : 5000, fees_usd: research ? 0 : 10,
      active_minutes: research ? 60 : 90, horizon_days: 14, slippage_cap_pct: research ? 0 : 1 };
    const actions = {
      lending: ['If verified and eligible, read collateral, liquidation and withdrawal rules; test a small unlevered supply.', 'Use only a verified asset; test the smallest withdrawal before longer exposure.'],
      liquidity: ['If verified, inspect pool depth, fee tier and asset risk; test a small swap inside the 1% slippage cap.', 'Quantify impermanent-loss and range risk; preview the exit before any deposit.'],
      vault: ['Find a verified accessible vault; read permissions, loss exposure, lockups and exit queues first.', 'Test the smallest deposit and redeem, recording share conversion and exit delay.'],
      derivatives: ['Research-only: read margin, liquidation, funding and settlement rules or use a verified simulation.', 'Model a simulated entry and adverse exit; no live leveraged position is required.'],
      restricted: ['Research-only: check jurisdiction, eligibility, custody, backing and redemption terms.', 'Map the redemption path and counterparty risk without depositing.'],
      'general-research': ['Research-only: establish what the product permits from verified documentation.', 'Write the candidate interaction and its exit conditions on paper; deposit nothing.'],
    };
    const name = p.name.slice(0, 90), chain = [...p.chains].sort(compare)[0]?.slice(0, 70) || 'an independently verified supported chain';
    const status = classifyTokenRecord(p) === 'token-recorded' ?
      'Token recorded: post-token research, not proof of a future launch.' :
      'No token recorded: verify status independently; absence is not proof of no token.';
    const actionSteps = risks.length ? [
      'Research-only product-risk exclusion: inspect whether this is a bridge, wrapper, staked asset, versioned product or exchange-related instrument. Do not treat its TVL as evidence of an independent pre-token opportunity.',
      'Trace the underlying asset and verified redemption/custody mechanism in official documentation. No bridge transfer, staking transaction or deposit is required; stop if lineage or exit rights cannot be established.',
    ] : actions[family];
    return { family, mode, budget, steps: [
      `Verify ${name}: confirm official contracts on ${chain} from primary sources; the snapshot has none. Stop on mismatch.`,
      `${status} Recorded category: ${cat}. Verify that any proposed operation is currently available and eligible. This plan asserts no live points, rewards, fees or airdrop campaign.`,
      `Illustrative, not live: capital <= $${budget.capital_usd}, gas/fees <= $${budget.fees_usd}, ${budget.active_minutes} min over ${budget.horizon_days} days. Principal may be lost.`,
      ...actionSteps,
            'Log verified documentation and real costs, review weekly, manufacture no volume; stop on unverified contracts, ineligibility, unsafe approvals, thin exit liquidity or any budget breach.',
    ] };
  }
  function buildRadar(input) {
    const snapshot = parseSnapshot(input), calibration = calibratePeers(snapshot), validation = validateModels(snapshot);
    const rows = snapshot.protocols.map((p) => {
      const row = valueProtocol(p, snapshot, calibration), risk = productRisks(p);
      const { steps, ...plan } = farmPlan(p);
      return { ...row, risk_flags: risk,
        candidate: row.token_status === 'no-token-recorded' && (!risk.length || row.watchlist),
        lineage_status: row.watchlist ? 'official-watchlist-rule' : 'parent-lineage-not-supplied',
        farm_steps: steps, plan,
        economics: { ...economics({ capital_usd: plan.budget.capital_usd, steps: steps.length, tx_per_step: familyTx[plan.family] || 1,
          chains: p.chains.length, tvl_usd: p.tvl_usd, implied_value_usd: row.implied_value_usd, horizon_days: plan.budget.horizon_days,
          principal_risk: familyRisk[plan.family] ?? 0.6 }), family: plan.family, mode: plan.mode } };
    }).sort((a, b) => b.implied_value_usd - a.implied_value_usd || compare(a.slug, b.slug))
      .map((row, i) => ({ ...row, rank: i + 1 }));
    const verdicts = { farm: 0, thin: 0, skip: 0 };
    for (const r of rows) verdicts[r.economics.verdict]++;
    return { schema: 'launch-signal/v1', as_of: snapshot.as_of, source: snapshot.source,
      floor_usd: snapshot.floor_usd,
      validation,
      economics_summary: { verdicts,
        thresholds: 'farm: net>=2x costs, risk<=0.40',
        assumptions: 'gas 0.35/tx, bridge 2.5, reward share 2%' },
      disclaimer: 'Sealed snapshot, hypothetical value; not a price, forecast or airdrop promise.',
      methodology: {
        formula: 'TVL x peer multiple x growth x tracking',
        peers: 'positive mcap/TVL only; R7 log quantiles; p10/p90 clip; shrink n/(n+6); target excluded',
        growth: 'exp(0.35*log1p(clamp(g,-75,100)/100)); missing=1',
        age: 'clamp(1+0.08*log2((days+30)/395),0.8,1.2); missing/future=1',
        uncertainty: 'peer quartile dispersion, min 2x; wider when data is thin or missing',
        fallback: 'no peers -> 1x TVL with wide range; zero TVL -> 1 USD floor',
        limitations: 'TVL overlaps; not FDV or exit liquidity; lineage and live fees absent',
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
  function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  const priceable = (p) => classifyTokenRecord(p) === 'token-recorded' && p.mcap_usd > 0 && p.tvl_usd > 0;
  const growthArg = (p) => Math.log1p((p.change_7d === null ? 0 : clamp(p.change_7d, -75, 100)) / 100);
  function splitPeers(snapshot, salt = 'a') {
    const all = snapshot.protocols.filter(priceable).sort((a, b) => compare(a.slug, b.slug));
    const fit = [], holdout = [];
    for (const p of all) (fnv(salt + ':' + p.slug) % 10 < 7 ? fit : holdout).push(p);
    return { salt, eligible: all.length, fit, holdout };
  }
  function fitFamilies(fit, asOf) {
    const groups = new Map();
    for (const p of fit) { if (!groups.has(p.category)) groups.set(p.category, []); groups.get(p.category).push(Math.log(p.mcap_usd / p.tvl_usd)); }
    const category = {};
    for (const [c, xs] of [...groups].sort((a, b) => compare(a[0] || '', b[0] || ''))) category[c || '\u0000'] = xs.length >= 5 ? quantile(xs, 0.5) : null;
    const global = quantile(fit.map((p) => Math.log(p.mcap_usd / p.tvl_usd)), 0.5);
    let best = { g: 0, a: 0, mdape: Infinity };
    for (let g = 0; g <= 1.0001; g += 0.1) for (let a = -0.15; a <= 0.1501; a += 0.05) {
      const errs = fit.map((p) => Math.abs(baseLog(p) + g * growthArg(p) + a * ageArg(p, asOf) - Math.log(p.mcap_usd / p.tvl_usd))).sort((x, y) => x - y);
      const mdape = errs[Math.floor(errs.length / 2)] ?? Infinity;
      if (mdape < best.mdape) best = { g: round2(g), a: round2(a), mdape };
    }
    return { global_log: global, category_log: category, growth_exp: best.g, age_exp: best.a, fit_n: fit.length };
    function baseLog(p) { const c = category[p.category || '\u0000']; return c == null ? global : c; }
  }
  const round2 = (n) => Math.round(n * 100) / 100;
  function ageArg(p, asOf) { const d = p.listed_at === null ? null : dayNumber(asOf) - dayNumber(p.listed_at); return d === null || d < 0 ? 0 : Math.log2((d + 30) / 395); }
  function multipleOf(family, p, params, asOf) {
    if (family === 'naive-tvl') return 1;
    const c = params.category_log[p.category || '\u0000'];
    const base = family === 'global' || c == null ? Math.exp(params.global_log) : Math.exp(c);
    if (family !== 'category-growth-age') return base;
    return base * Math.exp(params.growth_exp * growthArg(p)) * Math.exp(params.age_exp * ageArg(p, asOf));
  }
  function accuracy(pairs) {
    const errs = pairs.map((x) => Math.abs(x.pred - x.actual) / x.actual).sort((a, b) => a - b);
    const n = errs.length, mean = errs.reduce((s, x) => s + x, 0) / n;
    const rank = (xs) => { const order = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = new Array(xs.length); order.forEach(([, i], k) => { r[i] = k; }); return r; };
    const px = rank(pairs.map((x) => x.pred)), py = rank(pairs.map((x) => x.actual));
    const mx = (n - 1) / 2, num = px.reduce((s, v, i) => s + (v - mx) * (py[i] - mx), 0);
    const den = Math.sqrt(px.reduce((s, v) => s + (v - mx) ** 2, 0) * py.reduce((s, v) => s + (v - mx) ** 2, 0));
    return { n, mdape: round2(100 * (errs[Math.floor(n / 2)] ?? 0)), mape: round2(100 * mean),
      spearman: round2(den ? num / den : 0), within_2x: round2(pairs.filter((x) => x.pred / x.actual >= 0.5 && x.pred / x.actual <= 2).length / n) };
  }
  const FAMILIES = ['naive-tvl', 'global', 'category', 'category-growth-age'];
  function evaluateSplit(snapshot, salt) {
    const split = splitPeers(snapshot, salt), params = fitFamilies(split.fit, snapshot.as_of);
    const families = FAMILIES.map((id) => ({ id,
      holdout: accuracy(split.holdout.map((p) => ({ pred: p.tvl_usd * multipleOf(id, p, params, snapshot.as_of), actual: p.mcap_usd }))) }));
    const chosen = [...families].sort((x, y) => x.holdout.mdape - y.holdout.mdape || x.holdout.mape - y.holdout.mape || compare(x.id, y.id))[0].id;
    return { salt, fit_n: split.fit.length, holdout_n: split.holdout.length, families, chosen };
  }
  function validateModels(snapshot) {
    const first = evaluateSplit(snapshot, 'a'), second = evaluateSplit(snapshot, 'b');
    const chosen = first.families.find((f) => f.id === first.chosen);
    return { protocol: 'Traded peers only; hash split 70/30; fitted on fit, measured on holdout.',
      chosen: first.chosen, chosen_family: chosen, fit_n: first.fit_n, holdout_n: first.holdout_n,
      families: first.families.map((f) => ({ id: f.id, holdout: f.holdout })),
      stability: { second_split_chosen: second.chosen, stable: second.chosen === first.chosen,
        second_split_metrics: second.families.map((f) => ({ id: f.id, mdape: f.holdout.mdape })) },
      selection_rule: 'lowest holdout MdAPE' };
  }
  const GAS_PER_TX = 0.35, BRIDGE_COST = 2.5, REWARD_SHARE = 0.02;
  const familyRisk = { lending: 0.25, liquidity: 0.35, vault: 0.3, derivatives: 0.6, restricted: 0.6, 'general-research': 0.4 };
  const familyTx = { lending: 2, liquidity: 3, vault: 2, derivatives: 1, restricted: 1, 'general-research': 1 };
  function economics(s) {
    const capital = Math.max(0, s.capital_usd || 0), tx = Math.max(1, s.steps || 1) * Math.max(1, s.tx_per_step || 1);
    const gas = round2(tx * GAS_PER_TX), bridge = s.chains > 1 ? BRIDGE_COST : 0, costs = round2(gas + bridge);
    const share = capital > 0 && s.tvl_usd > 0 ? capital / (s.tvl_usd + capital) : 0;
    const gross = round2((s.implied_value_usd || 0) * share * REWARD_SHARE);
    const net = round2(gross - costs);
    const breakeven = gross > 0 ? Math.max(1, round2(costs / gross)) : null;
    let verdict = 'skip', reason = 'no-capital-at-risk';
    if (capital > 0) {
      if (gross <= 0) { verdict = 'skip'; reason = 'no-expected-reward'; }
      else if (net <= 0) { verdict = 'skip'; reason = 'net-below-cost'; }
      else if (net >= 2 * costs && (s.principal_risk ?? 1) <= 0.4) { verdict = 'farm'; reason = 'net-exceeds-2x-costs-and-bounded-risk'; }
      else { verdict = 'thin'; reason = net < 2 * costs ? 'net-under-2x-costs' : 'principal-risk-above-threshold'; }
    }
    return { capital_usd: capital, tx_count: tx, steps: s.steps, gas_per_tx_usd: GAS_PER_TX, gas_cost_usd: gas,
      bridge_cost_usd: bridge, costs_usd: costs, weeks: round2((s.horizon_days || 14) / 7), principal_risk: s.principal_risk ?? 1,
      reward_share: REWARD_SHARE, tvl_share: share, expected_gross_usd: gross, net_usd: net, breakeven_multiple: breakeven, verdict, reason };
  }
  root.LaunchModel = Object.freeze({ classifyTokenRecord, parseSnapshot, calibratePeers, valueProtocol,
    productRisks, farmPlan, buildRadar, validateBoard, dataScript, splitPeers, fitFamilies, validateModels, economics });
})(globalThis);
