// app/player/[playerId]/PlayerHero.tsx
//
// Server-rendered hero for a player page: the headline averages as bold tiles
// (the instant payoff a searcher sees), an optional shooting-splits row, and a
// team-history logo strip. All static markup — no client JS, crawlable, fast.

import Image from 'next/image';
import { CareerStatsData } from '@/types/stats';
import { teamTimeline } from '@/lib/teamLogos';
import {
  compactPercentileLabel,
  isStatSelfConsistent,
  FG_FROM,
  type PercentileKey,
} from '@/lib/percentiles';

// FG%/3P%/TS% depend on shot attempts, which aren't fully logged before ~1980,
// so the shooting row only shows for players whose career starts in FG_FROM+
// (the shared gate in lib/percentiles).

// Three-across even on a phone, so these tiles get the smaller headline size.
const SHOOTING_VALUE = 'text-xl sm:text-3xl';

// valueClass sizes the headline number: the shooting row packs three tiles
// across even on a phone, so its longer "50.7%" values start a notch smaller
// than the two-across averages row.
function StatTile({
  value,
  label,
  sub,
  valueClass = 'text-2xl sm:text-3xl',
}: {
  value: string;
  label: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 px-2 py-3 sm:px-3 text-center">
      <div className={`${valueClass} font-bold text-slate-900 dark:text-slate-100 tabular-nums`}>
        {value}
      </div>
      <div className="mt-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {sub && (
        <div className="mt-0.5 text-[0.65rem] font-medium leading-tight whitespace-nowrap text-sky-600 dark:text-sky-400">
          {sub}
        </div>
      )}
    </div>
  );
}

const per = (v: number | null | undefined) => (v == null ? 'N/A' : v.toFixed(1));
const pct = (v: number | null | undefined) => (v == null ? 'N/A' : `${(v * 100).toFixed(1)}%`);

const compactSub = (label: string | undefined) =>
  label == null ? label : compactPercentileLabel(label);

export default function PlayerHero({
  player,
  seasons,
  percentiles,
}: {
  player: CareerStatsData;
  seasons: { SeasonYear: number; playerteamName: string | null }[];
  percentiles?: Partial<Record<PercentileKey, string>> | null;
}) {
  const games = player.games_played;
  // Labels arrive self-contained ("3rd all-time" or "98.72th percentile").
  const pctSub = (key: PercentileKey) => compactSub(percentiles?.[key]);
  const showShooting =
    (player.startYear ?? 0) >= FG_FROM &&
    (player.fg_pct != null || player.fg3_pct != null || player.ts_pct != null);
  // A percentage whose make/attempt pair contradicts itself is dashed rather
  // than shown -- these read as e.g. 1300% otherwise.
  const shootingPct = (key: 'fg_pct' | 'fg3_pct' | 'ts_pct') =>
    isStatSelfConsistent(player, key) ? pct(player[key]) : '-';

  const stints = teamTimeline(seasons);
  const lastYear = stints.length ? Math.max(...stints.map((s) => s.endYear)) : null;
  const currentYear = new Date().getFullYear();

  const yearSpan = (start: number, end: number) => {
    const endLabel = end === lastYear && end >= currentYear - 1 ? 'present' : String(end);
    return start === end ? String(start) : `${start}-${endLabel}`;
  };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatTile value={per(player.pts_per_g)} label="PPG" sub={pctSub('ppg')} />
        <StatTile value={per(player.trb_per_g)} label="RPG" sub={pctSub('rpg')} />
        <StatTile value={per(player.ast_per_g)} label="APG" sub={pctSub('apg')} />
        <StatTile
          value={games != null ? games.toLocaleString() : 'N/A'}
          label="Games"
          sub={pctSub('games')}
        />
      </div>

      {showShooting && (
        <div className="mt-2 sm:mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile value={shootingPct('fg_pct')} label="FG%" sub={pctSub('fg_pct')} valueClass={SHOOTING_VALUE} />
          <StatTile value={shootingPct('fg3_pct')} label="3P%" sub={pctSub('fg3_pct')} valueClass={SHOOTING_VALUE} />
          <StatTile value={shootingPct('ts_pct')} label="TS%" sub={pctSub('ts_pct')} valueClass={SHOOTING_VALUE} />
        </div>
      )}

      {stints.length > 0 && (
        <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3">
          {stints.map((s, i) => (
            <div key={`${s.team}-${s.startYear}-${i}`} className="flex flex-col items-center w-16 text-center">
              {s.logo ? (
                <Image
                  src={s.logo}
                  alt={s.team}
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
              ) : (
                <span className="flex h-9 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {s.team.split(/\s+/).pop()}
                </span>
              )}
              <span className="mt-1 text-[0.7rem] leading-tight text-slate-500 dark:text-slate-400">
                {yearSpan(s.startYear, s.endYear)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
