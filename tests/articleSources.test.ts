import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSources } from '../lib/articleSources';

test('parseSources drops malformed entries', () => {
  assert.deepEqual(parseSources(null), []);
  assert.deepEqual(parseSources({}), []);
  const parsed = parseSources([
    { label: 'ok', url: 'https://example.com' },
    { label: 'bad-url', url: 'javascript:alert(1)' },
    { label: 42, url: 'https://example.com' },
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].label, 'ok');
});

test('parseSources accepts legacy title-keyed rows', () => {
  const parsed = parseSources([
    { title: 'NBA.com: 15 greatest Finals duos', url: 'https://www.nba.com/news/x' },
    { label: 'label wins over title', title: 'ignored', url: 'https://example.com' },
  ]);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].label, 'NBA.com: 15 greatest Finals duos');
  assert.equal(parsed[1].label, 'label wins over title');
});
