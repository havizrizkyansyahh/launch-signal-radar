/* Shared, side-effect-free selection/formatting for the offline interface. */
(function (root) {
  'use strict';
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
  const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const VERDICTS = {
    farm: { label: 'FARM', mark: '\u25cf\u25cf', tone: 'farm', note: 'net clears twice the cost at bounded risk' },
    thin: { label: 'THIN', mark: '\u25cf', tone: 'thin', note: 'net positive but under the bar' },
    skip: { label: 'SKIP', mark: '\u25cb', tone: 'skip', note: 'no capital, no reward or net at or below zero' },
  };
  function money(value, exact = false) { return value == null ? 'Not recorded' : '$' + (exact ? whole : compact).format(value); }
  function net(value) { if (value == null) return '\u2014'; const abs = Math.abs(value); const body = abs < 1000 ? abs.toFixed(2) : compact.format(abs); return (value > 0 ? '+' : value < 0 ? '-' : '') + '$' + body; }
  function band(low, high) { return money(low) + '\u2013' + money(high); }
  function verdict(kind) { return VERDICTS[kind] || VERDICTS.skip; }
  const SORTERS = {
    rank: (r) => r.rank, name: (r) => r.name, tvl_usd: (r) => r.tvl_usd, change_7d: (r) => r.change_7d,
    implied_value_usd: (r) => r.implied_value_usd, net: (r) => r.economics.net_usd,
  };
  function selectRows(rows, state = {}) {
    const scope = state.scope || 'candidates', query = (state.query || '').trim().toLowerCase();
    const direction = state.direction === 'asc' ? 1 : -1;
    const read = SORTERS[state.sort] || SORTERS.implied_value_usd;
    return rows.filter((r) => (scope !== 'candidates' || r.candidate) && (scope !== 'watchlist' || r.watchlist) &&
      (!state.token || state.token === 'all' || r.token_status === state.token) &&
      (!state.verdict || state.verdict === 'all' || r.economics.verdict === state.verdict) &&
      (!state.chain || r.chains.includes(state.chain)) && (!state.category || r.category === state.category) &&
      (!query || [r.name, r.slug, r.category, r.symbol, ...r.chains].some((s) => (s || '').toLowerCase().includes(query))))
      .sort((a, b) => {
        const av = read(a), bv = read(b);
        if (av == null || bv == null) return av == null && bv == null ? cmp(a.slug, b.slug) : av == null ? 1 : -1;
        return direction * cmp(av, bv) || cmp(a.slug, b.slug);
      });
  }
  root.LaunchView = Object.freeze({ selectRows, money, net, band, verdict });
})(globalThis);