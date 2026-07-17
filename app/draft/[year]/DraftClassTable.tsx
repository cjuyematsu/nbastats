// app/draft/[year]/DraftClassTable.tsx
//
// Client table for a draft class. Receives the fully-resolved picks as plain
// data, so every row (and player/school link) is in the initial SSR HTML and
// stays crawlable; the header buttons only reorder rows on the client. Default
// order is by pick, matching the server order.

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { canonicalSchool, schoolSlug } from '@/lib/collegeSlugs';
import { teamLogo } from '@/lib/teamLogos';

export interface DraftPickRow {
  round: number;
  pick: number;
  name: string;
  playerId: number | null;
  team: string | null;
  school: string | null;
  games: number;
  points: number;
  ppg: number | null;
}

type SortKey = 'pick' | 'name' | 'games' | 'points' | 'ppg';

export default function DraftClassTable({
  picks,
  hasStats,
}: {
  picks: DraftPickRow[];
  hasStats: boolean;
}) {
  const [key, setKey] = useState<SortKey>('pick');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const onSort = (k: SortKey) => {
    if (k === key) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setKey(k);
      // Names ascend; stats are most useful high-to-low first.
      setDir(k === 'name' || k === 'pick' ? 'asc' : 'desc');
    }
  };

  const rows = useMemo(() => {
    const sorted = [...picks];
    const sign = dir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      switch (key) {
        case 'name':
          return sign * a.name.localeCompare(b.name);
        case 'games':
          return sign * (a.games - b.games);
        case 'points':
          return sign * (a.points - b.points);
        case 'ppg':
          return sign * ((a.ppg ?? -1) - (b.ppg ?? -1));
        default:
          return sign * (a.round - b.round || a.pick - b.pick);
      }
    });
    return sorted;
  }, [picks, key, dir]);

  const arrow = (k: SortKey) => (k === key ? (dir === 'asc' ? ' ▲' : ' ▼') : '');
  const ariaSort = (k: SortKey): 'ascending' | 'descending' | 'none' =>
    k === key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';

  const thBase =
    'px-3 py-3 text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider';
  const sortBtn = 'inline-flex items-center hover:text-sky-600 dark:hover:text-sky-400';

  return (
    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-slate-600 mb-10">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
        <thead className="bg-gray-50 dark:bg-slate-600">
          <tr>
            <th className={`${thBase} text-left`} aria-sort={ariaSort('pick')}>
              <button type="button" onClick={() => onSort('pick')} className={sortBtn}>
                Pick{arrow('pick')}
              </button>
            </th>
            <th className={`${thBase} text-left`} aria-sort={ariaSort('name')}>
              <button type="button" onClick={() => onSort('name')} className={sortBtn}>
                Player{arrow('name')}
              </button>
            </th>
            <th className={`${thBase} text-left`}>Team</th>
            <th className={`${thBase} text-left hidden sm:table-cell`}>School / Club</th>
            {hasStats && (
              <>
                <th className={`${thBase} text-right`} aria-sort={ariaSort('games')}>
                  <button type="button" onClick={() => onSort('games')} className={sortBtn}>
                    G{arrow('games')}
                  </button>
                </th>
                <th className={`${thBase} text-right`} aria-sort={ariaSort('points')}>
                  <button type="button" onClick={() => onSort('points')} className={sortBtn}>
                    PTS{arrow('points')}
                  </button>
                </th>
                <th className={`${thBase} text-right`} aria-sort={ariaSort('ppg')}>
                  <button type="button" onClick={() => onSort('ppg')} className={sortBtn}>
                    PPG{arrow('ppg')}
                  </button>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600">
          {rows.map((p) => (
            <tr key={`${p.round}-${p.pick}`}>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                {p.round === 2 ? `R2 · ${p.pick}` : p.pick}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold">
                {p.playerId != null ? (
                  <Link href={`/player/${p.playerId}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                    {p.name}
                  </Link>
                ) : (
                  <span className="text-slate-800 dark:text-slate-100">{p.name}</span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  {p.team && teamLogo(p.team) && (
                    <Image
                      src={teamLogo(p.team)!}
                      alt=""
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] object-contain"
                    />
                  )}
                  {p.team ?? 'N/A'}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                {p.school ? (
                  <Link
                    href={`/colleges/${schoolSlug(canonicalSchool(p.school))}`}
                    className="hover:text-sky-600 dark:hover:text-sky-400 hover:underline"
                  >
                    {p.school}
                  </Link>
                ) : (
                  'N/A'
                )}
              </td>
              {hasStats && (
                <>
                  <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">
                    {p.games > 0 ? p.games.toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">
                    {p.points > 0 ? p.points.toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">
                    {p.ppg != null ? p.ppg.toFixed(1) : 'N/A'}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
