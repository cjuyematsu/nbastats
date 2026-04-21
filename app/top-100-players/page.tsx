// app/top-100-players/page.tsx

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import Top100PlayersClient, { type RankingHistoryData } from './Top100PlayersClient';
import type { RpcRankedPlayerData, TopPlayer } from './types';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Top 100 NBA Players 2026: Vote To Change Rankings',
  description: 'View and vote on the Top 100 NBA player rankings for 2026. No sign-in required! Compare NBA player stats, nominate players, and see who rises to the top. Updated weekly based on fan votes.',
  keywords: [
    'top 100 nba players',
    'top 100 nba players 2026',
    'top 100 nba players 2025',
    'nba player rankings',
    'best nba players',
    'nba player rankings 2026',
    'top nba players',
    'nba player stats',
    'nba statistics',
    'nba stat leaders',
    'compare nba players',
    'nba player comparison',
    'fan-voted nba rankings',
    'nba top 100',
    'top 100 players nba',
  ],
  alternates: {
    canonical: '/top-100-players',
  },
  openGraph: {
    title: 'Top 100 NBA Players 2026 | Fan-Voted Rankings',
    description: 'Vote on the Top 100 NBA players for 2026. No sign-in required. Rankings update weekly based on fan votes.',
    url: '/top-100-players',
  },
};

interface PlayerRankingHistoryRPCRow {
  player_id: number;
  ranking_history: Array<{ week: number; rank: number; date: string }>;
  last_week_rank: number | null;
  current_rank: number;
  weekly_change: number;
}

function rpcRowToTopPlayer(p: RpcRankedPlayerData): TopPlayer {
  const gamesPlayed = p.G ?? 0;
  const points = p.PTS_total ?? 0;
  const fga = p.FGA_total ?? 0;
  const fta = p.FTA_total ?? 0;
  const trueShootingAttempts = fga + 0.44 * fta;
  const trueShootingPercentage = trueShootingAttempts > 0 ? points / (2 * trueShootingAttempts) : null;

  return {
    rankNumber: p.rankNumber,
    personId: p.personId,
    firstName: p.firstName ?? 'Unknown',
    lastName: p.lastName ?? 'Player',
    playerteamName: p.playerteamName ?? 'Free Agent',
    gamesPlayed,
    pointsPerGame: gamesPlayed > 0 && p.PTS_total != null ? p.PTS_total / gamesPlayed : null,
    reboundsPerGame: gamesPlayed > 0 && p.TRB_total != null ? p.TRB_total / gamesPlayed : null,
    assistsPerGame: gamesPlayed > 0 && p.AST_total != null ? p.AST_total / gamesPlayed : null,
    stealsPerGame: gamesPlayed > 0 && p.STL_total != null ? p.STL_total / gamesPlayed : null,
    blocksPerGame: gamesPlayed > 0 && p.BLK_total != null ? p.BLK_total / gamesPlayed : null,
    fieldGoalPercentage: p.FGA_total != null && p.FGA_total > 0 && p.FGM_total != null ? p.FGM_total / p.FGA_total : null,
    threePointPercentage: p.FG3A_total != null && p.FG3A_total > 0 && p.FG3M_total != null ? p.FG3M_total / p.FG3A_total : null,
    freeThrowPercentage: p.FTA_total != null && p.FTA_total > 0 && p.FTM_total != null ? p.FTM_total / p.FTA_total : null,
    trueShootingPercentage,
    weightedProminence: p.statsBasedProminence ?? p.Prominence_rs ?? null,
    upvotes: 0,
    downvotes: 0,
    sameSpotVotes: 0,
    finalMovementScoreAtRanking: p.weeklyMovementScore ?? 0,
    currentUserVote: null,
    seasonYear: p.SeasonYear ?? null,
  };
}

async function getInitialTop100Data(): Promise<{
  players: TopPlayer[];
  rankingData: Record<number, { history: RankingHistoryData[]; weeklyChange: number }>;
}> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_ranking_with_details');
  if (rpcError || !rpcData) {
    if (rpcError) console.error('SSR: error fetching top 100 rankings:', rpcError);
    return { players: [], rankingData: {} };
  }

  const ranked = rpcData as RpcRankedPlayerData[];
  const players = ranked.map(rpcRowToTopPlayer);
  const playerIds = ranked.map((p) => p.personId);

  const rankingData: Record<number, { history: RankingHistoryData[]; weeklyChange: number }> = {};
  if (playerIds.length > 0) {
    const { data: historyData, error: historyError } = await supabase.rpc(
      'get_players_ranking_histories_with_current',
      { player_ids_array: playerIds },
    );
    if (historyError) {
      console.error('SSR: error fetching ranking histories:', historyError);
    } else if (Array.isArray(historyData)) {
      (historyData as unknown as PlayerRankingHistoryRPCRow[]).forEach((record) => {
        rankingData[record.player_id] = {
          history: record.ranking_history.map((h) => ({
            week_of_year: h.week,
            rank_position: h.rank,
            archived_at: h.date,
          })),
          weeklyChange: record.weekly_change,
        };
      });
    }
  }

  return { players, rankingData };
}

export default async function Top100PlayersPage() {
  const { players, rankingData } = await getInitialTop100Data();
  return <Top100PlayersClient initialPlayers={players} initialRankingData={rankingData} />;
}
