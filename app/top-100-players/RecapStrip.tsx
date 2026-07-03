// app/top-100-players/RecapStrip.tsx

'use client';

import type { TopPlayer } from './types';

export interface RecapMover {
  player: TopPlayer;
  change: number;
}

interface RecapStripProps {
  risers: RecapMover[];
  fallers: RecapMover[];
  newEntries: TopPlayer[];
}

function RecapRow({ player, badge, badgeClass }: { player: TopPlayer; badge: string; badgeClass: string }) {
  return (
    <a href={`#player-card-${player.personId}`} className="flex justify-between gap-2 py-0.5 hover:underline">
      <span className="truncate text-slate-700 dark:text-slate-200">
        #{player.rankNumber} {player.firstName} {player.lastName}
      </span>
      <span className={`flex-none font-bold ${badgeClass}`}>{badge}</span>
    </a>
  );
}

export default function RecapStrip({ risers, fallers, newEntries }: RecapStripProps) {
  if (risers.length === 0 && fallers.length === 0 && newEntries.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto mb-4 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
      <p className="font-bold text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wide mb-2">
        Since the last reshuffle
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {risers.length > 0 && (
          <div>
            <p className="font-bold text-green-700 dark:text-green-300 uppercase text-xs tracking-wide mb-1.5">Rising</p>
            {risers.map(({ player, change }) => (
              <RecapRow
                key={player.personId}
                player={player}
                badge={`▲ ${change}`}
                badgeClass="text-green-600 dark:text-green-400"
              />
            ))}
          </div>
        )}
        {fallers.length > 0 && (
          <div>
            <p className="font-bold text-red-700 dark:text-red-300 uppercase text-xs tracking-wide mb-1.5">Falling</p>
            {fallers.map(({ player, change }) => (
              <RecapRow
                key={player.personId}
                player={player}
                badge={`▼ ${Math.abs(change)}`}
                badgeClass="text-red-500 dark:text-red-400"
              />
            ))}
          </div>
        )}
        {newEntries.length > 0 && (
          <div>
            <p className="font-bold text-sky-700 dark:text-sky-300 uppercase text-xs tracking-wide mb-1.5">New entries</p>
            {newEntries.map((player) => (
              <RecapRow
                key={player.personId}
                player={player}
                badge="NEW"
                badgeClass="text-sky-600 dark:text-sky-400"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
