'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import CountdownTimer from '@/components/CountdownTimer';
import ShareResult from '@/components/ShareResult';
import { getNextRearrangementIso } from '@/lib/top100Time';
import { buildTop100Share } from '@/lib/shareText';
import { resolveVoteIdentity, writeTop100Vote, type VoteIdentity } from '@/lib/top100Votes';
import PlayerRow from './PlayerRow';
import RecapStrip from './RecapStrip';
import NominateSection from './NominateSection';
import type { PlayerRankingInfo, TopPlayer } from './types';

interface UserVoteRow {
  player_id: number;
  vote_type: number;
}

interface AggregatedVotesData {
  playerId: number;
  upvotes: number;
  downvotes: number;
  sameSpotVotes: number;
}

interface Top100PlayersClientProps {
  initialPlayers: TopPlayer[];
  initialRankingData: Record<number, PlayerRankingInfo>;
  initialWeekStartISO: string;
}

export default function Top100PlayersPage({ initialPlayers, initialRankingData, initialWeekStartISO }: Top100PlayersClientProps) {
  const { user, isLoading: authIsLoading } = useAuth();
  const [players, setPlayers] = useState<TopPlayer[]>(initialPlayers);
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(initialPlayers.length === 0);
  const [nextRearrangementTime, setNextRearrangementTime] = useState<string | null>(null);
  const lastRearrangementTimeISO = initialWeekStartISO;
  const [isSubmittingVoteForPlayer, setIsSubmittingVoteForPlayer] = useState<Record<number, boolean>>({});
  const submittingRef = useRef<Record<number, boolean>>({});
  const [playerRankingData] = useState<Map<number, PlayerRankingInfo>>(
    () => new Map(Object.entries(initialRankingData).map(([id, v]) => [Number(id), v]))
  );
  const [jumpTerm, setJumpTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadVoteDataInternal = useCallback(async (weekStartISO: string) => {
    const currentPlayers = playersRef.current;
    if (currentPlayers.length === 0) return;
    const playerIds = currentPlayers.map(p => p.personId);

    const weeklyVotesPromise = supabase.rpc('get_aggregated_weekly_votes_for_players', {
      player_ids_array: playerIds,
      p_week_start_time: weekStartISO,
    });

    // Only votes from the current cycle count as "yours": highlights must
    // match the cycle-scoped counts, not all-time vote rows.
    const userVotesPromise = (async () => {
      if (user) {
        return supabase.from('playervotes')
          .select('player_id, vote_type')
          .eq('user_id', user.id)
          .in('player_id', playerIds)
          .gte('created_at', weekStartISO);
      }
      try {
        const identity = resolveVoteIdentity(null);
        return supabase.from('playervotes')
          .select('player_id, vote_type')
          .eq('anonymous_id', identity.anonymousId!)
          .in('player_id', playerIds)
          .gte('created_at', weekStartISO);
      } catch {
        return { data: null, error: null };
      }
    })();

    const [weeklyVotesResult, userVotesResult] = await Promise.all([weeklyVotesPromise, userVotesPromise]);

    const liveVoteCountsMap = new Map<number, { upvotes: number; downvotes: number; sameSpotVotes: number }>();
    if (weeklyVotesResult.error) {
      console.error('Error fetching current cycle vote counts via RPC:', weeklyVotesResult.error);
    } else {
      (weeklyVotesResult.data ?? []).forEach((row: AggregatedVotesData) => {
        liveVoteCountsMap.set(row.playerId, {
          upvotes: row.upvotes,
          downvotes: row.downvotes,
          sameSpotVotes: row.sameSpotVotes,
        });
      });
    }

    const currentUserVotesMap = new Map<number, number | null>();
    if (userVotesResult?.error) console.warn('Error fetching current user votes:', userVotesResult.error.message);
    userVotesResult?.data?.forEach((v: UserVoteRow) => currentUserVotesMap.set(v.player_id, v.vote_type));

    setPlayers(prev => prev.map(p => {
      const live = liveVoteCountsMap.get(p.personId);
      return {
        ...p,
        upvotes: live?.upvotes ?? p.upvotes,
        downvotes: live?.downvotes ?? p.downvotes,
        sameSpotVotes: live?.sameSpotVotes ?? p.sameSpotVotes,
        currentUserVote: currentUserVotesMap.get(p.personId) ?? null,
      };
    }));
  }, [user]);

  useEffect(() => {
    if (!nextRearrangementTime) {
      setNextRearrangementTime(getNextRearrangementIso());
    }
  }, [nextRearrangementTime]);

  useEffect(() => {
    if (authIsLoading || !lastRearrangementTimeISO) return;
    let isMounted = true;
    loadVoteDataInternal(lastRearrangementTimeISO)
      .catch(err => {
        if (!isMounted) return;
        console.error('Error loading vote data:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlayers(false);
      });
    return () => { isMounted = false; };
  }, [authIsLoading, lastRearrangementTimeISO, loadVoteDataInternal]);

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  const handlePlayerVote = useCallback(async (playerId: number, newVoteType: number) => {
    if (submittingRef.current[playerId]) return;

    let identity: VoteIdentity;
    try {
      identity = resolveVoteIdentity(user?.id);
    } catch (e) {
      console.error('Failed to get anonymous ID (localStorage may be blocked):', e);
      alert('Voting requires localStorage access. Please disable private browsing or enable cookies for this site.');
      return;
    }

    submittingRef.current[playerId] = true;
    setIsSubmittingVoteForPlayer(prev => ({ ...prev, [playerId]: true }));

    const originalPlayer = playersRef.current.find(p => p.personId === playerId);

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

    const result = await writeTop100Vote(identity, playerId, newVoteType);
    if (!result.ok) {
      console.error('Error submitting vote:', result.message);
      alert(`Failed to submit vote: ${result.message}`);
      if (originalPlayer) {
        setPlayers(prev => prev.map(p => (p.personId === playerId ? originalPlayer : p)));
      }
    }
    submittingRef.current[playerId] = false;
    setIsSubmittingVoteForPlayer(prev => ({ ...prev, [playerId]: false }));
  }, [user]);

  // Derived from a prop, so server and client agree (no hydration mismatch).
  const rankingYear = new Date(initialWeekStartISO).getFullYear();
  const pageTitle = `Top 100 NBA Players of ${rankingYear}`;
  const pageSubtitle = 'The fan-voted NBA Top 100. Rankings reshuffle every 3 days.';

  const recap = useMemo(() => {
    const rows = players
      .map(p => ({ player: p, change: playerRankingData.get(p.personId)?.weeklyChange ?? 0 }))
      .filter(r => r.change !== 0);
    return {
      risers: rows.filter(r => r.change > 0).sort((a, b) => b.change - a.change).slice(0, 3),
      fallers: rows.filter(r => r.change < 0).sort((a, b) => a.change - b.change).slice(0, 3),
      newEntries: players.filter(p => (playerRankingData.get(p.personId)?.history?.length ?? 0) === 0).slice(0, 3),
    };
  }, [players, playerRankingData]);

  const ballotCount = useMemo(() => players.filter(p => p.currentUserVote != null).length, [players]);

  const jumpMatches = useMemo(() => {
    const term = jumpTerm.trim().toLowerCase();
    if (term.length < 2) return [];
    return players
      .filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [jumpTerm, players]);

  const jumpToPlayer = (personId: number) => {
    setJumpTerm('');
    document.getElementById(`player-card-${personId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(personId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 2000);
  };

  const LoadingErrorDisplay = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg text-slate-800 dark:text-slate-100 p-4 md:p-6 text-center flex-grow">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 text-sky-600 dark:text-sky-400">{pageTitle}</h1>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 sm:mb-8">{pageSubtitle}</p>
      {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}
      <div className="py-10">{children}</div>
    </div>
  );

  // Never gate the board on auth: during SSR auth is always "loading", and
  // returning early here would serve crawlers a spinner instead of the list.
  // Vote highlights hydrate later via loadVoteDataInternal once auth resolves.
  if (isLoadingPlayers && players.length === 0) {
    return <LoadingErrorDisplay><p className="text-xl">Loading players...</p></LoadingErrorDisplay>;
  }
  if (!isLoadingPlayers && players.length === 0) {
    return <LoadingErrorDisplay>
      <p className="text-slate-700 dark:text-slate-300">No player data is currently available for the ranking.</p>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Rankings reshuffle every 3 days based on fan votes.</p>
    </LoadingErrorDisplay>;
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <div className="p-4 md:py-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 text-center text-sky-600 dark:text-sky-400">{pageTitle}</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-1 text-center">{pageSubtitle}</p>

        <div className="mt-4 mb-4 p-4 bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-200 dark:border-sky-800 rounded-lg">
          <p className="text-center text-sky-700 dark:text-sky-300 font-semibold text-lg">
            Voting is open to everyone. No sign-in required.
          </p>
          <p className="text-center text-sky-600 dark:text-sky-400 text-sm mt-1">
            Vote players up or down, or{' '}
            <a href="#nominate" className="underline font-semibold hover:text-sky-800 dark:hover:text-sky-200">
              nominate someone new
            </a>
            . Votes are applied at every reshuffle.
          </p>
        </div>

        <RecapStrip risers={recap.risers} fallers={recap.fallers} newEntries={recap.newEntries} />

        {nextRearrangementTime && <CountdownTimer targetTimeIso={nextRearrangementTime} />}
        {players.length >= 5 && (
          <div className="flex justify-center mt-2">
            <ShareResult
              shareText={buildTop100Share({
                topFive: [...players]
                  .sort((a, b) => a.rankNumber - b.rankNumber)
                  .slice(0, 5)
                  .map((p) => `${p.firstName} ${p.lastName}`),
              })}
              game="top_100"
              surface="rankings"
            />
          </div>
        )}
        {!user && !authIsLoading && (
          <p className="text-center text-sky-600 dark:text-sky-400 my-4 font-semibold">
            <Link href="/signin" className="underline hover:text-sky-700 dark:hover:text-sky-300">Sign in</Link> to save your vote history across devices!
          </p>
        )}

        <div className="sticky top-0 z-20 -mx-4 px-4 py-2 mt-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={jumpTerm}
                onChange={(e) => setJumpTerm(e.target.value)}
                placeholder="Find a player in the 100..."
                aria-label="Find a player in the Top 100"
                className="w-full p-2 text-sm rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 border border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              {jumpMatches.length > 0 && (
                <ul className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-600">
                  {jumpMatches.map((p) => (
                    <li key={p.personId}>
                      <button
                        onClick={() => jumpToPlayer(p.personId)}
                        className="w-full text-left p-2 text-sm hover:bg-sky-500 dark:hover:bg-sky-600 hover:text-white border-b border-gray-200 dark:border-slate-600 last:border-b-0"
                      >
                        #{p.rankNumber} {p.firstName} {p.lastName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <span className="flex-none text-xs font-semibold rounded-full border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 px-2.5 py-1">
              Your ballot: {ballotCount}/100<span className="hidden sm:inline"> this cycle</span>
            </span>
          </div>
        </div>

        <ol className="max-w-3xl mx-auto mt-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 divide-y divide-gray-200 dark:divide-slate-700">
          {players.map((player) => (
            <PlayerRow
              key={player.personId}
              player={player}
              rankingInfo={playerRankingData.get(player.personId)}
              onVote={handlePlayerVote}
              isVoting={!!isSubmittingVoteForPlayer[player.personId]}
              isHighlighted={highlightedId === player.personId}
            />
          ))}
        </ol>
      </div>
      <NominateSection topPlayers={players} cycleStartIso={lastRearrangementTimeISO} />
    </div>
  );
}
