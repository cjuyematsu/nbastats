// lib/articleExplore.ts
//
// Pure helpers for the article retention modules: related-article picking
// (title word overlap, articles have no tags column) and the end-of-article
// explore links registry.

import { duoHref } from '@/app/data/duoPages';

export interface RelatedArticleCandidate {
  slug: string;
  title: string;
  dek: string | null;
  kind: string;
  published_at: string | null;
}

export interface ArticleExploreItem {
  href: string;
  title: string;
  subtitle?: string;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'and', 'to', 'for', 'vs', 'is', 'are',
  'how', 'what', 'why', 'who', 'all', 'time', 'nba', 'basketball',
]);

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  );
}

export function pickRelatedArticles(
  current: { slug: string; title: string; kind: string },
  candidates: RelatedArticleCandidate[],
  count = 3
): RelatedArticleCandidate[] {
  const words = titleWords(current.title);
  return candidates
    .filter((c) => c.slug !== current.slug)
    .map((c) => {
      let score = 0;
      for (const w of titleWords(c.title)) if (words.has(w)) score += 2;
      if (c.kind === current.kind) score += 1;
      return { c, score };
    })
    .sort(
      (x, y) =>
        y.score - x.score ||
        (y.c.published_at ?? '').localeCompare(x.c.published_at ?? '')
    )
    .slice(0, count)
    .map(({ c }) => c);
}

const DEFAULT_ITEMS: ArticleExploreItem[] = [
  { href: '/compare', title: 'Compare any two players', subtitle: 'Career stats side by side' },
  { href: '/top-100-players', title: 'Top 100 players', subtitle: 'Vote on the community ranking' },
  { href: '/#daily', title: "Play today's challenges", subtitle: 'Daily NBA trivia games' },
];

const REGISTRY: Record<string, ArticleExploreItem[]> = {
  'greatest-duos': [
    {
      href: `/duos/${duoHref('Michael Jordan', 'Scottie Pippen')}`,
      title: 'Jordan and Pippen',
      subtitle: 'Their full record together',
    },
    {
      href: `/duos/${duoHref("Shaquille O'Neal", 'Kobe Bryant')}`,
      title: 'Shaq and Kobe',
      subtitle: 'Their full record together',
    },
    {
      href: `/duos/${duoHref('Stephen Curry', 'Klay Thompson')}`,
      title: 'Curry and Thompson',
      subtitle: 'Their full record together',
    },
    { href: '/duos', title: 'Look up any duo', subtitle: 'Every teammate pair in NBA history' },
    { href: '/compare', title: 'Compare any two players', subtitle: 'Career stats side by side' },
  ],
};

export function exploreItemsForArticle(article: {
  slug: string;
  component_key: string | null;
}): ArticleExploreItem[] {
  return REGISTRY[article.slug] ?? REGISTRY[article.component_key ?? ''] ?? DEFAULT_ITEMS;
}
