//app/player/[playerId]/PlayerStatsTables.tsx

import Image from 'next/image';
import { CareerStatsData } from '@/types/stats';
import {
  compactPercentileLabel,
  isCareerStatDisplayable,
  isCareerStatReliable,
  isSeasonStatDisplayable,
  isStatSelfConsistent,
  FG_FROM,
  type PercentileKey,
} from '@/lib/percentiles';
import { QUALIFYING_GAMES } from '@/app/data/statPercentiles';
import { teamLogo } from '@/lib/teamLogos';

export interface SeasonRow {
  SeasonYear: number;
  playerteamName: string;
  G: number | null;
  PTS_per_g: number | null;
  TRB_per_g: number | null;
  AST_per_g: number | null;
  FG_PCT: number | null;
  FG3_PCT: number | null;
  // Makes/attempts aren't displayed, but the percentages above are only shown
  // when their pair holds together (see isSeasonStatDisplayable).
  FGM_total: number | null;
  FGA_total: number | null;
  FG3M_total: number | null;
  FG3A_total: number | null;
}

const formatStat = (value: number | string | null | undefined, decimalPlaces: number = 1): string => {
  if (value === null || typeof value === 'undefined' || String(value).trim() === '') return 'N/A';
  const numValue: number = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  return numValue.toFixed(decimalPlaces);
};

const formatPercentage = (value: number | string | null | undefined): string => {
  if (value === null || typeof value === 'undefined' || String(value).trim() === '') return 'N/A';
  const numValue: number = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  return (numValue * 100).toFixed(1) + '%';
};

// Every stat row carries its abbreviation in parens ("Points Per Game (PPG)").
// Phones show just the abbreviation, and the shorter "98.72th pct" percentile,
// so the essentials fit without a sideways scroll; sm+ gets the full wording.
const shortLabel = (label: string) => label.match(/\(([^)]+)\)\s*$/)?.[1] ?? label;

const StatLabel = ({ label }: { label: string }) => (
  <>
    <span className="sm:hidden">{shortLabel(label)}</span>
    <span className="hidden sm:inline">{label}</span>
  </>
);

const PercentileCell = ({ pct }: { pct?: string }) =>
  pct == null ? (
    <>-</>
  ) : (
    <>
      <span className="sm:hidden">{compactPercentileLabel(pct)}</span>
      <span className="hidden sm:inline">{pct}</span>
    </>
  );

export function SeasonBySeasonTable({ seasons }: { seasons: SeasonRow[] }) {
  if (seasons.length === 0) return null;
  const th = 'px-3 py-3 text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider transition-colors duration-200';
  const td = 'px-3 py-2 whitespace-nowrap text-sm transition-colors duration-200';
  return (
    <section className="mb-6">
      <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-gray-200 dark:border-slate-600 pb-2 transition-colors duration-200">
        Season-by-Season Stats
      </h3>
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-slate-600">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
          <thead className="bg-gray-50 dark:bg-slate-600 transition-colors duration-200">
            <tr>
              <th className={`${th} text-left`}>Season</th>
              <th className={`${th} text-left`}>Team</th>
              <th className={`${th} text-right`}>G</th>
              <th className={`${th} text-right`}>PPG</th>
              <th className={`${th} text-right`}>RPG</th>
              <th className={`${th} text-right`}>APG</th>
              <th className={`${th} text-right`}>FG%</th>
              <th className={`${th} text-right`}>3P%</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600 transition-colors duration-200">
            {seasons.map((s) => (
              <tr key={`${s.SeasonYear}-${s.playerteamName}`}>
                <td className={`${td} text-slate-600 dark:text-slate-300`}>{s.SeasonYear}</td>
                <td className={`${td} text-slate-600 dark:text-slate-300`}>
                  <span className="flex items-center gap-1.5">
                    {teamLogo(s.playerteamName) && (
                      <Image
                        src={teamLogo(s.playerteamName)!}
                        alt=""
                        width={18}
                        height={18}
                        className="h-[18px] w-[18px] object-contain"
                      />
                    )}
                    {s.playerteamName}
                  </span>
                </td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{s.G ?? 'N/A'}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{formatStat(s.PTS_per_g)}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{formatStat(s.TRB_per_g)}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{formatStat(s.AST_per_g)}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{isSeasonStatDisplayable(s.SeasonYear, s, 'fg_pct') ? formatPercentage(s.FG_PCT) : '-'}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{isSeasonStatDisplayable(s.SeasonYear, s, 'fg3_pct') ? formatPercentage(s.FG3_PCT) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// One row of the Averages table; percentileKey links it to the precomputed
// all-time pool (rows without one, like turnovers, never show a percentile).
const AVERAGE_ROWS: {
  label: string;
  field: keyof CareerStatsData;
  kind: 'stat' | 'pct';
  percentileKey?: PercentileKey;
}[] = [
  { label: 'Points Per Game (PPG)', field: 'pts_per_g', kind: 'stat', percentileKey: 'ppg' },
  { label: 'Assists Per Game (APG)', field: 'ast_per_g', kind: 'stat', percentileKey: 'apg' },
  { label: 'Rebounds Per Game (RPG)', field: 'trb_per_g', kind: 'stat', percentileKey: 'rpg' },
  { label: 'Steals Per Game (SPG)', field: 'stl_per_g', kind: 'stat', percentileKey: 'spg' },
  { label: 'Blocks Per Game (BPG)', field: 'blk_per_g', kind: 'stat', percentileKey: 'bpg' },
  { label: 'Turnovers Per Game (TOVPG)', field: 'tov_per_g', kind: 'stat', percentileKey: 'tovpg' },
  { label: 'Personal Fouls Per Game (PFPG)', field: 'pf_per_g', kind: 'stat', percentileKey: 'pfpg' },
  { label: 'Field Goal % (FG%)', field: 'fg_pct', kind: 'pct', percentileKey: 'fg_pct' },
  { label: '3-Point % (3P%)', field: 'fg3_pct', kind: 'pct', percentileKey: 'fg3_pct' },
  { label: 'Free Throw % (FT%)', field: 'ft_pct', kind: 'pct', percentileKey: 'ft_pct' },
  { label: 'Effective Field Goal % (eFG%)', field: 'efg_pct', kind: 'pct', percentileKey: 'efg_pct' },
  { label: 'True Shooting % (TS%)', field: 'ts_pct', kind: 'pct', percentileKey: 'ts_pct' },
];

// One row of the Totals table; multi-field rows render "made - attempted" and
// rank on the makes (attempts are volume, makes are the achievement).
const TOTAL_ROWS: {
  label: string;
  fields: (keyof CareerStatsData)[];
  percentileKey?: PercentileKey;
}[] = [
  { label: 'Games Played (G)', fields: ['games_played'], percentileKey: 'games' },
  { label: 'Points (PTS)', fields: ['pts_total'], percentileKey: 'pts_total' },
  { label: 'Assists (AST)', fields: ['ast_total'], percentileKey: 'ast_total' },
  { label: 'Total Rebounds (TRB)', fields: ['trb_total'], percentileKey: 'trb_total' },
  { label: 'Steals (STL)', fields: ['stl_total'], percentileKey: 'stl_total' },
  { label: 'Blocks (BLK)', fields: ['blk_total'], percentileKey: 'blk_total' },
  { label: 'Field Goals (FGM-FGA)', fields: ['fgm_total', 'fga_total'], percentileKey: 'fgm_total' },
  { label: '3-Pointers (3PM-3PA)', fields: ['fg3m_total', 'fg3a_total'], percentileKey: 'fg3m_total' },
  { label: 'Free Throws (FTM-FTA)', fields: ['ftm_total', 'fta_total'], percentileKey: 'ftm_total' },
  { label: 'Turnovers (TOV)', fields: ['tov_total'], percentileKey: 'tov_total' },
  { label: 'Personal Fouls (PF)', fields: ['pf_total'], percentileKey: 'pf_total' },
];

export function StatsTable({
  stats,
  title,
  statType,
  percentiles,
  // Derived from the generated pool so copy can't drift from the actual gate.
  poolDescription = `${QUALIFYING_GAMES}+ career regular-season games`,
}: {
  stats: CareerStatsData | null;
  title: string;
  statType: 'Totals' | 'Averages';
  // undefined = percentiles not requested for this table; null = requested but
  // the player hasn't met the pool's games floor yet (drives the explainer note).
  percentiles?: Partial<Record<PercentileKey, string>> | null;
  poolDescription?: string;
}) {
    if (!stats || stats.games_played === null || stats.games_played === 0) {
        return (
            <div className="mt-6 p-6 bg-gray-50 dark:bg-slate-600 rounded-xl shadow-md border border-gray-200 dark:border-slate-500 transition-colors duration-200">
                 <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200 transition-colors duration-200">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 transition-colors duration-200">No {title.toLowerCase().includes("playoff") ? "playoff" : "regular season"} stats available for this player.</p>
            </div>
        );
    }
    const tableHeaderLabel = statType === "Totals" ? "Total" : "Average";
    const showPercentiles = percentiles != null;
    // Explain the dashes so they read as intentional, not as a broken page.
    // Two things cause them: an era that didn't log the stat (FG_FROM, ~1980,
    // is the broadest gate), or a row whose makes exceed its attempts, which
    // happens to a handful of players in any era.
    const earlyEra = (stats.startYear ?? 9999) < FG_FROM;
    const hasInconsistent = (['fg_pct', 'fg3_pct', 'ft_pct', 'efg_pct', 'ts_pct'] as const).some(
      (k) => !isStatSelfConsistent(stats, k),
    );
    return (
        <section className="mb-6">
            <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-gray-200 dark:border-slate-600 pb-2 transition-colors duration-200">{title}</h3>
            {earlyEra && (
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Some stats from this player&apos;s era were not tracked or not fully logged
                league-wide, so those rows show a dash. Points, rebounds, assists, free throws, and
                games are complete for every era.
              </p>
            )}
            {hasInconsistent && (
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Some attempt counts are missing from the box scores behind these totals, which would
                make the matching percentage read above 100%. Those show a dash instead. The makes
                are shown as recorded.
              </p>
            )}
            <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-slate-600">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                <thead className="bg-gray-50 dark:bg-slate-600 transition-colors duration-200">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider transition-colors duration-200">Statistic</th>
                    <th className="px-2 sm:px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider transition-colors duration-200">{tableHeaderLabel}</th>
                    {showPercentiles && (
                      <th className="px-2 sm:px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider transition-colors duration-200">All-Time</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600 transition-colors duration-200">
                  {statType === "Totals" ? (
                    <>
                      {TOTAL_ROWS.map((row) => {
                        const reliable =
                          !row.percentileKey || isCareerStatReliable(stats.startYear, row.percentileKey);
                        // When a make/attempt pair doesn't hold together, only the
                        // attempts are suspect -- the makes reconcile against points.
                        // Show "13 - -" rather than dropping a real total.
                        const consistent =
                          !row.percentileKey || isStatSelfConsistent(stats, row.percentileKey);
                        const value = !reliable
                          ? '-'
                          : row.fields
                              .map((f, i) =>
                                !consistent && i > 0
                                  ? '-'
                                  : (stats[f] as number | null)?.toLocaleString() ?? 'N/A',
                              )
                              .join(' - ');
                        const pct = row.percentileKey ? percentiles?.[row.percentileKey] : undefined;
                        return (
                          <tr key={row.label}>
                            <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">
                              <StatLabel label={row.label} />
                            </td>
                            <td className="px-2 sm:px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{value}</td>
                            {showPercentiles && (
                              <td className="px-2 sm:px-4 py-2 text-right text-sm font-mono whitespace-nowrap text-slate-500 dark:text-slate-400 transition-colors duration-200">
                                <PercentileCell pct={pct} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {AVERAGE_ROWS.map((row) => {
                        const raw = stats[row.field] as number | null;
                        const reliable =
                          !row.percentileKey || isCareerStatDisplayable(stats, row.percentileKey);
                        const pct = row.percentileKey ? percentiles?.[row.percentileKey] : undefined;
                        return (
                          <tr key={row.label}>
                            <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">
                              <StatLabel label={row.label} />
                            </td>
                            <td className="px-2 sm:px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">
                              {!reliable ? '-' : row.kind === 'pct' ? formatPercentage(raw) : formatStat(raw)}
                            </td>
                            {showPercentiles && (
                              <td className="px-2 sm:px-4 py-2 text-right text-sm font-mono whitespace-nowrap text-slate-500 dark:text-slate-400 transition-colors duration-200">
                                <PercentileCell pct={pct} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {showPercentiles ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Percentile (or exact rank for top-25 finishes) among players with {poolDescription}.
                All stats rank by volume, including turnovers and fouls.
                {' '}A dash means the stat was not tracked or not fully logged league-wide in that
                era, or the player lacks enough attempts to rank. The NBA did not record steals and
                blocks until 1973-74 or turnovers until 1977-78; field-goal attempts are not fully
                logged before 1980 (so shooting percentages), and 3-point percentages stabilize from
                the 1982-83 season. Made shots, free throws, and points are complete for every era.
              </p>
            ) : percentiles === null ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                All-time percentile ranks appear once a player reaches {poolDescription}.
              </p>
            ) : null}
        </section>
    );
}
