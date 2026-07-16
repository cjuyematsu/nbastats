// app/players/page.tsx
//
// Crawlable A-Z index of notable NBA players. Gives search crawlers (and users)
// a shallow path to the thousands of /player/[id] profile pages instead of
// relying on deep teammate-graph walking.

import type { Metadata } from 'next';
import Link from 'next/link';
import { PLAYER_DIRECTORY } from '@/app/data/playerDirectory';
import PlayerDirectoryBrowser from './PlayerDirectoryBrowser';
import { breadcrumbLd } from '@/lib/jsonLd';

export const metadata: Metadata = {
  title: 'NBA Player Directory: Career Stats A-Z',
  description:
    'Browse NBA players A-Z. Find career stats, per-game averages, and season-by-season totals for every notable player in NBA history.',
  keywords: ['nba player directory', 'nba players list', 'nba player stats a-z', 'all nba players', 'nba career stats'],
  alternates: { canonical: '/players' },
  openGraph: {
    title: 'NBA Player Directory: Career Stats A-Z',
    description: 'Browse NBA players A-Z and find career stats for every notable player in NBA history.',
    url: '/players',
  },
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function PlayersDirectoryPage() {
  const counts = new Map<string, number>();
  for (const p of PLAYER_DIRECTORY) counts.set(p.letter, (counts.get(p.letter) ?? 0) + 1);

  const breadcrumb = breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Player Directory', path: '/players' },
  ]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            NBA Player Directory
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
            Browse {PLAYER_DIRECTORY.length.toLocaleString()} notable players by last name. Each profile has
            full career stats, per-game averages, season-by-season tables, and their most frequent teammates.
          </p>
        </header>

        <PlayerDirectoryBrowser players={PLAYER_DIRECTORY} mode="search" />

        <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Browse by last name
        </h2>
        <nav aria-label="Players by letter" className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
          {ALPHABET.map((letter) => {
            const count = counts.get(letter) ?? 0;
            return count > 0 ? (
              <Link
                key={letter}
                href={`/players/${letter.toLowerCase()}`}
                className="flex flex-col items-center justify-center py-3 rounded-lg bg-slate-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 hover:border-sky-400 hover:shadow-md transition-all"
              >
                <span className="text-xl font-bold text-sky-600 dark:text-sky-400">{letter}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{count}</span>
              </Link>
            ) : (
              <span
                key={letter}
                className="flex flex-col items-center justify-center py-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700 text-slate-300 dark:text-slate-600"
              >
                <span className="text-xl font-bold">{letter}</span>
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
