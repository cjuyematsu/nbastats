'use client';

import { supabase } from '@/lib/supabaseClient';
import { PlayerSuggestion, CareerStatsData } from '@/types/stats'; 
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';

// Helper functions (formatStat, formatPercentage) remain the same...
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

export default function PlayerSearchStats() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  const [selectedPlayerRegularStats, setSelectedPlayerRegularStats] = useState<CareerStatsData | null>(null);
  const [selectedPlayerPlayoffStats, setSelectedPlayerPlayoffStats] = useState<CareerStatsData | null>(null);
  
  const [isLoadingRegularStats, setIsLoadingRegularStats] = useState(false);
  const [isLoadingPlayoffStats, setIsLoadingPlayoffStats] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const debouncedFetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsSuggestionsVisible(false);
        return;
      }
      setIsLoadingSuggestions(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_player_suggestions', {
          search_term: query,
        });
        if (rpcError) throw rpcError;
        setSuggestions(data || []);
        setIsSuggestionsVisible(true);
      } catch (e: any) {
        console.error('Error fetching suggestions:', e);
        setError(`Failed to fetch suggestions. Details: ${e.message || 'Unknown error'}. Make sure "get_player_suggestions" function is working.`);
        setSuggestions([]);
        setIsSuggestionsVisible(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 350),
    []
  );

  useEffect(() => {
    debouncedFetchSuggestions(searchTerm);
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [searchTerm, debouncedFetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const handleSelectPlayer = async (player: PlayerSuggestion) => {
    setSearchTerm(`${player.firstName || ''} ${player.lastName || ''}`.trim());
    setIsSuggestionsVisible(false);
    
    setSelectedPlayerRegularStats(null);
    setSelectedPlayerPlayoffStats(null);
    setError(null);

    setIsLoadingRegularStats(true);
    setIsLoadingPlayoffStats(true);

    try {
      const { data: regularData, error: regularRpcError } = await supabase.rpc('calculate_player_career_stats', {
        p_person_id: player.personId,
      });

      if (regularRpcError) {
        console.error('Regular Season Stats RPC Error:', regularRpcError);
        throw new Error(`Regular Season Stats Error: ${regularRpcError.message}`);
      }
      if (regularData && regularData.length > 0) {
        setSelectedPlayerRegularStats(regularData[0] as CareerStatsData);
      } else {
        setSelectedPlayerRegularStats(null);
      }
    } catch (e: any) {
      console.error('Error fetching regular season career stats:', e);
      setError(e.message || 'Failed to fetch regular season career stats.');
    } finally {
      setIsLoadingRegularStats(false);
    }

    try {
        const { data: playoffData, error: playoffRpcError } = await supabase.rpc('calculate_player_career_playoff_stats', {
            p_person_id: player.personId,
        });

        if (playoffRpcError) {
            console.error('Playoff Stats RPC Error:', playoffRpcError);
            throw new Error(`Playoff Stats Error: ${playoffRpcError.message}`);
        }
        if (playoffData && playoffData.length > 0) {
            setSelectedPlayerPlayoffStats(playoffData[0] as CareerStatsData);
        } else {
            setSelectedPlayerPlayoffStats(null);
        }
    } catch (e: any) {
        console.error('Error fetching playoff career stats:', e);
        setError(prevError => prevError ? `${prevError}\n${e.message}` : (e.message || 'Failed to fetch playoff career stats.'));
    } finally {
        setIsLoadingPlayoffStats(false);
    }
  };

  const renderStatsTable = (stats: CareerStatsData | null, title: string, statType: "Totals" | "Averages") => {
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
                      {/* --- REMOVED Minutes Played (MP) Total ---
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Minutes Played (MP)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{stats.mp_total?.toLocaleString() ?? 'N/A'}</td></tr>
                      */}
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
                      {/* --- REMOVED Minutes Per Game (MPG) ---
                      <tr><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Minutes Per Game (MPG)</td><td className="px-4 py-2 text-right text-sm font-mono text-gray-900 dark:text-gray-100">{formatStat(stats.mp_per_g)}</td></tr>
                      */}
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

  const playerDisplayName = selectedPlayerRegularStats?.firstName || selectedPlayerPlayoffStats?.firstName || "";
  const playerDisplayLastName = selectedPlayerRegularStats?.lastName || selectedPlayerPlayoffStats?.lastName || "";
  const playerStartYear = selectedPlayerRegularStats?.startYear ?? selectedPlayerPlayoffStats?.startYear;
  const playerEndYear = selectedPlayerRegularStats?.endYear ?? selectedPlayerPlayoffStats?.endYear;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div ref={searchContainerRef} className="relative mb-4">
        <input
            type="text"
            placeholder="Search for a player (e.g., Michael Jordan, LeBron)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >=2 && suggestions.length > 0 && setIsSuggestionsVisible(true)}
            className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
        {isLoadingSuggestions && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            </div>
        )}
        {isSuggestionsVisible && suggestions.length > 0 && (
            <ul className="absolute z-20 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg mt-1 shadow-lg max-h-72 overflow-y-auto">
            {suggestions.map((player) => (
            <li
                key={`${player.personId}-${player.firstName}-${player.lastName}-${player.startYear}-${player.endYear}`}
                onClick={() => handleSelectPlayer(player)}
                className="p-3 hover:bg-blue-100 dark:hover:bg-blue-600 dark:hover:text-white cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
                <span className="font-medium text-gray-800 dark:text-gray-200">{player.firstName} {player.lastName}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">({player.startYear} - {player.endYear})</span>
            </li>
            ))}
            </ul>
        )}
        {isSuggestionsVisible && !isLoadingSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && (
            <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg mt-1 shadow-lg p-3 text-gray-700 dark:text-gray-300">
                No players found matching "{searchTerm}".
            </div>
        )}
      </div>

      {error && <p className="text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200 border border-red-400 dark:border-red-700 p-3 rounded-md text-center my-4">{error}</p>}

      {(isLoadingRegularStats || isLoadingPlayoffStats) && (
        <div className="text-center py-10">
          <div className="inline-block w-12 h-12 border-4 border-t-blue-600 border-r-blue-600 border-b-gray-200 border-l-gray-200 dark:border-b-gray-700 dark:border-l-gray-700 rounded-full animate-spin"></div>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">Loading career stats...</p>
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
    </div>
  );
}