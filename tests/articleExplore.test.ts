// tests/articleExplore.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exploreItemsForArticle,
  pickRelatedArticles,
  type RelatedArticleCandidate,
} from '@/lib/articleExplore';

function candidate(
  slug: string,
  title: string,
  kind = 'markdown',
  published_at: string | null = '2026-01-01'
): RelatedArticleCandidate {
  return { slug, title, dek: null, kind, published_at };
}

test('pickRelatedArticles ranks by title overlap and excludes the current article', () => {
  const current = { slug: 'greatest-duos-in-nba-history', title: 'The Greatest Duos in NBA History', kind: 'component' };
  const picks = pickRelatedArticles(current, [
    candidate('greatest-duos-in-nba-history', 'The Greatest Duos in NBA History'),
    candidate('best-duos-2026', 'The Best Active Duos of 2026'),
    candidate('salary-analysis', 'Salary vs Performance Analysis'),
    candidate('greatest-scorers', 'The Greatest Scorers in NBA History'),
  ], 2);
  assert.deepEqual(picks.map((p) => p.slug), ['greatest-scorers', 'best-duos-2026']);
});

test('pickRelatedArticles breaks score ties by newest publish date', () => {
  const current = { slug: 'x', title: 'Draft Night Steals', kind: 'markdown' };
  const picks = pickRelatedArticles(current, [
    candidate('old', 'Unrelated Topic One', 'markdown', '2025-01-01'),
    candidate('new', 'Unrelated Topic Two', 'markdown', '2026-06-01'),
  ], 1);
  assert.equal(picks[0].slug, 'new');
});

test('greatest-duos gets duo links first', () => {
  const items = exploreItemsForArticle({ slug: 'greatest-duos-in-nba-history', component_key: 'greatest-duos' });
  assert.ok(items[0].href.startsWith('/duos/'));
  assert.ok(items.some((i) => i.href === '/duos'));
  assert.ok(items.some((i) => i.href === '/compare'));
});

test('unknown articles fall back to default tool links', () => {
  const items = exploreItemsForArticle({ slug: 'some-new-article', component_key: null });
  assert.deepEqual(items.map((i) => i.href), ['/compare', '/top-100-players', '/#daily']);
});
