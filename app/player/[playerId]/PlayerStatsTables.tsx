//app/player/[playerId]/PlayerStatsTables.tsx

import { CareerStatsData } from '@/types/stats';

export interface SeasonRow {
  SeasonYear: number;
  playerteamName: string;
  G: number | null;
  PTS_per_g: number | null;
  TRB_per_g: number | null;
  AST_per_g: number | null;
  FG_PCT: number | null;
  FG3_PCT: number | null;
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
                <td className={`${td} text-slate-600 dark:text-slate-300`}>{s.playerteamName}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{s.G ?? 'N/A'}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{formatStat(s.PTS_per_g)}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{formatStat(s.TRB_per_g)}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{formatStat(s.AST_per_g)}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{formatPercentage(s.FG_PCT)}</td>
                <td className={`${td} text-right font-mono text-slate-800 dark:text-slate-100`}>{formatPercentage(s.FG3_PCT)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StatsTable({
  stats,
  title,
  statType,
}: {
  stats: CareerStatsData | null;
  title: string;
  statType: 'Totals' | 'Averages';
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
    return (
        <section className="mb-6">
            <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-gray-200 dark:border-slate-600 pb-2 transition-colors duration-200">{title}</h3>
            <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-slate-600">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                <thead className="bg-gray-50 dark:bg-slate-600 transition-colors duration-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider transition-colors duration-200">Statistic</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider transition-colors duration-200">{tableHeaderLabel}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600 transition-colors duration-200">
                  {statType === "Totals" ? (
                    <>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Games Played (G)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.games_played ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Points (PTS)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.pts_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Assists (AST)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.ast_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Total Rebounds (TRB)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.trb_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Steals (STL)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.stl_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Blocks (BLK)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.blk_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Field Goals (FGM-FGA)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.fgm_total?.toLocaleString() ?? 'N/A'} - {stats.fga_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">3-Pointers (3PM-3PA)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.fg3m_total?.toLocaleString() ?? 'N/A'} - {stats.fg3a_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Free Throws (FTM-FTA)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.ftm_total?.toLocaleString() ?? 'N/A'} - {stats.fta_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Turnovers (TOV)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.tov_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Personal Fouls (PF)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{stats.pf_total?.toLocaleString() ?? 'N/A'}</td></tr>
                    </>
                  ) : (
                    <>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Points Per Game (PPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatStat(stats.pts_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Assists Per Game (APG)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatStat(stats.ast_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Rebounds Per Game (RPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatStat(stats.trb_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Steals Per Game (SPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatStat(stats.stl_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Blocks Per Game (BPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatStat(stats.blk_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Turnovers Per Game (TOVPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatStat(stats.tov_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Personal Fouls Per Game (PFPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatStat(stats.pf_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Field Goal % (FG%)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatPercentage(stats.fg_pct)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">3-Point % (3P%)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatPercentage(stats.fg3_pct)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Free Throw % (FT%)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatPercentage(stats.ft_pct)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">Effective Field Goal % (eFG%)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatPercentage(stats.efg_pct)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">True Shooting % (TS%)</td><td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 transition-colors duration-200">{formatPercentage(stats.ts_pct)}</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
        </section>
    );
}
