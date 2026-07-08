// components/PlayerComparisonChart.tsx

'use client';

import { useSearchParams } from 'next/navigation';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlayerSuggestion, SelectedPlayerForComparison } from '@/types/stats';
import { compareHref } from '@/app/data/compareMatchups';
import { buildCompareShare } from '@/lib/shareText';
import ShareResult from '@/components/ShareResult';
import CompareCareerTable from '@/components/CompareCareerTable';
import CompareExploreLinks from '@/components/CompareExploreLinks';
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

// Categorical palettes validated for CVD separation and contrast against the
// chart surfaces (light bg-gray-50, dark bg-slate-700). Indexed by player slot,
// never cycled, so removing a player does not repaint the others.
const PLAYER_COLORS_LIGHT = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7'];
const PLAYER_COLORS_DARK = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9'];

interface PlayerSearchInputProps {
  index: number;
  selectedPlayer: SelectedPlayerForComparison | null;
  onPlayerSelect: (player: SelectedPlayerForComparison | null, index: number) => void;
  onRemovePlayer: (index: number) => void;
}

interface SelectedPlayerData {
  PlayerAge: number | null;
  SeasonYear: number | null;
  playerteamName: string;
  [key: string]: number | string | null;
}

interface CustomChartPoint {
  x: number;
  y: number | null;
  team: string | null;
  season: number | null;
  age: number | null;
}

type SlotDataset = ChartDataset<'line', CustomChartPoint[]> & { slot: number };

function isSelectedPlayerDataArray(data: unknown): data is SelectedPlayerData[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  const firstElement = data[0];
  return (
    typeof firstElement === 'object' &&
    firstElement !== null &&
    typeof (firstElement as { error?: unknown }).error === 'undefined' &&
    'PlayerAge' in firstElement &&
    'SeasonYear' in firstElement &&
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

  const inputClasses = "w-full p-2 border border-gray-300 dark:border-slate-500 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-600 placeholder-gray-400 dark:placeholder-slate-400";

  const suggestionsListClasses = "absolute z-20 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto";

  const suggestionItemClasses = "p-2 hover:bg-sky-500 dark:hover:bg-sky-600 cursor-pointer text-sm text-gray-700 dark:text-slate-200";

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
      {isLoading && <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-slate-400">Loading...</div>}
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
        <div className={`${suggestionsListClasses} p-2 text-sm text-gray-500 dark:text-slate-400`}>
          No players found matching &quot;{searchTerm}&quot;.
        </div>
      )}
    </div>
  );
};

const QUICK_STATS: { value: string; label: string }[] = [
  { value: 'PTS_per_g', label: 'PPG' },
  { value: 'TRB_per_g', label: 'RPG' },
  { value: 'AST_per_g', label: 'APG' },
  { value: 'FG3_PCT', label: '3P%' },
  { value: 'TS_PCT', label: 'TS%' },
];

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

export default function PlayerComparisonChart({ initialPlayerNames, showShare, showExplore }: { initialPlayerNames?: string[]; showShare?: boolean; showExplore?: boolean }) {
  const [selectedPlayers, setSelectedPlayers] = useState<(SelectedPlayerForComparison | null)[]>(Array(MAX_PLAYERS).fill(null));
  const [selectedStat, setSelectedStat] = useState<string>(availableStats[0].value);
  const [seasonType, setSeasonType] = useState<'regular' | 'playoffs'>('regular');
  const [xAxisMode, setXAxisMode] = useState<'age' | 'season'>('age');
  const [chartData, setChartData] = useState<ChartData<'line', CustomChartPoint[]> | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const searchParams = useSearchParams();
  const initialNamesKey = (initialPlayerNames ?? []).join(',');

  useEffect(() => {
    const playersQuery = searchParams.get('players') || initialNamesKey;
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
  }, [searchParams, initialNamesKey]);


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
    const datasets: SlotDataset[] = [];
    const allXValues = new Set<number>();
    const currentTableName = seasonType === 'regular' ? 'regularseasonstats' : 'playoffstats';

    try {
      for (let slot = 0; slot < selectedPlayers.length; slot++) {
        const player = selectedPlayers[slot];
        if (!player || !player.personId) continue;

        const columnsToSelect = `PlayerAge, SeasonYear, playerteamName, "${selectedStat}"`;

        const { data: fetchedData, error: dbError } = await supabase
          .from(currentTableName)
          .select<string, SelectedPlayerData>(columnsToSelect)
          .eq('personId', player.personId)
          .order('SeasonYear', { ascending: true });

        if (dbError) throw new Error(`Data fetch error for ${player.firstName}: ${dbError.message}`);

        let seasonApiData: SelectedPlayerData[] | null = null;
        if (isSelectedPlayerDataArray(fetchedData)) seasonApiData = fetchedData;
        else if (fetchedData !== null) console.warn(`Unexpected data format for ${player.firstName}`, fetchedData);

        const xOf = (s: SelectedPlayerData) => (xAxisMode === 'age' ? s.PlayerAge : s.SeasonYear);

        const playerCareerDataPoints: CustomChartPoint[] = [];
        if (seasonApiData && seasonApiData.length > 0) {
          const validSeasons = seasonApiData.filter((s) => xOf(s) !== null);
          if (validSeasons.length === 0) continue;

          const playerMinX = xOf(validSeasons[0])!;
          const playerMaxX = xOf(validSeasons[validSeasons.length - 1])!;

          const seasonDataMap = new Map(validSeasons.map(s => [xOf(s)!, {
            stat: s[selectedStat] === null ? null : Number(s[selectedStat]),
            team: s.playerteamName,
            season: s.SeasonYear,
            age: s.PlayerAge,
          }]));
          let lastKnownTeam = validSeasons[0]?.playerteamName || null;

          for (let x = playerMinX; x <= playerMaxX; x++) {
            allXValues.add(x);
            const currentData = seasonDataMap.get(x);
            if (currentData) {
              playerCareerDataPoints.push({
                x,
                y: (currentData.stat === null || isNaN(currentData.stat)) ? null : currentData.stat,
                team: currentData.team || lastKnownTeam,
                season: currentData.season,
                age: currentData.age,
              });
              if (currentData.team) lastKnownTeam = currentData.team;
            } else {
              playerCareerDataPoints.push({ x, y: null, team: lastKnownTeam, season: null, age: null });
            }
          }
        }

        if (playerCareerDataPoints.length > 0) {
          datasets.push({
            label: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
            data: playerCareerDataPoints,
            tension: 0.1,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: (ctx: ScriptableContext<'line'>) => ((ctx.raw as CustomChartPoint | undefined)?.y === null ? 0 : 7),
            pointHitRadius: 3,
            spanGaps: false,
            slot,
          });
        }
      }

      if (datasets.length === 0 && activePlayers.length > 0) {
        setError(`No data found for selected players, stat, and ${seasonType} type.`);
        setChartData(null);
      } else if (datasets.length > 0 && allXValues.size > 0) {
        const actualMinX = Math.min(...allXValues);
        const actualMaxX = Math.max(...allXValues);

        const displayMinX = actualMinX - AGE_AXIS_PADDING;
        const displayMaxX = actualMaxX + AGE_AXIS_PADDING;

        const chartLabels: string[] = [];
        for (let x = displayMinX; x <= displayMaxX; x++) {
          chartLabels.push(x.toString());
        }
        setChartData({ labels: chartLabels, datasets });

      } else if (datasets.length > 0 && allXValues.size === 0) {
        setError('Chart data exists but no axis range determined.');
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
  }, [selectedPlayers, selectedStat, seasonType, xAxisMode]);

  useEffect(() => {
    if (selectedPlayers.some(p => p !== null)) {
        fetchChartDataForAllPlayers();
    } else {
        setChartData(null);
        setError(null);
    }
  }, [selectedPlayers, selectedStat, seasonType, xAxisMode, fetchChartDataForAllPlayers]);

  const playerPalette = isDarkMode ? PLAYER_COLORS_DARK : PLAYER_COLORS_LIGHT;

  const themedChartData = React.useMemo(() => {
    if (!chartData) return null;
    return {
      ...chartData,
      datasets: chartData.datasets.map((ds) => {
        const color = playerPalette[(ds as SlotDataset).slot] ?? playerPalette[0];
        return { ...ds, borderColor: color, backgroundColor: color + '33', pointBackgroundColor: color };
      }),
    };
  }, [chartData, playerPalette]);

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
            text: `${seasonType.charAt(0).toUpperCase() + seasonType.slice(1)} - ${availableStats.find(s => s.value === selectedStat)?.label || selectedStat} ${xAxisMode === 'age' ? 'vs. Age' : 'by Season'}`,
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
                title: function(items: TooltipItem<'line'>[]) {
                    const x = items[0]?.parsed?.x;
                    if (x == null) return '';
                    return xAxisMode === 'age' ? `Age ${x}` : `${x} Season`;
                },
                label: function(context: TooltipItem<'line'>) {
                    let label = context.dataset.label || '';
                    if (label) label += ': ';
                    const rawData = context.raw as CustomChartPoint | undefined;
                    if (rawData?.y !== null && typeof rawData?.y !== 'undefined') {
                        const yValue = Number(rawData.y);
                        if (selectedStat.includes('_PCT')) label += (yValue * 100).toFixed(1) + '%';
                        else if (selectedStat.includes('_per_g')) label += yValue.toFixed(1);
                        else label += yValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: (selectedStat.includes('_per_g') || selectedStat.includes('_PCT') ? 1 : 0) });
                        const detail = xAxisMode === 'age' ? rawData?.season : rawData?.age != null ? `Age ${rawData.age}` : null;
                        if (rawData?.team && detail != null) label += ` (${rawData.team}, ${detail})`;
                        else if (rawData?.team) label += ` (${rawData.team})`;
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
            title: { display: true, text: xAxisMode === 'age' ? 'Player Age' : 'Season', color: chartTextColor, font: { size: 14, weight: 'bold' }},
            ticks: { color: chartTextColor, stepSize: 1, callback: (value: string | number) => String(Number(value)) },
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
  }, [selectedStat, seasonType, xAxisMode, chartTextColor, chartGridColor, chartTooltipBgColor, chartTooltipTitleColor, chartTooltipBodyColor, chartTooltipBorderColor, chartData]);

  const mainContainerClasses = "w-full bg-white dark:bg-gray-800 rounded-lg text-gray-800 dark:text-slate-100";
  const sectionClasses = "p-5 bg-gray-50 dark:bg-slate-700 rounded-xl shadow-lg border border-gray-200 dark:border-slate-600";
  const chartContainerClasses = "mt-6 h-96 md:h-[550px] bg-gray-50 dark:bg-slate-700 p-3 rounded-xl shadow-inner border border-gray-200 dark:border-slate-600";
  const selectClasses = "w-full p-2.5 border border-sky-300 dark:border-sky-500 rounded-lg shadow-sm focus:ring-sky-500 focus:border-sky-500 text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-600 text-sm";
  const idleToggleClasses = 'bg-white dark:bg-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-500 border border-gray-300 dark:border-slate-500';
  const buttonGroupRegularClasses = `flex-1 px-4 py-2.5 text-sm font-medium rounded-l-lg transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    seasonType === 'regular'
      ? 'bg-sky-500 dark:bg-sky-600 text-white border-sky-700'
      : idleToggleClasses
  }`;
  const buttonGroupPlayoffsClasses = `flex-1 -ml-px px-4 py-2.5 text-sm font-medium rounded-r-lg transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    seasonType === 'playoffs'
      ? 'bg-sky-500 dark:bg-sky-600 text-white border-sky-700'
      : idleToggleClasses
  }`;
  const xAxisAgeClasses = `flex-1 px-4 py-2.5 text-sm font-medium rounded-l-lg transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    xAxisMode === 'age' ? 'bg-sky-500 dark:bg-sky-600 text-white border-sky-700' : idleToggleClasses
  }`;
  const xAxisSeasonClasses = `flex-1 -ml-px px-4 py-2.5 text-sm font-medium rounded-r-lg transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    xAxisMode === 'season' ? 'bg-sky-500 dark:bg-sky-600 text-white border-sky-700' : idleToggleClasses
  }`;
  const chipClasses = (active: boolean) => `px-3 py-1 text-sm font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    active ? 'bg-sky-500 text-white' : idleToggleClasses
  }`;

  const activeNames = selectedPlayers
    .filter((p): p is SelectedPlayerForComparison => p !== null)
    .map((p) => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim())
    .filter((n) => n.length > 0);
  const activePlayersWithColors = selectedPlayers
    .map((p, slot) => (p ? { player: p, color: playerPalette[slot] } : null))
    .filter((x): x is { player: SelectedPlayerForComparison; color: string } => x !== null);
  // Two selected players always share a crawlable permalink (curated slug or the
  // canonical open slug); only fall back to the query-param URL for other counts.
  const shareSlug = activeNames.length === 2 ? compareHref(activeNames[0], activeNames[1]) : null;
  const shareUrl = shareSlug
    ? `hoopsdata.net/compare/${shareSlug}`
    : `hoopsdata.net/compare?players=${encodeURIComponent(activeNames.join(','))}`;

  return (
    <div className={mainContainerClasses}>
      <div className="p-4 md:px-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
            <div className={`lg:col-span-2 ${sectionClasses}`}>
                <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-slate-100">
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
            <div className={`${sectionClasses} space-y-5`}>
            <div>
                <label htmlFor="stat-select" className="block text-lg font-semibold mb-1.5 text-gray-800 dark:text-slate-100">Statistic:</label>
                <div className="flex flex-wrap gap-2 mb-2.5">
                    {QUICK_STATS.map((stat) => (
                        <button key={stat.value} type="button" onClick={() => setSelectedStat(stat.value)} className={chipClasses(selectedStat === stat.value)}>
                            {stat.label}
                        </button>
                    ))}
                </div>
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
                <label className="block text-lg font-semibold mb-1.5 text-gray-800 dark:text-slate-100">Season Type:</label>
                <div className="flex rounded-lg shadow-sm">
                    <button type="button" onClick={() => setSeasonType('regular')} className={buttonGroupRegularClasses}>Regular Season</button>
                    <button type="button" onClick={() => setSeasonType('playoffs')} className={buttonGroupPlayoffsClasses}>Playoffs</button>
                </div>
            </div>
            <div>
                <label className="block text-lg font-semibold mb-1.5 text-gray-800 dark:text-slate-100">X-Axis:</label>
                <div className="flex rounded-lg shadow-sm">
                    <button type="button" onClick={() => setXAxisMode('age')} className={xAxisAgeClasses}>Age</button>
                    <button type="button" onClick={() => setXAxisMode('season')} className={xAxisSeasonClasses}>Season</button>
                </div>
            </div>
            </div>
      </div>
      <div className={chartContainerClasses}>
        {isLoadingChart && (
            <div className="flex flex-col justify-center items-center h-full">
                <div className="w-12 h-12 border-4 border-t-sky-600 border-r-sky-700 border-b-slate-600 border-l-slate-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-lg text-gray-600 dark:text-slate-300">Loading Chart Data...</p>
            </div>
        )}
        {!isLoadingChart && error && (
          <div className="flex justify-center items-center h-full">
            <p className="text-center text-red-500 p-4 bg-red-100 rounded-md border border-red-300">{error}</p>
          </div>
        )}
        {!isLoadingChart && !error && themedChartData && themedChartData.datasets.length > 0 && (
          <Line options={dynamicChartOptions} data={themedChartData} />
        )}
        {!isLoadingChart && !error && (!chartData || chartData.datasets.length === 0) && (
             <div className="flex justify-center items-center h-full">
                <p className="text-lg text-gray-500 dark:text-slate-400 text-center px-4">
                    {selectedPlayers.some(p => p !== null) ? `No ${seasonType} data to display for current selections.` : "Select players and a statistic to view the chart."}
                </p>
            </div>
        )}
      </div>
      <CompareCareerTable players={activePlayersWithColors} seasonType={seasonType} />
      {showExplore && <CompareExploreLinks names={activeNames} />}
      {showShare && activeNames.length >= 2 && (
        <div className="mt-4 flex justify-center">
          <ShareResult
            shareText={buildCompareShare({ nameA: activeNames[0], nameB: activeNames[1], url: shareUrl })}
            game="compare"
            surface="tool"
          />
        </div>
      )}
      </div>
    </div>
  );
}