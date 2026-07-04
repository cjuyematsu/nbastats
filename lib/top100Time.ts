// lib/top100Time.ts
//
// Top 100 rearrangements run at midnight America/Los_Angeles every third day,
// anchored to REARRANGE_EPOCH, so the reshuffle lands on the same LA-midnight
// boundary as the daily games/comparison. The Vercel cron fires once daily at
// 08:00 UTC (LA midnight in winter/PST, ~1h after it in summer/PDT — Hobby only
// allows one run per day); the route acts only at the boundary of a
// rearrangement day, so the countdown and the cron always agree.

import { getLaDateString, laMidnightIso } from '@/lib/dailyTime';
import { dayNumber } from '@/lib/dailySeed';

const MS_PER_DAY = 86_400_000;
const CYCLE_DAYS = 3;
const REARRANGE_EPOCH_DAY = dayNumber('2026-07-03');

const mod = (n: number, m: number) => ((n % m) + m) % m;

// LA calendar day number (epoch-day of the LA date), matching the daily games.
function laDayNumber(at: Date): number {
  return dayNumber(getLaDateString(at));
}

function laDateForDay(dayNum: number): string {
  return new Date(dayNum * MS_PER_DAY).toISOString().slice(0, 10);
}

// UTC instant of LA midnight starting the given LA day number.
function runInstantIso(dayNum: number): string {
  return laMidnightIso(laDateForDay(dayNum));
}

function latestCycleDay(at: Date): number {
  const day = laDayNumber(at);
  return day - mod(day - REARRANGE_EPOCH_DAY, CYCLE_DAYS);
}

function lastRunDay(now: Date): number {
  let day = latestCycleDay(now);
  while (Date.parse(runInstantIso(day)) > now.getTime()) day -= CYCLE_DAYS;
  return day;
}

export function isRearrangementDay(now: Date = new Date()): boolean {
  return mod(laDayNumber(now) - REARRANGE_EPOCH_DAY, CYCLE_DAYS) === 0;
}

export function getNextRearrangementIso(now: Date = new Date()): string {
  let day = latestCycleDay(now);
  while (Date.parse(runInstantIso(day)) <= now.getTime()) day += CYCLE_DAYS;
  return runInstantIso(day);
}

export function getLastRearrangementIso(now: Date = new Date()): string {
  return runInstantIso(lastRunDay(now));
}

export function getPreviousRearrangementIso(now: Date = new Date()): string {
  return runInstantIso(lastRunDay(now) - CYCLE_DAYS);
}
