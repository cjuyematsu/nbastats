// tests/careerArcDaily.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleReveals,
  buildCareerArcSeries,
  teamsInOrder,
  type CareerArcSeasonRow,
} from '@/lib/careerArcCore';

function row(
  year: number,
  team: string,
  g: number | null,
  ptsTotal: number | null,
  ptsPerG: number | null = null
): CareerArcSeasonRow {
  return { SeasonYear: year, playerteamName: team, G: g, PTS_total: ptsTotal, PTS_per_g: ptsPerG };
}

test('buildCareerArcSeries merges traded seasons into one point', () => {
  const points = buildCareerArcSeries([
    row(2000, 'Lakers', 50, 1000),
    row(2001, 'Lakers', 40, 800),
    row(2001, 'Suns', 40, 400),
  ]);
  assert.deepEqual(points, [
    { year: 2000, ppg: 20 },
    { year: 2001, ppg: 15 },
  ]);
});

test('buildCareerArcSeries falls back to per-game of the biggest-G row when totals are null', () => {
  const points = buildCareerArcSeries([
    row(1960, 'Royals', 20, null, 12.5),
    row(1960, 'Hawks', 60, null, 18.5),
  ]);
  assert.deepEqual(points, [{ year: 1960, ppg: 18.5 }]);
});

test('buildCareerArcSeries drops unusable rows and sorts by year', () => {
  const points = buildCareerArcSeries([
    row(2005, 'Spurs', 82, 1640),
    { SeasonYear: null, playerteamName: 'Spurs', G: 10, PTS_total: 100, PTS_per_g: 10 },
    row(2003, 'Spurs', null, null, null),
    row(2004, 'Spurs', 70, 700),
  ]);
  assert.deepEqual(points, [
    { year: 2004, ppg: 10 },
    { year: 2005, ppg: 20 },
  ]);
});

test('teamsInOrder is first-appearance order without duplicates', () => {
  const teams = teamsInOrder([
    row(2002, 'Heat', 82, 100),
    row(2000, 'Lakers', 82, 100),
    row(2001, 'Lakers', 82, 100),
    row(2003, 'Lakers', 82, 100),
  ]);
  assert.deepEqual(teams, ['Lakers', 'Heat']);
});

test('assembleReveals covers the drafted branch in order', () => {
  const reveals = assembleReveals({
    draftRow: { Year: 1996, Round: 1, Pick: 13, school: 'Lower Merion HS' },
    teams: ['Lakers'],
    teammateName: 'Derek Fisher',
    seasonCount: 20,
  });
  assert.deepEqual(reveals.map((r) => r.label), ['Draft', 'Teams', 'Teammate', 'Pre-NBA team']);
  assert.equal(reveals[0].value, 'Drafted 1996, Round 1 Pick 13');
  assert.equal(reveals[3].value, 'Lower Merion HS');
});

test('assembleReveals covers the undrafted and missing-data branches', () => {
  const reveals = assembleReveals({
    draftRow: null,
    teams: [],
    teammateName: null,
    seasonCount: 10,
  });
  assert.equal(reveals[0].value, 'Went undrafted');
  assert.equal(reveals[1].value, '10 NBA seasons');
  assert.equal(reveals[2].value, 'Teammate data unavailable');
  assert.equal(reveals[3].value, 'Unknown');
});
