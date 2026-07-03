// lib/sixDegreesDaily.ts
//
// Shared localStorage record for the daily Six Degrees puzzle so the home-page
// teaser and the full /games/six-degrees/daily page stay in sync for every user
// (signed-in results also persist in six_degrees_scores; this covers guests too).

import type { GuessResult } from '@/lib/shareText';
import type { ScoreHistoryRecord } from '@/lib/sixDegreesStats';
import { getLaDateString } from '@/lib/dailyTime';
import { markDailyPlayed } from '@/lib/dailyProgress';

export interface DailyResult {
  status: 'won' | 'lost';
  path: { id: number; name: string }[];
  guessesUsed: number;
  solutionPathNames?: string[] | null;
  guessResults?: GuessResult[];
}

const KEY = 'sixDegreesDaily_';

export function readDailyResult(gameDate: string): DailyResult | null {
  try {
    const raw = localStorage.getItem(KEY + gameDate);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d && (d.status === 'won' || d.status === 'lost')) return d as DailyResult;
  } catch {
    // ignore malformed storage
  }
  return null;
}

export function writeDailyResult(gameDate: string, result: DailyResult): void {
  try {
    localStorage.setItem(KEY + gameDate, JSON.stringify(result));
  } catch {
    // ignore storage failures
  }
  if (gameDate === getLaDateString()) markDailyPlayed('sixDegrees');
}

// Rebuild a score history from local records so guests get the same stats and
// streaks as signed-in users (feed the result to computeSixDegreesStats).
export function readAllLocalDailyResults(): ScoreHistoryRecord[] {
  const out: ScoreHistoryRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(KEY)) continue;
      const gameDate = storageKey.slice(KEY.length);
      const rec = readDailyResult(gameDate);
      if (!rec) continue;
      out.push({
        game_date: gameDate,
        is_successful: rec.status === 'won',
        guess_count: rec.guessesUsed,
      });
    }
  } catch {
    // ignore storage failures
  }
  return out.sort((a, b) => a.game_date.localeCompare(b.game_date));
}
