// app/compare/all/page.tsx
//
// Crawlable directory of every comparison page. Curated matchups plus the full
// strategic cross-product — the latter are otherwise sitemap-only orphans with
// no internal links, which keeps them out of the index. This page is the shallow
// door that lets crawlers reach them. A client filter narrows the (large) list
// by player name without hiding anything from the initial SSR HTML.

import type { Metadata } from 'next';
import Link from 'next/link';
import { COMPARE_MATCHUPS } from '@/app/data/compareMatchups';
import { strategicComparePairs } from '@/app/data/strategicPlayers';
import DirectoryFilter, { type FilterGroup } from '@/components/DirectoryFilter';
import { breadcrumbLd } from '@/lib/jsonLd';

export const metadata: Metadata = {
  title: 'All NBA Player Comparisons',
  description:
    'Browse every head-to-head NBA player comparison: LeBron vs Jordan, Kobe vs Jordan, Curry vs Durant, and hundreds more, side by side.',
  keywords: ['nba player comparisons', 'nba head to head', 'compare nba players', 'nba matchups', 'nba player vs player'],
  alternates: { canonical: '/compare/all' },
  openGraph: {
    title: 'All NBA Player Comparisons',
    description: 'Browse every head-to-head NBA player comparison, side by side.',
    url: '/compare/all',
  },
};

export default function AllComparisonsPage() {
  const strategic = strategicComparePairs().sort(
    (x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b),
  );

  const groups: FilterGroup[] = [
    {
      title: 'Featured Matchups',
      entries: COMPARE_MATCHUPS.map((m) => ({
        key: m.slug,
        label: `${m.a} vs ${m.b}`,
        href: `/compare/${m.slug}`,
        keywords: `${m.a} ${m.b}`,
      })),
    },
    {
      title: 'All-Time & Cross-Era Matchups',
      entries: strategic.map((m) => ({
        key: m.slug,
        label: `${m.a} vs ${m.b}`,
        href: `/compare/${m.slug}`,
        keywords: `${m.a} ${m.b}`,
      })),
    },
  ];

  const breadcrumb = breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Comparison Tool', path: '/compare' },
    { name: 'All Comparisons', path: '/compare/all' },
  ]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          <Link href="/compare" className="hover:underline text-sky-600 dark:text-sky-400">
            Comparison Tool
          </Link>{' '}
          / All Comparisons
        </nav>

        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            All NBA Player Comparisons
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
            Every head-to-head comparison on HoopsData. Pick any matchup to see two players&apos; stats
            side by side by age and season, or build your own with the{' '}
            <Link href="/compare" className="text-sky-600 dark:text-sky-400 hover:underline">
              comparison tool
            </Link>
            .
          </p>
        </header>

        <DirectoryFilter groups={groups} placeholder="Filter comparisons by player…" />
      </div>
    </div>
  );
}
