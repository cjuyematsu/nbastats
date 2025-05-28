// components/PlayerComparisonChart.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlayerSuggestion, SelectedPlayerForComparison } from '@/types/stats';
import { debounce } from 'lodash';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  ChartDataset, // Import for explicit typing
  Filler,
  TooltipItem,
  ScriptableContext,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

const MAX_PLAYERS = 5;

// New: Define distinct colors for player lines
const PLAYER_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#E7E9ED', '#8390FA',
];

interface PlayerSearchInputProps {
  index: number;
  selectedPlayer: SelectedPlayerForComparison | null;
  onPlayerSelect: (player: SelectedPlayerForComparison | null, index: number) => void;
  onRemovePlayer: (index: number) => void;
}

interface SelectedPlayerData {
  PlayerAge: number | null;
  playerteamName: string;
  [key: string]: number | string | null;
}

// Type for custom chart data points, retaining team for tooltips
interface CustomChartPoint {
  x: number;
  y: number | null;
  team: string | null; // Keep team for tooltip information
}

function isSelectedPlayerDataArray(data: unknown): data is SelectedPlayerData[] {
  if (!Array.isArray(data)) {
    return false;
  }
  if (data.length === 0) {
    return true;
  }
  const firstElement = data[0];
  return (
    typeof firstElement === 'object' &&
    firstElement !== null &&
    // Ensure 'error' property, if potentially present from a failed fetch, isn't mistaken for data
    typeof (firstElement as { error?: unknown }).error === 'undefined' &&
    'PlayerAge' in firstElement &&
    'playerteamName' in firstElement
  );
}

const PlayerSearchInput: React.FC<PlayerSearchInputProps> = ({ index, selectedPlayer, onPlayerSelect, onRemovePlayer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const debouncedFetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsSuggestionsVisible(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_player_suggestions', {
          search_term: query,
        });
        if (rpcError) throw rpcError;
        setSuggestions(data || []);
        setIsSuggestionsVisible(true);
      } catch (e: unknown) {
        console.error(`Error fetching suggestions for Player ${index + 1}:`, e);
        setSuggestions([]);
        setIsSuggestionsVisible(false);
      } finally {
        setIsLoading(false);
      }
    }, 350),
    [index]
  );

  useEffect(() => {
    if (selectedPlayer) {
      setSearchTerm(`${selectedPlayer.firstName || ''} ${selectedPlayer.lastName || ''}`.trim());
      setIsSuggestionsVisible(false);
    } else {
      setSearchTerm('');
    }
  }, [selectedPlayer]);

  useEffect(() => {
    if (!selectedPlayer && searchTerm) {
      debouncedFetchSuggestions(searchTerm);
    } else if (!searchTerm) {
      setSuggestions([]);
      setIsSuggestionsVisible(false);
    }
    return () => debouncedFetchSuggestions.cancel();
  }, [searchTerm, debouncedFetchSuggestions, selectedPlayer]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (player: PlayerSuggestion) => {
    onPlayerSelect({ ...player } as SelectedPlayerForComparison, index);
    setSearchTerm(`${player.firstName || ''} ${player.lastName || ''}`.trim());
    setIsSuggestionsVisible(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (selectedPlayer && newSearchTerm !== `${selectedPlayer.firstName || ''} ${selectedPlayer.lastName || ''}`.trim()) {
      onPlayerSelect(null, index);
    }
  };

  return (
    <div ref={searchContainerRef} className="relative mb-2">
      <div className="flex items-center">
        <input
          type="text"
          placeholder={`Player ${index + 1}...`}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchTerm.length >= 2 && suggestions.length > 0 && !selectedPlayer) {
              setIsSuggestionsVisible(true);
            }
          }}
          className="w-full p-2 border border-slate-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-100 bg-slate-600 placeholder-slate-400"
        />
        {selectedPlayer && (
          <button
            onClick={() => onRemovePlayer(index)}
            className="ml-2 p-2 text-red-400 hover:text-red-300 focus:outline-none"
            title="Remove player"
            aria-label={`Remove ${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
          >
            &#x2715; {/* Checkmark/X for remove */}
          </button>
        )}
      </div>
      {isLoading && <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">Loading...</div>}
      {isSuggestionsVisible && suggestions.length > 0 && !selectedPlayer && (
        <ul className="absolute z-20 w-full bg-slate-700 border border-slate-600 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((p) => (
            <li
              key={p.personId}
              onClick={() => handleSelectSuggestion(p)}
              className="p-2 hover:bg-blue-600 cursor-pointer text-sm text-slate-200"
            >
              {p.firstName} {p.lastName} ({p.startYear}-{p.endYear})
            </li>
          ))}
        </ul>
      )}
       {isSuggestionsVisible && searchTerm.length >= 2 && suggestions.length === 0 && !isLoading && !selectedPlayer && (
        <div className="absolute z-10 w-full bg-slate-700 border border-slate-600 rounded-md mt-1 shadow-lg p-2 text-sm text-slate-400">
          No players found matching &quot;{searchTerm}&quot;.
        </div>
      )}
    </div>
  );
};

const availableStats = [
  { value: 'PTS_per_g', label: 'Points Per Game (PPG)' },
  { value: 'AST_per_g', label: 'Assists Per Game (APG)' },
  { value: 'TRB_per_g', label: 'Rebounds Per Game (RPG)' },
  { value: 'STL_per_g', label: 'Steals Per Game (SPG)' },
  { value: 'BLK_per_g', label: 'Blocks Per Game (BPG)' },
  { value: 'FG_PCT', label: 'Field Goal % (FG%)' },
  { value: 'FG3_PCT', label: '3-Point % (3P%)' },
  { value: 'FT_PCT', label: 'Free Throw % (FT%)' },
  { value: 'eFG_PCT', label: 'Effective FG % (eFG%)' },
  { value: 'TS_PCT', label: 'True Shooting % (TS%)' },
  { value: 'MP_per_g', label: 'Minutes Per Game (MPG)' },
  { value: 'PTS_total', label: 'Total Points (Season)' },
  { value: 'AST_total', label: 'Total Assists (Season)' },
  { value: 'TRB_total', label: 'Total Rebounds (Season)' },
];

export default function PlayerComparisonChart() {
  const [selectedPlayers, setSelectedPlayers] = useState<(SelectedPlayerForComparison | null)[]>(Array(MAX_PLAYERS).fill(null));
  const [selectedStat, setSelectedStat] = useState<string>(availableStats[0].value);
  const [seasonType, setSeasonType] = useState<'regular' | 'playoffs'>('regular');
  // Explicitly type chartData with CustomChartPoint
  const [chartData, setChartData] = useState<ChartData<'line', CustomChartPoint[]> | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlayerSelect = (player: SelectedPlayerForComparison | null, index: number) => {
    setSelectedPlayers(prev => {
      const newPlayers = [...prev];
      newPlayers[index] = player;
      return newPlayers;
    });
  };

  const handleRemovePlayer = (indexToRemove: number) => {
    setSelectedPlayers(prev => prev.map((p, i) => (i === indexToRemove ? null : p)));
  };

  const fetchChartDataForAllPlayers = useCallback(async () => {
    const activePlayers = selectedPlayers.filter(p => p !== null) as SelectedPlayerForComparison[];
    if (activePlayers.length === 0 || !selectedStat) {
      setChartData(null);
      setError(null);
      return;
    }

    setIsLoadingChart(true);
    setError(null);
    // Explicitly type the datasets array
    const datasets: ChartDataset<'line', CustomChartPoint[]>[] = [];
    const allAgesAcrossPlayers = new Set<number>();
    const currentTableName = seasonType === 'regular' ? 'regularseasonstats' : 'playoffstats';

    try {
      for (let i = 0; i < activePlayers.length; i++) {
        const player = activePlayers[i];
        if (!player || !player.personId) continue;

        // Assign a distinct color to each player
        const playerLineColor = PLAYER_COLORS[i % PLAYER_COLORS.length];

        const columnsToSelect = `PlayerAge, playerteamName, "${selectedStat}"`;

        const { data: fetchedData, error: dbError } = await supabase
          .from(currentTableName)
          .select<string, SelectedPlayerData>(columnsToSelect) // supabase-js v2 style
          .eq('personId', player.personId)
          .order('PlayerAge', { ascending: true });

        if (dbError) {
            console.error(`Supabase DB Error for ${player.firstName} ${player.lastName} from ${currentTableName}:`, dbError);
            throw new Error(`Failed to fetch data for ${player.firstName} ${player.lastName}. ${dbError.message}`);
        }

        let seasonApiData: SelectedPlayerData[] | null = null;
        if (isSelectedPlayerDataArray(fetchedData)) {
          seasonApiData = fetchedData;
        } else if (fetchedData === null) {
          seasonApiData = null;
        } else {
          console.warn(
            `Supabase returned data for ${player.firstName} ${player.lastName} in an unexpected format:`,
            fetchedData
          );
        }
        
        const playerCareerDataPoints: CustomChartPoint[] = [];
        
        if (seasonApiData && seasonApiData.length > 0) {
          const validSeasonsWithAge = seasonApiData.filter(
            (s): s is SelectedPlayerData & { PlayerAge: number } => s.PlayerAge !== null && typeof s.PlayerAge === 'number'
          );

          if (validSeasonsWithAge.length === 0) {
            console.warn(`No seasons with valid PlayerAge found for ${player.firstName} ${player.lastName}`);
            continue;
          }

          const minAge = validSeasonsWithAge[0].PlayerAge;
          const maxAge = validSeasonsWithAge[validSeasonsWithAge.length - 1].PlayerAge;
          
          const seasonDataMap = new Map(
            validSeasonsWithAge.map((s) => {
              const statValFromRow = s[selectedStat];
              return [
                s.PlayerAge,
                { 
                  stat: (statValFromRow === null || typeof statValFromRow === 'undefined') ? null : Number(statValFromRow),
                  team: s.playerteamName 
                },
              ];
            })
          );

          let lastKnownTeamForPlayer: string | null = validSeasonsWithAge[0]?.playerteamName || null;
          for (let age = minAge; age <= maxAge; age++) {
            allAgesAcrossPlayers.add(age);
            const currentAgeData = seasonDataMap.get(age);

            if (currentAgeData) {
              playerCareerDataPoints.push({
                x: age,
                y: (currentAgeData.stat === null || isNaN(currentAgeData.stat)) ? null : currentAgeData.stat,
                team: currentAgeData.team || lastKnownTeamForPlayer,
              });
              if (currentAgeData.team) lastKnownTeamForPlayer = currentAgeData.team;
            } else {
              playerCareerDataPoints.push({ x: age, y: null, team: lastKnownTeamForPlayer });
            }
          }
        }

        if (playerCareerDataPoints.length > 0) {
          datasets.push({
            label: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
            data: playerCareerDataPoints, // No 'as any' needed due to typed datasets and CustomChartPoint
            borderColor: playerLineColor, // Player-specific line color
            backgroundColor: playerLineColor + '33', // Optional: semi-transparent fill
            tension: 0.1,
            fill: false, // Set to true if you want area fill with backgroundColor
            pointRadius: 0, // Points not visible by default
            pointHoverRadius: (ctx: ScriptableContext<'line'>) => {
              const rawData = ctx.raw as CustomChartPoint | undefined;
              return rawData?.y === null ? 0 : 7; // Show on hover if data exists
            },
            pointHitRadius: 3,
            pointBackgroundColor: (ctx: ScriptableContext<'line'>) => { // Point color on hover
              const rawData = ctx.raw as CustomChartPoint | undefined;
              if (rawData?.y === null) return 'transparent';
              return playerLineColor; // Player-specific point color
            },
            spanGaps: false, // Lines will break over null data points
            // segment.borderColor can be removed if all drawn segments take playerLineColor from dataset.borderColor
            // If spanGaps were true, you might use segment.borderColor to style the spanned gap.
          });
        }
      }

       if (datasets.length === 0 && activePlayers.length > 0) {
        setError(`No data found for selected players, stat, and ${seasonType} type.`);
        setChartData(null);
      } else if (datasets.length > 0) {
        const sortedAges = Array.from(allAgesAcrossPlayers).sort((a, b) => a - b);
        setChartData({ labels: sortedAges.map(String), datasets });
      } else {
        setChartData(null);
      }
    } catch (e: unknown) {
      console.error('Error processing chart data:', e);
      if (e instanceof Error) {
        setError(e.message || 'Failed to generate chart data.');
      } else {
        setError('Failed to generate chart data due to an unknown error.');
      }
      setChartData(null);
    } finally {
      setIsLoadingChart(false);
    }
  }, [selectedPlayers, selectedStat, seasonType]);

  useEffect(() => {
    const activePlayerCount = selectedPlayers.filter(p => p !== null).length;
    if (activePlayerCount > 0) {
        fetchChartDataForAllPlayers();
    } else {
        setChartData(null);
        setError(null);
    }
  }, [selectedPlayers, selectedStat, seasonType, fetchChartDataForAllPlayers]);

  const chartTextColor = '#D1D5DB'; // slate-300
  const chartGridColor = 'rgba(71, 85, 105, 0.5)'; // slate-500 with opacity, adjust as needed
  const chartTooltipBgColor = 'rgba(30, 41, 59, 0.9)'; // slate-800 with opacity
  const chartTooltipTitleColor = '#F9FAFB'; // slate-50
  const chartTooltipBodyColor = '#E5E7EB'; // slate-200
  const chartTooltipBorderColor = '#4B5563'; // slate-600

  const dynamicChartOptions = React.useMemo(() => {
    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'x', // 'index' or 'x' are common for comparing points at the same x-value
        },
        plugins: {
          legend: {
            position: 'top' as const,
            labels: { color: chartTextColor, usePointStyle: true, padding: 20 }
          },
          title: {
            display: true,
            text: `${seasonType.charAt(0).toUpperCase() + seasonType.slice(1)} - ${availableStats.find(s => s.value === selectedStat)?.label || selectedStat} vs. Age`,
            font: { size: 18, weight: 'bold' }, // No 'as any'
            color: chartTextColor,
            padding: { top: 10, bottom: 20 }
          },
          tooltip: {
            backgroundColor: chartTooltipBgColor,
            titleColor: chartTooltipTitleColor,
            bodyColor: chartTooltipBodyColor,
            borderColor: chartTooltipBorderColor,
            borderWidth: 1,
            padding: 10,
            boxPadding: 5,
            callbacks: {
                label: function(context: TooltipItem<'line'>) {
                    let label = context.dataset.label || '';
                    if (label) { label += ': '; }
                    const rawData = context.raw as CustomChartPoint | undefined; // Use CustomChartPoint
                    if (rawData?.y !== null && typeof rawData?.y !== 'undefined') {
                        const yValue = Number(rawData.y);
                        if (selectedStat.includes('_PCT')) {
                            label += (yValue * 100).toFixed(1) + '%';
                        } else if (selectedStat.includes('_per_g')) {
                            label += yValue.toFixed(1);
                        } else {
                            label += yValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: (selectedStat.includes('_per_g') || selectedStat.includes('_PCT') ? 1 : 0) });
                        }
                        // Include team name in tooltip if available
                        if (rawData?.team) { label += ` (${rawData.team})`; }
                    } else {
                        label += 'N/A';
                        if (rawData?.team) { label += ` (On ${rawData.team}, No Data)`; }
                    }
                    return label;
                }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Player Age', color: chartTextColor, 
                     font: { size: 14, weight: 'bold' }}, 
            ticks: { color: chartTextColor },
            grid: { color: chartGridColor }
          },
          y: {
            title: { display: true, text: availableStats.find(s => s.value === selectedStat)?.label || selectedStat, color: chartTextColor, 
                     font: { size: 14, weight: 'bold' }}, 
            ticks: {
                color: chartTextColor,
                callback: function(value: string | number) {
                    const numValue = Number(value);
                    if (selectedStat.includes('_PCT')) {
                        return (numValue * 100).toFixed(0) + '%';
                    }
                    // For per_g stats, allow 1 decimal, otherwise 0 for totals.
                    return numValue.toFixed(selectedStat.includes('_per_g') ? 1 : 0);
                }
            },
            grid: { color: chartGridColor },
            beginAtZero: !selectedStat.includes('_PCT') // Percentages might not start at zero
          },
        },
    };
    return options;
  }, [selectedStat, seasonType, chartTextColor, chartGridColor, chartTooltipBgColor, chartTooltipTitleColor, chartTooltipBodyColor, chartTooltipBorderColor]);

  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100">
      <div className="p-4 md:px-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
            <div className="lg:col-span-2 p-5 bg-slate-700 rounded-xl shadow-lg border border-slate-600">
                <h3 className="text-xl font-semibold mb-3 text-slate-100">
                Select Up to {MAX_PLAYERS} Players ({selectedPlayers.filter(p => p !== null).length} / {MAX_PLAYERS})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {Array.from({ length: MAX_PLAYERS }).map((_, index) => (
                        <PlayerSearchInput
                        key={`player-search-${index}`}
                        index={index}
                        selectedPlayer={selectedPlayers[index]}
                        onPlayerSelect={handlePlayerSelect}
                        onRemovePlayer={handleRemovePlayer}
                        />
                    ))}
                </div>
            </div>
            <div className="p-5 bg-slate-700 rounded-xl shadow-lg border border-slate-600 space-y-5">
            <div>
                <label htmlFor="stat-select" className="block text-lg font-semibold mb-1.5 text-slate-100">
                Statistic:
                </label>
                <select
                id="stat-select"
                value={selectedStat}
                onChange={(e) => setSelectedStat(e.target.value)}
                className="w-full p-2.5 border border-slate-500 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-slate-100 bg-slate-600 text-sm"
                >
                {availableStats.map((stat) => (
                    <option key={stat.value} value={stat.value}>
                    {stat.label}
                    </option>
                ))}
                </select>
            </div>
            <div>
                <label className="block text-lg font-semibold mb-1.5 text-slate-100">
                    Season Type:
                </label>
                <div className="flex rounded-lg shadow-sm">
                    <button
                        type="button"
                        onClick={() => setSeasonType('regular')}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-l-lg transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-400
                                    ${seasonType === 'regular'
                                        ? 'bg-blue-600 text-white border border-blue-600'
                                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500'}`}
                    >
                        Regular Season
                    </button>
                    <button
                        type="button"
                        onClick={() => setSeasonType('playoffs')}
                        className={`flex-1 -ml-px px-4 py-2.5 text-sm font-medium rounded-r-lg transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-400
                                    ${seasonType === 'playoffs'
                                        ? 'bg-blue-600 text-white border border-blue-600'
                                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500'}`}
                    >
                        Playoffs
                    </button>
                </div>
            </div>
            </div>
      </div>
      <div className="mt-6 h-96 md:h-[550px] bg-slate-700 p-3 rounded-xl shadow-inner border border-slate-600">
        {isLoadingChart && (
            <div className="flex flex-col justify-center items-center h-full">
                <div className="w-12 h-12 border-4 border-t-blue-500 border-r-blue-500 border-b-slate-600 border-l-slate-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-lg text-slate-300">Loading Chart Data...</p>
            </div>
        )}
        {!isLoadingChart && error && (
          <div className="flex justify-center items-center h-full">
            <p className="text-center text-red-400 p-4 bg-red-900 bg-opacity-40 rounded-md border border-red-700">{error}</p>
          </div>
        )}
        {!isLoadingChart && !error && chartData && chartData.datasets.length > 0 && (
          <Line options={dynamicChartOptions} data={chartData} />
        )}
        {!isLoadingChart && !error && (!chartData || chartData.datasets.length === 0) && (
             <div className="flex justify-center items-center h-full">
                <p className="text-lg text-slate-400 text-center px-4">
                    {selectedPlayers.filter(p => p !== null).length > 0 ? `No ${seasonType} data to display for current selections.` : "Select players and a statistic to view the chart."}
                </p>
            </div>
        )}
      </div>
      </div>
    </div>
  );
}