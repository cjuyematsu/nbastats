// Import statements and interfaces remain the same
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export const revalidate = 86400;

interface PlayerSeasonStats {
  gamesPlayed: number | null;
  pointsPerGame: number | null;
  reboundsPerGame: number | null;
  assistsPerGame: number | null;
  stealsPerGame: number | null;
  blocksPerGame: number | null;
  fieldGoalPercentage: number | null;
  threePointPercentage: number | null;
  freeThrowPercentage: number | null;
}

interface TopPlayer {
  rank: number;
  personId: string | number;
  firstName: string;
  lastName: string;
  playerteamName: string;
  stats_2024_2025: PlayerSeasonStats;
  Prominence: number | null;
}

interface RpcPlayerStatsRow {
  rankNumber: number; 
  personId: number;
  firstName: string;
  lastName: string;
  playerteamName: string;
  gamesPlayed: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  weightedProminence: number;
}

async function getTop100PlayersData(): Promise<TopPlayer[]> {
  const { data, error } = await supabase.rpc('get_top_100_prominence_2025_stats');

  if (error) {
    console.error("Error fetching (Iteration 3) top players via RPC. Full error object:", JSON.stringify(error, null, 2));
    throw new Error("Failed to fetch (Iteration 3) top players. Message: " + error.message);
  }

  if (!data) {
    console.log("No data returned from (Iteration 3) RPC call.");
    return [];
  }

  return data.map((p: RpcPlayerStatsRow, index: number) => ({
    rank: index + 1, // Assign rank based on array position
    personId: p.personId,
    firstName: p.firstName,
    lastName: p.lastName,
    playerteamName: p.playerteamName,
    stats_2024_2025: {
      gamesPlayed: p.gamesPlayed,
      pointsPerGame: p.pointsPerGame,
      reboundsPerGame: p.reboundsPerGame,
      assistsPerGame: p.assistsPerGame,
      stealsPerGame: p.stealsPerGame,
      blocksPerGame: p.blocksPerGame,
      fieldGoalPercentage: p.fieldGoalPercentage,
      threePointPercentage: p.threePointPercentage,
      freeThrowPercentage: p.freeThrowPercentage,
    },
    Prominence: p.weightedProminence,
  }));
}

const PlayerBox = ({ player }: { player: TopPlayer }) => {
  const stats = player.stats_2024_2025;

  const statItems = [
    { label: "GP", value: stats.gamesPlayed ?? 'N/A' },
    { label: "PTS", value: stats.pointsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "REB", value: stats.reboundsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "AST", value: stats.assistsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "STL", value: stats.stealsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "BLK", value: stats.blocksPerGame?.toFixed(1) ?? 'N/A' },
    { label: "FG%", value: stats.fieldGoalPercentage !== null && stats.fieldGoalPercentage !== undefined ? (stats.fieldGoalPercentage * 100)?.toFixed(1) + '%' : 'N/A' },
    { label: "3P%", value: stats.threePointPercentage !== null && stats.threePointPercentage !== undefined ? (stats.threePointPercentage * 100)?.toFixed(1) + '%' : 'N/A' },
    { label: "FT%", value: stats.freeThrowPercentage !== null && stats.freeThrowPercentage !== undefined ? (stats.freeThrowPercentage * 100)?.toFixed(1) + '%' : 'N/A' },
  ];

  return (
    <div className="bg-slate-700 border border-slate-500 rounded-lg shadow-lg p-4 text-slate-200 flex flex-col transition-all hover:shadow-sky-500/30 hover:border-sky-500/50">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
        <span className="text-3xl font-bold text-sky-400 mr-5 w-12 text-right">{player.rank}.</span>
          <div>
          <Link href={`/player/${player.personId}`}>
              <h3 className="text-xl font-semibold leading-tight hover:text-sky-300 cursor-pointer">
                {`${player.firstName} ${player.lastName}`}
              </h3>
            </Link>
            <p className="text-sm text-slate-400">{player.playerteamName}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-slate-500/50">
        <div className="grid grid-cols-3 gap-x-2 gap-y-2 text-sm font-mono">
          {statItems.map(item => (
            <div key={item.label} className="bg-slate-600/70 p-2 rounded shadow text-center">
              <div className="text-xs text-sky-300/80 mb-0.5">{item.label}</div>
              <div className="text-md font-semibold text-slate-100">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default async function Top100PlayersPage() {
  let players: TopPlayer[] = [];
  let fetchError: string | null = null;

  try {
    players = await getTop100PlayersData();
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching player data.";
  }

  if (fetchError) {
    return (
      <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100 p-4 md:p-6">
        <h1 className="text-3xl font-bold mb-8 text-center text-red-400">Error Loading Top Players</h1>
        <p className="text-center text-red-300">{fetchError}</p>
        <p className="mt-4 text-center text-slate-300">Please check back later or contact support if the issue persists.</p>
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100 p-4 md:p-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-sky-400">
          Top 100 Players - 2024-2025 Season
        </h1>
        <p className="text-center text-slate-300 py-10">No player data is currently available.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100">
      <div className="p-4 md:py-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-sky-400">
          Top 100 <span className="block sm:inline text-2xl sm:text-3xl text-slate-300">(2024-2025)</span>
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {players.map((player) => (
            <PlayerBox key={player.personId.toString()} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}