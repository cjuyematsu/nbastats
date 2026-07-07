// app/draft/page.tsx
//
// Crawlable index of every NBA draft class. Replaces the reliance on the
// year-to-year prev/next chain so crawlers reach all draft-year pages directly.

import type { Metadata } from 'next';
import Link from 'next/link';

const FIRST_DRAFT_YEAR = 1955;

export const metadata: Metadata = {
  title: 'NBA Draft History: Every Class & Pick',
  description:
    'Browse every NBA draft class from 1955 to today. See all first and second round picks with career points, games, and PPG for each player.',
  keywords: ['nba draft history', 'nba draft classes', 'nba draft by year', 'nba draft picks', 'nba draft results'],
  alternates: { canonical: '/draft' },
  openGraph: {
    title: 'NBA Draft History: Every Class & Pick',
    description: 'Browse every NBA draft class from 1955 to today with career stats for each pick.',
    url: '/draft',
  },
};

export default function DraftIndexPage() {
  const latest = new Date().getFullYear();
  const years = Array.from({ length: latest - FIRST_DRAFT_YEAR + 1 }, (_, i) => latest - i);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            NBA Draft History
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
            Every NBA draft class from {FIRST_DRAFT_YEAR} to {latest}. Pick a year to see all first and
            second round selections with each player&apos;s career points, games, and points per game.
          </p>
        </header>

        <nav aria-label="Draft classes" className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3">
          {years.map((year) => (
            <Link
              key={year}
              href={`/draft/${year}`}
              className="flex items-center justify-center py-3 rounded-lg bg-slate-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 hover:border-sky-400 hover:shadow-md text-sky-600 dark:text-sky-400 font-semibold transition-all"
            >
              {year}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
