// lib/dailySeed.ts
//
// Deterministic per-day randomness so every visitor gets the same daily
// challenge. Seed everything off the LA date like the other dailies.

import { getLaDateString } from '@/lib/dailyTime';

export function dayNumber(laDate: string = getLaDateString()): number {
  return Math.round(Date.parse(`${laDate}T00:00:00Z`) / 86_400_000);
}

export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function seededPick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

const DRAFT_DAILY_FIRST_YEAR = 1975;
const DRAFT_DAILY_LAST_YEAR = 2025;
const DRAFT_DAILY_SLOT_COUNT = 3;

export interface DraftDailySlot {
  year: number;
  pick: number;
}

// Three slots, each a top-5 pick from a different draft year.
export function dailyDraftSlots(laDate: string = getLaDateString()): DraftDailySlot[] {
  const rng = seededRng(dayNumber(laDate) * 7919 + 17);
  const years = new Set<number>();
  while (years.size < DRAFT_DAILY_SLOT_COUNT) {
    years.add(
      DRAFT_DAILY_FIRST_YEAR +
        Math.floor(rng() * (DRAFT_DAILY_LAST_YEAR - DRAFT_DAILY_FIRST_YEAR + 1))
    );
  }
  return Array.from(years).map((year) => ({ year, pick: 1 + Math.floor(rng() * 5) }));
}
