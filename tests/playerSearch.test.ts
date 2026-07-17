// tests/playerSearch.test.ts
//
// Pure logic behind the shared autocomplete: local directory search, the
// local/RPC merge, and the LRU cache used by usePlayerSuggestions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLruCache,
  mergeSuggestions,
  normalizeSearchText,
  searchDirectory,
  type LocalDirectoryEntry,
} from '../lib/playerSearch';
import type { PlayerSuggestion } from '../types/stats';

const DIRECTORY: LocalDirectoryEntry[] = [
  { id: 1, name: 'LeBron James', points: 40000, startYear: 2004, endYear: 2025 },
  { id: 2, name: 'Mike James', points: 3000 },
  { id: 3, name: 'James Harden', points: 26000, startYear: 2010, endYear: 2025 },
  { id: 4, name: 'Nikola Jokić', points: 15000, startYear: 2016, endYear: 2025 },
  { id: 5, name: 'Karl-Anthony Towns', points: 14000 },
  { id: 6, name: 'Jaja Santos', points: 100 },
];

function s(personId: number, firstName: string, lastName: string, years?: [number, number]): PlayerSuggestion {
  return {
    personId,
    firstName,
    lastName,
    startYear: years ? years[0] : null,
    endYear: years ? years[1] : null,
  };
}

test('normalizeSearchText lowercases, trims, and strips diacritics', () => {
  assert.equal(normalizeSearchText('  JokiĆ '), 'jokic');
  assert.equal(normalizeSearchText('LeBron'), 'lebron');
});

test('searchDirectory returns nothing below two characters', () => {
  assert.deepEqual(searchDirectory(DIRECTORY, 'j'), []);
  assert.deepEqual(searchDirectory(DIRECTORY, ' '), []);
});

test('searchDirectory ranks word-start matches above substrings, points desc within tier', () => {
  const results = searchDirectory(DIRECTORY, 'ja');
  const ids = results.map((r) => r.personId);
  // Word-start tier: LeBron James (40000), James Harden (26000), Mike James (3000),
  // Jaja Santos (100). No substring-only matches for "ja" except inside Jaja (word start wins).
  assert.deepEqual(ids.slice(0, 3), [1, 3, 2]);
});

test('searchDirectory places mid-word substring matches after word-start matches', () => {
  const results = searchDirectory(DIRECTORY, 'ame');
  // "ame" appears mid-word in James only.
  assert.deepEqual(results.map((r) => r.personId), [1, 3, 2]);
});

test('searchDirectory matches diacritic-insensitively', () => {
  const results = searchDirectory(DIRECTORY, 'jokic');
  assert.equal(results.length, 1);
  assert.equal(results[0].personId, 4);
  assert.equal(results[0].startYear, 2016);
});

test('searchDirectory treats hyphens as word boundaries', () => {
  const results = searchDirectory(DIRECTORY, 'anthony');
  assert.equal(results[0].personId, 5);
});

test('searchDirectory respects the limit', () => {
  const results = searchDirectory(DIRECTORY, 'ja', 2);
  assert.equal(results.length, 2);
});

test('searchDirectory splits first and last name and nulls missing years', () => {
  const [towns] = searchDirectory(DIRECTORY, 'towns');
  assert.equal(towns.firstName, 'Karl-Anthony');
  assert.equal(towns.lastName, 'Towns');
  assert.equal(towns.startYear, null);
  assert.equal(towns.endYear, null);

  const [lebron] = searchDirectory(DIRECTORY, 'lebron');
  assert.equal(lebron.firstName, 'LeBron');
  assert.equal(lebron.lastName, 'James');
  assert.equal(lebron.startYear, 2004);
});

test('mergeSuggestions keeps local order but takes remote fields for shared ids', () => {
  const local = [s(1, 'LeBron', 'James'), s(2, 'Mike', 'James')];
  const remote = [s(2, 'Mike', 'James', [2002, 2014]), s(9, 'New', 'Guy', [2020, 2025])];
  const merged = mergeSuggestions(local, remote);
  assert.deepEqual(merged.map((m) => m.personId), [1, 2, 9]);
  assert.equal(merged[1].startYear, 2002);
});

test('mergeSuggestions dedupes and enforces the cap', () => {
  const local = [s(1, 'A', 'A'), s(1, 'A', 'A'), s(2, 'B', 'B')];
  const remote = [s(3, 'C', 'C'), s(4, 'D', 'D')];
  const merged = mergeSuggestions(local, remote, 3);
  assert.deepEqual(merged.map((m) => m.personId), [1, 2, 3]);
});

test('mergeSuggestions with empty local returns remote in RPC order', () => {
  const remote = [s(5, 'E', 'E'), s(6, 'F', 'F')];
  assert.deepEqual(mergeSuggestions([], remote).map((m) => m.personId), [5, 6]);
});

test('createLruCache evicts the least recently used entry', () => {
  const cache = createLruCache<number>(2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
});

test('createLruCache get refreshes recency', () => {
  const cache = createLruCache<number>(2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.get('a');
  cache.set('c', 3);
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.get('a'), 1);
});
