import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import '../dashboard/model.js';
import { sealedInput } from './kit.js';

const board = globalThis.LaunchModel.buildRadar(JSON.parse(readFileSync(sealedInput, 'utf8')));
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('README numbers match the shipped model data, not prose', () => {
  const v = board.economics_summary.verdicts;
  assert.ok(readme.includes(`**${v.farm} farm / ${v.thin} thin / ${v.skip} skip**`), 'verdict counts must match the board');
  assert.ok(readme.includes(`${board.validation.fit_n} fit and ${board.validation.holdout_n} holdout`), 'split sizes must match');
  for (const family of board.validation.families) {
    const row = Object.entries({ 'naive TVL': 'naive-tvl', 'global multiple': 'global', 'category + global fallback': 'category', 'category + growth + age': 'category-growth-age' })
      .find(([, id]) => id === family.id);
    assert.ok(row, family.id);
    assert.ok(readme.includes(family.holdout.mdape.toFixed(2) + '%'), 'missing MdAPE for ' + family.id);
    assert.ok(readme.includes(Math.round(family.holdout.within_2x * 100) + '%'), 'missing within-2x for ' + family.id);
  }
  assert.equal(board.validation.chosen, 'global');
  assert.ok(readme.includes('`global` to `category`') === (board.validation.stability.second_split_chosen === 'category'));
});