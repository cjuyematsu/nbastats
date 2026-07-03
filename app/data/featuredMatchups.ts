// app/data/featuredMatchups.ts

import { COMPARE_MATCHUPS } from './compareMatchups';
import { getLaDateString } from '@/lib/dailyTime';
import { dayNumber } from '@/lib/dailySeed';

export interface FeaturedMatchup {
  a: string;
  b: string;
}

// Players to keep OFF the home hero rotation. Every other curated /compare pair
// is eligible to be featured (each pair keeps its own /compare/<slug> SEO page
// regardless). Add a name here to pull them from the front-page rotation.
const HERO_EXCLUDE = new Set<string>(['Karl Malone']);

const FEATURED_POOL: FeaturedMatchup[] = COMPARE_MATCHUPS
  .filter((m) => !HERO_EXCLUDE.has(m.a) && !HERO_EXCLUDE.has(m.b))
  .map((m) => ({ a: m.a, b: m.b }));

// One pair per day, flipping at LA midnight in lockstep with the other daily
// features (dayNumber is the same LA-date index the daily challenges use).
// Prime stride (coprime to any pool size) spreads consecutive days across the
// pool so the same star does not appear on back-to-back days.
const STRIDE = 9973;

export function getTodaysMatchup(date = new Date()): FeaturedMatchup {
  const day = dayNumber(getLaDateString(date));
  return FEATURED_POOL[(day * STRIDE) % FEATURED_POOL.length];
}
