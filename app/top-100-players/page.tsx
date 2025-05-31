// app/top-100-players/page.tsx
'use client'; 

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Ensure this path is correct
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext'; // Ensure this path is correct
import CountdownTimer from '@/components/CountdownTimer'; // Ensure this path is correct

// Helper function to calculate next Sunday midnight
function getNextSundayMidnightISO(): string {
  const now = new Date();
  const nextSunday = new Date(now.getTime());
  const currentDay = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
  const daysToAdd = (7 - currentDay) % 7; 
  
  nextSunday.setDate(now.getDate() + daysToAdd);
  nextSunday.setHours(0, 0, 0, 0); 

  if (nextSunday.getTime() < now.getTime()) {
    nextSunday.setDate(nextSunday.getDate() + 7);
    nextSunday.setHours(0, 0, 0, 0); 
  }
  return nextSunday.toISOString();
}

// --- Interface Definitions ---
// CRITICAL: Ensure personId type (number, string, or bigint) in these interfaces
// matches your generated types/supabase.ts for INT8 columns.
// The code below assumes 'number'. Adjust if your generated types differ.

// This interface matches the FLAT structure returned by the 'get_current_ranking_with_details' RPC
interface RpcRankedPlayerData { 
  rankNumber: number; 
  personId: number; 
  weeklyMovementScore: number | null;
  statsBasedProminence: number | null;
  // Fields from regularseasonstats (now flat in the RPC result)
  firstName: string | null;
  lastName: string | null;
  playerteamName: string | null;
  G: number | null; // Games played from regularseasonstats
  PTS_total: number | null;
  TRB_total: number | null;
  AST_total: number | null;
  STL_total: number | null;
  BLK_total: number | null;
  FGA_total: number | null;
  FGM_total: number | null;
  FG3A_total: number | null;
  FG3M_total: number | null;
  FTA_total: number | null;
  FTM_total: number | null;
  Prominence_rs: number | null; // Prominence directly from regularseasonstats table, aliased in RPC
}

// Represents a player object used for display and state within the component
interface TopPlayer {
  rankNumber: number; 
  personId: number; 
  firstName: string;
  lastName: string;
  playerteamName: string;
  gamesPlayed: number | null;
  pointsPerGame: number | null;
  reboundsPerGame: number | null;
  assistsPerGame: number | null;
  stealsPerGame: number | null;
  blocksPerGame: number | null;
  fieldGoalPercentage: number | null;
  threePointPercentage: number | null;
  freeThrowPercentage: number | null;
  weightedProminence: number | null; 
  
  upvotes: number;           
  downvotes: number;          
  sameSpotVotes: number;      
  
  finalMovementScoreAtRanking: number; 
  currentUserVote?: number | null;
}

// Type for rows from 'playervotes' table when fetching current week's aggregates
interface CurrentWeekPlayerVoteCountsRow {
    player_id: number; 
    vote_type: number; 
}

// --- VotingButton Component ---
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
      className={`p-1.5 rounded-md transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? activeClass : inactiveClass}`}
    >
      {children}
    </button>
  );
};

// --- PlayerBox Component ---
// --- PlayerBox Component ---
interface PlayerBoxProps {
  player: TopPlayer;
  onVote: (playerId: number, newVoteType: number) => Promise<void>;
  isVotingDisabled: boolean; // This prop will now ONLY control if buttons are *clickable*
}

const PlayerBox: React.FC<PlayerBoxProps> = ({ player, onVote, isVotingDisabled }) => {
  const statItems = [
    { label: "GP", value: player.gamesPlayed ?? 'N/A' },
    { label: "PTS", value: player.pointsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "REB", value: player.reboundsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "AST", value: player.assistsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "STL", value: player.stealsPerGame?.toFixed(1) ?? 'N/A' },
    { label: "BLK", value: player.blocksPerGame?.toFixed(1) ?? 'N/A' },
    { label: "FG%", value: player.fieldGoalPercentage !== null && player.fieldGoalPercentage !== undefined ? (player.fieldGoalPercentage * 100)?.toFixed(1) + '%' : 'N/A' },
    { label: "3P%", value: player.threePointPercentage !== null && player.threePointPercentage !== undefined ? (player.threePointPercentage * 100)?.toFixed(1) + '%' : 'N/A' },
    { label: "FT%", value: player.freeThrowPercentage !== null && player.freeThrowPercentage !== undefined ? (player.freeThrowPercentage * 100)?.toFixed(1) + '%' : 'N/A' },
  ];

  const handleVoteClick = (voteTypeClicked: number) => {
    // Only call onVote if voting is not disabled (buttons themselves will also be disabled)
    if (isVotingDisabled) return; 
    const newVoteType = player.currentUserVote === voteTypeClicked ? 0 : voteTypeClicked;
    onVote(player.personId, newVoteType);
  };

  return (
    <div className="bg-slate-700 border border-slate-500 rounded-lg shadow-lg p-4 text-slate-200 flex flex-col transition-all hover:shadow-sky-500/30 hover:border-sky-500/50">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center flex-grow min-w-0">
          <span className="text-3xl font-bold text-sky-400 mr-3 sm:mr-4 w-10 sm:w-12 text-right flex-shrink-0">{player.rankNumber}.</span>
          <div className="flex-grow">
          <Link 
              href={`/player/${player.personId}`}
              className="text-xl font-semibold leading-tight hover:text-sky-300 cursor-pointer break-words"
            >
              {`${player.firstName} ${player.lastName}`}
            </Link>
            <p className="text-sm text-slate-400">{player.playerteamName}</p>
          </div>
        </div>
        
        {/* This div is now always rendered to show counts */}
        <div className="flex flex-col space-y-1 items-center ml-2 flex-shrink-0"> 
            <VotingButton
              onClick={() => handleVoteClick(1)}
              isActive={player.currentUserVote === 1} // Active state still depends on logged-in user's vote
              disabled={isVotingDisabled} // Button clickability depends on login state
              ariaLabel={`Upvote ${player.firstName} ${player.lastName}`}
              activeClass="bg-green-500 text-white hover:bg-green-600"
              inactiveClass="bg-slate-600 hover:bg-slate-500 text-green-300 hover:text-green-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
              <span className="text-xs ml-1">{player.upvotes}</span>
            </VotingButton>
            <VotingButton
              onClick={() => handleVoteClick(2)} 
              isActive={player.currentUserVote === 2}
              disabled={isVotingDisabled}
              ariaLabel={`Confirm spot for ${player.firstName} ${player.lastName}`}
              activeClass="bg-sky-500 text-white hover:bg-sky-600"
              inactiveClass="bg-slate-600 hover:bg-slate-500 text-sky-300 hover:text-sky-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              <span className="text-xs ml-1">{player.sameSpotVotes}</span>
            </VotingButton>
            <VotingButton
              onClick={() => handleVoteClick(-1)}
              isActive={player.currentUserVote === -1}
              disabled={isVotingDisabled}
              ariaLabel={`Downvote ${player.firstName} ${player.lastName}`}
              activeClass="bg-red-500 text-white hover:bg-red-600"
              inactiveClass="bg-slate-600 hover:bg-slate-500 text-red-300 hover:text-red-100"
            >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
               <span className="text-xs ml-1">{player.downvotes}</span>
            </VotingButton>
          </div>
        {/* The conditional rendering based on !isVotingDisabled was removed from wrapping this whole div */}
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

// --- Top100PlayersPage Component ---
export default function Top100PlayersPage() {
  const { user, isLoading: authIsLoading, session } = useAuth();
  const [players, setPlayers] = useState<TopPlayer[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [nextRearrangementTime, setNextRearrangementTime] = useState<string | null>(null);
  const [lastRearrangementTimeISO, setLastRearrangementTimeISO] = useState<string | null>(null);

  const fetchOfficialWeeklyRanking = useCallback(async (): Promise<RpcRankedPlayerData[]> => {
    // Calls the new RPC function that performs the JOIN
    const { data, error } = await supabase.rpc('get_current_ranking_with_details');

    if (error) {
      console.error("Error fetching official weekly rankings via RPC:", error);
      throw new Error("Failed to fetch official rankings. Message: " + (error.message || 'Unknown RPC error'));
    }
    return (data || []) as RpcRankedPlayerData[]; 
  }, []);

  const fetchCurrentWeekVoteCountsForPlayers = useCallback(async (playerIds: number[], weekStartTimeISO: string): Promise<Map<number, {upvotes: number, downvotes: number, sameSpotVotes: number}>> => {
    const voteCountsMap = new Map<number, {upvotes: number, downvotes: number, sameSpotVotes: number}>();
    playerIds.forEach(id => voteCountsMap.set(id, { upvotes: 0, downvotes: 0, sameSpotVotes: 0 }));

    if (playerIds.length === 0 || !weekStartTimeISO) {
        return voteCountsMap;
    }
    
    const { data, error } = await supabase
        .from('playervotes')
        .select('player_id, vote_type')
        .in('player_id', playerIds)     
        .gte('created_at', weekStartTimeISO);

    if (error) {
        console.error('Error fetching current week vote counts:', error);
        return voteCountsMap; 
    }

    data?.forEach((vote: CurrentWeekPlayerVoteCountsRow) => { 
        const counts = voteCountsMap.get(vote.player_id);
        if (counts) {
            if (vote.vote_type === 1) counts.upvotes++;
            else if (vote.vote_type === -1) counts.downvotes++;
            else if (vote.vote_type === 2) counts.sameSpotVotes++;
        }
    });
    return voteCountsMap;
  }, []);

  const loadPlayerData = useCallback(async () => {
    if (!lastRearrangementTimeISO && !authIsLoading) { 
        if (!isLoadingPlayers) setIsLoadingPlayers(true);
        return;
    }
     if (isLoadingPlayers && !lastRearrangementTimeISO && authIsLoading) {
        return;
    }

    setIsLoadingPlayers(true);
    setFetchError(null);
    try {
      const rpcData = await fetchOfficialWeeklyRanking(); // rpcData is RpcRankedPlayerData[]
      if (rpcData.length === 0) {
        setPlayers([]);
        setIsLoadingPlayers(false);
        return;
      }

      const playerIds = rpcData.map(p => p.personId);
      
      const liveVoteCountsMap = lastRearrangementTimeISO 
        ? await fetchCurrentWeekVoteCountsForPlayers(playerIds, lastRearrangementTimeISO)
        : new Map<number, {upvotes: number, downvotes: number, sameSpotVotes: number}>();

      const currentUserVotesMap = new Map<number, number | null>();
      if (user && playerIds.length > 0) {
        const { data: votesData, error: votesError } = await supabase
          .from('playervotes')
          .select('player_id, vote_type')
          .eq('user_id', user.id)
          .in('player_id', playerIds);
        if (votesError) throw votesError;
        votesData?.forEach(v => currentUserVotesMap.set(v.player_id, v.vote_type));
      }

      const combinedPlayersData: TopPlayer[] = rpcData.map(p => {
        // p is now an RpcRankedPlayerData object, which is flat
        const gamesPlayed = p.G ?? 0;
        const liveCounts = liveVoteCountsMap.get(p.personId) || { upvotes: 0, downvotes: 0, sameSpotVotes: 0 };

        return {
          rankNumber: p.rankNumber,
          personId: p.personId,
          firstName: p.firstName ?? 'N/A',
          lastName: p.lastName ?? 'N/A',
          playerteamName: p.playerteamName ?? 'N/A',
          gamesPlayed: gamesPlayed,
          pointsPerGame: gamesPlayed > 0 && p.PTS_total != null ? p.PTS_total / gamesPlayed : null,
          reboundsPerGame: gamesPlayed > 0 && p.TRB_total != null ? p.TRB_total / gamesPlayed : null,
          assistsPerGame: gamesPlayed > 0 && p.AST_total != null ? p.AST_total / gamesPlayed : null,
          stealsPerGame: gamesPlayed > 0 && p.STL_total != null ? p.STL_total / gamesPlayed : null,
          blocksPerGame: gamesPlayed > 0 && p.BLK_total != null ? p.BLK_total / gamesPlayed : null,
          fieldGoalPercentage: p.FGA_total != null && p.FGA_total > 0 && p.FGM_total != null ? p.FGM_total / p.FGA_total : null,
          threePointPercentage: p.FG3A_total != null && p.FG3A_total > 0 && p.FG3M_total != null ? p.FG3M_total / p.FG3A_total : null,
          freeThrowPercentage: p.FTA_total != null && p.FTA_total > 0 && p.FTM_total != null ? p.FTM_total / p.FTA_total : null,
          weightedProminence: p.statsBasedProminence ?? p.Prominence_rs ?? null,
          upvotes: liveCounts.upvotes,
          downvotes: liveCounts.downvotes,
          sameSpotVotes: liveCounts.sameSpotVotes,
          finalMovementScoreAtRanking: p.weeklyMovementScore ?? 0,
          currentUserVote: currentUserVotesMap.get(p.personId) ?? null,
        };
      });
      setPlayers(combinedPlayersData);

    } catch (error) {
      console.error("Error in loadPlayerData:", error);
    } finally {
      setIsLoadingPlayers(false);
    }
  }, [user, fetchOfficialWeeklyRanking, fetchCurrentWeekVoteCountsForPlayers, lastRearrangementTimeISO, authIsLoading, isLoadingPlayers]);

  useEffect(() => {
    const nextTime = getNextSundayMidnightISO();
    setNextRearrangementTime(nextTime);
    const lastSunday = new Date(nextTime);
    lastSunday.setDate(lastSunday.getDate() - 7);
    lastSunday.setHours(0,0,0,0); 
    setLastRearrangementTimeISO(lastSunday.toISOString());
  }, []); 

  useEffect(() => {
    if (!authIsLoading && lastRearrangementTimeISO) { 
        loadPlayerData();
    }
  }, [authIsLoading, loadPlayerData, lastRearrangementTimeISO]);


  const handlePlayerVote = async (playerId: number, newVoteType: number) => {
    if (!user || !session) {
      alert("Please sign in to vote.");
      return;
    }
    
    const originalPlayersState = JSON.parse(JSON.stringify(players));

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
        const { error: deleteError } = await supabase
          .from('playervotes')
          .delete()
          .match({ player_id: playerId, user_id: user.id });
        if (deleteError) throw deleteError;
      } else { 
        const { error: upsertError } = await supabase
          .from('playervotes')
          .upsert({
              player_id: playerId,
              user_id: user.id, 
              vote_type: newVoteType
          }, {
              onConflict: 'player_id, user_id'
          });
        if (upsertError) throw upsertError;
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      setPlayers(originalPlayersState); 
    }
  };
  
  const pageTitle = "Top 100 Players";
  const pageSubtitle = "(Weekly Ranking)";

  if (authIsLoading || (isLoadingPlayers && players.length === 0 && !fetchError)) { 
    return (
      <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100 p-4 md:p-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 text-sky-400">{pageTitle}</h1>
        <p className="text-lg text-slate-400 mb-6 sm:mb-8">{pageSubtitle}</p>
        {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}
        <p className="text-slate-300 py-10 text-xl">Loading players...</p>
      </div>
    );
  }

  if (fetchError) {
     return (
      <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100 p-4 md:p-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 text-sky-400">{pageTitle}</h1>
        <p className="text-lg text-slate-400 mb-6 sm:mb-8">{pageSubtitle}</p>
        {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}
        <p className="text-center text-red-300 mt-4">Error: {fetchError}</p>
      </div>
    );
  }

  if (!isLoadingPlayers && players.length === 0) { 
    return (
      <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100 p-4 md:p-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 text-center text-sky-400">{pageTitle}</h1>
        <p className="text-lg text-slate-400 mb-6 sm:mb-8 text-center">{pageSubtitle}</p>
        {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}
        <p className="text-center text-slate-300 py-10">No player data is currently available for this week&apos;s ranking.</p>
        <p className="text-center text-slate-400 text-sm mt-2">Ranks are updated weekly on Sunday at midnight.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100">
      <div className="p-4 md:py-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 text-center text-sky-400">{pageTitle}</h1>
        <p className="text-lg text-slate-400 mb-1 text-center">{pageSubtitle}</p>
        
        {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}

        {!user && !authIsLoading && (
            <p className="text-center text-sky-300 my-6">
                <Link href="/signin" className="underline hover:text-sky-100">Sign in</Link> to vote on player rankings!
            </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mt-6">
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
    </div>
  );
}