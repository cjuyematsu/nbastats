// tests/collegeSlugs.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import { ALIASES, canonicalSchool, classifySchool, schoolSlug } from '@/lib/collegeSlugs';

test('alias folding merges known duplicates', () => {
  assert.equal(canonicalSchool('Miami (Florida)'), 'Miami (FL)');
  assert.equal(canonicalSchool('Loyola (Illinois)'), 'Loyola (IL)');
  assert.equal(canonicalSchool('Ohio St.'), 'Ohio State');
  assert.equal(canonicalSchool('UConn'), 'Connecticut');
  assert.equal(canonicalSchool('Mega Leks'), 'Mega Basket');
  assert.equal(canonicalSchool('Texas Western'), 'UTEP');
  assert.equal(canonicalSchool('  Duke  '), 'Duke');
});

test('no alias target is itself an alias key', () => {
  for (const target of Object.values(ALIASES)) {
    assert.ok(!(target in ALIASES), `${target} chains to another alias`);
  }
});

test('slugs handle diacritics, apostrophes, parentheticals, and ampersands', () => {
  assert.equal(schoolSlug('Miami (FL)'), 'miami-fl');
  assert.equal(schoolSlug("Saint Joseph's"), 'saint-josephs');
  assert.equal(schoolSlug('Žalgiris Kaunas'), 'zalgiris-kaunas');
  assert.equal(schoolSlug('Texas A&M'), 'texas-a-m');
  assert.equal(schoolSlug('Lower Merion HS'), 'lower-merion-hs');
  assert.equal(schoolSlug('Beşiktaş'), 'besiktas');
});

test('nearby schools keep distinct slugs', () => {
  const names = [
    'Miami (FL)', 'Miami (OH)', 'Loyola (IL)', 'Loyola (MD)', 'Loyola Marymount',
    "Saint Mary's (CA)", "St. Mary's (Canada)", "St. Mary's (Texas)",
    'Butler', 'Butler CC', 'Washington', 'Washington State',
  ];
  const slugs = names.map(schoolSlug);
  assert.equal(new Set(slugs).size, names.length);
});

test('classification buckets colleges, high schools, and clubs', () => {
  assert.equal(classifySchool('Duke'), 'college');
  assert.equal(classifySchool('Lower Merion HS'), 'high-school');
  assert.equal(classifySchool('Oak Hill Academy'), 'high-school');
  assert.equal(classifySchool('St. Patrick\'s High School'), 'high-school');
  assert.equal(classifySchool('South Kent School'), 'high-school');
  assert.equal(classifySchool('Real Madrid'), 'club');
  assert.equal(classifySchool('NBA G League Ignite'), 'club');
  assert.equal(classifySchool('Birmingham, Alabama'), 'club');
  assert.equal(classifySchool('Some Future College'), 'college');
});
