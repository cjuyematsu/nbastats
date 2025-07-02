//player/[playerId]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CareerStatsData } from '@/types/stats';
import { useSearchParams, useParams } from 'next/navigation';

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

const renderStatsTable = (stats: CareerStatsData | null, title: string, statType: "Totals" | "Averages") => {
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
};

export default function PlayerStatsPage() {
  const routeParams = useParams<{ playerId: string }>();
  const playerId = routeParams.playerId;

  const searchParams = useSearchParams();
  const playerNameFromQuery = searchParams.get('name') || 'Player';

  const [selectedPlayerRegularStats, setSelectedPlayerRegularStats] = useState<CareerStatsData | null>(null);
  const [selectedPlayerPlayoffStats, setSelectedPlayerPlayoffStats] = useState<CareerStatsData | null>(null);
  const [isLoadingRegularStats, setIsLoadingRegularStats] = useState(false);
  const [isLoadingPlayoffStats, setIsLoadingPlayoffStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setSelectedPlayerRegularStats(null);
      setSelectedPlayerPlayoffStats(null);
      setError(null);
      setIsLoadingRegularStats(false);
      setIsLoadingPlayoffStats(false);
      return;
    }

    const fetchStats = async () => {
      setError(null);
      setSelectedPlayerRegularStats(null);
      setSelectedPlayerPlayoffStats(null);
      setIsLoadingRegularStats(true);
      setIsLoadingPlayoffStats(true);

      let fetchedRegularStats: CareerStatsData | null = null;
      let fetchedPlayoffStats: CareerStatsData | null = null;
      let regularStatsErrorMsg: string | null = null;
      let playoffStatsErrorMsg: string | null = null;

      const numericPlayerId = parseInt(playerId, 10);

      if (isNaN(numericPlayerId)) {
        const idError = "Invalid Player ID: Must be a number.";
        setError(idError);
        setIsLoadingRegularStats(false);
        setIsLoadingPlayoffStats(false);
        return;
      }

      try {
        const { data: regularData, error: regularRpcError } = await supabase.rpc('calculate_player_career_stats', {
          p_person_id: numericPlayerId,
        });
        if (regularRpcError) {
          console.error('Regular Season Stats RPC Error:', regularRpcError);
          regularStatsErrorMsg = `Regular Season: ${regularRpcError.message}`;
        } else {
          fetchedRegularStats = regularData && regularData.length > 0 ? regularData[0] : null;
        }
      } catch (e: unknown) {
        console.error('Error fetching regular season stats:', e);
        regularStatsErrorMsg = e instanceof Error ? `Regular Season: ${e.message}` : 'Regular Season: Unknown error.';
      } finally {
        setIsLoadingRegularStats(false);
      }

      try {
        const { data: playoffData, error: playoffRpcError } = await supabase.rpc('calculate_player_career_playoff_stats', {
          p_person_id: numericPlayerId,
        });
        if (playoffRpcError) {
          console.error('Playoff Stats RPC Error:', playoffRpcError);
          playoffStatsErrorMsg = `Playoffs: ${playoffRpcError.message}`;
        } else {
          fetchedPlayoffStats = playoffData && playoffData.length > 0 ? playoffData[0] : null;
        }
      } catch (e: unknown) {
        console.error('Error fetching playoff stats:', e);
        playoffStatsErrorMsg = e instanceof Error ? `Playoffs: ${e.message}` : 'Playoffs: Unknown error.';
      } finally {
        setIsLoadingPlayoffStats(false);
      }

      setSelectedPlayerRegularStats(fetchedRegularStats);
      setSelectedPlayerPlayoffStats(fetchedPlayoffStats);

      if (regularStatsErrorMsg && playoffStatsErrorMsg) {
        setError(`${regularStatsErrorMsg}\n${playoffStatsErrorMsg}`);
      } else if (regularStatsErrorMsg) {
        setError(regularStatsErrorMsg);
      } else if (playoffStatsErrorMsg) {
        setError(playoffStatsErrorMsg);
      } else {
        setError(null);
      }
    };
    fetchStats();
  }, [playerId]);

  const currentPlayerData = selectedPlayerRegularStats || selectedPlayerPlayoffStats;
  const displayFirstName = currentPlayerData?.firstName || (playerNameFromQuery !== "Player" ? playerNameFromQuery.split(" ")[0] : "");
  const displayLastName = currentPlayerData?.lastName || (playerNameFromQuery !== "Player" ? playerNameFromQuery.split(" ").slice(1).join(" ") : "");
  const playerStartYear = currentPlayerData?.startYear;
  const playerEndYear = currentPlayerData?.endYear;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="p-4 md:py-6">
        {error && (
          <p className="text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/60 border border-red-300 dark:border-red-700 p-3 rounded-md text-center my-4 transition-colors duration-200"
             dangerouslySetInnerHTML={{ __html: error.replace(/\n/g, '<br />') }}>
          </p>
        )}

        {(isLoadingRegularStats || isLoadingPlayoffStats) && (
          <div className="text-center py-10">
            <div className="inline-block w-12 h-12 border-4 border-t-sky-500 border-r-sky-500 border-b-gray-200 border-l-gray-200 dark:border-b-slate-600 dark:border-l-slate-600 rounded-full animate-spin"></div>
            <p className="mt-2 text-lg text-slate-500 dark:text-slate-300 transition-colors duration-200">Loading {playerNameFromQuery}&apos;s career stats...</p>
          </div>
        )}

        {!isLoadingRegularStats && !isLoadingPlayoffStats && (selectedPlayerRegularStats || selectedPlayerPlayoffStats) && (
          <div className="p-5 bg-gray-50 dark:bg-slate-700/60 rounded-xl shadow-md border border-gray-200 dark:border-slate-600 animate-fadeIn transition-colors duration-200">
            {(displayFirstName || displayLastName) && (
              <div className="text-left sm:text-left mb-6">
                <h2 className="text-[1.91rem] font-bold text-sky-600 dark:text-sky-400 transition-colors duration-200">
                  {displayFirstName} {displayLastName}
                </h2>
                {(playerStartYear && playerEndYear) && (
                  <p className="text-[1.2rem] text-slate-500 dark:text-slate-400 font-medium transition-colors duration-200">
                    Career ({playerStartYear} - {playerEndYear})
                  </p>
                )}
              </div>
            )}

            {renderStatsTable(selectedPlayerRegularStats, "Regular Season Career Totals", "Totals")}
            {renderStatsTable(selectedPlayerRegularStats, "Regular Season Career Stats", "Averages")}

            {renderStatsTable(selectedPlayerPlayoffStats, "Playoff Career Totals", "Totals")}
            {renderStatsTable(selectedPlayerPlayoffStats, "Playoff Career Stats", "Averages")}
          </div>
        )}

        {!isLoadingRegularStats && !isLoadingPlayoffStats && !selectedPlayerRegularStats && !selectedPlayerPlayoffStats && !error && (
           <div className="text-center py-10">
              <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 transition-colors duration-200">No stats found for {playerNameFromQuery} (ID: {playerId}).</p>
          </div>
        )}
      </div>
    </div>
  );
}