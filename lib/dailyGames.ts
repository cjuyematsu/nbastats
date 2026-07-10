// lib/dailyGames.ts
//
// Pure daily-game registry: the game list, labels/hrefs, and the "what should
// I play next" pick. No supabase import so tests can load it directly;
// lib/dailyProgress.ts re-exports the shared types for back-compat.

export type DailyGame =
  | 'sixDegrees'
  | 'statOu'
  | 'ranking'
  | 'oddManOut'
  | 'draftQuiz'
  | 'careerArc'
  | 'commonTeammate';

export type DailyProgress = Record<DailyGame, boolean>;

export const DAILY_GAMES: DailyGame[] = [
  'sixDegrees',
  'statOu',
  'ranking',
  'oddManOut',
  'draftQuiz',
  'careerArc',
  'commonTeammate',
];

export const GAME_META: Record<DailyGame, { label: string; href: string }> = {
  sixDegrees: { label: 'Six Degrees', href: '/games/six-degrees/daily' },
  statOu: { label: 'Stat Over/Under', href: '/games/stat-over-under' },
  ranking: { label: 'Guess the Ranking', href: '/games/ranking-game' },
  oddManOut: { label: 'Odd Man Out', href: '/games/odd-man-out' },
  draftQuiz: { label: 'Name That Pick', href: '/games/draft-quiz/daily' },
  careerArc: { label: 'Career Arc', href: '/games/career-arc' },
  commonTeammate: { label: 'Common Teammate', href: '/games/common-teammate' },
};

export function pickNextGame(progress: DailyProgress, current?: DailyGame): DailyGame | null {
  return DAILY_GAMES.find((g) => g !== current && !progress[g]) ?? null;
}
