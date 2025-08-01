// components/PlayerComparisonChart.tsx

'use client';

import { useSearchParams } from 'next/navigation';
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
  ChartDataset,
  Filler,
  TooltipItem,
  ScriptableContext,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

const MAX_PLAYERS = 5;
const AGE_AXIS_PADDING = 1; 

const PLAYER_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
];

interface PlayerSearchInputProps {
  index: number;
  selectedPlayer: SelectedPlayerForComparison | null;
  onPlayerSelect: (player: SelectedPlayerForComparison | null, index: number) => void;
  onRemovePlayer: (index: number) => void;
  isDarkMode: boolean;
}

interface SelectedPlayerData {
  PlayerAge: number | null;
  playerteamName: string;
  [key: string]: number | string | null;
}

interface CustomChartPoint {
  x: number;
  y: number | null;
  team: string | null;
}

function isSelectedPlayerDataArray(data: unknown): data is SelectedPlayerData[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  const firstElement = data[0];
  return (
    typeof firstElement === 'object' &&
    firstElement !== null &&
    typeof (firstElement as { error?: unknown }).error === 'undefined' &&
    'PlayerAge' in firstElement &&
    'playerteamName' in firstElement
  );
}

const PlayerSearchInput: React.FC<PlayerSearchInputProps> = ({ index, selectedPlayer, onPlayerSelect, onRemovePlayer, isDarkMode }) => {
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
        const { data, error: rpcError } = await supabase.rpc('get_player_suggestions', { search_term: query });
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
    if (!selectedPlayer && searchTerm) debouncedFetchSuggestions(searchTerm);
    else if (!searchTerm) {
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

  const inputClasses = isDarkMode 
    ? "w-full p-2 border border-slate-500 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm text-slate-100 bg-slate-600 placeholder-slate-400"
    : "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm text-gray-800 bg-white placeholder-gray-400";
  
  const suggestionsListClasses = isDarkMode
    ? "absolute z-20 w-full bg-slate-700 border border-slate-600 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto"
    : "absolute z-20 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto";

  const suggestionItemClasses = isDarkMode
    ? "p-2 hover:bg-sky-600 cursor-pointer text-sm text-slate-200"
    : "p-2 hover:bg-sky-500 cursor-pointer text-sm text-gray-700";

  return (
    <div ref={searchContainerRef} className="relative mb-2">
      <div className="flex items-center">
        <input
          type="text"
          placeholder={`Player ${index + 1}...`}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => { if (searchTerm.length >= 2 && suggestions.length > 0 && !selectedPlayer) setIsSuggestionsVisible(true); }}
          className={inputClasses}
        />
        {selectedPlayer && (
          <button
            onClick={() => onRemovePlayer(index)}
            className="ml-2 p-2 text-red-500 hover:text-red-700 focus:outline-none"
            title="Remove player"
            aria-label={`Remove ${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
          >
            &#x2715;
          </button>
        )}
      </div>
      {isLoading && <div className={`absolute right-10 top-1/2 transform -translate-y-1/2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading...</div>}
      {isSuggestionsVisible && suggestions.length > 0 && !selectedPlayer && (
        <ul className={suggestionsListClasses}>
          {suggestions.map((p) => (
            <li key={p.personId} onClick={() => handleSelectSuggestion(p)} className={suggestionItemClasses}>
              {p.firstName} {p.lastName} ({p.startYear}-{p.endYear})
            </li>
          ))}
        </ul>
      )}
      {isSuggestionsVisible && searchTerm.length >= 2 && suggestions.length === 0 && !isLoading && !selectedPlayer && (
        <div className={`${suggestionsListClasses} p-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
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
  const [chartData, setChartData] = useState<ChartData<'line', CustomChartPoint[]> | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); 

  const searchParams = useSearchParams();

  useEffect(() => {
    const playersQuery = searchParams.get('players');
    if (playersQuery) {
      const playerNames = playersQuery.split(',').slice(0, MAX_PLAYERS);
      
      const fetchInitialPlayers = async () => {
        setIsLoadingChart(true); 
        const newSelectedPlayers = Array(MAX_PLAYERS).fill(null);
        let playersFound = 0;

        for (let i = 0; i < playerNames.length; i++) {
          const name = playerNames[i].trim();
          if (name) {
            try {
              const { data, error: rpcError } = await supabase.rpc('get_player_suggestions', { search_term: name });

              if (rpcError) throw rpcError;

              if (data && data.length > 0) {
                newSelectedPlayers[i] = data[0] as SelectedPlayerForComparison;
                playersFound++;
              }
            } catch (e) {
              console.error(`Error fetching initial player data for "${name}":`, e);
            }
          }
        }
        
        if (playersFound > 0) {
          setSelectedPlayers(newSelectedPlayers);
        } else {
            setIsLoadingChart(false);
        }
      };

      fetchInitialPlayers();
    }
  }, [searchParams]); 


  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);


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
    const datasets: ChartDataset<'line', CustomChartPoint[]>[] = [];
    const allAgesWithData = new Set<number>(); 
    const currentTableName = seasonType === 'regular' ? 'regularseasonstats' : 'playoffstats';

    try {
      for (let i = 0; i < activePlayers.length; i++) {
        const player = activePlayers[i];
        if (!player || !player.personId) continue;

        const playerLineColor = PLAYER_COLORS[i % PLAYER_COLORS.length];
        const columnsToSelect = `PlayerAge, playerteamName, "${selectedStat}"`;

        const { data: fetchedData, error: dbError } = await supabase
          .from(currentTableName)
          .select<string, SelectedPlayerData>(columnsToSelect)
          .eq('personId', player.personId)
          .order('PlayerAge', { ascending: true });

        if (dbError) throw new Error(`Data fetch error for ${player.firstName}: ${dbError.message}`);

        let seasonApiData: SelectedPlayerData[] | null = null;
        if (isSelectedPlayerDataArray(fetchedData)) seasonApiData = fetchedData;
        else if (fetchedData !== null) console.warn(`Unexpected data format for ${player.firstName}`, fetchedData);
        
        const playerCareerDataPoints: CustomChartPoint[] = [];
        if (seasonApiData && seasonApiData.length > 0) {
          const validSeasons = seasonApiData.filter((s): s is SelectedPlayerData & { PlayerAge: number } => s.PlayerAge !== null);
          if (validSeasons.length === 0) continue;

          const playerMinAge = validSeasons[0].PlayerAge;
          const playerMaxAge = validSeasons[validSeasons.length - 1].PlayerAge;
          
          const seasonDataMap = new Map(validSeasons.map(s => [s.PlayerAge, { stat: s[selectedStat] === null ? null : Number(s[selectedStat]), team: s.playerteamName }]));
          let lastKnownTeam = validSeasons[0]?.playerteamName || null;

          for (let age = playerMinAge; age <= playerMaxAge; age++) {
            allAgesWithData.add(age); 
            const currentAgeData = seasonDataMap.get(age);
            if (currentAgeData) {
              playerCareerDataPoints.push({ x: age, y: (currentAgeData.stat === null || isNaN(currentAgeData.stat)) ? null : currentAgeData.stat, team: currentAgeData.team || lastKnownTeam });
              if (currentAgeData.team) lastKnownTeam = currentAgeData.team;
            } else {
              playerCareerDataPoints.push({ x: age, y: null, team: lastKnownTeam });
            }
          }
        }

        if (playerCareerDataPoints.length > 0) {
          datasets.push({
            label: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
            data: playerCareerDataPoints,
            borderColor: playerLineColor,
            backgroundColor: playerLineColor + '33', 
            tension: 0.1,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: (ctx: ScriptableContext<'line'>) => ((ctx.raw as CustomChartPoint | undefined)?.y === null ? 0 : 7),
            pointHitRadius: 3,
            pointBackgroundColor: playerLineColor,
            spanGaps: false,
          });
        }
      }

      if (datasets.length === 0 && activePlayers.length > 0) {
        setError(`No data found for selected players, stat, and ${seasonType} type.`);
        setChartData(null);
      } else if (datasets.length > 0 && allAgesWithData.size > 0) {
        const actualMinDataAge = Math.min(...allAgesWithData);
        const actualMaxDataAge = Math.max(...allAgesWithData);

        const displayMinAge = actualMinDataAge - AGE_AXIS_PADDING;
        const displayMaxAge = actualMaxDataAge + AGE_AXIS_PADDING;

        const chartLabels: string[] = [];
        for (let age = displayMinAge; age <= displayMaxAge; age++) {
          chartLabels.push(age.toString());
        }
        setChartData({ labels: chartLabels, datasets });

      } else if (datasets.length > 0 && allAgesWithData.size === 0) {
        setError('Chart data exists but no age range determined.');
        setChartData(null);
      } else {
        setChartData(null);
      }
    } catch (e: unknown) {
      console.error('Error processing chart data:', e);
      setError(e instanceof Error ? e.message : 'Failed to generate chart data.');
      setChartData(null);
    } finally {
      setIsLoadingChart(false);
    }
  }, [selectedPlayers, selectedStat, seasonType]);

  useEffect(() => {
    if (selectedPlayers.some(p => p !== null)) {
        fetchChartDataForAllPlayers();
    } else {
        setChartData(null);
        setError(null);
    }
  }, [selectedPlayers, selectedStat, seasonType, fetchChartDataForAllPlayers]);

  const chartTextColor = isDarkMode ? '#D1D5DB' : '#374151';
  const chartGridColor = isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(209, 213, 219, 0.5)'; 
  const chartTooltipBgColor = isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)';
  const chartTooltipTitleColor = isDarkMode ? '#F9FAFB' : '#1F2937';
  const chartTooltipBodyColor = isDarkMode ? '#E5E7EB' : '#4B5563';
  const chartTooltipBorderColor = isDarkMode ? '#4B5563' : '#D1D5DB';

  const dynamicChartOptions = React.useMemo(() => {
    const currentLabels = chartData?.labels as string[] | undefined;
    const xMin = currentLabels && currentLabels.length > 0 ? Number(currentLabels[0]) : undefined;
    const xMax = currentLabels && currentLabels.length > 0 ? Number(currentLabels[currentLabels.length - 1]) : undefined;

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'x' },
        plugins: {
          legend: { position: 'top' as const, labels: { color: chartTextColor, usePointStyle: true, padding: 20 }},
          title: {
            display: true,
            text: `${seasonType.charAt(0).toUpperCase() + seasonType.slice(1)} - ${availableStats.find(s => s.value === selectedStat)?.label || selectedStat} vs. Age`,
            font: { size: 18, weight: 'bold' },
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
                    if (label) label += ': ';
                    const rawData = context.raw as CustomChartPoint | undefined;
                    if (rawData?.y !== null && typeof rawData?.y !== 'undefined') {
                        const yValue = Number(rawData.y);
                        if (selectedStat.includes('_PCT')) label += (yValue * 100).toFixed(1) + '%';
                        else if (selectedStat.includes('_per_g')) label += yValue.toFixed(1);
                        else label += yValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: (selectedStat.includes('_per_g') || selectedStat.includes('_PCT') ? 1 : 0) });
                        if (rawData?.team) label += ` (${rawData.team})`;
                    } else {
                        label += 'N/A';
                        if (rawData?.team) label += ` (On ${rawData.team}, No Data)`;
                    }
                    return label;
                }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: xMin, 
            max: xMax, 
            title: { display: true, text: 'Player Age', color: chartTextColor, font: { size: 14, weight: 'bold' }}, 
            ticks: { color: chartTextColor, stepSize: 1 }, 
            grid: { color: chartGridColor }
          },
          y: {
            title: { display: true, text: availableStats.find(s => s.value === selectedStat)?.label || selectedStat, color: chartTextColor, font: { size: 14, weight: 'bold' }}, 
            ticks: {
                color: chartTextColor,
                callback: function(value: string | number) {
                    const numValue = Number(value);
                    if (selectedStat.includes('_PCT')) return (numValue * 100).toFixed(0) + '%';
                    return numValue.toFixed(selectedStat.includes('_per_g') ? 1 : 0);
                }
            },
            grid: { color: chartGridColor },
            beginAtZero: !selectedStat.includes('_PCT')
          },
        },
    };
    return options;
  }, [selectedStat, seasonType, chartTextColor, chartGridColor, chartTooltipBgColor, chartTooltipTitleColor, chartTooltipBodyColor, chartTooltipBorderColor, chartData]); 

  const mainContainerClasses = isDarkMode 
    ? "w-full bg-gray-800 rounded-lg text-slate-100" 
    : "w-full bg-white rounded-lg text-gray-800";
  const sectionClasses = isDarkMode
    ? "p-5 bg-slate-700 rounded-xl shadow-lg border border-slate-600"
    : "p-5 bg-gray-50 rounded-xl shadow-lg border border-gray-200";
  const chartContainerClasses = isDarkMode
    ? "mt-6 h-96 md:h-[550px] bg-slate-700 p-3 rounded-xl shadow-inner border border-slate-600"
    : "mt-6 h-96 md:h-[550px] bg-gray-50 p-3 rounded-xl shadow-inner border border-gray-200";
  const selectClasses = isDarkMode
    ? "w-full p-2.5 border border-sky-500 rounded-lg shadow-sm focus:ring-sky-500 0 text-slate-100 bg-slate-600 text-sm"
    : "w-full p-2.5 border border-sky-300 rounded-lg shadow-sm focus:ring-sky-500 focus:border-sky-500 text-gray-800 bg-white text-sm";
  const buttonGroupRegularClasses = `flex-1 px-4 py-2.5 text-sm font-medium rounded-l-lg transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    seasonType === 'regular' 
      ? 'bg-sky-500 dark:bg-sky-600 text-white border-sky-700' 
      : (isDarkMode ? 'bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300')
  }`;
  const buttonGroupPlayoffsClasses = `flex-1 -ml-px px-4 py-2.5 text-sm font-medium rounded-r-lg transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    seasonType === 'playoffs' 
      ? 'bg-sky-500 dark:bg-sky-600 text-white border-sky-700' 
      : (isDarkMode ? 'bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300')
  }`;

  return (
    <div className={mainContainerClasses}>
      <div className="p-4 md:px-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
            <div className={`lg:col-span-2 ${sectionClasses}`}>
                <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>
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
                        isDarkMode={isDarkMode}
                        />
                    ))}
                </div>
            </div>
            <div className={`${sectionClasses} space-y-5`}>
            <div>
                <label htmlFor="stat-select" className={`block text-lg font-semibold mb-1.5 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Statistic:</label>
                <select
                  id="stat-select"
                  value={selectedStat}
                  onChange={(e) => setSelectedStat(e.target.value)}
                  className={selectClasses}
                >
                {availableStats.map((stat) => (<option key={stat.value} value={stat.value}>{stat.label}</option>))}
                </select>
            </div>
            <div>
                <label className={`block text-lg font-semibold mb-1.5 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Season Type:</label>
                <div className="flex rounded-lg shadow-sm">
                    <button type="button" onClick={() => setSeasonType('regular')} className={buttonGroupRegularClasses}>Regular Season</button>
                    <button type="button" onClick={() => setSeasonType('playoffs')} className={buttonGroupPlayoffsClasses}>Playoffs</button>
                </div>
            </div>
            </div>
      </div>
      <div className={chartContainerClasses}>
        {isLoadingChart && (
            <div className="flex flex-col justify-center items-center h-full">
                <div className="w-12 h-12 border-4 border-t-sky-600 border-r-sky-700 border-b-slate-600 border-l-slate-600 rounded-full animate-spin"></div>
                <p className={`mt-4 text-lg ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Loading Chart Data...</p>
            </div>
        )}
        {!isLoadingChart && error && (
          <div className="flex justify-center items-center h-full">
            <p className="text-center text-red-500 p-4 bg-red-100 rounded-md border border-red-300">{error}</p>
          </div>
        )}
        {!isLoadingChart && !error && chartData && chartData.datasets.length > 0 && (
          <Line options={dynamicChartOptions} data={chartData} />
        )}
        {!isLoadingChart && !error && (!chartData || chartData.datasets.length === 0) && (
             <div className="flex justify-center items-center h-full">
                <p className={`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} text-center px-4`}>
                    {selectedPlayers.some(p => p !== null) ? `No ${seasonType} data to display for current selections.` : "Select players and a statistic to view the chart."}
                </p>
            </div>
        )}
      </div>
      </div>
    </div>
  );
}