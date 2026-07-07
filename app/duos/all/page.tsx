// app/duos/all/page.tsx
//
// Crawlable directory of every curated duo page. The /duos hub only seeds the
// first 24, so the rest depend on this page (and cross-links) for discovery.

import type { Metadata } from 'next';
import Link from 'next/link';
import { DUO_PAGES } from '@/app/data/duoPages';

export const metadata: Metadata = {
  title: 'All NBA Duos: Records & Games Together',
  description:
    'Browse every NBA duo on HoopsData: Jordan and Pippen, Shaq and Kobe, Curry and Thompson, Stockton and Malone, and more. Games played and record together.',
  keywords: ['nba duos', 'best nba duos', 'nba teammates', 'nba duo stats', 'greatest nba duos'],
  alternates: { canonical: '/duos/all' },
  openGraph: {
    title: 'All NBA Duos: Records & Games Together',
    description: 'Browse every NBA duo: games played and record together.',
    url: '/duos/all',
  },
};

export default function AllDuosPage() {
  const duos = [...DUO_PAGES].sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b));

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          <Link href="/duos" className="hover:underline text-sky-600 dark:text-sky-400">
            Duos Tool
          </Link>{' '}
          / All Duos
        </nav>

        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            All NBA Duos
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
            Every duo page on HoopsData. See how two teammates performed together: games side by side,
            their record as a duo, and shared teams. Or check any pair with the{' '}
            <Link href="/duos" className="text-sky-600 dark:text-sky-400 hover:underline">
              duos tool
            </Link>
            .
          </p>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
          {duos.map((d) => (
            <li key={d.slug}>
              <Link href={`/duos/${d.slug}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                {d.a} &amp; {d.b}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
