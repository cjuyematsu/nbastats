// lib/dailyProgress.ts
//
// Cross-game daily completion, keyed on the LA date like the daily puzzles.
// Reads the legacy per-game records (sixDegreesDaily_*, statOuDaily_*) raw so
// this module stays import-cycle-free (sixDegreesDaily imports this one).

import { getLaDateString } from '@/lib/dailyTime';
import { supabase } from '@/lib/supabaseClient';

export type DailyGame = 'sixDegrees' | 'statOu' | 'ranking' | 'oddManOut' | 'draftQuiz';

export interface DailyProgress {
  sixDegrees: boolean;
  statOu: boolean;
  ranking: boolean;
  oddManOut: boolean;
  draftQuiz: boolean;
}

export const DAILY_PROGRESS_EVENT = 'hd:daily-progress';
export const DAILY_GAMES: DailyGame[] = ['sixDegrees', 'statOu', 'ranking', 'oddManOut', 'draftQuiz'];

const KEY = 'hd:dailyProgress_';
const LOOKBACK_DAYS = 60;
const STAT_OU_ERAS = ['modern', '2000s', '1990s', '1980s'];

const emptyProgress = (): DailyProgress => ({
  sixDegrees: false,
  statOu: false,
  ranking: false,
  oddManOut: false,
  draftQuiz: false,
});

const dayBefore = (isoDate: string) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

function readRecord(date: string): DailyProgress {
  try {
    const raw = localStorage.getItem(KEY + date);
    if (!raw) return emptyProgress();
    return { ...emptyProgress(), ...JSON.parse(raw) };
  } catch {
    return emptyProgress();
  }
}

function withLegacyRecords(date: string, progress: DailyProgress): DailyProgress {
  const out = { ...progress };
  try {
    if (!out.sixDegrees) {
      const raw = localStorage.getItem(`sixDegreesDaily_${date}`);
      if (raw) {
        const rec = JSON.parse(raw);
        if (rec && (rec.status === 'won' || rec.status === 'lost')) out.sixDegrees = true;
      }
    }
    if (!out.statOu) {
      out.statOu = STAT_OU_ERAS.some((era) => !!localStorage.getItem(`statOuDaily_${era}_${date}`));
    }
  } catch {
    // ignore malformed storage
  }
  return out;
}

function anyPlayed(p: DailyProgress): boolean {
  return p.sixDegrees || p.statOu || p.ranking || p.oddManOut || p.draftQuiz;
}

export function countCompleted(p: DailyProgress): number {
  return DAILY_GAMES.filter((g) => p[g]).length;
}

export function readTodayProgress(): DailyProgress {
  const today = getLaDateString();
  const progress = withLegacyRecords(today, readRecord(today));
  // Pre-LA-switch stat O/U keys were written with the device-local date.
  if (!progress.statOu) {
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      if (localDate !== today) {
        progress.statOu = STAT_OU_ERAS.some(
          (era) => !!localStorage.getItem(`statOuDaily_${era}_${localDate}`)
        );
      }
    } catch {
      // ignore storage failures
    }
  }
  return progress;
}

export function markDailyPlayed(game: DailyGame): void {
  try {
    const today = getLaDateString();
    const progress = readRecord(today);
    if (!progress[game]) {
      progress[game] = true;
      localStorage.setItem(KEY + today, JSON.stringify(progress));
    }
    pruneOldRecords(today);
    window.dispatchEvent(new CustomEvent(DAILY_PROGRESS_EVENT));
  } catch {
    // ignore storage failures
  }
}

export function computeSiteStreak(todayLaDate: string = getLaDateString()): number {
  const playedOn = (date: string) => anyPlayed(withLegacyRecords(date, readRecord(date)));
  let cursor = todayLaDate;
  if (!playedOn(cursor)) cursor = dayBefore(cursor);
  let streak = 0;
  while (streak < LOOKBACK_DAYS && playedOn(cursor)) {
    streak++;
    cursor = dayBefore(cursor);
  }
  return streak;
}

// Signed-in plays land in the DB (possibly from another device), not in this
// browser's localStorage. Merge the per-day DB records in; games without exact
// per-day rows (ranking, odd man out, draft daily) stay local-only.
export async function syncDailyProgressFromDb(userId: string): Promise<void> {
  const today = getLaDateString();
  try {
    const [six, statOu] = await Promise.all([
      supabase
        .from('six_degrees_scores')
        .select('id')
        .eq('user_id', userId)
        .eq('game_date', today)
        .limit(1),
      supabase
        .from('gamescores')
        .select('game_id')
        .eq('user_id', userId)
        .eq('played_on_date', today)
        .like('game_id', 'STAT_OVER_UNDER_DAILY_V1_%')
        .limit(1),
    ]);
    if (six.data && six.data.length > 0) markDailyPlayed('sixDegrees');
    if (statOu.data && statOu.data.length > 0) markDailyPlayed('statOu');
  } catch {
    // offline or RLS failure; local records still apply
  }
}

function pruneOldRecords(today: string): void {
  try {
    let cutoff = today;
    for (let i = 0; i < LOOKBACK_DAYS; i++) cutoff = dayBefore(cutoff);
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY) && key.slice(KEY.length) < cutoff) stale.push(key);
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage failures
  }
}
