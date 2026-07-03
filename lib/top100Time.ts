// lib/top100Time.ts
//
// Top 100 rearrangements run at 07:00 UTC every third day, anchored to
// REARRANGE_EPOCH. The cron fires daily; the route only rearranges when
// isRearrangementDay() is true, so the countdown and the cron always agree.

const MS_PER_DAY = 86_400_000;
const RUN_HOUR_UTC = 7;
const CYCLE_DAYS = 3;
const REARRANGE_EPOCH_DAY = Date.UTC(2026, 6, 3) / MS_PER_DAY;

const mod = (n: number, m: number) => ((n % m) + m) % m;

function utcDayNumber(at: Date): number {
  return Math.floor(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()) / MS_PER_DAY);
}

function runInstantIso(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY + RUN_HOUR_UTC * 3_600_000).toISOString();
}

function latestCycleDay(at: Date): number {
  const day = utcDayNumber(at);
  return day - mod(day - REARRANGE_EPOCH_DAY, CYCLE_DAYS);
}

export function isRearrangementDay(now: Date = new Date()): boolean {
  return mod(utcDayNumber(now) - REARRANGE_EPOCH_DAY, CYCLE_DAYS) === 0;
}

export function getNextRearrangementIso(now: Date = new Date()): string {
  let day = latestCycleDay(now);
  while (day * MS_PER_DAY + RUN_HOUR_UTC * 3_600_000 <= now.getTime()) {
    day += CYCLE_DAYS;
  }
  return runInstantIso(day);
}

export function getLastRearrangementIso(now: Date = new Date()): string {
  let day = latestCycleDay(now);
  while (day * MS_PER_DAY + RUN_HOUR_UTC * 3_600_000 > now.getTime()) {
    day -= CYCLE_DAYS;
  }
  return runInstantIso(day);
}

export function getPreviousRearrangementIso(now: Date = new Date()): string {
  const last = Date.parse(getLastRearrangementIso(now));
  return new Date(last - CYCLE_DAYS * MS_PER_DAY).toISOString();
}

// The 07:00 UTC run instant of the calendar day `now` falls on.
export function getRunInstantIso(now: Date = new Date()): string {
  return runInstantIso(utcDayNumber(now));
}
