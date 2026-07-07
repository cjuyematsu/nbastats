// app/top-100-players/TrendingStrip.tsx

'use client';

import { useMemo } from 'react';
import type { TopPlayer } from './types';

interface TrendingStripProps {
  players: TopPlayer[];
}

function TrendItem({ player, count, cls }: { player: TopPlayer; count: number; cls: string }) {
  return (
    <a href={`#player-card-${player.personId}`} className="flex justify-between gap-2 py-0.5 hover:underline">
      <span className="truncate text-slate-700 dark:text-slate-200">
        <span className="text-slate-400 dark:text-slate-500 tabular-nums">#{player.rankNumber}</span>{' '}
        {player.firstName} {player.lastName}
      </span>
      <span className={`flex-none font-bold tabular-nums ${cls}`}>{count}</span>
    </a>
  );
}

export default function TrendingStrip({ players }: TrendingStripProps) {
  const { gaining, slipping, lockedIn, totalVotes } = useMemo(() => {
    const voters = players.filter((p) => p.upvotes + p.downvotes + p.sameSpotVotes > 0);

    // Top 3 by each vote type; ties broken by placement (better rank first).
    const topBy = (count: (p: TopPlayer) => number) =>
      voters
        .filter((p) => count(p) > 0)
        .sort((a, b) => count(b) - count(a) || a.rankNumber - b.rankNumber)
        .slice(0, 3);

    const gaining = topBy((p) => p.upvotes);
    const slipping = topBy((p) => p.downvotes);
    const lockedIn = topBy((p) => p.sameSpotVotes);
    const totalVotes = voters.reduce((s, p) => s + p.upvotes + p.downvotes + p.sameSpotVotes, 0);

    return { gaining, slipping, lockedIn, totalVotes };
  }, [players]);

  if (totalVotes === 0) return null;

  return (
    <div className="max-w-3xl mx-auto mb-4 p-3 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-900/15">
      <div className="flex items-center justify-between mb-2">
        <p className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300 uppercase text-xs tracking-wide">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
          Trending this cycle
        </p>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {totalVotes} vote{totalVotes === 1 ? '' : 's'} in
        </span>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-center gap-4 sm:gap-10 text-sm">
        {gaining.length > 0 && (
          <div className="w-full sm:w-52">
            <p className="font-bold text-green-700 dark:text-green-300 uppercase text-xs tracking-wide mb-1.5">Gaining support</p>
            {gaining.map((p) => (
              <TrendItem key={p.personId} player={p} count={p.upvotes} cls="text-green-600 dark:text-green-400" />
            ))}
          </div>
        )}
        {slipping.length > 0 && (
          <div className="w-full sm:w-52">
            <p className="font-bold text-red-700 dark:text-red-300 uppercase text-xs tracking-wide mb-1.5">Losing ground</p>
            {slipping.map((p) => (
              <TrendItem key={p.personId} player={p} count={p.downvotes} cls="text-red-500 dark:text-red-400" />
            ))}
          </div>
        )}
        {lockedIn.length > 0 && (
          <div className="w-full sm:w-52">
            <p className="font-bold text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wide mb-1.5">Fans say: stay put</p>
            {lockedIn.map((p) => (
              <TrendItem key={p.personId} player={p} count={p.sameSpotVotes} cls="text-sky-600 dark:text-sky-400" />
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-snug text-center">
        Each number is that player&apos;s vote count this cycle, applied at the next reshuffle.
      </p>
    </div>
  );
}
