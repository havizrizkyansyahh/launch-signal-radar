/* Shared, side-effect-free selection/formatting for the offline interface. */
(function (root) {
  'use strict';
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
  const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  function money(value, exact = false) { return value == null ? 'Not recorded' : '$' + (exact ? whole : compact).format(value); }
  function selectRows(rows, state = {}) {
    const scope = state.scope || 'candidates', query = (state.query || '').trim().toLowerCase();
    const direction = state.direction === 'asc' ? 1 : -1;
    const sort = ['rank', 'name', 'tvl_usd', 'change_7d', 'implied_value_usd'].includes(state.sort) ? state.sort : 'implied_value_usd';
    return rows.filter((r) => (scope !== 'candidates' || r.candidate) && (scope !== 'watchlist' || r.watchlist) &&
      (!state.token || state.token === 'all' || r.token_status === state.token) &&
      (!state.chain || r.chains.includes(state.chain)) && (!state.category || r.category === state.category) &&
      (!query || [r.name, r.slug, r.category, r.symbol, ...r.chains].some((s) => (s || '').toLowerCase().includes(query))))
      .sort((a, b) => {
        const av = a[sort], bv = b[sort];
        if (av == null || bv == null) return av == null && bv == null ? cmp(a.slug, b.slug) : av == null ? 1 : -1;
        return direction * cmp(av, bv) || cmp(a.slug, b.slug);
      });
  }
  root.LaunchView = Object.freeze({ selectRows, money });
})(globalThis);
