//app/top-100-players/Top100PlayersClient.tsx

'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import CountdownTimer from '@/components/CountdownTimer';
import Image from 'next/image';
import { TopPlayer, RpcRankedPlayerData } from './types';
import { getAnonymousId } from '@/lib/anonymousIdentifier'; 

const CACHE_KEY_TOP_100_RANKS = 'top100OfficialRanksCache_v1';

function getNextSundayMidnightISO(): string {
  const now = new Date();
  const nextSunday = new Date(now.getTime());
  const currentDay = now.getDay(); 
  const daysToAdd = (7 - currentDay) % 7; 
  nextSunday.setDate(now.getDate() + daysToAdd);
  nextSunday.setHours(0, 0, 0, 0); 
  if (nextSunday.getTime() < now.getTime()) {
    nextSunday.setDate(nextSunday.getDate() + 7);
    nextSunday.setHours(0, 0, 0, 0); 
  }
  return nextSunday.toISOString();
}

interface CurrentWeekPlayerVoteCountsRow {
    player_id: number; 
    vote_type: number; 
}

interface PlayerSuggestion {
  personId: number;
  firstName: string;
  lastName: string;
  min_season?: number; 
  max_season?: number; 
}

interface CachedTop100Data {
  ranks: RpcRankedPlayerData[];
  expiresAt: string; 
}

interface VotingButtonProps {
  onClick: () => void;
  isActive: boolean;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  activeClass: string; 
  inactiveClass: string; 
}

export interface RankingHistoryData {
  week_of_year: number;
  rank_position: number;
  archived_at: string;
}

interface PlayerRankingHistoryRPC {
  player_id: number;
  ranking_history: Array<{
    week: number;
    rank: number;
    date: string;
  }>;
  last_week_rank: number | null;
  current_rank: number;
  weekly_change: number;
}

const VotingButton: React.FC<VotingButtonProps> = ({ 
  onClick, isActive, disabled, ariaLabel, children, activeClass, inactiveClass,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex items-center p-1.5 rounded-md transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? activeClass : inactiveClass}`}
    >
      {children}
    </button>
  );
};

interface AggregatedVotesData {
  playerId: number;  
  upvotes: number; 
  downvotes: number;
  sameSpotVotes: number;
}

const getTeamLogoUrl = (teamName: string | null): string => {
  if (!teamName) return '/nba-logo.png'; 
  if (teamName.toLowerCase().includes('trail blazers')) return '/trailblazers.png';
  const nameParts = teamName.split(' ');
  const logoName = nameParts[nameParts.length - 1].toLowerCase();
  return `/${logoName}.png`;
};

interface PlayerBoxProps {
  player: TopPlayer;
  onVote: (playerId: number, newVoteType: number) => Promise<void>;
  isVotingDisabled: boolean;
  rankingHistory?: RankingHistoryData[];
  weeklyChange?: number;
}

const PlayerBox: React.FC<PlayerBoxProps> = ({ 
  player, 
  onVote, 
  isVotingDisabled, 
  rankingHistory = [], 
  weeklyChange = 0 
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const formattedHistory = rankingHistory.map(h => ({
    week: h.week_of_year,
    rank: h.rank_position,
    date: h.archived_at
  }));

  const stats = [
    { label: "PTS", value: player.pointsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "REB", value: player.reboundsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "AST", value: player.assistsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "STL", value: player.stealsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "BLK", value: player.blocksPerGame?.toFixed(1) ?? 'N/A' },
    { label: "TS%", value: player.trueShootingPercentage !== null ? (player.trueShootingPercentage * 100)?.toFixed(1) : 'N/A' },
    { label: "FG%", value: player.fieldGoalPercentage !== null ? (player.fieldGoalPercentage * 100)?.toFixed(1) : 'N/A' },
    { label: "3P%", value: player.threePointPercentage !== null ? (player.threePointPercentage * 100)?.toFixed(1) : 'N/A' },
    { label: "FT%", value: player.freeThrowPercentage !== null ? (player.freeThrowPercentage * 100)?.toFixed(1) : 'N/A' },
    { label: "GP", value: player.gamesPlayed ?? 'N/A' },
  ];

  const handleVoteClick = (voteTypeClicked: number) => {
    const newVoteType = player.currentUserVote === voteTypeClicked ? 0 : voteTypeClicked;
    onVote(player.personId, newVoteType);
  };

  return (
    <div className={`relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg flex flex-col h-full overflow-hidden transition-all duration-300 hover:border-sky-500/60 hover:shadow-sky-500/10 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Image
        width="1000"
        height="500"
        src={getTeamLogoUrl(player.playerteamName)}
        alt={`${player.playerteamName} logo`}
        className="absolute top-1/2 left-1/2 w-[29rem] h-[17.5rem] object-cover opacity-[0.12] dark:opacity-[0.09] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        onLoad={() => setIsImageLoaded(true)}
        onError={(e) => {
          e.currentTarget.src = '/nba-logo.png';
          setIsImageLoaded(true); 
        }}
      />
      
      {formattedHistory.length > 0 && player.rankNumber && (
        <div className="relative z-10 px-3 pt-3 border-b border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CollapsibleRankingTimeline 
            history={formattedHistory}
            currentRank={player.rankNumber}
            weeklyChange={weeklyChange}
          />
        </div>
      )}
      
      <div className="relative z-10 flex flex-row flex-1">
        <div className="flex w-3/5 flex-col justify-between p-4">
          <div>
            <div className="flex items-center mb-1">
              <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-full bg-sky-500 text-white font-bold text-sm flex-shrink-0">
                {player.rankNumber}
              </div>
              <div className="flex flex-col">
                <Link
                  href={`/player/${player.personId}`}
                  className="text-2xl font-bold leading-tight text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  {`${player.firstName} ${player.lastName}`}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {player.gamesPlayed === 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
                      INJURED
                    </span>
                  )}
                  {player.seasonYear === 2025 && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-50 dark:bg-sky-900/20 text-white-700 dark:text-white-400 border border-sky-200 dark:border-sky-800">
                      2025 Stats
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 pl-11">{player.playerteamName}</p>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <VotingButton
              onClick={() => handleVoteClick(1)}
              isActive={player.currentUserVote === 1}
              disabled={isVotingDisabled}
              ariaLabel={`Upvote ${player.firstName} ${player.lastName}`}
              activeClass="bg-green-500 text-white hover:bg-green-600"
              inactiveClass="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-green-600 dark:text-green-300 hover:text-green-700 dark:hover:text-green-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
              <span className="font-semibold text-xs ml-1.5">{player.upvotes}</span>
            </VotingButton>
            <VotingButton
              onClick={() => handleVoteClick(2)}
              isActive={player.currentUserVote === 2}
              disabled={isVotingDisabled}
              ariaLabel={`Confirm spot for ${player.firstName} ${player.lastName}`}
              activeClass="bg-sky-500 text-white hover:bg-sky-600"
              inactiveClass="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:text-sky-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              <span className="font-semibold text-xs ml-1.5">{player.sameSpotVotes}</span>
            </VotingButton>
            <VotingButton
              onClick={() => handleVoteClick(-1)}
              isActive={player.currentUserVote === -1}
              disabled={isVotingDisabled}
              ariaLabel={`Downvote ${player.firstName} ${player.lastName}`}
              activeClass="bg-red-500 text-white hover:bg-red-600"
              inactiveClass="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-red-500 dark:text-red-300 hover:text-red-600 dark:hover:text-red-100"
            >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
               <span className="font-semibold text-xs ml-1.5">{player.downvotes}</span>
            </VotingButton>
          </div>
        </div>

        <div className="relative z-10 w-2/5 border-l border-gray-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-2 grid-rows-5 gap-x-4 gap-y-2 h-full">
            {stats.map(stat => (
                <div key={stat.label} className="flex flex-col">
                    <span className="text-xs text-sky-600 dark:text-sky-400">{stat.label}</span>
                    <span className="text-lg font-bold text-slate-700 dark:text-sky-200">
                        {stat.value}
                        {stat.label.includes('%') && stat.value !== 'N/A' ? <span className="text-xs text-slate-500 dark:text-slate-400">%</span> : ''}
                    </span>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Top100PlayersPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [players, setPlayers] = useState<TopPlayer[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [nextRearrangementTime, setNextRearrangementTime] = useState<string | null>(null);
  const [lastRearrangementTimeISO, setLastRearrangementTimeISO] = useState<string | null>(null);
  const [nominationSearchTerm, setNominationSearchTerm] = useState('');
  const [nominationSuggestions, setNominationSuggestions] = useState<PlayerSuggestion[]>([]);
  const [isNominating, setIsNominating] = useState(false); 
  const [nominationMessage, setNominationMessage] = useState<string | null>(null);
  const [isSubmittingVoteForPlayer, setIsSubmittingVoteForPlayer] = useState<Record<number, boolean>>({});
  const [playerRankingData, setPlayerRankingData] = useState<Map<number, { history: RankingHistoryData[], weeklyChange: number }>>(new Map());

  const fetchOfficialWeeklyRankingWithCache = useCallback(async (
    currentNextRearrangementTime: string | null
  ): Promise<RpcRankedPlayerData[]> => {

    // Check cache first to avoid unnecessary database calls
    if (!currentNextRearrangementTime) {
      const { data, error } = await supabase.rpc('get_current_ranking_with_details');
      if (error) {
        console.error("Error fetching official weekly rankings (no cache time):", error);
        throw new Error("Failed to fetch official rankings. Message: " + (error.message || 'Unknown RPC error'));
      }
      return (data || []) as RpcRankedPlayerData[];
    }
    try {
      const cachedItem = localStorage.getItem(CACHE_KEY_TOP_100_RANKS);
      if (cachedItem) {
        const cachedData: CachedTop100Data = JSON.parse(cachedItem);
        if (cachedData.expiresAt && new Date().getTime() < new Date(cachedData.expiresAt).getTime()) {
          console.log("Returning cached rankings data.");
          return cachedData.ranks;
        } else {
          localStorage.removeItem(CACHE_KEY_TOP_100_RANKS);
        }
      }
    } catch (e) { console.error("Error reading official rankings from localStorage:", e); localStorage.removeItem(CACHE_KEY_TOP_100_RANKS); }

    console.log("Fetching fresh official weekly rankings from database.");
    const { data, error } = await supabase.rpc('get_current_ranking_with_details');
    if (error) {
      console.error("Error fetching official weekly rankings via RPC:", error);
      throw new Error("Failed to fetch official rankings. Message: " + (error.message || 'Unknown RPC error'));
    }
    const fetchedRanks = (data || []) as RpcRankedPlayerData[];

    try {
      localStorage.setItem(CACHE_KEY_TOP_100_RANKS, JSON.stringify({ ranks: fetchedRanks, expiresAt: currentNextRearrangementTime }));
    } catch (e) { console.error("Error writing official rankings to localStorage:", e); }

    return fetchedRanks; 
  }, []);

  const fetchCurrentWeekVoteCountsForPlayers = useCallback(async (playerIds: number[], weekStartTimeISO: string): Promise<Map<number, {upvotes: number, downvotes: number, sameSpotVotes: number}>> => {
    const voteCountsMap = new Map<number, {upvotes: number, downvotes: number, sameSpotVotes: number}>();
    playerIds.forEach(id => voteCountsMap.set(id, { upvotes: 0, downvotes: 0, sameSpotVotes: 0 }));

    if (playerIds.length === 0 || !weekStartTimeISO) {
        return voteCountsMap;
    }
    
    const { data, error } = await supabase.rpc('get_aggregated_weekly_votes_for_players', {
        player_ids_array: playerIds,
        p_week_start_time: weekStartTimeISO 
    });

    if (error) {
        console.error('Error fetching current week vote counts via RPC:', error);
        return voteCountsMap; 
    }

    data?.forEach((row: AggregatedVotesData) => { 
        voteCountsMap.set(row.playerId, { 
            upvotes: row.upvotes,
            downvotes: row.downvotes,
            sameSpotVotes: row.sameSpotVotes
        });
    });
    return voteCountsMap;
  }, []);

    const fetchRankingHistoriesWithRPC = useCallback(async (
    playerIds: number[]
  ): Promise<Map<number, { history: RankingHistoryData[], weeklyChange: number }>> => {
    const historiesMap = new Map<number, { history: RankingHistoryData[], weeklyChange: number }>();
    
    if (playerIds.length === 0) {
      return historiesMap;
    }

    try {
      const { data, error } = await supabase.rpc('get_players_ranking_histories_with_current', {
        player_ids_array: playerIds,
      });

      if (error) {
        console.error('Error fetching ranking histories via RPC:', error);
        return historiesMap;
      }

      if (data && Array.isArray(data)) {
        (data as PlayerRankingHistoryRPC[]).forEach(record => {
          const history = record.ranking_history.map(h => ({
            week_of_year: h.week,
            rank_position: h.rank,
            archived_at: h.date
          }));
          
          historiesMap.set(record.player_id, {
            history,
            weeklyChange: record.weekly_change
          });
        });
      }
    } catch (err) {
      console.error('Exception fetching ranking histories:', err);
    }

    return historiesMap;
  }, []);
  
  const loadPlayerDataInternal = useCallback(async (currentNextRankTimeForCache: string | null) => {
    setFetchError(null); 
    try {
      const rpcData = await fetchOfficialWeeklyRankingWithCache(currentNextRankTimeForCache); 
      if (rpcData.length === 0) { 
        setPlayers([]); 
        return; 
      }
      
      const playerIds = rpcData.map(p => p.personId);
      
      const [liveVoteCountsMapResult, currentUserVotesResult, rankingDataMap] = await Promise.all([
        lastRearrangementTimeISO ? fetchCurrentWeekVoteCountsForPlayers(playerIds, lastRearrangementTimeISO) : Promise.resolve(new Map<number, {upvotes: number, downvotes: number, sameSpotVotes: number}>()),
        playerIds.length > 0
          ? (async () => {
              if (user) {
                return supabase.from('playervotes').select('player_id, vote_type').eq('user_id', user.id).in('player_id', playerIds);
              } else {
                const anonymousId = getAnonymousId();
                return supabase.from('playervotes').select('player_id, vote_type').eq('anonymous_id', anonymousId).in('player_id', playerIds);
              }
            })()
          : Promise.resolve({ data: null, error: null }),
        fetchRankingHistoriesWithRPC(playerIds)
      ]);
      
      setPlayerRankingData(rankingDataMap);
      
      const liveVoteCountsMap = liveVoteCountsMapResult;
      const currentUserVotesMap = new Map<number, number | null>();
      if (currentUserVotesResult?.error) console.warn("Error fetching current user votes:", currentUserVotesResult.error.message);
      currentUserVotesResult?.data?.forEach((v: CurrentWeekPlayerVoteCountsRow) => currentUserVotesMap.set(v.player_id, v.vote_type));
      
      const combinedPlayersData: TopPlayer[] = rpcData.map(p => {
        const gamesPlayed = p.G ?? 0;
        const liveCounts = liveVoteCountsMap.get(p.personId) || { upvotes: 0, downvotes: 0, sameSpotVotes: 0 };
        const points = p.PTS_total ?? 0;
        const fga = p.FGA_total ?? 0;
        const fta = p.FTA_total ?? 0;
        const trueShootingAttempts = fga + 0.44 * fta;
        const trueShootingPercentage = trueShootingAttempts > 0 ? points / (2 * trueShootingAttempts) : null;

        return {
          rankNumber: p.rankNumber, personId: p.personId, firstName: p.firstName ?? 'Unknown', lastName: p.lastName ?? 'Player',
          playerteamName: p.playerteamName ?? 'Free Agent', gamesPlayed: gamesPlayed,
          pointsPerGame: gamesPlayed > 0 && p.PTS_total != null ? p.PTS_total / gamesPlayed : null,
          reboundsPerGame: gamesPlayed > 0 && p.TRB_total != null ? p.TRB_total / gamesPlayed : null,
          assistsPerGame: gamesPlayed > 0 && p.AST_total != null ? p.AST_total / gamesPlayed : null,
          stealsPerGame: gamesPlayed > 0 && p.STL_total != null ? p.STL_total / gamesPlayed : null,
          blocksPerGame: gamesPlayed > 0 && p.BLK_total != null ? p.BLK_total / gamesPlayed : null,
          fieldGoalPercentage: p.FGA_total != null && p.FGA_total > 0 && p.FGM_total != null ? p.FGM_total / p.FGA_total : null,
          threePointPercentage: p.FG3A_total != null && p.FG3A_total > 0 && p.FG3M_total != null ? p.FG3M_total / p.FG3A_total : null,
          freeThrowPercentage: p.FTA_total != null && p.FTA_total > 0 && p.FTM_total != null ? p.FTM_total / p.FTA_total : null,
          trueShootingPercentage: trueShootingPercentage,
          weightedProminence: p.statsBasedProminence ?? p.Prominence_rs ?? null,
          upvotes: liveCounts.upvotes, downvotes: liveCounts.downvotes, sameSpotVotes: liveCounts.sameSpotVotes,
          finalMovementScoreAtRanking: p.weeklyMovementScore ?? 0,
          currentUserVote: currentUserVotesMap.get(p.personId) ?? null,
          seasonYear: p.SeasonYear ?? null,
        };
      });
      setPlayers(combinedPlayersData);
    } catch (error) { 
      let message = "An unknown error occurred while fetching player data.";
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      setFetchError(message); console.error("Error in loadPlayerDataInternal:", error); 
    }
  }, [user, fetchOfficialWeeklyRankingWithCache, fetchCurrentWeekVoteCountsForPlayers, lastRearrangementTimeISO, fetchRankingHistoriesWithRPC]); 

  useEffect(() => {
    if (!nextRearrangementTime) {
        const nextTime = getNextSundayMidnightISO();
        setNextRearrangementTime(nextTime);
        
        const lastSunday = new Date(nextTime);
        lastSunday.setDate(lastSunday.getDate() - 7);
        lastSunday.setHours(0,0,0,0); 
        setLastRearrangementTimeISO(lastSunday.toISOString());
    }
  }, [nextRearrangementTime]); 

  useEffect(() => {
    if (!authIsLoading && lastRearrangementTimeISO && nextRearrangementTime) {
      let isMounted = true;
      
      setIsLoadingPlayers(true);
      loadPlayerDataInternal(nextRearrangementTime) 
        .catch(err => { 
          if (isMounted) {
            let message = "Failed to load player data.";
            if (err instanceof Error) message = err.message;
            else if (typeof err === 'string') message = err;
            setFetchError(message); 
            console.error("Error from loadPlayerDataInternal call:", err);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingPlayers(false);
          }
        });
      
      return () => { isMounted = false; }; 
    } else if (authIsLoading || !lastRearrangementTimeISO || !nextRearrangementTime) {
        if (players.length === 0 && !fetchError) { 
            setIsLoadingPlayers(true);
        }
    }
  }, [authIsLoading, lastRearrangementTimeISO, nextRearrangementTime, loadPlayerDataInternal]); 

  const handlePlayerVote = async (playerId: number, newVoteType: number) => {
    if (isSubmittingVoteForPlayer[playerId]) return;

    // Get identifier (user_id or anonymous_id)
    const userId = user?.id || null;
    let anonymousId: string | null = null;
    if (!userId) {
      try {
        anonymousId = getAnonymousId();
      } catch (e) {
        console.error("Failed to get anonymous ID (localStorage may be blocked):", e);
        alert("Voting requires localStorage access. Please disable private browsing or enable cookies for this site.");
        return;
      }
    }

    setIsSubmittingVoteForPlayer(prev => ({ ...prev, [playerId]: true }));

    let originalPlayerForRevert: TopPlayer | undefined;
    const playerIndex = players.findIndex(p => p.personId === playerId);
    if (playerIndex !== -1) {
      originalPlayerForRevert = JSON.parse(JSON.stringify(players[playerIndex]));
    }

    setPlayers(prevPlayers =>
      prevPlayers.map(p => {
        if (p.personId === playerId) {
          const updatedPlayer = { ...p };
          const oldVoteType = p.currentUserVote;
          updatedPlayer.currentUserVote = newVoteType === 0 ? null : newVoteType;
          if (oldVoteType === 1) updatedPlayer.upvotes = Math.max(0, updatedPlayer.upvotes - 1);
          else if (oldVoteType === -1) updatedPlayer.downvotes = Math.max(0, updatedPlayer.downvotes - 1);
          else if (oldVoteType === 2) updatedPlayer.sameSpotVotes = Math.max(0, updatedPlayer.sameSpotVotes - 1);
          if (newVoteType === 1) updatedPlayer.upvotes += 1;
          else if (newVoteType === -1) updatedPlayer.downvotes += 1;
          else if (newVoteType === 2) updatedPlayer.sameSpotVotes += 1;
          return updatedPlayer;
        }
        return p;
      })
    );
    try {
      // Build the match filter for this user's vote
      const matchFilter = userId
        ? { player_id: playerId, user_id: userId }
        : { player_id: playerId, anonymous_id: anonymousId };

      if (newVoteType === 0) {
        // Delete vote
        const { error: deleteError } = await supabase.from('playervotes').delete().match(matchFilter);
        if (deleteError) throw deleteError;
      } else {
        // Check if vote already exists
        let existingQuery = supabase.from('playervotes').select('player_id').eq('player_id', playerId);
        if (userId) {
          existingQuery = existingQuery.eq('user_id', userId);
        } else {
          existingQuery = existingQuery.eq('anonymous_id', anonymousId!);
        }
        const { data: existing, error: selectError } = await existingQuery.maybeSingle();
        if (selectError) throw selectError;

        if (existing) {
          // Update existing vote
          const { error: updateError } = await supabase.from('playervotes')
            .update({ vote_type: newVoteType })
            .match(matchFilter);
          if (updateError) throw updateError;
        } else {
          // Insert new vote
          const { error: insertError } = await supabase.from('playervotes')
            .insert({
              player_id: playerId,
              user_id: userId,
              anonymous_id: anonymousId,
              vote_type: newVoteType
            });
          if (insertError) throw insertError;
        }
      }
    } catch (error: unknown) {
        let message = "An unknown error occurred.";
        if (error instanceof Error) message = error.message;
        else if (typeof error === 'string') message = error;
        else if (error && typeof error === 'object' && 'message' in error) message = String((error as { message: unknown }).message);
        console.error("Error submitting vote:", error);
        alert(`Failed to submit vote: ${message}`);
        if (originalPlayerForRevert) {
            setPlayers(prev => prev.map(p => p.personId === playerId ? originalPlayerForRevert! : p));
        } else {
            console.warn("Could not find original player state for revert on error for player:", playerId);
        }
    } finally {
        setIsSubmittingVoteForPlayer(prev => ({ ...prev, [playerId]: false }));
    }
  };
  
  function debounce<Args extends unknown[], Ret>(
    func: (...args: Args) => Ret,
    waitFor: number
  ) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const debounced = (...args: Args) => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => func(...args), waitFor);
    };
    return debounced as (...args: Args) => void;
  }
  const debouncedFetchNominationSuggestions = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setNominationSuggestions([]);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('get_player_suggestions_2025', { search_term: term });
        if (error) {
          console.error('Error fetching nomination suggestions:', error);
          setNominationSuggestions([]); return;
        }
        const currentTop100Ids = new Set(players.map(p => p.personId));
        const filteredSuggestions = (data || []).filter(
          (suggestion: PlayerSuggestion) => !currentTop100Ids.has(suggestion.personId)
        );
        setNominationSuggestions(filteredSuggestions as PlayerSuggestion[]);
      } catch (err) { 
        let message = "Exception fetching nomination suggestions.";
        if (err instanceof Error) message = err.message;
        else if (typeof err === 'string') message = err;
        console.error('Exception fetching nomination suggestions:', err);
        setNominationMessage(`Error: ${message}`);
        setNominationSuggestions([]);
      }
    }, 300),
    [players] 
  );

  const handleNominationSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setNominationSearchTerm(term);
    setNominationMessage(null);
    debouncedFetchNominationSuggestions(term);
  };

  const handleNominatePlayer = async (playerToNominate: PlayerSuggestion) => {
    if (isNominating || isSubmittingVoteForPlayer[playerToNominate.personId]) return;
    if (players.some(p => p.personId === playerToNominate.personId)) {
        setNominationMessage(`${playerToNominate.firstName} ${playerToNominate.lastName} is already in the Top 100.`);
        setNominationSearchTerm(''); setNominationSuggestions([]);
        setTimeout(() => setNominationMessage(null), 5000); return;
    }

    // Get identifier (user_id or anonymous_id)
    const userId = user?.id || null;
    let anonymousId: string | null = null;
    if (!userId) {
      try {
        anonymousId = getAnonymousId();
      } catch (e) {
        console.error("Failed to get anonymous ID:", e);
        setNominationMessage("Nomination requires localStorage. Please disable private browsing or enable cookies.");
        setTimeout(() => setNominationMessage(null), 5000); return;
      }
    }

    setIsNominating(true); setIsSubmittingVoteForPlayer(prev => ({ ...prev, [playerToNominate.personId]: true }));
    setNominationMessage(`Nominating ${playerToNominate.firstName} ${playerToNominate.lastName}...`);
    try {
      // Check if already nominated/voted
      let existingQuery = supabase.from('playervotes').select('vote_type').eq('player_id', playerToNominate.personId);
      if (userId) {
        existingQuery = existingQuery.eq('user_id', userId);
      } else {
        existingQuery = existingQuery.eq('anonymous_id', anonymousId!);
      }
      const { data: existingVote, error: existingVoteError } = await existingQuery.maybeSingle();
      if (existingVoteError) throw existingVoteError;

      if (existingVote && existingVote.vote_type === 1) {
        setNominationMessage(`${playerToNominate.firstName} ${playerToNominate.lastName} has already been upvoted/nominated by you.`);
      } else if (existingVote) {
        // Update existing vote to upvote
        const matchFilter = userId
          ? { player_id: playerToNominate.personId, user_id: userId }
          : { player_id: playerToNominate.personId, anonymous_id: anonymousId };
        const { error: updateError } = await supabase.from('playervotes').update({ vote_type: 1 }).match(matchFilter);
        if (updateError) throw updateError;
        setNominationMessage(`${playerToNominate.firstName} ${playerToNominate.lastName} nominated successfully! This counts as an upvote.`);
      } else {
        // Insert new nomination vote
        const { error: insertError } = await supabase.from('playervotes').insert({
          player_id: playerToNominate.personId,
          user_id: userId,
          anonymous_id: anonymousId,
          vote_type: 1
        });
        if (insertError) throw insertError;
        setNominationMessage(`${playerToNominate.firstName} ${playerToNominate.lastName} nominated successfully! This counts as an upvote.`);
      }
      setNominationSearchTerm(''); setNominationSuggestions([]);
    } catch (error: unknown) {
      let message = "Failed to nominate player.";
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      else if (error && typeof error === 'object' && 'message' in error) message = String((error as { message: unknown }).message);
      console.error("Error nominating player:", error); setNominationMessage(`Error: ${message}`);
    } finally {
      setIsNominating(false); setIsSubmittingVoteForPlayer(prev => ({ ...prev, [playerToNominate.personId]: false }));
      setTimeout(() => setNominationMessage(null), 5000);
    }
  };


  const pageTitle = "Top 100 Players";
  const pageSubtitle = "Give your opinion on how players should be moved";

  const LoadingErrorDisplay = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg text-slate-800 dark:text-slate-100 p-4 md:p-6 text-center flex-grow">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 text-sky-600 dark:text-sky-400">{pageTitle}</h1>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 sm:mb-8">{pageSubtitle}</p>
      {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}
      <div className="py-10">{children}</div>
    </div>
  );

  if (authIsLoading || (isLoadingPlayers && players.length === 0 && !fetchError)) {
    return <LoadingErrorDisplay><p className="text-xl">Loading players...</p></LoadingErrorDisplay>;
  }
  if (fetchError) {
     return <LoadingErrorDisplay><p className="text-center text-red-600 dark:text-red-400 mt-4">Error: {fetchError}</p></LoadingErrorDisplay>;
  }
  if (!isLoadingPlayers && players.length === 0) {
    return <LoadingErrorDisplay>
      <p className="text-slate-700 dark:text-slate-300">No player data is currently available for this week&apos;s ranking.</p>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Ranks are updated weekly on Sunday at midnight.</p>
    </LoadingErrorDisplay>;
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <div className="p-4 md:py-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 text-center text-sky-600 dark:text-sky-400">{pageTitle}</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-1 text-center">{pageSubtitle}</p>

        {/* Voting Open Announcement */}
        <div className="mt-4 mb-4 p-4 bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-200 dark:border-sky-800 rounded-lg">
          <p className="text-center text-sky-700 dark:text-sky-300 font-semibold text-lg">
            Voting is now open to everyone! No sign-in required.
          </p>
          <p className="text-center text-sky-600 dark:text-sky-400 text-sm mt-1">
            Your votes are saved locally and count equally toward weekly rankings
          </p>
        </div>

        {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}
        {!user && !authIsLoading && (
          <p className="text-center text-sky-600 dark:text-sky-400 my-6 font-semibold">
            <Link href="/signin" className="underline hover:text-sky-700 dark:hover:text-sky-300">Sign in</Link> to save your vote history across devices!
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-6">
          {players.map((player) => {
            const rankingInfo = playerRankingData.get(player.personId);
            return (
              <PlayerBox
                key={player.personId.toString()}
                player={player}
                onVote={handlePlayerVote}
                isVotingDisabled={false}
                rankingHistory={rankingInfo?.history || []}
                weeklyChange={rankingInfo?.weeklyChange ?? 0}
              />
            );
          })}
        </div>
      </div>
      <div className="px-4 md:px-6 pb-8">
            <div className="max-w-2xl mx-auto bg-gray-100 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-transparent">
                <h2 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-3 text-center">Nominate a Player for Top 100</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 text-center"> Search for a player not in the Top 100. Each nomination counts as an upvote. </p>
                <div className="max-w-md mx-auto relative">
                  <input type="text" placeholder="Search player name to nominate..." value={nominationSearchTerm} onChange={handleNominationSearchChange} disabled={isNominating} className="w-full p-2.5 rounded-md bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 border border-gray-300 dark:border-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                  {nominationSuggestions.length > 0 && (
                    <ul className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-600">
                      {nominationSuggestions.map((playerSugg) => (
                        <li key={playerSugg.personId} className={`p-2.5 hover:bg-sky-500 dark:hover:bg-sky-600 hover:text-white dark:hover:text-white cursor-pointer border-b border-gray-200 dark:border-slate-600 last:border-b-0 ${isNominating || isSubmittingVoteForPlayer[playerSugg.personId] ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => !(isNominating || isSubmittingVoteForPlayer[playerSugg.personId]) && handleNominatePlayer(playerSugg)} >
                          {playerSugg.firstName} {playerSugg.lastName}
                        </li>
                      ))}
                    </ul>
                  )}
                  {nominationMessage && ( <p className={`mt-3 text-sm text-center ${ nominationMessage.includes('Error:') || nominationMessage.includes('Failed') || nominationMessage.includes('already in') || nominationMessage.includes('already been upvoted') ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{nominationMessage}</p> )}
                </div>
            </div>
          </div>
    </div>
  );
}


// --- NEW COMPONENT: CollapsibleRankingTimeline ---
// This component replaces the old timeline for a more subtle and interactive UI.

interface RankingHistoryPoint {
  week: number;
  rank: number;
  date: string;
}

interface CollapsibleRankingTimelineProps {
  history: RankingHistoryPoint[];
  currentRank: number;
  weeklyChange: number;
}

const CollapsibleRankingTimeline: React.FC<CollapsibleRankingTimelineProps> = ({ history, currentRank, weeklyChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const displayHistory = history.slice(-4); // Show last 4 weeks + current week = 5 points

  // --- Change Indicator Logic ---
  const getChangeIndicator = () => {
    if (weeklyChange > 0) {
      return { color: 'text-green-500 dark:text-green-400', icon: '▲', text: `+${weeklyChange}` };
    }
    if (weeklyChange < 0) {
      return { color: 'text-red-500 dark:text-red-400', icon: '▼', text: `${weeklyChange}` };
    }
    return { color: 'text-slate-500 dark:text-slate-400', icon: '▬', text: '0' };
  };
  const change = getChangeIndicator();

  // --- Charting Logic ---
  const allRanks = [...displayHistory.map(h => h.rank), currentRank];
  const minRank = Math.min(...allRanks);
  const maxRank = Math.max(...allRanks);
  const rankRange = maxRank - minRank;
  
  // Add padding for better visualization, ensuring it doesn't go below 1
  const paddedMin = Math.max(1, minRank - (rankRange > 10 ? 5 : 2));
  const paddedMax = maxRank + (rankRange > 10 ? 5 : 2);
  const paddedRange = paddedMax - paddedMin || 1;
  
  const getY = (rank: number) => 100 - ((rank - paddedMin) / paddedRange) * 100;

  return (
    <div className="w-full mb-1">
      {/* --- Collapsible Header / Button --- */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <div className="flex items-center space-x-2">
          <span className={`font-bold text-sm ${change.color}`}>
            {change.icon} {change.text}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
            Weekly Trend
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* --- Expandable Chart Content --- */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-40 mt-2' : 'max-h-0'
        }`}
      >
        <div className="relative p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <svg viewBox="0 0 100 35" className="overflow-visible w-full h-auto">
            {/* --- Rank line connecting all points --- */}
            <polyline
              points={
                displayHistory.map((point, index) =>
                  `${index * 22 + 10},${getY(point.rank) * 0.25 + 5}`
                ).join(' ') + ` ${displayHistory.length * 22 + 10},${getY(currentRank) * 0.25 + 5}`
              }
              fill="none"
              className="stroke-sky-500"
              strokeWidth="1"
            />
            
            {/* --- Historical data points and labels --- */}
            {displayHistory.map((point, index) => (
              <g key={index}>
                <circle
                  cx={index * 22 + 10}
                  cy={getY(point.rank) * 0.25 + 5}
                  r="1.5"
                  className="fill-sky-500"
                />
                <text x={index * 22 + 10} y="34" textAnchor="middle" className="text-[5px] fill-slate-500 dark:fill-slate-400">
                  W{point.week}
                </text>
                 <text x={index * 22 + 10} y={getY(point.rank) * 0.25 + 2} textAnchor="middle" className="text-[5px] font-bold fill-slate-600 dark:fill-slate-300">
                  {point.rank}
                </text>
              </g>
            ))}

            {/* --- Current rank point and label --- */}
            <g>
              <circle
                cx={displayHistory.length * 22 + 10}
                cy={getY(currentRank) * 0.25 + 5}
                r="2"
                className="fill-white dark:fill-slate-900 stroke-sky-500"
                strokeWidth="1"
              />
               <text x={displayHistory.length * 22 + 10} y="34" textAnchor="middle" className="text-[5px] font-bold fill-slate-700 dark:fill-slate-300">
                  Now
                </text>
              <text x={displayHistory.length * 22 + 10} y={getY(currentRank) * 0.25 + 2} textAnchor="middle" className="text-[6px] font-extrabold fill-slate-800 dark:fill-slate-100">
                {currentRank}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};