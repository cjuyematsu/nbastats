//app/top-100-players/Top100PlayersClient.tsx

'use client'; 

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext'; 
import CountdownTimer from '@/components/CountdownTimer'; 
import Image from 'next/image';
import { TopPlayer, RpcRankedPlayerData } from './types'; 

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
}

const PlayerBox: React.FC<PlayerBoxProps> = ({ player, onVote, isVotingDisabled }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

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
    <div className={`relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg flex flex-row h-full overflow-hidden transition-all duration-300 hover:border-sky-500/60 hover:shadow-sky-500/10 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}>
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
      
      <div className="relative z-10 flex w-3/5 flex-col justify-between p-4">
        <div>
          <div className="flex items-center mb-1">
            <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-full bg-sky-500 text-white font-bold text-sm flex-shrink-0">
              {player.rankNumber}
            </div>
            <Link
              href={`/player/${player.personId}`}
              className="text-2xl font-bold leading-tight text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              {`${player.firstName} ${player.lastName}`}
            </Link>
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
  );
};

export default function Top100PlayersPage() {
  const { user, isLoading: authIsLoading, session } = useAuth();
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

  const fetchOfficialWeeklyRankingWithCache = useCallback(async (
    currentNextRearrangementTime: string | null
  ): Promise<RpcRankedPlayerData[]> => {
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
          return cachedData.ranks;
        } else {
          localStorage.removeItem(CACHE_KEY_TOP_100_RANKS);
        }
      }
    } catch (e) { console.error("Error reading official rankings from localStorage:", e); localStorage.removeItem(CACHE_KEY_TOP_100_RANKS); }

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
  
  const loadPlayerDataInternal = useCallback(async (currentNextRankTimeForCache: string | null) => {
    setFetchError(null); 
    try {
      const rpcData = await fetchOfficialWeeklyRankingWithCache(currentNextRankTimeForCache); 
      if (rpcData.length === 0) { 
        setPlayers([]); return; 
      }
      const playerIds = rpcData.map(p => p.personId);
      const [liveVoteCountsMapResult, currentUserVotesResult] = await Promise.all([
        lastRearrangementTimeISO ? fetchCurrentWeekVoteCountsForPlayers(playerIds, lastRearrangementTimeISO) : Promise.resolve(new Map<number, {upvotes: number, downvotes: number, sameSpotVotes: number}>()),
        user && playerIds.length > 0 
          ? supabase.from('playervotes').select('player_id, vote_type').eq('user_id', user.id).in('player_id', playerIds)
          : Promise.resolve({ data: null, error: null })
      ]);
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
          rankNumber: p.rankNumber, personId: p.personId, firstName: p.firstName ?? 'N/A', lastName: p.lastName ?? 'N/A',
          playerteamName: p.playerteamName ?? 'N/A', gamesPlayed: gamesPlayed,
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
        };
      });
      setPlayers(combinedPlayersData);
    } catch (error) { 
      let message = "An unknown error occurred while fetching player data.";
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      setFetchError(message); console.error("Error in loadPlayerDataInternal:", error); 
    }
  }, [user, fetchOfficialWeeklyRankingWithCache, fetchCurrentWeekVoteCountsForPlayers, lastRearrangementTimeISO]); 

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
    if (!user || !session) { alert("Please sign in to vote."); return; }
    if (isSubmittingVoteForPlayer[playerId]) return; 

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
      if (newVoteType === 0) { 
        const { error: deleteError } = await supabase.from('playervotes').delete().match({ player_id: playerId, user_id: user.id });
        if (deleteError) throw deleteError;
      } else { 
        const { error: upsertError } = await supabase.from('playervotes').upsert({ player_id: playerId, user_id: user.id, vote_type: newVoteType }, { onConflict: 'player_id, user_id' });
        if (upsertError) throw upsertError;
      }
    } catch (error) { 
        let message = "An unknown error occurred.";
        if (error instanceof Error) message = error.message;
        else if (typeof error === 'string') message = error;
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
    if (!user || !session) { alert("Please sign in to nominate a player."); setNominationMessage("Please sign in to nominate."); return; }
    if (isNominating || isSubmittingVoteForPlayer[playerToNominate.personId]) return; 
    if (players.some(p => p.personId === playerToNominate.personId)) {
        setNominationMessage(`${playerToNominate.firstName} ${playerToNominate.lastName} is already in the Top 100.`);
        setNominationSearchTerm(''); setNominationSuggestions([]);
        setTimeout(() => setNominationMessage(null), 5000); return; 
    }
    setIsNominating(true); setIsSubmittingVoteForPlayer(prev => ({ ...prev, [playerToNominate.personId]: true })); 
    setNominationMessage(`Nominating ${playerToNominate.firstName} ${playerToNominate.lastName}...`);
    try {
      const { data: existingVote, error: existingVoteError } = await supabase.from('playervotes').select('vote_type').eq('user_id', user.id).eq('player_id', playerToNominate.personId).maybeSingle();
      if (existingVoteError) throw existingVoteError;
      if (existingVote && existingVote.vote_type === 1) {
        setNominationMessage(`${playerToNominate.firstName} ${playerToNominate.lastName} has already been upvoted/nominated by you.`);
      } else {
        const { error: upsertError } = await supabase.from('playervotes').upsert({ player_id: playerToNominate.personId, user_id: user.id, vote_type: 1 }, { onConflict: 'player_id, user_id' });
        if (upsertError) throw upsertError;
        setNominationMessage(`${playerToNominate.firstName} ${playerToNominate.lastName} nominated successfully! This counts as an upvote.`);
      }
      setNominationSearchTerm(''); setNominationSuggestions([]);
    } catch (error) {
      let message = "Failed to nominate player.";
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
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
        {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}
        {!user && !authIsLoading && (
          <p className="text-center text-sky-600 dark:text-sky-400 my-6 font-semibold">
            <Link href="/signin" className="underline hover:text-sky-700 dark:hover:text-sky-300">Sign in</Link> to vote on player rankings or nominate players!
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-6">
          {players.map((player) => (
            <PlayerBox
              key={player.personId.toString()}
              player={player}
              onVote={handlePlayerVote}
              isVotingDisabled={!user || !session}
            />
          ))}
        </div>
      </div>
      {user && (
          <div className="px-4 md:px-6 pb-8">
            <div className="max-w-2xl mx-auto bg-gray-100 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-transparent">
                <h2 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-3 text-center">Nominate a Player for Top 100</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 text-center"> Search for a player (2025 Season) not in the Top 100. Each nomination counts as an upvote. </p>
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
        )}
    </div>
  );
}