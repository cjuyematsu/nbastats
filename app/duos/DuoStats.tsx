// app/duos/DuoStats.tsx
//
// Shared stat tiles for the duo surfaces (detail page, index result card, embed).
// Presentational only (no hooks) so both server and client components can render it.

import { type DuoRow, parseRecord } from '@/lib/duos';

export function StatTile({
  value,
  label,
  size = 'default',
}: {
  value: string;
  label: string;
  size?: 'default' | 'sm';
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-center">
      <p className={`${size === 'sm' ? 'text-2xl' : 'text-3xl'} font-bold text-slate-900 dark:text-white`}>
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default function DuoStats({ row, teams }: { row: DuoRow; teams: string | null }) {
  const record = parseRecord(row.SharedGamesRecord);
  const winPct =
    record && record.wins + record.losses > 0
      ? ((record.wins / (record.wins + record.losses)) * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatTile value={row.SharedGamesTotal?.toLocaleString() ?? 'N/A'} label="Games Together" />
        <StatTile value={row.SharedGamesRecord ?? 'N/A'} label="Record Together" />
        {winPct && <StatTile value={`${winPct}%`} label="Win Percentage" />}
      </div>

      {row.CombinedPtsPerGame != null && (
        <div>
          <p className="text-center text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
            Combined per game
          </p>
          <div className="grid grid-cols-3 gap-4">
            <StatTile size="sm" value={row.CombinedPtsPerGame.toFixed(1)} label="Points" />
            <StatTile size="sm" value={row.CombinedAstPerGame?.toFixed(1) ?? 'N/A'} label="Assists" />
            <StatTile size="sm" value={row.CombinedRebPerGame?.toFixed(1) ?? 'N/A'} label="Rebounds" />
          </div>
        </div>
      )}

      {teams && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Shared Teams</p>
          <p className="text-slate-800 dark:text-slate-200">{teams}</p>
        </div>
      )}
    </div>
  );
}
