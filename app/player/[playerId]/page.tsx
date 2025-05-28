// app/player/[playerId]/page.tsx (or src/app/players/[playerId]/page.tsx)
'use client'; // This directive makes it a Client Component

import React, { useState, useEffect } from 'react'; // Removed 'use' as it's not for this purpose here
import { supabase } from '@/lib/supabaseClient';
import { CareerStatsData } from '@/types/stats';
import { useSearchParams, useParams } from 'next/navigation'; // Import useParams

// --- Re-include your helper functions here or import them ---
const formatStat = (value: number | string | null | undefined, decimalPlaces: number = 1): string => {
  if (value === null || typeof value === 'undefined' || String(value).trim() === '') return 'N/A';
  let numValue: number = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  return numValue.toFixed(decimalPlaces);
};

const formatPercentage = (value: number | string | null | undefined): string => {
  if (value === null || typeof value === 'undefined' || String(value).trim() === '') return 'N/A';
  let numValue: number = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  return (numValue * 100).toFixed(1) + '%';
};

const renderStatsTable = (stats: CareerStatsData | null, title: string, statType: "Totals" | "Averages") => {
    // ... (your existing renderStatsTable implementation)
    if (!stats || stats.games_played === null || stats.games_played === 0) {
        return (
            <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                 <h3 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-300">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400">No {title.toLowerCase().includes("playoff") ? "playoff" : "regular season"} stats available for this player.</p>
            </div>
        );
    }
    const tableHeaderLabel = statType === "Totals" ? "Total" : "Average / %";
    return (
        <section className="mb-12">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-2">{title}</h3>
            <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Statistic</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{tableHeaderLabel}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {statType === "Totals" ? (
                    <>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Games Played (G)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.games_played ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Points (PTS)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.pts_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Assists (AST)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.ast_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Total Rebounds (TRB)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.trb_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Steals (STL)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.stl_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Blocks (BLK)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.blk_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Field Goals (FGM-FGA)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.fgm_total?.toLocaleString() ?? 'N/A'} - {stats.fga_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">3-Pointers (3PM-3PA)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.fg3m_total?.toLocaleString() ?? 'N/A'} - {stats.fg3a_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Free Throws (FTM-FTA)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.ftm_total?.toLocaleString() ?? 'N/A'} - {stats.fta_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Turnovers (TOV)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.tov_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Personal Fouls (PF)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.pf_total?.toLocaleString() ?? 'N/A'}</td></tr>
                    </>
                  ) : ( // Averages & Percentages
                    <>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Points Per Game (PPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatStat(stats.pts_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Assists Per Game (APG)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatStat(stats.ast_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Rebounds Per Game (RPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatStat(stats.trb_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Steals Per Game (SPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatStat(stats.stl_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Blocks Per Game (BPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatStat(stats.blk_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Turnovers Per Game (TOVPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatStat(stats.tov_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Personal Fouls Per Game (PFPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatStat(stats.pf_per_g)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Field Goal % (FG%)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatPercentage(stats.fg_pct)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">3-Point % (3P%)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatPercentage(stats.fg3_pct)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Free Throw % (FT%)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatPercentage(stats.ft_pct)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Effective Field Goal % (eFG%)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatPercentage(stats.efg_pct)}</td></tr>
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">True Shooting % (TS%)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatPercentage(stats.ts_pct)}</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
        </section>
    );
};
// --- End of renderStatsTable ---

// No longer need PlayerPageProps for params if using the hook
// interface PlayerPageProps {
//   params: { playerId: string };
// }

export default function PlayerStatsPage(/* Removed { params }: PlayerPageProps */) {
  // Use the useParams hook to get dynamic route parameters
  // Specify the expected shape of the params object
  const routeParams = useParams<{ playerId: string }>();
  const playerId = routeParams.playerId; // Access playerId directly

  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Player';

  const [selectedPlayerRegularStats, setSelectedPlayerRegularStats] = useState<CareerStatsData | null>(null);
  const [selectedPlayerPlayoffStats, setSelectedPlayerPlayoffStats] = useState<CareerStatsData | null>(null);
  const [isLoadingRegularStats, setIsLoadingRegularStats] = useState(false);
  const [isLoadingPlayoffStats, setIsLoadingPlayoffStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure playerId from useParams is available before fetching
    if (!playerId) {
      // This case should ideally not happen if the route is matched correctly
      // but good practice to check.
      // console.warn("Player ID not found in route params.");
      // setError("Player ID not found.");
      return;
    }

    const fetchStats = async () => {
      setError(null);
      setIsLoadingRegularStats(true);
      setIsLoadingPlayoffStats(true);

      try {
        const numericPlayerId = parseInt(playerId, 10);
        if (isNaN(numericPlayerId)) {
            throw new Error("Invalid Player ID format.");
        }

        // Fetch Regular Season Stats
        const { data: regularData, error: regularRpcError } = await supabase.rpc('calculate_player_career_stats', {
          p_person_id: numericPlayerId,
        });
        if (regularRpcError) throw new Error(`Regular Season Stats Error: ${regularRpcError.message}`);
        setSelectedPlayerRegularStats(regularData && regularData.length > 0 ? regularData[0] : null);
      } catch (e: any) {
        console.error('Error fetching regular season stats:', e);
        setError(e.message || 'Failed to fetch regular stats.');
      } finally {
        setIsLoadingRegularStats(false);
      }

      try {
        const numericPlayerId = parseInt(playerId, 10);
         if (isNaN(numericPlayerId)) {
            // Error already thrown and caught by outer try-catch if it was from the first block
            // Or handle specifically if you want separate error states
            // For now, assume it's handled or will be caught if this is the first attempt
            if (!selectedPlayerRegularStats && !error) throw new Error("Invalid Player ID format for Playoff Stats.");
        }
        // Fetch Playoff Stats
        const { data: playoffData, error: playoffRpcError } = await supabase.rpc('calculate_player_career_playoff_stats', {
          p_person_id: numericPlayerId,
        });
        if (playoffRpcError) throw new Error(`Playoff Stats Error: ${playoffRpcError.message}`);
        setSelectedPlayerPlayoffStats(playoffData && playoffData.length > 0 ? playoffData[0] : null);
      } catch (e: any) {
        console.error('Error fetching playoff stats:', e);
        setError(prevError => prevError ? `${prevError}\n${e.message}` : (e.message || 'Failed to fetch playoff stats.'));
      } finally {
        setIsLoadingPlayoffStats(false);
      }
    };

    fetchStats();
  }, [playerId]); // useEffect now correctly depends on playerId from useParams

  const playerDisplayName = selectedPlayerRegularStats?.firstName || selectedPlayerPlayoffStats?.firstName || (playerName !== "Player" ? playerName.split(" ")[0] : "");
  const playerDisplayLastName = selectedPlayerRegularStats?.lastName || selectedPlayerPlayoffStats?.lastName || (playerName !== "Player" ? playerName.split(" ").slice(1).join(" ") : "");
  const playerStartYear = selectedPlayerRegularStats?.startYear ?? selectedPlayerPlayoffStats?.startYear;
  const playerEndYear = selectedPlayerRegularStats?.endYear ?? selectedPlayerPlayoffStats?.endYear;

  // Ensure you parse playerId to a number when calling Supabase RPC functions
  // const numericPlayerIdForDisplay = playerId ? parseInt(playerId, 10) : 'N/A';

  return (
    <div className="container mx-auto p-4 mt-6">
      {error && <p className="text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200 border border-red-400 dark:border-red-700 p-3 rounded-md text-center my-4" dangerouslySetInnerHTML={{ __html: error.replace(/\n/g, '<br />') }}></p>}


      {(isLoadingRegularStats || isLoadingPlayoffStats) && (
        <div className="text-center py-10">
          <div className="inline-block w-12 h-12 border-4 border-t-blue-600 border-r-blue-600 border-b-gray-200 border-l-gray-200 dark:border-b-gray-700 dark:border-l-gray-700 rounded-full animate-spin"></div>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">Loading {playerName}'s career stats...</p>
        </div>
      )}

      {(!isLoadingRegularStats && !isLoadingPlayoffStats && (selectedPlayerRegularStats || selectedPlayerPlayoffStats)) && (
        <div className="mt-10 p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeIn">
            { (playerDisplayName || playerDisplayLastName) &&
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-1 text-blue-600 dark:text-blue-400">
                    {playerDisplayName} {playerDisplayLastName}
                    </h2>
                    {(playerStartYear && playerEndYear) &&
                        <p className="text-md text-gray-500 dark:text-gray-400 mb-8 font-medium">
                        Career ({playerStartYear} - {playerEndYear})
                        </p>
                    }
                </div>
            }

          {renderStatsTable(selectedPlayerRegularStats, "Regular Season Career Totals", "Totals")}
          {renderStatsTable(selectedPlayerRegularStats, "Regular Season Career Stats", "Averages")} 

          {renderStatsTable(selectedPlayerPlayoffStats, "Playoff Career Totals", "Totals")}
          {renderStatsTable(selectedPlayerPlayoffStats, "Playoff Career Stats", "Averages")}
        </div>
      )}

      {(!isLoadingRegularStats && !isLoadingPlayoffStats && !selectedPlayerRegularStats && !selectedPlayerPlayoffStats && !error) && (
         <div className="text-center py-10">
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">No stats found for {playerName} (ID: {playerId}).</p>
        </div>
      )}
    </div>
  );
}