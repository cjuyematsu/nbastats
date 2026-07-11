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
  playerA,
  playerB,
}: {
  puzzleNumber: number;
  guessResults: GuessResult[];
  won: boolean;
  streak?: number;
  playerA?: string;
  playerB?: string;
}): string {
  const score = won ? `${guessResults.length}/6` : 'X/6';
  const lines = [`Six Degrees of NBA #${puzzleNumber}`];
  if (playerA && playerB) lines.push(`Link ${playerA} to ${playerB} through teammates.`);
  lines.push(`${guessEmojiRow(guessResults)} ${score}`);
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

// Challenge-style shares carry the puzzle itself (never the answer), so the
// person reading has something to try, not just a score to admire. Names go
// out alphabetically so the order never leaks the solution.
const alphabetical = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b));

export function buildRankingChallengeShare({
  names,
  season,
  won,
}: {
  names: string[];
  season: number;
  won: boolean;
}): string {
  return [
    `NBA Ranking Game: rank these four (${season} season), then name the hidden category:`,
    alphabetical(names).join(', '),
    won ? 'I got it. Your turn:' : 'It stumped me. Your turn:',
    'hoopsdata.net/games/ranking-game',
  ].join('\n');
}

export function buildOddManOutChallengeShare({
  names,
  won,
}: {
  names: string[];
  won: boolean;
}): string {
  return [
    'Odd Man Out: three of these shared the court with the same NBA star. One never did.',
    alphabetical(names).join(', '),
    won ? 'I found the odd one. Can you?' : 'This one got me. Can you find it?',
    'hoopsdata.net/games/odd-man-out',
  ].join('\n');
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

export function buildCareerArcShare({
  guessResults,
  won,
  maxGuesses = 5,
}: {
  guessResults: GuessResult[];
  won: boolean;
  maxGuesses?: number;
}): string {
  const score = won ? `${guessResults.length}/${maxGuesses}` : `X/${maxGuesses}`;
  return [
    'NBA Career Arc',
    `${guessEmojiRow(guessResults)} ${score}`,
    'hoopsdata.net/games/career-arc',
  ].join('\n');
}

export function buildCommonTeammateShare({
  roundResults,
  points,
  total,
  pairs,
}: {
  roundResults: boolean[];
  points: number;
  total: number;
  pairs?: [string, string][];
}): string {
  const lines = [
    `NBA Common Teammate ${points}/${total}`,
    roundResults.map((r) => (r ? HIT : MISS)).join(''),
  ];
  if (pairs && pairs.length > 0) {
    lines.push('Name anyone who played with BOTH:');
    pairs.forEach(([a, b]) => lines.push(`${a} + ${b}`));
  }
  lines.push('hoopsdata.net/games/common-teammate');
  return lines.join('\n');
}

export function buildDailySevenShare({
  completed,
  total,
  streak,
}: {
  completed: number;
  total: number;
  streak?: number;
}): string {
  const UNPLAYED = '\u{2B1C}';
  const row = Array.from({ length: total }, (_, i) => (i < completed ? HIT : UNPLAYED)).join('');
  const header =
    completed >= total
      ? `HoopsData Daily ${completed}/${total} (perfect day)`
      : `HoopsData Daily ${completed}/${total}`;
  const lines = [header, row];
  if (streak && streak > 1) lines.push(`Streak: ${streak} days`);
  lines.push('hoopsdata.net');
  return lines.join('\n');
}

export function buildCollectionShare({ collected }: { collected: number }): string {
  return [
    `My HoopsData player collection: ${collected} player${collected === 1 ? '' : 's'} and counting.`,
    'Win the daily NBA games to collect the players in them. Start yours:',
    'hoopsdata.net/games',
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
