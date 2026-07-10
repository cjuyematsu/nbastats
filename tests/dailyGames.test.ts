// tests/dailyGames.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_GAMES, DailyProgress, GAME_META, pickNextGame } from '@/lib/dailyGames';

function progress(played: Partial<DailyProgress> = {}): DailyProgress {
  const base = Object.fromEntries(DAILY_GAMES.map((g) => [g, false])) as unknown as DailyProgress;
  return { ...base, ...played };
}

test('every daily game has meta with a label and href', () => {
  for (const game of DAILY_GAMES) {
    assert.ok(GAME_META[game].label.length > 0, `${game} label`);
    assert.ok(GAME_META[game].href.startsWith('/games/'), `${game} href`);
  }
});

test('pickNextGame returns the first unplayed game in order', () => {
  assert.equal(pickNextGame(progress()), DAILY_GAMES[0]);
  assert.equal(pickNextGame(progress({ [DAILY_GAMES[0]]: true } as Partial<DailyProgress>)), DAILY_GAMES[1]);
});

test('pickNextGame skips the current game even when unplayed', () => {
  assert.equal(pickNextGame(progress(), DAILY_GAMES[0]), DAILY_GAMES[1]);
});

test('pickNextGame returns null when everything is played', () => {
  const all = progress(Object.fromEntries(DAILY_GAMES.map((g) => [g, true])) as Partial<DailyProgress>);
  assert.equal(pickNextGame(all), null);
});
