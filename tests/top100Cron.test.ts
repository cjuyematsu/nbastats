// tests/top100Cron.test.ts
//
// Decision matrix for planRearrangement: exactly when does a cron fire act,
// and with what freshen window/stamp. The late-fire rows are the regression
// tests for the 2026-07-03 miss (a fire 61+ minutes after the boundary was
// refused by the old gate and the cycle was silently lost).

import test from 'node:test';
import assert from 'node:assert/strict';
import { planRearrangement } from '@/lib/top100Cron';

const HOUR = 3_600_000;
const B = '2026-07-06T07:00:00.000Z'; // a PDT boundary
const PREV = '2026-07-03T07:00:00.000Z';
const APPLIED_PREV = '2026-07-03T08:04:12.000Z'; // previous boundary applied slightly late

function fireAt(iso: string, rankedAt: string | null = APPLIED_PREV, force = false) {
  return planRearrangement({ force, rankedAt, now: new Date(iso) });
}

function expectRun(iso: string, rankedAt: string | null = APPLIED_PREV) {
  const plan = fireAt(iso, rankedAt);
  assert.equal(plan.action, 'run', `fire at ${iso} must run`);
  assert.ok(plan.action === 'run');
  return plan;
}

test('on-time fire (60 min after a PDT boundary) runs with the boundary stamp', () => {
  const plan = expectRun('2026-07-06T08:00:00Z');
  assert.equal(plan.mode, 'boundary');
  assert.equal(plan.boundaryIso, B);
  assert.equal(plan.stampIso, '2026-07-06T06:59:59.000Z'); // boundary minus 1s
  assert.equal(plan.freshenStartIso, PREV);
  assert.equal(plan.freshenEndIso, B);
});

test('late fires still run: 61 min, 2 h, 12 h, 23 h after the boundary', () => {
  for (const iso of [
    '2026-07-06T08:01:00Z', // the exact July 3 failure profile
    '2026-07-06T09:00:00Z',
    '2026-07-06T19:00:00Z',
    '2026-07-07T06:00:00Z',
  ]) {
    const plan = expectRun(iso);
    assert.equal(plan.boundaryIso, B);
    assert.equal(plan.stampIso, '2026-07-06T06:59:59.000Z');
  }
});

test('next-day catch-up runs for the missed boundary and keeps votes in the RPC window', () => {
  const now = Date.parse('2026-07-07T08:29:00Z');
  const plan = expectRun('2026-07-07T08:29:00Z');
  assert.equal(plan.boundaryIso, B);
  assert.equal(plan.stampIso, '2026-07-06T06:59:59.000Z'); // 25.5h old < RPC's 48h
  assert.ok(now - Date.parse(plan.stampIso) < 48 * HOUR);
});

test('two-days-late catch-up floors the stamp at now minus 47h', () => {
  const now = Date.parse('2026-07-08T08:15:00Z'); // 49.25h after the boundary
  const plan = expectRun('2026-07-08T08:15:00Z');
  assert.equal(plan.boundaryIso, B);
  assert.equal(Date.parse(plan.stampIso), now - 47 * HOUR);
});

test('stamp is always inside the RPC 48h window and never in the future', () => {
  for (let lateMin = 0; lateMin <= 60 * 60; lateMin += 37) {
    const now = Date.parse(B) + lateMin * 60_000;
    const plan = fireAt(new Date(now).toISOString());
    if (plan.action !== 'run') continue;
    const stamp = Date.parse(plan.stampIso);
    assert.ok(stamp >= now - 47 * HOUR, `stamp inside RPC window at +${lateMin}min`);
    assert.ok(stamp <= now, `stamp not in the future at +${lateMin}min`);
  }
});

test('skips when the boundary is already applied', () => {
  for (const iso of ['2026-07-06T08:31:00Z', '2026-07-07T08:00:00Z', '2026-07-08T08:00:00Z']) {
    const plan = fireAt(iso, '2026-07-06T08:30:00.000Z');
    assert.equal(plan.action, 'skip');
    assert.ok(plan.action === 'skip');
    assert.equal(plan.reason, 'boundary already applied');
    assert.equal(plan.boundaryIso, B);
  }
});

test('mid-cycle fires skip; the day after an applied boundary is not a rerun', () => {
  const plan = fireAt('2026-07-04T08:00:00Z'); // day after PREV was applied
  assert.equal(plan.action, 'skip');
});

test('a fire just before the boundary skips instead of running early', () => {
  const plan = fireAt('2026-07-06T06:59:30Z');
  assert.equal(plan.action, 'skip'); // last boundary is PREV, already applied
});

test('null ranked_at is treated as owed', () => {
  const plan = expectRun('2026-07-06T08:00:00Z', null);
  assert.equal(plan.boundaryIso, B);
});

test('an exactly-on-time winter fire (08:00 UTC = PST midnight) runs the same instant', () => {
  const plan = planRearrangement({
    force: false,
    rankedAt: '2026-12-27T08:05:00.000Z',
    now: new Date('2026-12-30T08:00:00Z'),
  });
  assert.equal(plan.action, 'run');
  assert.ok(plan.action === 'run');
  assert.equal(plan.boundaryIso, '2026-12-30T08:00:00.000Z');
  assert.equal(plan.stampIso, '2026-12-30T07:59:59.000Z');
});

test('force runs mid-cycle, stamps now, and freshens from the boundary onward', () => {
  const nowIso = '2026-07-07T15:00:00.000Z';
  const plan = planRearrangement({ force: true, rankedAt: '2026-07-06T08:01:00.000Z', now: new Date(nowIso) });
  assert.equal(plan.action, 'run');
  assert.ok(plan.action === 'run');
  assert.equal(plan.mode, 'forced');
  assert.equal(plan.stampIso, nowIso);
  assert.equal(plan.freshenStartIso, B);
  assert.equal(plan.freshenEndIso, null);
});

test('run then skip: applying the boundary makes every later fire in the cycle a no-op', () => {
  const first = expectRun('2026-07-06T08:44:00Z');
  assert.equal(first.boundaryIso, B);
  const rankedAt = '2026-07-06T08:44:00.000Z';
  for (const iso of ['2026-07-06T08:49:00Z', '2026-07-07T08:02:00Z', '2026-07-08T09:10:00Z']) {
    assert.equal(fireAt(iso, rankedAt).action, 'skip', `no rerun at ${iso}`);
  }
  // ...until the next boundary (2026-07-09) is owed again.
  const next = fireAt('2026-07-09T08:03:00Z', rankedAt);
  assert.equal(next.action, 'run');
  assert.ok(next.action === 'run');
  assert.equal(next.boundaryIso, '2026-07-09T07:00:00.000Z');
});
