// lib/commonTeammateCore.ts
//
// Pure Common Teammate pieces (no supabase import) so tests can load them
// directly. A round is two players who never shared the court; the answer set
// is every player who played with both.

export interface CtPlayer {
  personId: number;
  name: string;
}

export interface CtMate {
  id: number;
  name: string;
  shared: number;
}

export interface CtRound {
  a: CtPlayer;
  b: CtPlayer;
  aMateIds: number[];
  bMateIds: number[];
  answers: CtMate[];
}

export const CT_ROUNDS = 5;
export const CT_GUESSES_PER_ROUND = 3;
export const CT_POTENTIAL_POINTS = CT_ROUNDS * CT_GUESSES_PER_ROUND;

export const MIN_ANSWERS = 2;

// null when the pair is invalid: direct teammates, or too few common teammates.
export function buildRound(
  a: CtPlayer,
  b: CtPlayer,
  aMates: Map<number, CtMate>,
  bMates: Map<number, CtMate>
): CtRound | null {
  if (aMates.has(b.personId) || bMates.has(a.personId)) return null;
  const answers: CtMate[] = [];
  for (const [id, mate] of aMates) {
    const other = bMates.get(id);
    if (other) answers.push({ id, name: mate.name, shared: mate.shared + other.shared });
  }
  if (answers.length < MIN_ANSWERS) return null;
  answers.sort((x, y) => y.shared - x.shared || x.name.localeCompare(y.name));
  return {
    a,
    b,
    aMateIds: [...aMates.keys()],
    bMateIds: [...bMates.keys()],
    answers,
  };
}

export type CtFeedback = 'correct' | 'a-only' | 'b-only' | 'neither';

export function feedbackForGuess(round: CtRound, guessId: number): CtFeedback {
  if (round.answers.some((ans) => ans.id === guessId)) return 'correct';
  const withA = round.aMateIds.includes(guessId);
  const withB = round.bMateIds.includes(guessId);
  if (withA && !withB) return 'a-only';
  if (withB && !withA) return 'b-only';
  return 'neither';
}

// Solved on guess 1/2/3 scores 3/2/1; unsolved scores 0.
export function pointsForRound(solved: boolean, guessesUsed: number): number {
  if (!solved) return 0;
  return Math.max(CT_GUESSES_PER_ROUND + 1 - guessesUsed, 1);
}
