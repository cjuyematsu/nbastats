// lib/dailyStreak.ts
//
// Play-based calendar streak: any completion keeps it alive, so a played-but-lost
// day still counts. Six Degrees keeps its own win-based math in sixDegreesStats.

import { getLaDateString } from '@/lib/dailyTime';

const dayBefore = (isoDate: string) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export function computeDailyStreak(
  playedDates: string[],
  todayLaDate: string = getLaDateString()
): number {
  const days = new Set(playedDates);
  let cursor = days.has(todayLaDate) ? todayLaDate : dayBefore(todayLaDate);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = dayBefore(cursor);
  }
  return streak;
}
