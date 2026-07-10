// tests/commonTeammateDaily.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRound,
  feedbackForGuess,
  pointsForRound,
  type CtMate,
  type CtPlayer,
} from '@/lib/commonTeammateCore';

const A: CtPlayer = { personId: 1, name: 'Player A' };
const B: CtPlayer = { personId: 2, name: 'Player B' };

function mates(entries: [number, string, number][]): Map<number, CtMate> {
  return new Map(entries.map(([id, name, shared]) => [id, { id, name, shared }]));
}

test('buildRound rejects direct teammates', () => {
  const round = buildRound(A, B, mates([[2, 'Player B', 50], [10, 'X', 100]]), mates([[10, 'X', 80], [11, 'Y', 20]]));
  assert.equal(round, null);
});

test('buildRound rejects pairs with too few common teammates', () => {
  const round = buildRound(A, B, mates([[10, 'X', 100]]), mates([[10, 'X', 80]]));
  assert.equal(round, null);
});

test('buildRound returns answers sorted by combined shared games', () => {
  const round = buildRound(
    A,
    B,
    mates([[10, 'Xavier', 100], [11, 'Yanni', 200], [12, 'Zeke', 50]]),
    mates([[10, 'Xavier', 300], [11, 'Yanni', 10], [13, 'Walt', 40]])
  );
  assert.ok(round);
  assert.deepEqual(round.answers.map((a) => a.name), ['Xavier', 'Yanni']);
  assert.equal(round.answers[0].shared, 400);
});

test('feedbackForGuess distinguishes correct, one-sided, and neither', () => {
  const round = buildRound(
    A,
    B,
    mates([[10, 'X', 1], [11, 'Y', 1], [20, 'OnlyA', 1]]),
    mates([[10, 'X', 1], [11, 'Y', 1], [30, 'OnlyB', 1]])
  );
  assert.ok(round);
  assert.equal(feedbackForGuess(round, 10), 'correct');
  assert.equal(feedbackForGuess(round, 20), 'a-only');
  assert.equal(feedbackForGuess(round, 30), 'b-only');
  assert.equal(feedbackForGuess(round, 99), 'neither');
});

test('pointsForRound scores 3/2/1 by guess and 0 on failure', () => {
  assert.equal(pointsForRound(true, 1), 3);
  assert.equal(pointsForRound(true, 2), 2);
  assert.equal(pointsForRound(true, 3), 1);
  assert.equal(pointsForRound(false, 3), 0);
});
