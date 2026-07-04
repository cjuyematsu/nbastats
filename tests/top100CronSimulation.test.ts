// tests/top100CronSimulation.test.ts
//
// End-to-end simulation of the vote/rearrangement lifecycle: real
// planRearrangement + real boundary math driving a model of the DB and the
// perform_weekly_player_rearrangement RPC (freshen filter, the RPC's
// hardcoded NOW()-48h counting window, and its DELETE of counted votes).
// Proves: every boundary is applied exactly once even with late/missed
// fires, no vote is ever counted twice, and votes are only lost if zero
// fires happen for an entire 3-day cycle.

import test from 'node:test';
import assert from 'node:assert/strict';
import { planRearrangement, type CronPlan } from '@/lib/top100Cron';
import { getNextRearrangementIso, getPreviousRearrangementIso, isRearrangementDay } from '@/lib/top100Time';
import { seededRng } from '@/lib/dailySeed';

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const RPC_WINDOW = 48 * HOUR;

interface Vote {
  id: number;
  createdAt: number;
  updatedAt: number;
  castAt: number; // immutable true cast time, for attribution asserts
}

interface Run {
  boundaryIso: string;
  firedAt: number;
  counted: number[];
}

class CycleSim {
  rankedAt: number;
  votes: Vote[] = [];
  runs: Run[] = [];
  countedBy = new Map<number, Run>();
  private nextId = 1;

  constructor(rankedAtIso: string) {
    this.rankedAt = Date.parse(rankedAtIso);
  }

  cast(atMs: number): number {
    const id = this.nextId++;
    this.votes.push({ id, createdAt: atMs, updatedAt: atMs, castAt: atMs });
    return id;
  }

  fire(nowMs: number, force = false): CronPlan {
    const plan = planRearrangement({
      force,
      rankedAt: new Date(this.rankedAt).toISOString(),
      now: new Date(nowMs),
    });
    if (plan.action === 'skip') return plan;

    // Freshen step (models the route's playervotes UPDATE ... .or(filter)).
    const start = Date.parse(plan.freshenStartIso);
    const end = plan.freshenEndIso === null ? Infinity : Date.parse(plan.freshenEndIso);
    const stamp = Date.parse(plan.stampIso);
    for (const v of this.votes) {
      if ((v.createdAt >= start && v.createdAt < end) || (v.updatedAt >= start && v.updatedAt < end)) {
        v.createdAt = stamp;
        v.updatedAt = stamp;
      }
    }

    // RPC model: count then DELETE votes with created_at >= NOW() - 48h.
    const windowStart = nowMs - RPC_WINDOW;
    const run: Run = { boundaryIso: plan.boundaryIso, firedAt: nowMs, counted: [] };
    const kept: Vote[] = [];
    for (const v of this.votes) {
      if (v.createdAt >= windowStart) {
        assert.ok(!this.countedBy.has(v.id), `vote ${v.id} counted twice`);
        this.countedBy.set(v.id, run);
        run.counted.push(v.id);
      } else {
        kept.push(v);
      }
    }
    this.votes = kept;
    this.rankedAt = nowMs;
    this.runs.push(run);
    return plan;
  }
}

function boundariesThrough(startMs: number, lastIso: string): string[] {
  const out: string[] = [];
  let iso = getNextRearrangementIso(new Date(startMs));
  while (Date.parse(iso) <= Date.parse(lastIso)) {
    out.push(iso);
    iso = getNextRearrangementIso(new Date(Date.parse(iso)));
  }
  return out;
}

test('a year of daily fires with Vercel-style jitter: every boundary applied once, no votes lost', () => {
  const rng = seededRng(20260703);
  const simStart = Date.parse('2026-07-03T07:00:00Z');
  const simEnd = Date.parse('2027-07-03T07:00:00Z');
  const sim = new CycleSim('2026-07-03T07:30:00.000Z');
  const castTimes = new Map<number, number>();

  for (let dayStart = Date.parse('2026-07-04T00:00:00Z'); dayStart < simEnd; dayStart += DAY) {
    const fireAt = dayStart + 8 * HOUR + Math.floor(rng() * 76) * MIN; // 08:00 UTC, 0-75 min late
    const dayVotes = [0, 0, 0].map(() => dayStart + Math.floor(rng() * DAY));
    for (const t of dayVotes.filter((t) => t <= fireAt)) castTimes.set(sim.cast(t), t);

    const plan = sim.fire(fireAt);
    if (plan.action === 'run') {
      const again = sim.fire(fireAt + 5 * MIN);
      assert.equal(again.action, 'skip', 'immediate re-fire skips');
    }
    for (const t of dayVotes.filter((t) => t > fireAt)) castTimes.set(sim.cast(t), t);
  }

  const lastBoundaryIso = sim.runs[sim.runs.length - 1].boundaryIso;
  const boundaries = boundariesThrough(simStart, lastBoundaryIso);
  assert.ok(boundaries.length >= 118, `a year has ~121 boundaries (got ${boundaries.length})`);

  for (const boundaryIso of boundaries) {
    const runs = sim.runs.filter((r) => r.boundaryIso === boundaryIso);
    assert.equal(runs.length, 1, `boundary ${boundaryIso} applied exactly once`);
    const delay = runs[0].firedAt - Date.parse(boundaryIso);
    assert.ok(delay >= 0 && delay <= 3 * HOUR, `boundary ${boundaryIso} applied same morning (delay ${delay / HOUR}h)`);
  }

  // The DST-shifted boundaries were applied like any other.
  for (const dstBoundary of ['2026-11-03T08:00:00.000Z', '2027-03-15T07:00:00.000Z']) {
    assert.ok(boundaries.includes(dstBoundary), `${dstBoundary} is a boundary`);
    assert.equal(sim.runs.filter((r) => r.boundaryIso === dstBoundary).length, 1);
  }

  // No vote cast before the last applied boundary was lost.
  const lastBoundaryMs = Date.parse(lastBoundaryIso);
  for (const [id, castAt] of castTimes) {
    if (castAt < lastBoundaryMs) {
      assert.ok(sim.countedBy.has(id), `vote ${id} (cast ${new Date(castAt).toISOString()}) counted`);
    }
  }

  // Attribution: counted at most one cycle away from the cast time.
  for (const [id, castAt] of castTimes) {
    const run = sim.countedBy.get(id);
    if (!run) continue;
    const prevMs = Date.parse(getPreviousRearrangementIso(new Date(Date.parse(run.boundaryIso))));
    assert.ok(castAt >= prevMs, `vote ${id} not older than its run's cycle`);
    assert.ok(castAt < run.firedAt, `vote ${id} cast before the run that counted it`);
  }
});

test('every boundary-day fire missed: next-day fires self-heal every cycle, no votes lost', () => {
  const rng = seededRng(42);
  const simStart = Date.parse('2026-07-03T07:00:00Z');
  const simEnd = Date.parse('2026-12-31T00:00:00Z');
  const sim = new CycleSim('2026-07-03T07:30:00.000Z');
  const castTimes = new Map<number, number>();

  for (let dayStart = Date.parse('2026-07-04T00:00:00Z'); dayStart < simEnd; dayStart += DAY) {
    const fireAt = dayStart + 8 * HOUR + Math.floor(rng() * 76) * MIN;
    const dayVotes = [0, 0].map(() => dayStart + Math.floor(rng() * DAY));
    for (const t of dayVotes.filter((t) => t <= fireAt)) castTimes.set(sim.cast(t), t);
    if (!isRearrangementDay(new Date(fireAt))) sim.fire(fireAt); // boundary-day fire always missed
    for (const t of dayVotes.filter((t) => t > fireAt)) castTimes.set(sim.cast(t), t);
  }

  const lastBoundaryIso = sim.runs[sim.runs.length - 1].boundaryIso;
  for (const boundaryIso of boundariesThrough(simStart, lastBoundaryIso)) {
    const runs = sim.runs.filter((r) => r.boundaryIso === boundaryIso);
    assert.equal(runs.length, 1, `boundary ${boundaryIso} still applied exactly once`);
    const delay = runs[0].firedAt - Date.parse(boundaryIso);
    assert.ok(delay >= 23 * HOUR && delay <= 28 * HOUR, `boundary ${boundaryIso} healed next day (delay ${delay / HOUR}h)`);
  }

  const lastBoundaryMs = Date.parse(lastBoundaryIso);
  for (const [id, castAt] of castTimes) {
    if (castAt < lastBoundaryMs) {
      assert.ok(sim.countedBy.has(id), `vote ${id} survived the 25h-late catch-up`);
    }
  }
});

test('two-day outage every cycle: the day-3 catch-up still counts the whole cycle', () => {
  const rng = seededRng(7);
  const simStart = Date.parse('2026-07-03T07:00:00Z');
  const simEnd = Date.parse('2026-10-01T00:00:00Z');
  const sim = new CycleSim('2026-07-03T07:30:00.000Z');
  const castTimes = new Map<number, number>();

  for (let dayStart = Date.parse('2026-07-04T00:00:00Z'); dayStart < simEnd; dayStart += DAY) {
    const fireAt = dayStart + 8 * HOUR + Math.floor(rng() * 76) * MIN;
    const dayVotes = [0, 0].map(() => dayStart + Math.floor(rng() * DAY));
    for (const t of dayVotes.filter((t) => t <= fireAt)) castTimes.set(sim.cast(t), t);
    // Only the fire on the LA day BEFORE each boundary day survives.
    const nextBoundaryMs = Date.parse(getNextRearrangementIso(new Date(fireAt)));
    if (nextBoundaryMs - fireAt < 24 * HOUR) sim.fire(fireAt);
    for (const t of dayVotes.filter((t) => t > fireAt)) castTimes.set(sim.cast(t), t);
  }

  const lastBoundaryIso = sim.runs[sim.runs.length - 1].boundaryIso;
  for (const boundaryIso of boundariesThrough(simStart, lastBoundaryIso)) {
    const runs = sim.runs.filter((r) => r.boundaryIso === boundaryIso);
    assert.equal(runs.length, 1, `boundary ${boundaryIso} applied exactly once`);
    const delay = runs[0].firedAt - Date.parse(boundaryIso);
    assert.ok(delay >= 44 * HOUR && delay <= 52 * HOUR, `boundary ${boundaryIso} healed on day 3 (delay ${delay / HOUR}h)`);
  }

  // Even at ~49h late, the 47h stamp floor keeps the cycle's votes countable.
  const lastBoundaryMs = Date.parse(lastBoundaryIso);
  for (const [id, castAt] of castTimes) {
    if (castAt < lastBoundaryMs) {
      assert.ok(sim.countedBy.has(id), `vote ${id} (cast ${new Date(castAt).toISOString()}) survived the 2-day outage`);
    }
  }
});

test('full 3-day blackout: exactly one cycle of votes dies as dead rows, the system recovers', () => {
  const sim = new CycleSim('2026-07-03T08:02:00.000Z'); // B0 = Jul 3 applied
  // Cycle B0 -> B1 (Jul 6): these votes need a run for B1, which never comes.
  const doomed = [
    sim.cast(Date.parse('2026-07-04T15:00:00Z')),
    sim.cast(Date.parse('2026-07-05T03:30:00Z')),
    sim.cast(Date.parse('2026-07-05T22:10:00Z')),
  ];
  // Blackout: no fires on Jul 6, 7, 8. Votes keep arriving in cycle B1 -> B2.
  const survivors = [
    sim.cast(Date.parse('2026-07-07T12:00:00Z')),
    sim.cast(Date.parse('2026-07-08T18:45:00Z')),
  ];
  // Fires resume the morning after B2 (Jul 9 07:00 UTC boundary).
  const plan = sim.fire(Date.parse('2026-07-09T08:10:00Z'));
  assert.equal(plan.action, 'run');
  assert.ok(plan.action === 'run');
  assert.equal(plan.boundaryIso, '2026-07-09T07:00:00.000Z');

  assert.equal(sim.runs.filter((r) => r.boundaryIso === '2026-07-06T07:00:00.000Z').length, 0, 'B1 was never applied');
  for (const id of survivors) assert.ok(sim.countedBy.has(id), `post-blackout vote ${id} counted at B2`);
  for (const id of doomed) {
    assert.ok(!sim.countedBy.has(id), `blackout-cycle vote ${id} is lost, not miscounted`);
    assert.ok(sim.votes.some((v) => v.id === id), `vote ${id} remains as a harmless dead row`);
  }

  // Dead rows never leak into later cycles.
  sim.cast(Date.parse('2026-07-10T12:00:00Z'));
  sim.fire(Date.parse('2026-07-12T08:05:00Z'));
  sim.fire(Date.parse('2026-07-15T08:05:00Z'));
  for (const id of doomed) {
    assert.ok(!sim.countedBy.has(id), `dead row ${id} still uncounted after later cycles`);
  }
});

test('regression: the exact July 3 2026 miss, healed by a late same-day fire', () => {
  const sim = new CycleSim('2026-07-03T02:13:09.586Z'); // pre-boundary accidental run
  const ids: number[] = [];
  for (let i = 0; i < 111; i++) ids.push(sim.cast(Date.parse('2026-07-03T02:26:40Z')));

  // Old gate refused fires past 08:30 UTC; this one is 2.5h late.
  const plan = sim.fire(Date.parse('2026-07-03T09:31:00Z'));
  assert.equal(plan.action, 'run');
  assert.ok(plan.action === 'run');
  assert.equal(plan.boundaryIso, '2026-07-03T07:00:00.000Z');
  assert.equal(plan.stampIso, '2026-07-03T06:59:59.000Z');
  for (const id of ids) assert.ok(sim.countedBy.has(id), `vote ${id} counted`);
  assert.equal(sim.fire(Date.parse('2026-07-03T09:36:00Z')).action, 'skip');
});

test('regression: the exact July 3 2026 miss, healed by the next-day fire', () => {
  const sim = new CycleSim('2026-07-03T02:13:09.586Z');
  const ids: number[] = [];
  for (let i = 0; i < 111; i++) ids.push(sim.cast(Date.parse('2026-07-03T02:26:40Z')));

  const plan = sim.fire(Date.parse('2026-07-04T08:23:00Z'));
  assert.equal(plan.action, 'run');
  assert.ok(plan.action === 'run');
  assert.equal(plan.boundaryIso, '2026-07-03T07:00:00.000Z');
  for (const id of ids) assert.ok(sim.countedBy.has(id), `vote ${id} counted a day late`);
  assert.equal(sim.fire(Date.parse('2026-07-05T08:14:00Z')).action, 'skip');
});

test('force run mid-cycle consumes current votes and the next boundary still applies on time', () => {
  const sim = new CycleSim('2026-07-06T08:01:00.000Z');
  const early = [sim.cast(Date.parse('2026-07-07T10:00:00Z')), sim.cast(Date.parse('2026-07-07T14:00:00Z'))];

  const forced = sim.fire(Date.parse('2026-07-07T15:00:00Z'), true);
  assert.equal(forced.action, 'run');
  assert.ok(forced.action === 'run');
  assert.equal(forced.mode, 'forced');
  for (const id of early) assert.ok(sim.countedBy.has(id), 'mid-cycle votes consumed by force run');

  assert.equal(sim.fire(Date.parse('2026-07-07T16:00:00Z')).action, 'skip', 'scheduled fire after force skips');

  const late = sim.cast(Date.parse('2026-07-08T12:00:00Z'));
  const next = sim.fire(Date.parse('2026-07-09T08:05:00Z'));
  assert.equal(next.action, 'run');
  assert.ok(next.action === 'run');
  assert.equal(next.boundaryIso, '2026-07-09T07:00:00.000Z');
  assert.ok(sim.countedBy.has(late), 'post-force vote counted at the next boundary');
});
