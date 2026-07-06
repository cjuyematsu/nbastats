// app/top-100-players/TrendingStrip.tsx

'use client';

import { useMemo } from 'react';
import type { TopPlayer } from './types';

interface TrendingStripProps {
  players: TopPlayer[];
}

interface TrendRow {
  player: TopPlayer;
  net: number;
  total: number;
}

function TrendItem({ player, badge, badgeClass, sub }: { player: TopPlayer; badge: string; badgeClass: string; sub: string }) {
  return (
    <a href={`#player-card-${player.personId}`} className="flex items-center justify-between gap-2 py-0.5 hover:underline">
      <span className="truncate text-slate-700 dark:text-slate-200">
        <span className="text-slate-400 dark:text-slate-500 tabular-nums">#{player.rankNumber}</span>{' '}
        {player.firstName} {player.lastName}
      </span>
      <span className="flex-none flex items-center gap-2">
        <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{sub}</span>
        <span className={`font-bold tabular-nums ${badgeClass}`}>{badge}</span>
      </span>
    </a>
  );
}

export default function TrendingStrip({ players }: TrendingStripProps) {
  const { gaining, slipping, lockedIn, totalVotes } = useMemo(() => {
    const rows: TrendRow[] = players
      .map((p) => ({ player: p, net: p.upvotes - p.downvotes, total: p.upvotes + p.downvotes + p.sameSpotVotes }))
      .filter((r) => r.total > 0);

    const gaining = rows
      .filter((r) => r.net > 0)
      .sort((a, b) => b.net - a.net || b.total - a.total)
      .slice(0, 3);
    const slipping = rows
      .filter((r) => r.net < 0)
      .sort((a, b) => a.net - b.net || b.total - a.total)
      .slice(0, 3);
    const lockedIn = rows
      .filter((r) => r.player.sameSpotVotes > 0)
      .sort((a, b) => b.player.sameSpotVotes - a.player.sameSpotVotes)
      .slice(0, 3);
    const totalVotes = rows.reduce((s, r) => s + r.total, 0);

    return { gaining, slipping, lockedIn, totalVotes };
  }, [players]);

  if (totalVotes === 0) return null;

  return (
    <div className="max-w-3xl mx-auto mb-4 p-3 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-900/15">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-sky-700 dark:text-sky-300 uppercase text-xs tracking-wide">
          Trending this cycle
        </p>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {totalVotes} vote{totalVotes === 1 ? '' : 's'} in, applied at the next reshuffle
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {gaining.length > 0 && (
          <div>
            <p className="font-bold text-green-700 dark:text-green-300 uppercase text-xs tracking-wide mb-1.5">Gaining support</p>
            {gaining.map((r) => (
              <TrendItem
                key={r.player.personId}
                player={r.player}
                badge={`+${r.net}`}
                badgeClass="text-green-600 dark:text-green-400"
                sub={`${r.player.upvotes}▲`}
              />
            ))}
          </div>
        )}
        {slipping.length > 0 && (
          <div>
            <p className="font-bold text-red-700 dark:text-red-300 uppercase text-xs tracking-wide mb-1.5">Losing ground</p>
            {slipping.map((r) => (
              <TrendItem
                key={r.player.personId}
                player={r.player}
                badge={`${r.net}`}
                badgeClass="text-red-500 dark:text-red-400"
                sub={`${r.player.downvotes}▼`}
              />
            ))}
          </div>
        )}
        {lockedIn.length > 0 && (
          <div>
            <p className="font-bold text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wide mb-1.5">Fans say: stay put</p>
            {lockedIn.map((r) => (
              <TrendItem
                key={r.player.personId}
                player={r.player}
                badge={`${r.player.sameSpotVotes}`}
                badgeClass="text-sky-600 dark:text-sky-400"
                sub="✓"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
