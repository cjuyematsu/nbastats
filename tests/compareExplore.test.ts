// tests/compareExplore.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import { exploreLinksForNames } from '@/lib/compareExplore';
import { buildCompareSlug } from '@/app/data/compareMatchups';

test('returns matchups involving a selected player', () => {
  const links = exploreLinksForNames(['LeBron James']);
  assert.ok(links.length > 0);
  for (const l of links) {
    assert.ok(l.a === 'LeBron James' || l.b === 'LeBron James');
  }
});

test('excludes the current pair by canonical slug', () => {
  const exclude = buildCompareSlug('LeBron James', 'Michael Jordan');
  const links = exploreLinksForNames(['LeBron James', 'Michael Jordan'], exclude, 50);
  for (const l of links) {
    assert.notEqual(buildCompareSlug(l.a, l.b), exclude);
  }
});

test('dedupes by canonical pair identity', () => {
  const links = exploreLinksForNames(['LeBron James', 'Kevin Durant'], null, 50);
  const canonicals = links.map((l) => buildCompareSlug(l.a, l.b));
  assert.equal(new Set(canonicals).size, canonicals.length);
});

test('respects the count cap', () => {
  const links = exploreLinksForNames(['LeBron James', 'Stephen Curry'], null, 6);
  assert.equal(links.length, 6);
});

test('returns empty for unknown names and empty input', () => {
  assert.deepEqual(exploreLinksForNames(['Nobody Realman']), []);
  assert.deepEqual(exploreLinksForNames([]), []);
});
