// lib/sixDegreesDaily.ts
//
// Shared localStorage record for the daily Six Degrees puzzle so the home-page
// teaser and the full /games/six-degrees/daily page stay in sync for every user
// (signed-in results also persist in six_degrees_scores; this covers guests too).

export interface DailyResult {
  status: 'won' | 'lost';
  path: { id: number; name: string }[];
  guessesUsed: number;
  solutionPathNames?: string[] | null;
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
}
