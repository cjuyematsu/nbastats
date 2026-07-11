// tests/collection.test.ts
//
// mergeCollection invariants: seen upgrades to collected but never downgrades,
// personIds fill in once known, and newlyCollected only reports real upgrades.

import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyCollection, mergeCollection, countCollection } from '@/lib/collection';

const DAY1 = '2026-07-10';
const DAY2 = '2026-07-11';

test('collecting a new player records name, id, date, and via', () => {
  const { state, newlyCollected } = mergeCollection(
    emptyCollection(),
    [{ name: 'Stephen Curry', personId: 201939 }],
    { status: 'collected', via: 'careerArc', date: DAY1 }
  );
  const entry = state.players['stephen curry'];
  assert.equal(entry.status, 'collected');
  assert.equal(entry.personId, 201939);
  assert.equal(entry.collectedDate, DAY1);
  assert.equal(entry.via, 'careerArc');
  assert.equal(newlyCollected.length, 1);
});

test('a seen player upgrades to collected and reports as newly collected', () => {
  const seen = mergeCollection(emptyCollection(), [{ name: 'Ray Allen' }], {
    status: 'seen',
    via: 'oddManOut',
    date: DAY1,
  }).state;
  const { state, newlyCollected } = mergeCollection(seen, [{ name: 'Ray Allen' }], {
    status: 'collected',
    via: 'ranking',
    date: DAY2,
  });
  const entry = state.players['ray allen'];
  assert.equal(entry.status, 'collected');
  assert.equal(entry.collectedDate, DAY2);
  assert.equal(entry.firstDate, DAY1);
  assert.equal(entry.via, 'ranking');
  assert.equal(newlyCollected.length, 1);
});

test('a collected player never downgrades to seen and is not re-reported', () => {
  const collectedState = mergeCollection(emptyCollection(), [{ name: 'Tim Duncan' }], {
    status: 'collected',
    via: 'ranking',
    date: DAY1,
  }).state;
  const { state, newlyCollected } = mergeCollection(collectedState, [{ name: 'Tim Duncan' }], {
    status: 'seen',
    via: 'sixDegrees',
    date: DAY2,
  });
  const entry = state.players['tim duncan'];
  assert.equal(entry.status, 'collected');
  assert.equal(entry.collectedDate, DAY1);
  assert.equal(entry.via, 'ranking');
  assert.equal(newlyCollected.length, 0);
});

test('a later sighting fills in a missing personId without clobbering an existing one', () => {
  const noId = mergeCollection(emptyCollection(), [{ name: 'Steve Nash' }], {
    status: 'seen',
    via: 'oddManOut',
    date: DAY1,
  }).state;
  const withId = mergeCollection(noId, [{ name: 'Steve Nash', personId: 959 }], {
    status: 'collected',
    via: 'commonTeammate',
    date: DAY2,
  }).state;
  assert.equal(withId.players['steve nash'].personId, 959);

  const clobberAttempt = mergeCollection(withId, [{ name: 'Steve Nash', personId: 1 }], {
    status: 'collected',
    via: 'ranking',
    date: DAY2,
  }).state;
  assert.equal(clobberAttempt.players['steve nash'].personId, 959);
});

test('names key case- and whitespace-insensitively; blanks are dropped', () => {
  const { state } = mergeCollection(
    emptyCollection(),
    [{ name: '  LeBron James ' }, { name: 'lebron james' }, { name: '   ' }],
    { status: 'collected', via: 'sixDegrees', date: DAY1 }
  );
  assert.equal(Object.keys(state.players).length, 1);
  assert.equal(state.players['lebron james'].name, 'LeBron James');
});

test('countCollection splits collected and seen', () => {
  let state = emptyCollection();
  state = mergeCollection(state, [{ name: 'A Player' }, { name: 'B Player' }], {
    status: 'collected',
    via: 'ranking',
    date: DAY1,
  }).state;
  state = mergeCollection(state, [{ name: 'C Player' }], {
    status: 'seen',
    via: 'ranking',
    date: DAY1,
  }).state;
  assert.deepEqual(countCollection(state), { collected: 2, seen: 1 });
});
