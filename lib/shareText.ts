// lib/shareText.ts
//
// Pure builders for the spoiler-free share texts. No player names or paths in
// the daily formats so results can be posted without ruining the puzzle.

export type GuessResult = 'hit' | 'miss';

const HIT = '\u{1F7E9}';
const MISS = '\u{1F7E5}';

export function guessEmojiRow(guessResults: GuessResult[]): string {
  return guessResults.map((r) => (r === 'hit' ? HIT : MISS)).join('');
}

export function buildSixDegreesShare({
  puzzleNumber,
  guessResults,
  won,
  streak,
}: {
  puzzleNumber: number;
  guessResults: GuessResult[];
  won: boolean;
  streak?: number;
}): string {
  const score = won ? `${guessResults.length}/6` : 'X/6';
  const lines = [`Six Degrees of NBA #${puzzleNumber}`, `${guessEmojiRow(guessResults)} ${score}`];
  if (streak && streak > 0) lines.push(`Streak: ${streak}`);
  lines.push('hoopsdata.net/games/six-degrees');
  return lines.join('\n');
}

// Degraded variant for results saved before per-guess tracking existed or on
// another device: hits and misses cannot be reconstructed, so no emoji row.
export function buildSixDegreesShareFromCount({
  puzzleNumber,
  won,
  guessCount,
  streak,
}: {
  puzzleNumber: number;
  won: boolean;
  guessCount: number;
  streak?: number;
}): string {
  const lines = [
    `Six Degrees of NBA #${puzzleNumber}`,
    won ? `Solved ${Math.min(Math.max(guessCount, 1), 6)}/6` : 'X/6',
  ];
  if (streak && streak > 0) lines.push(`Streak: ${streak}`);
  lines.push('hoopsdata.net/games/six-degrees');
  return lines.join('\n');
}

export function buildSixDegreesRandomShare({
  playerA,
  playerB,
  guesses,
  guessResults,
}: {
  playerA: string;
  playerB: string;
  guesses: number;
  guessResults?: GuessResult[];
}): string {
  const lines = [
    `I connected ${playerA} to ${playerB} in ${guesses} guess${guesses === 1 ? '' : 'es'} on Six Degrees of NBA.`,
  ];
  if (guessResults && guessResults.length > 0) lines.push(guessEmojiRow(guessResults));
  lines.push('hoopsdata.net/games/six-degrees');
  return lines.join('\n');
}

export function buildStatOuShare({
  eraLabel,
  results,
  correct,
  total,
}: {
  eraLabel: string;
  results: boolean[];
  correct: number;
  total: number;
}): string {
  const lines = [`NBA Stat Over/Under (${eraLabel}) ${correct}/${total}`];
  if (results.length > 0) lines.push(results.map((r) => (r ? HIT : MISS)).join(''));
  lines.push('hoopsdata.net/games/stat-over-under');
  return lines.join('\n');
}

export function buildStreakShare({
  gameLabel,
  streak,
  url,
}: {
  gameLabel: string;
  streak: number;
  url: string;
}): string {
  return [`I hit a streak of ${streak} in ${gameLabel}. Beat that:`, url].join('\n');
}
