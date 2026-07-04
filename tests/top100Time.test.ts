// tests/top100Time.test.ts
//
// Boundary math invariants for the Top 100 cycle clock. Every boundary must
// be an LA midnight on a cycle day (every 3rd day from the 2026-07-03 epoch),
// including across both DST transitions and the year rollover.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLastRearrangementIso,
  getNextRearrangementIso,
  getPreviousRearrangementIso,
  isRearrangementDay,
} from '@/lib/top100Time';
import { getLaDateString, laMidnightIso } from '@/lib/dailyTime';
import { dayNumber } from '@/lib/dailySeed';

const HOUR = 3_600_000;
const EPOCH_DAY = dayNumber('2026-07-03');
const mod3 = (n: number) => ((n % 3) + 3) % 3;

function assertBoundaryInvariants(at: Date) {
  const lastIso = getLastRearrangementIso(at);
  const nextIso = getNextRearrangementIso(at);
  const prevIso = getPreviousRearrangementIso(at);
  const ctx = `at ${at.toISOString()}`;

  assert.ok(Date.parse(lastIso) <= at.getTime(), `last ${lastIso} <= now ${ctx}`);
  assert.ok(Date.parse(nextIso) > at.getTime(), `next ${nextIso} > now ${ctx}`);
  assert.ok(Date.parse(prevIso) < Date.parse(lastIso), `prev < last ${ctx}`);

  for (const iso of [prevIso, lastIso, nextIso]) {
    const laDate = getLaDateString(new Date(Date.parse(iso)));
    assert.equal(iso, laMidnightIso(laDate), `${iso} is an LA midnight ${ctx}`);
    assert.equal(mod3(dayNumber(laDate) - EPOCH_DAY), 0, `${iso} on a cycle day ${ctx}`);
    assert.ok(isRearrangementDay(new Date(Date.parse(iso))), `${iso} isRearrangementDay ${ctx}`);
  }

  const dayOf = (iso: string) => dayNumber(getLaDateString(new Date(Date.parse(iso))));
  assert.equal(dayOf(nextIso) - dayOf(lastIso), 3, `next is 3 LA days after last ${ctx}`);
  assert.equal(dayOf(lastIso) - dayOf(prevIso), 3, `last is 3 LA days after prev ${ctx}`);
}

test('invariants hold every hour for two years (spans 4 DST transitions and 2 year rollovers)', () => {
  const start = Date.parse('2026-01-01T00:30:00Z');
  const end = Date.parse('2028-01-01T00:30:00Z');
  for (let t = start; t < end; t += HOUR) {
    assertBoundaryInvariants(new Date(t));
  }
});

test('invariants hold minute-by-minute around boundary and DST-transition instants', () => {
  const instants = [
    '2026-07-03T07:00:00Z', // epoch boundary (PDT)
    '2026-11-01T09:00:00Z', // fall-back morning 2026
    '2026-11-03T08:00:00Z', // first PST boundary after fall-back
    '2026-12-30T08:00:00Z', // winter boundary
    '2027-03-12T08:00:00Z', // last PST boundary before spring-forward
    '2027-03-14T10:00:00Z', // spring-forward morning 2027
    '2027-03-15T07:00:00Z', // first PDT boundary after spring-forward
  ];
  for (const iso of instants) {
    const center = Date.parse(iso);
    for (let t = center - 90 * 60_000; t <= center + 90 * 60_000; t += 60_000) {
      assertBoundaryInvariants(new Date(t));
    }
  }
});

test('boundary instants pin to LA midnight in UTC across DST', () => {
  assert.equal(laMidnightIso('2026-07-03'), '2026-07-03T07:00:00.000Z'); // PDT
  assert.equal(laMidnightIso('2026-10-31'), '2026-10-31T07:00:00.000Z'); // last PDT cycle day
  assert.equal(laMidnightIso('2026-11-03'), '2026-11-03T08:00:00.000Z'); // PST
  assert.equal(laMidnightIso('2026-12-30'), '2026-12-30T08:00:00.000Z'); // PST
  assert.equal(laMidnightIso('2027-03-12'), '2027-03-12T08:00:00.000Z'); // last PST cycle day
  assert.equal(laMidnightIso('2027-03-15'), '2027-03-15T07:00:00.000Z'); // PDT

  // Fall-back cycle is 73 real hours, spring-forward cycle is 71; the chain
  // must still land exactly on the next cycle day's LA midnight.
  assert.equal(getNextRearrangementIso(new Date('2026-10-31T07:00:01Z')), '2026-11-03T08:00:00.000Z');
  assert.equal(getNextRearrangementIso(new Date('2027-03-12T08:00:01Z')), '2027-03-15T07:00:00.000Z');
});

test('an exactly-on-time 08:00 UTC fire sees the same-day boundary in both PST and PDT', () => {
  // PST: boundary IS 08:00 UTC; the fire instant itself must count as past it.
  assert.equal(
    getLastRearrangementIso(new Date('2026-12-30T08:00:00Z')),
    '2026-12-30T08:00:00.000Z'
  );
  // PDT: boundary is 07:00 UTC, an hour before the earliest possible fire.
  assert.equal(
    getLastRearrangementIso(new Date('2026-07-03T08:00:00Z')),
    '2026-07-03T07:00:00.000Z'
  );
  // One second before a boundary still belongs to the previous cycle.
  assert.equal(
    getLastRearrangementIso(new Date('2026-07-03T06:59:59Z')),
    '2026-06-30T07:00:00.000Z'
  );
});
