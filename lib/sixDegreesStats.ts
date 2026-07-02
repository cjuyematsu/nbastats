// lib/sixDegreesStats.ts
//
// One implementation of the Six Degrees stats math so the lobby, the end-of-game
// screen, and the share text always agree. Works on the DB history for signed-in
// users and on records rebuilt from localStorage for guests.
//
// Streaks are calendar-aware: a streak is wins on consecutive days, so skipping
// a day breaks it. Pass todayLaDate so a streak whose last win was before
// yesterday counts as broken even if every recorded game was a win.

export interface ScoreHistoryRecord {
  game_date: string;
  is_successful: boolean;
  guess_count: number;
}

export interface SixDegreesStats {
  played: number;
  winPercentage: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
}

const dayBefore = (isoDate: string) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export function computeSixDegreesStats(
  scores: ScoreHistoryRecord[],
  todayLaDate?: string
): SixDegreesStats {
  if (!scores || scores.length === 0) {
    return { played: 0, winPercentage: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] };
  }
  const ordered = [...scores].sort((a, b) => a.game_date.localeCompare(b.game_date));
  const played = ordered.length;
  const wins = ordered.filter((s) => s.is_successful).length;
  const winPercentage = Math.round((wins / played) * 100);

  let maxStreak = 0;
  let run = 0;
  let lastWinDate: string | null = null;
  for (const s of ordered) {
    if (s.is_successful) {
      run = lastWinDate !== null && dayBefore(s.game_date) === lastWinDate ? run + 1 : 1;
      lastWinDate = s.game_date;
      maxStreak = Math.max(maxStreak, run);
    } else {
      run = 0;
      lastWinDate = null;
    }
  }

  let currentStreak = 0;
  const last = ordered[ordered.length - 1];
  if (last.is_successful) {
    const alive =
      !todayLaDate || last.game_date === todayLaDate || last.game_date === dayBefore(todayLaDate);
    if (alive) {
      currentStreak = 1;
      for (let i = ordered.length - 2; i >= 0; i--) {
        if (ordered[i].is_successful && ordered[i].game_date === dayBefore(ordered[i + 1].game_date)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  const guessDistribution = [0, 0, 0, 0, 0, 0];
  ordered.forEach((score) => {
    if (score.is_successful && score.guess_count >= 1 && score.guess_count <= 6) {
      guessDistribution[score.guess_count - 1]++;
    }
  });
  return { played, winPercentage, currentStreak, maxStreak, guessDistribution };
}
