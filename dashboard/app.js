/* LAUNCH SIGNAL DOM interface. Snapshot text is always rendered as text nodes. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const diagnostics = globalThis.LaunchDiagnostics = { errors: [] };
  addEventListener('error', (e) => diagnostics.errors.push(e.message));
  const node = (tag, text, className) => {
    const n = document.createElement(tag);
    if (text != null) n.textContent = String(text);
    if (className) n.className = className;
    return n;
  };
  const put = (id, text) => { $(id).textContent = text; };
  const fixed = (n, d = 3) => Number(n).toFixed(d);
  const pct = (n) => n == null ? 'Not recorded' : (n > 0 ? '+' : '') + fixed(n, 2) + '%';
  const defaultState = () => ({ sort: 'implied_value_usd', direction: 'desc' });
  let data, view, state = defaultState(), openers = new Map();
  function openDialog(id, opener) {
    openers.set(id, opener || document.activeElement);
    $(id).showModal();
    $(id).scrollTop = 0;
    $(id).querySelector('.close').focus();
  }
  function addFact(list, label, value) {
    const pair = node('div'); pair.append(node('dt', label), node('dd', value)); list.append(pair);
  }
  function section(parent, heading) {
    const s = node('section', null, 'detail-section'); s.append(node('h3', heading)); parent.append(s); return s;
  }
  function renderRows() {
    const selected = view.selectRows(data.rows, state);
    const fragment = document.createDocumentFragment();
    for (const r of selected) {
      const tr = node('tr'); tr.dataset.slug = r.slug;
      tr.append(node('td', String(r.rank).padStart(2, '0')));
      const identity = node('td'), button = node('button', r.name, 'protocol-button');
      button.type = 'button'; button.dataset.protocol = r.slug;
      button.setAttribute('aria-label', 'Inspect ' + r.name + ', global model rank ' + r.rank);
      button.addEventListener('click', () => showDetail(r, button));
      identity.append(button, node('div', (r.category || 'Unclassified') + ' · ' + r.chains.length + (r.chains.length === 1 ? ' chain' : ' chains'), 'protocol-sub'));
      const vcell = node('td', view.money(r.implied_value_usd), 'num number value');
      vcell.append(node('span', view.band(r.uncertainty.low_usd, r.uncertainty.high_usd), 'range'));
      const verdict = view.verdict(r.economics.verdict), ncell = node('td', view.net(r.economics.net_usd), 'num number net ' + verdict.tone);
      const vd = node('td'); vd.append(node('span', verdict.mark + ' ' + verdict.label, 'badge ' + verdict.tone));
      tr.append(identity, vcell, ncell, vd);
      const record = node('td');
      record.append(node('span', r.token_status === 'no-token-recorded' ? 'NO TOKEN' : 'TOKEN', 'record ' + (r.token_status === 'no-token-recorded' ? 'early' : 'recorded')));
      record.append(node('span', r.watchlist ? 'watchlist' : r.risk_flags.length ? 'risk · research' : 'lineage n/a', 'row-note' + (r.watchlist ? ' watch' : '')));
      tr.append(record); fragment.append(tr);
    }
    $('rows').replaceChildren(fragment);
    $('empty').hidden = selected.length !== 0;
    put('result-count', selected.length + ' of ' + data.rows.length + ' protocols · ' + selected.filter((r) => r.watchlist).length + ' official watchlist in results');
    const names = { rank: 'GLOBAL RANK', name: 'PROTOCOL', tvl_usd: 'TVL', change_7d: '7D TVL', implied_value_usd: 'MODEL VALUE' };
    names.net = 'NET USD';
    const key = state.sort || 'implied_value_usd', ascending = state.direction === 'asc';
    put('sort-note', names[key] + (ascending ? ' ASC' : ' DESC'));
    document.querySelectorAll('[data-sort]').forEach((button) => {
      button.parentElement.setAttribute('aria-sort', button.dataset.sort === key ? ascending ? 'ascending' : 'descending' : 'none');
    });
    document.body.dataset.rendered = 'ready';
  }
  function showDetail(r, opener) {
    const body = $('detail-body'); body.replaceChildren();
    const heading = node('div', null, 'detail-heading');
    heading.append(node('span', r.token_status === 'no-token-recorded' ? 'NO TOKEN RECORDED' : 'TOKEN RECORDED', 'tag'));
    if (r.watchlist) heading.append(node('span', 'OFFICIAL WATCHLIST', 'tag warn'));
    const title = node('h2', r.name); title.id = 'detail-title'; heading.append(title);
    heading.append(node('p', (r.category || 'Unclassified') + ' · Global model rank #' + r.rank + ' · ' + r.lineage_status.replaceAll('-', ' '), 'detail-meta'));
    heading.append(node('p', r.chains.join(' / ') || 'No chains recorded', 'detail-meta'));
    body.append(heading);
    const scenario = section(body, 'HYPOTHETICAL TOKEN MARKET CAP / USD');
    const grid = node('div', null, 'scenario');
    for (const [label, value, cls] of [['LOW SCENARIO', r.uncertainty.low_usd, 'low'], ['BASE MODEL', r.implied_value_usd, 'base'], ['HIGH SCENARIO', r.uncertainty.high_usd, 'high']]) {
      const box = node('div', null, cls); box.append(node('span', label), node('strong', view.money(value))); grid.append(box);
    }
    scenario.append(grid, node('div', null, 'scenario-range'), node('p', 'Heuristic scenarios, not confidence intervals, price or issuance predictions.', 'detail-caption'));
    const observed = section(body, '01 / RECORDED SNAPSHOT FACTS · ' + data.as_of), facts = node('dl', null, 'facts');
    addFact(facts, 'Total value locked', view.money(r.tvl_usd, true));
    addFact(facts, 'Reported seven-day TVL change', pct(r.change_7d));
    addFact(facts, 'First tracking date (not launch date)', r.listed_at || 'Not recorded');
    addFact(facts, 'Snapshot-relative tracking age', r.factors.age_days == null ? 'Unknown / unusable date' : r.factors.age_days + ' days');
    addFact(facts, 'Recorded token market cap', view.money(r.mcap_usd, true) + (r.mcap_usd != null && r.mcap_usd <= 0 ? ' · excluded from peers' : ''));
    addFact(facts, 'Recorded symbol / CoinGecko ID', (r.symbol || 'Not recorded') + ' / ' + (r.gecko_id || 'Not recorded'));
    observed.append(facts);
    const factors = section(body, '02 / MODEL ASSUMPTIONS · MULTIPLICATIVE DECOMPOSITION'), factorGrid = node('div', null, 'factor-grid');
    for (const [label, value] of [['TVL INPUT', view.money(r.tvl_usd)], ['PEER MULTIPLE', r.factors.peer_multiple.toFixed(3) + '×'], ['GROWTH FACTOR', r.factors.growth_factor.toFixed(3) + '×'], ['TRACKING FACTOR', r.factors.age_factor.toFixed(3) + '×']]) {
      const box = node('div'); box.append(node('span', label), node('strong', value)); factorGrid.append(box);
    }
    factors.append(factorGrid, node('p', view.money(r.tvl_usd, true) + ' × ' + r.factors.peer_multiple.toFixed(6) + ' × ' + r.factors.growth_factor.toFixed(6) + ' × ' + r.factors.age_factor.toFixed(6) + ' = ' + view.money(r.implied_value_usd, true) + ' (integer-dollar rounding)', 'equation'));
    factors.append(node('p', r.factors.category_peers + ' category peers / ' + r.factors.global_peers + ' global peers. Category weight ' + (r.factors.category_weight * 100).toFixed(1) + '%, remainder global. Calibration: ' + r.factors.calibration_level.replaceAll('-', ' ') + '. ' + (r.factors.self_excluded ? 'Target asset excluded from its own peers.' : 'No observed target-token market cap used.'), 'detail-caption'));
    factors.append(node('p', 'Growth used: ' + pct(r.factors.growth_used_pct) + '; raw growth preserved above. Global winsorization: ' + r.factors.clip_low.toFixed(4) + '×–' + r.factors.clip_high.toFixed(4) + '×. Uncertainty flags: ' + (r.uncertainty.reasons.join(', ') || 'minimum peer-dispersion scenario width') + '.', 'detail-caption'));
    if (r.risk_flags.length) factors.append(node('p', 'Product-risk flags: ' + r.risk_flags.join(', ') + '. Not evidence of an independent pre-token launch.', 'detail-caption amber'));
    const peers = data.calibration.peers.filter((p) => p.category === r.category && p.slug !== r.slug && (!r.gecko_id || p.gecko_id !== r.gecko_id)).slice(0, 4);
    factors.append(node('p', peers.length ? 'Raw mcap/TVL examples before clipping: ' + peers.map((p) => p.name + ' ' + p.raw_ratio.toFixed(3) + '×').join('; ') + '.' : 'No category comparison examples after target exclusion; global fallback is explicit.', 'detail-caption'));
    const econ = section(body, '03 / NET FARM ECONOMICS · USD'), e = r.economics, efacts = node('dl', null, 'facts');
    addFact(efacts, 'Steps x tx', e.steps + ' x ' + (e.tx_count / e.steps) + ' = ' + e.tx_count);
    addFact(efacts, 'Gas', '$' + e.gas_per_tx_usd + '/tx = $' + e.gas_cost_usd.toFixed(2));
    addFact(efacts, 'Bridge', '$' + e.bridge_cost_usd.toFixed(2));
    addFact(efacts, 'Total cost', '$' + e.costs_usd.toFixed(2));
    addFact(efacts, 'Capital', '$' + e.capital_usd);
    addFact(efacts, 'TVL share', (e.tvl_share * 100).toFixed(5) + '%');
    addFact(efacts, 'Gross (' + (e.reward_share * 100) + '% share)', '$' + e.expected_gross_usd.toFixed(2));
    addFact(efacts, 'Net', view.net(e.net_usd));
    addFact(efacts, 'Breakeven', e.breakeven_multiple == null ? 'Not applicable' : e.breakeven_multiple + '\u00d7');
    addFact(efacts, 'Weeks / risk', e.weeks + ' weeks / ' + (e.principal_risk * 100) + '% assumed');
    econ.append(efacts, node('p', 'Verdict: ' + view.verdict(e.verdict).label + ' \u2014 ' + e.reason.replaceAll('-', ' ') + '. Costs and reward share are assumptions, not quotes or forecasts.', 'detail-caption'));
    const plan = section(body, '04 / CONDITIONAL FARM RESEARCH PLAN'), budget = node('div', null, 'budget');
    plan.append(node('p', r.plan.mode.replaceAll('-', ' ').toUpperCase() + ' · ' + r.plan.family + '. Illustrative assumptions, not live fees or required spending. No campaign, token issuance, airdrop or yield is asserted.', 'detail-caption amber'));
    for (const [label, value] of [['CAPITAL AT RISK CAP', '$' + r.plan.budget.capital_usd], ['GAS / FEE CAP', '$' + r.plan.budget.fees_usd], ['ACTIVE TIME', r.plan.budget.active_minutes + ' min'], ['RESEARCH HORIZON', r.plan.budget.horizon_days + ' days']]) {
      const box = node('span', label); box.append(node('strong', value)); budget.append(box);
    }
    plan.append(budget);
    const steps = node('ol', null, 'farm-list'); r.farm_steps.forEach((step) => steps.append(node('li', step))); plan.append(steps);
    openDialog('detail', opener);
  }
  function renderMethod() {
    const body = $('method-body'), facts = node('dl', null, 'facts');
    addFact(facts, 'Snapshot / fetched UTC', data.as_of + ' / ' + (data.source.match(/fetched (.+)$/)?.[1] || 'See sealed source'));
    addFact(facts, 'Whole universe / covered watchlist', data.rows.length + ' / ' + data.coverage.watchlist_covered + ' of ' + data.coverage.watchlist_total);
    addFact(facts, 'Missing growth / missing tracking date', data.coverage.missing_growth + ' / ' + data.coverage.missing_tracking_date);
    addFact(facts, 'Invalid nonpositive peer market caps excluded', data.calibration.invalid_mcap_count);
    body.append(facts);
    for (const [key, text] of Object.entries(data.methodology)) {
      const item = node('section'); item.append(node('h3', key.toUpperCase()), node('p', text)); body.append(item);
    }
    const source = node('section'); source.append(node('h3', 'SEALED PROVENANCE'), node('p', data.source)); body.append(source);
    const coverage = node('section'); coverage.append(node('h3', 'COVERAGE IS NOT ELIGIBILITY'), node('p', data.coverage.default_candidates + ' default research candidates; ' + data.coverage.no_token_recorded + ' records without token identifiers; ' + data.coverage.token_recorded + ' with a token identifier. All ' + data.rows.length + ' rows remain available. Watchlist is the supplied list, not reconstructed parent relationships. Product-risk filters are visible heuristics, not proof of tokenlessness. Global model ranks do not change with filtering.')); body.append(coverage);
    const summary = node('section'); summary.append(node('h3', 'CATEGORY SAMPLE SIZES / GLOBAL SHRINKAGE'), node('p', data.calibration.categories.map((p) => (p.category || 'Unclassified') + ': ' + p.peer_count + ' peers, ' + (p.category_weight * 100).toFixed(0) + '% category weight').join(' · '))); body.append(summary);
  }
  function reset() {
    HTMLFormElement.prototype.reset.call($('filters'));
    state = defaultState(); renderRows();
  }
  try {
    data = globalThis.LAUNCH_DATA; view = globalThis.LaunchView;
    if (!data?.rows?.length || !view) throw new Error('Sealed data is unavailable. Run main.ts and open output/dashboard/index.html, keeping ../data.js beside dashboard/.');
    put('snapshot-date', data.as_of);
    put('metric-universe', data.rows.length); put('metric-early', data.coverage.no_token_recorded);
    put('metric-recorded', data.coverage.token_recorded); put('metric-watchlist', data.coverage.watchlist_covered + ' / ' + data.coverage.watchlist_total);
    const val = data.validation, winner = val.families.find((f) => f.id === val.chosen);
    put('metric-oos', winner.holdout.mdape.toFixed(1) + '%');
    put('metric-oos-note', val.chosen + ' · ' + Math.round(winner.holdout.within_2x * 100) + '% within 2x');
    const valBody = $('val-rows');
    for (const f of val.families) {
      const tr = node('tr'); if (f.id === val.chosen) tr.className = 'chosen';
      tr.append(node('td', f.id.replace('category-growth-age', 'cat+growth+age').replace('category', 'category')),
        node('td', f.holdout.mdape.toFixed(0) + '%', 'num'), node('td', f.holdout.spearman.toFixed(2), 'num'),
        node('td', Math.round(f.holdout.within_2x * 100) + '%', 'num'));
      valBody.append(tr);
    }
    put('val-winner', 'Winner: ' + val.chosen + ' (holdout n=' + val.holdout_n + ').');
    put('val-stability', val.stability.stable ? 'Stable across a second split.' : 'Unstable: the second split picks ' + val.stability.second_split_chosen + '.');
    put('provenance', data.source);
    for (const [id, values] of [['category', data.rows.map((r) => r.category).filter(Boolean)], ['chain', data.rows.flatMap((r) => r.chains)]]) {
      [...new Set(values)].sort().forEach((value) => { const option = node('option', value); option.value = value; $(id).append(option); });
    }
    $('filters').addEventListener('submit', (e) => e.preventDefault());
    $('search').addEventListener('input', () => { state.query = $('search').value; renderRows(); });
    for (const id of ['scope', 'token', 'category', 'chain', 'verdict']) $(id).addEventListener('change', () => { state[id] = $(id).value; renderRows(); });
    $('reset').addEventListener('click', reset); $('empty-reset').addEventListener('click', reset);
    document.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
      const key = b.dataset.sort;
      state.direction = state.sort === key ? state.direction === 'asc' ? 'desc' : 'asc' : ['rank', 'name'].includes(key) ? 'asc' : 'desc';
      state.sort = key; renderRows();
    }));
    for (const id of ['method-open', 'peer-method-open', 'coverage-open']) $(id).addEventListener('click', () => openDialog('methodology', $(id)));
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => $(b.dataset.close).close()));
    for (const id of ['detail', 'methodology']) $(id).addEventListener('close', () => openers.get(id)?.focus());
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !document.querySelector('dialog[open]') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('search').focus(); }
    });
    renderMethod(); renderRows();
  } catch (error) {
    diagnostics.errors.push(error.message); $('error').hidden = false; put('error', error.message);
    put('result-count', 'Unable to load the sealed dataset. No results have been invented.');
  }
})();
