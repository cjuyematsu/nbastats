// tests/percentiles.test.ts
//
// Pure percentile/rank math backing the player-page "All-Time" column.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  percentileRank,
  rankInPool,
  ordinalRank,
  formatPercentile,
  isCareerStatReliable,
  isSeasonStatReliable,
  statReliableFrom,
} from '../lib/percentiles';

test('percentileRank: empty pool is 0', () => {
  assert.equal(percentileRank([], 10), 0);
});

test('percentileRank: below every value is 0, above every value is 100', () => {
  const pool = [1, 2, 3, 4, 5];
  assert.equal(percentileRank(pool, 0), 0);
  assert.equal(percentileRank(pool, 6), 100);
});

test('percentileRank: median of an odd pool is 50 (midrank on the tie)', () => {
  assert.equal(percentileRank([1, 2, 3, 4, 5], 3), 50);
});

test('percentileRank: ties use midrank', () => {
  // v=2 has 1 below and 2 ties among 4 -> (1 + 1) / 4 = 50
  assert.equal(percentileRank([1, 2, 2, 3], 2), 50);
});

test('percentileRank: value between pool entries interpolates by count', () => {
  // 2 of 4 strictly below, no ties -> 50
  assert.equal(percentileRank([1, 2, 3, 4], 2.5), 50);
});

test('rankInPool: the pool max is 1st, even though its percentile is not 100', () => {
  const pool = [1, 2, 3, 4, 5];
  assert.equal(rankInPool(pool, 5), 1);
  assert.ok(percentileRank(pool, 5) < 100);
});

test('rankInPool: competition ranking with ties sharing the better rank', () => {
  const pool = [1, 2, 4, 4, 5];
  assert.equal(rankInPool(pool, 5), 1);
  assert.equal(rankInPool(pool, 4), 2); // both 4s rank 2nd
  assert.equal(rankInPool(pool, 2), 4);
  assert.equal(rankInPool(pool, 1), 5);
});

test('rankInPool: value above everything is 1st, below everything is last+1', () => {
  const pool = [1, 2, 3];
  assert.equal(rankInPool(pool, 10), 1);
  assert.equal(rankInPool(pool, 0), 4);
});

test('ordinalRank: standard suffixes', () => {
  assert.equal(ordinalRank(1), '1st');
  assert.equal(ordinalRank(2), '2nd');
  assert.equal(ordinalRank(3), '3rd');
  assert.equal(ordinalRank(4), '4th');
  assert.equal(ordinalRank(11), '11th');
  assert.equal(ordinalRank(12), '12th');
  assert.equal(ordinalRank(13), '13th');
  assert.equal(ordinalRank(21), '21st');
  assert.equal(ordinalRank(93), '93rd');
});

test('formatPercentile: two decimals, always th', () => {
  assert.equal(formatPercentile(99.874), '99.87th');
  assert.equal(formatPercentile(88.4), '88.40th');
  assert.equal(formatPercentile(50), '50.00th');
  assert.equal(formatPercentile(2.345), '2.35th');
});

test('formatPercentile: clamps to [0.01, 99.99] so nothing reads 0th or 100th', () => {
  assert.equal(formatPercentile(0), '0.01th');
  assert.equal(formatPercentile(0.001), '0.01th');
  assert.equal(formatPercentile(100), '99.99th');
  assert.equal(formatPercentile(99.997), '99.99th');
});

test('statReliableFrom: era-gated stats have a cutoff, complete stats have none', () => {
  assert.equal(statReliableFrom('spg'), 1974);
  assert.equal(statReliableFrom('bpg'), 1974);
  assert.equal(statReliableFrom('tovpg'), 1978);
  // FG-attempt rates only reliable once attempt logs are complete (~1980).
  assert.equal(statReliableFrom('fg_pct'), 1980);
  assert.equal(statReliableFrom('efg_pct'), 1980);
  assert.equal(statReliableFrom('ts_pct'), 1980);
  // Free throws are complete in every era, so no gate.
  assert.equal(statReliableFrom('ft_pct'), null);
  assert.equal(statReliableFrom('ftm_total'), null);
  // 3-point percentages stabilize from the 1982-83 season.
  assert.equal(statReliableFrom('fg3_pct'), 1983);
  assert.equal(statReliableFrom('ppg'), null);
  assert.equal(statReliableFrom('rpg'), null);
  assert.equal(statReliableFrom('apg'), null);
  assert.equal(statReliableFrom('games'), null);
});

test('isCareerStatReliable: a pre-tracking-era player (started 1959) dashes the untracked stats', () => {
  const wilt = 1959;
  assert.equal(isCareerStatReliable(wilt, 'spg'), false);
  assert.equal(isCareerStatReliable(wilt, 'bpg'), false);
  assert.equal(isCareerStatReliable(wilt, 'tovpg'), false);
  assert.equal(isCareerStatReliable(wilt, 'fg_pct'), false);
  assert.equal(isCareerStatReliable(wilt, 'ts_pct'), false);
  assert.equal(isCareerStatReliable(wilt, 'efg_pct'), false);
  assert.equal(isCareerStatReliable(wilt, 'fg3_pct'), false);
  // Points, rebounds, assists, games are complete in every era.
  assert.equal(isCareerStatReliable(wilt, 'ppg'), true);
  assert.equal(isCareerStatReliable(wilt, 'rpg'), true);
  assert.equal(isCareerStatReliable(wilt, 'apg'), true);
  assert.equal(isCareerStatReliable(wilt, 'games'), true);
});

test('isCareerStatReliable: early-70s player has complete counting/FT stats but not FG rates', () => {
  const y1972 = 1972; // e.g. late-career Wilt seasons
  // Steals/blocks/turnovers exist by their own gates, FG rates do not (attempts short).
  assert.equal(isCareerStatReliable(y1972, 'fg_pct'), false);
  assert.equal(isCareerStatReliable(y1972, 'ts_pct'), false);
  assert.equal(isCareerStatReliable(y1972, 'fg3_pct'), false);
  // Free throws are complete in every era.
  assert.equal(isCareerStatReliable(y1972, 'ft_pct'), true);
  assert.equal(isCareerStatReliable(1955, 'ft_pct'), true);
  assert.equal(isCareerStatReliable(y1972, 'ppg'), true);
});

test('isCareerStatReliable: a modern player (started 1985) shows every stat', () => {
  const modern = 1985;
  for (const key of ['spg', 'bpg', 'tovpg', 'fg_pct', 'ts_pct', 'efg_pct', 'fg3_pct', 'ft_pct', 'ppg'] as const) {
    assert.equal(isCareerStatReliable(modern, key), true, key);
  }
});

test('isCareerStatReliable: gate is exactly the first reliable season, null start dashes gated stats', () => {
  assert.equal(isCareerStatReliable(1974, 'spg'), true); // first steals/blocks season
  assert.equal(isCareerStatReliable(1973, 'spg'), false);
  assert.equal(isCareerStatReliable(1980, 'fg_pct'), true); // FG attempts complete
  assert.equal(isCareerStatReliable(1979, 'fg_pct'), false);
  assert.equal(isCareerStatReliable(null, 'spg'), false);
  assert.equal(isCareerStatReliable(null, 'ppg'), true); // complete stats survive a null start
});

test('isSeasonStatReliable: gates a single season by its own year', () => {
  assert.equal(isSeasonStatReliable(1979, 'fg_pct'), false);
  assert.equal(isSeasonStatReliable(1980, 'fg_pct'), true);
  assert.equal(isSeasonStatReliable(1982, 'fg3_pct'), false);
  assert.equal(isSeasonStatReliable(1983, 'fg3_pct'), true);
});
