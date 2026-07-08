// tests/compareCareer.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPARE_TABLE_ROWS, rowLeaderFlags } from '@/lib/compareCareer';
import { CareerStatsData } from '@/types/stats';

const sample = {
  games_played: 1500,
  pts_total: 42184,
  pts_per_g: 27.03,
  trb_per_g: 7.46,
  ast_per_g: 7.35,
  fg_pct: 0.5062,
  fg3_pct: 0.3489,
  ts_pct: 0.5891,
} as CareerStatsData;

test('table rows keep the matchup-page labels and order', () => {
  assert.deepEqual(
    COMPARE_TABLE_ROWS.map((r) => r.label),
    [
      'Games Played',
      'Career Points',
      'Points Per Game',
      'Rebounds Per Game',
      'Assists Per Game',
      'Field Goal %',
      '3-Point %',
      'True Shooting %',
    ],
  );
});

test('formatting matches the server table: ints localized, decimals 1dp, pcts 1dp with sign', () => {
  const fmt = (key: string) => {
    const row = COMPARE_TABLE_ROWS.find((r) => r.key === key)!;
    const v = row.get(sample);
    return v != null ? row.format(v) : 'N/A';
  };
  assert.equal(fmt('pts_total'), (42184).toLocaleString());
  assert.equal(fmt('pts_per_g'), '27.0');
  assert.equal(fmt('fg_pct'), '50.6%');
  assert.equal(fmt('ts_pct'), '58.9%');
});

test('null stat formats to N/A via the null guard', () => {
  const row = COMPARE_TABLE_ROWS.find((r) => r.key === 'fg3_pct')!;
  const v = row.get({ ...sample, fg3_pct: null });
  assert.equal(v, null);
});

test('rowLeaderFlags marks the max', () => {
  assert.deepEqual(rowLeaderFlags([27.0, 30.1, 25.0]), [false, true, false]);
});

test('rowLeaderFlags marks all tied leaders', () => {
  assert.deepEqual(rowLeaderFlags([30.1, 30.1, 25.0]), [true, true, false]);
});

test('rowLeaderFlags never marks nulls', () => {
  assert.deepEqual(rowLeaderFlags([null, 20.0, 25.0]), [false, false, true]);
});

test('rowLeaderFlags has no leader with fewer than two comparable values', () => {
  assert.deepEqual(rowLeaderFlags([27.0]), [false]);
  assert.deepEqual(rowLeaderFlags([27.0, null]), [false, false]);
  assert.deepEqual(rowLeaderFlags([null, null]), [false, false]);
  assert.deepEqual(rowLeaderFlags([]), []);
});
