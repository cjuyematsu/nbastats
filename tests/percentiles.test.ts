// tests/percentiles.test.ts
//
// Pure percentile/rank math backing the player-page "All-Time" column.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percentileRank, rankInPool, ordinalRank, formatPercentile } from '../lib/percentiles';

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
