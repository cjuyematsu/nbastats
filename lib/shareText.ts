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
  streak,
}: {
  eraLabel: string;
  results: boolean[];
  correct: number;
  total: number;
  streak?: number;
}): string {
  const lines = [`NBA Stat Over/Under (${eraLabel}) ${correct}/${total}`];
  if (results.length > 0) lines.push(results.map((r) => (r ? HIT : MISS)).join(''));
  if (streak && streak > 0) lines.push(`Streak: ${streak}`);
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

export function buildDraftDailyShare({
  slotLabels,
  correct,
  total,
  results,
}: {
  slotLabels: string[];
  correct: number;
  total: number;
  results: boolean[];
}): string {
  const lines = [`NBA Draft Daily (${slotLabels.join(', ')}) ${correct}/${total}`];
  if (results.length > 0) lines.push(results.map((r) => (r ? HIT : MISS)).join(''));
  lines.push('hoopsdata.net/games/draft-quiz/daily');
  return lines.join('\n');
}

export function buildDraftQuizShare({
  year,
  correct,
  total,
}: {
  year: number;
  correct: number;
  total: number;
}): string {
  return [
    `I named ${correct}/${total} picks from the ${year} NBA Draft. Try it:`,
    'hoopsdata.net/games/draft-quiz',
  ].join('\n');
}

export function buildTop100Share({ topFive }: { topFive: string[] }): string {
  return [
    'Fan-voted NBA Top 100 right now:',
    ...topFive.map((name, i) => `${i + 1}. ${name}`),
    'Do you agree? Vote:',
    'hoopsdata.net/top-100-players',
  ].join('\n');
}

// A user's personal ballot for the current cycle: who they pushed up and who
// they pushed down. Arrow prefixes so it reads at a glance when pasted.
export function buildTop100BallotShare({ ups, downs }: { ups: string[]; downs: string[] }): string {
  const lines = ['My NBA Top 100 ballot this cycle:'];
  ups.slice(0, 5).forEach((name) => lines.push(`\u{2B06}\u{FE0F} ${name}`));
  downs.slice(0, 5).forEach((name) => lines.push(`\u{2B07}\u{FE0F} ${name}`));
  const extra = Math.max(0, ups.length - 5) + Math.max(0, downs.length - 5);
  if (extra > 0) lines.push(`+${extra} more`);
  lines.push('Cast yours (no sign-in):');
  lines.push('hoopsdata.net/top-100-players');
  return lines.join('\n');
}

export function buildCompareShare({
  nameA,
  nameB,
  url,
}: {
  nameA: string;
  nameB: string;
  url: string;
}): string {
  return [`${nameA} vs ${nameB}: settle it with the numbers.`, url].join('\n');
}

export function buildDuoShare({
  nameA,
  nameB,
  url,
}: {
  nameA: string;
  nameB: string;
  url: string;
}): string {
  return [`${nameA} & ${nameB} as teammates: games, record, and combined stats.`, url].join('\n');
}

export function buildPlayerShare({ name, url }: { name: string; url: string }): string {
  return [`${name}'s NBA career stats:`, url].join('\n');
}
