// app/top-100-players/page.tsx

import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getLastRearrangementIso } from '@/lib/top100Time';
import Top100PlayersClient from './Top100PlayersClient';
import type { PlayerRankingInfo, RpcRankedPlayerData, TopPlayer } from './types';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { weekStartISO } = await getInitialTop100Data();
  const year = new Date(weekStartISO).getFullYear();
  const title = `Top 100 NBA Players ${year}: Vote To Change Rankings`;
  const description = `Vote on the Top 100 NBA player rankings for ${year}, no sign-in required. Nominate players, compare stats, see who rises. Reshuffled every 3 days by fan votes.`;
  return {
    title,
    description,
    keywords: [
      'top 100 nba players',
      `top 100 nba players ${year}`,
      `top 100 nba players ${year - 1}`,
      'nba player rankings',
      'best nba players',
      `nba player rankings ${year}`,
      `best nba players ${year}`,
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
      title: `Top 100 NBA Players ${year} | Fan-Voted Rankings`,
      description: `Vote on the Top 100 NBA players for ${year}. No sign-in required. Rankings reshuffle every 3 days based on fan votes.`,
      url: '/top-100-players',
    },
  };
}

interface PlayerRankingHistoryRPCRow {
  player_id: number;
  ranking_history: Array<{ week: number; rank: number; date: string }>;
  last_week_rank: number | null;
  current_rank: number;
  weekly_change: number;
}

interface AggregatedVotesRPCRow {
  playerId: number;
  upvotes: number;
  downvotes: number;
  sameSpotVotes: number;
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

// cache(): generateMetadata and the page share one fetch per request.
const getInitialTop100Data = cache(async (): Promise<{
  players: TopPlayer[];
  rankingData: Record<number, PlayerRankingInfo>;
  weekStartISO: string;
}> => {
  // The vote window opens at the last APPLIED rearrangement, not the
  // theoretical boundary: if a cron fire is late, votes cast since the
  // boundary must stay visible until a run actually consumes them.
  const { data: boardMeta } = await supabase
    .from('currentweeklyrankings')
    .select('ranked_at')
    .limit(1);
  const weekStartISO = boardMeta?.[0]?.ranked_at ?? getLastRearrangementIso();

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_ranking_with_details');
  if (rpcError || !rpcData) {
    if (rpcError) console.error('SSR: error fetching top 100 rankings:', rpcError);
    return { players: [], rankingData: {}, weekStartISO };
  }

  const ranked = rpcData as RpcRankedPlayerData[];
  const players = ranked.map(rpcRowToTopPlayer);
  const playerIds = ranked.map((p) => p.personId);

  const rankingData: Record<number, PlayerRankingInfo> = {};

  const [historyResult, voteCountsResult] = await Promise.all([
    playerIds.length > 0
      ? supabase.rpc('get_players_ranking_histories_with_current', { player_ids_array: playerIds })
      : Promise.resolve({ data: null, error: null }),
    playerIds.length > 0
      ? supabase.rpc('get_aggregated_weekly_votes_for_players', {
          player_ids_array: playerIds,
          p_week_start_time: weekStartISO,
        })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (historyResult.error) {
    console.error('SSR: error fetching ranking histories:', historyResult.error);
  } else if (Array.isArray(historyResult.data)) {
    (historyResult.data as unknown as PlayerRankingHistoryRPCRow[]).forEach((record) => {
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

  if (!voteCountsResult.error && Array.isArray(voteCountsResult.data)) {
    const voteMap = new Map<number, { upvotes: number; downvotes: number; sameSpotVotes: number }>();
    (voteCountsResult.data as AggregatedVotesRPCRow[]).forEach((row) => {
      voteMap.set(row.playerId, { upvotes: row.upvotes, downvotes: row.downvotes, sameSpotVotes: row.sameSpotVotes });
    });
    players.forEach((p) => {
      const v = voteMap.get(p.personId);
      if (v) { p.upvotes = v.upvotes; p.downvotes = v.downvotes; p.sameSpotVotes = v.sameSpotVotes; }
    });
  }

  return { players, rankingData, weekStartISO };
});

export default async function Top100PlayersPage() {
  const { players, rankingData, weekStartISO } = await getInitialTop100Data();
  const year = new Date(weekStartISO).getFullYear();
  const reshuffledOn = new Date(weekStartISO).toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const topThree = players.slice(0, 3).map((p) => `${p.firstName} ${p.lastName}`);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Top 100 NBA Players of ${year}`,
    description: 'Fan-voted Top 100 NBA player rankings, reshuffled every 3 days.',
    numberOfItems: players.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: players.map((p) => ({
      '@type': 'ListItem',
      position: p.rankNumber,
      name: `${p.firstName} ${p.lastName}`,
      url: `https://hoopsdata.net/player/${p.personId}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <Top100PlayersClient initialPlayers={players} initialRankingData={rankingData} initialWeekStartISO={weekStartISO} />
      <section className="w-full mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 text-slate-700 dark:text-slate-300">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">About these rankings</h2>
        <p className="mb-2">
          This Top 100 NBA players list for {year} is ranked by fan votes, not by an editorial panel.
          Anyone can vote a player up or down without signing in, and the board reshuffles every 3 days
          based on the votes cast that cycle. It was last reshuffled on {reshuffledOn}.
        </p>
        {topThree.length === 3 && (
          <p className="mb-2">
            Fans currently rank {topThree[0]}, {topThree[1]}, and {topThree[2]} as the top three players
            in the NBA. Disagree? Cast your vote above, or{' '}
            <Link href="/compare" className="text-sky-600 dark:text-sky-400 hover:underline">
              compare any two players side by side
            </Link>{' '}
            to settle it with stats.
          </p>
        )}
        <p>
          Every player on the board links to their full career stats page, and nominations open a path
          for anyone outside the 100 to break in.
        </p>
      </section>
    </>
  );
}
