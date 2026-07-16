// app/players/PlayerDirectoryBrowser.tsx
//
// Client browse layer over the player directory. Renders stat-preview cards with
// live name search and sort. In mode="all" (letter pages) every card is in the
// initial SSR HTML so crawlers see the full list; the controls only reorder/hide
// on the client. In mode="search" (the index) cards appear once the user types,
// keeping the index light while the alphabet grid remains the crawl path.

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { DirectoryPlayer } from '@/app/data/playerDirectory';

type SortKey = 'az' | 'points' | 'games' | 'ppg';

const SORT_LABELS: Record<SortKey, string> = {
  az: 'A-Z',
  points: 'Points',
  games: 'Games',
  ppg: 'PPG',
};

const ppgOf = (p: DirectoryPlayer) => (p.games > 0 ? p.points / p.games : 0);

export default function PlayerDirectoryBrowser({
  players,
  mode = 'all',
}: {
  players: DirectoryPlayer[];
  mode?: 'all' | 'search';
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('az');
  const norm = q.trim().toLowerCase();

  const results = useMemo(() => {
    const list = norm ? players.filter((p) => p.name.toLowerCase().includes(norm)) : players;
    const sorted = [...list];
    switch (sort) {
      case 'points':
        sorted.sort((a, b) => b.points - a.points);
        break;
      case 'games':
        sorted.sort((a, b) => b.games - a.games);
        break;
      case 'ppg':
        sorted.sort((a, b) => ppgOf(b) - ppgOf(a));
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [players, norm, sort]);

  const showCards = mode === 'all' || norm.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === 'search' ? 'Search all players by name…' : 'Search this list…'}
          aria-label="Search players by name"
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <div className="flex items-center gap-1 text-sm" role="group" aria-label="Sort players">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              aria-pressed={sort === k}
              className={
                sort === k
                  ? 'px-3 py-1.5 rounded-lg bg-sky-500 dark:bg-sky-600 text-white font-semibold'
                  : 'px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {!showCards ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Type a name to search all {players.length.toLocaleString()} notable players, or browse by
          letter below.
        </p>
      ) : results.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No players match &ldquo;{q}&rdquo;.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((p) => (
            <li key={p.id}>
              <Link
                href={`/player/${p.id}`}
                className="block p-3 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-sky-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className="font-semibold text-sky-600 dark:text-sky-400">{p.name}</span>
                <span className="block mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {p.points.toLocaleString()} pts · {p.games.toLocaleString()} G
                  {p.games > 0 && ` · ${ppgOf(p).toFixed(1)} PPG`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
