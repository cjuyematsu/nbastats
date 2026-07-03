// app/top-100-players/NominateSection.tsx

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
import Link from 'next/link';
import { debounce } from 'lodash';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { resolveVoteIdentity, writeTop100Vote, type VoteIdentity } from '@/lib/top100Votes';
import type { TopPlayer } from './types';

interface PlayerSuggestion {
  personId: number;
  firstName: string;
  lastName: string;
  min_season?: number;
  max_season?: number;
}

interface BubblePlayer {
  personId: number;
  firstName: string;
  lastName: string;
  nominations: number;
}

interface NominateSectionProps {
  topPlayers: TopPlayer[];
  cycleStartIso: string;
}

export default function NominateSection({ topPlayers, cycleStartIso }: NominateSectionProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [isNominating, setIsNominating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyPlayer, setBusyPlayer] = useState<Record<number, boolean>>({});
  const [bubblePlayers, setBubblePlayers] = useState<BubblePlayer[]>([]);

  const topPlayersRef = useRef(topPlayers);
  useEffect(() => { topPlayersRef.current = topPlayers; }, [topPlayers]);

  // Players outside the 100 with nomination upvotes this cycle.
  const loadBubblePlayers = useCallback(async () => {
    try {
      const { data: votes } = await supabase
        .from('playervotes')
        .select('player_id, vote_type')
        .gte('created_at', cycleStartIso);
      if (!votes) return;
      const inList = new Set(topPlayersRef.current.map((p) => p.personId));
      const counts = new Map<number, number>();
      votes.forEach((v) => {
        if (v.vote_type === 1 && !inList.has(v.player_id)) {
          counts.set(v.player_id, (counts.get(v.player_id) || 0) + 1);
        }
      });
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      if (top.length === 0) {
        setBubblePlayers([]);
        return;
      }
      const { data: names } = await supabase
        .from('regularseasonstats')
        .select('personId, firstName, lastName')
        .in('personId', top.map(([id]) => id))
        .order('SeasonYear', { ascending: false })
        .limit(60);
      const nameById = new Map<number, { firstName: string; lastName: string }>();
      (names || []).forEach((n) => {
        if (!nameById.has(n.personId)) {
          nameById.set(n.personId, { firstName: n.firstName ?? '', lastName: n.lastName ?? '' });
        }
      });
      setBubblePlayers(
        top
          .map(([personId, nominations]) => {
            const name = nameById.get(personId);
            return name ? { personId, ...name, nominations } : null;
          })
          .filter((b): b is BubblePlayer => b !== null)
      );
    } catch {
      // best effort panel; ignore failures
    }
  }, [cycleStartIso]);

  useEffect(() => { loadBubblePlayers(); }, [loadBubblePlayers]);

  const fetchSuggestions = useMemo(
    () =>
      debounce(async (term: string) => {
        if (term.length < 2) {
          setSuggestions([]);
          return;
        }
        try {
          const { data, error } = await supabase.rpc('get_player_suggestions_2025', { search_term: term });
          if (error) {
            console.error('Error fetching nomination suggestions:', error);
            setSuggestions([]);
            return;
          }
          const players = topPlayersRef.current;
          const rankedIds = new Set(players.map((p) => p.personId));
          const all = (data || []) as PlayerSuggestion[];
          const filtered = all.filter((s) => !rankedIds.has(s.personId));
          if (filtered.length === 0 && all.length > 0) {
            const ranked = players.find((p) => p.personId === all[0].personId);
            setMessage(
              `${all[0].firstName} ${all[0].lastName} is already ranked${ranked ? ` #${ranked.rankNumber}` : ''}.`
            );
          }
          setSuggestions(filtered);
        } catch (err) {
          console.error('Exception fetching nomination suggestions:', err);
          setSuggestions([]);
        }
      }, 300),
    []
  );

  useEffect(() => () => fetchSuggestions.cancel(), [fetchSuggestions]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setMessage(null);
    fetchSuggestions(term);
  };

  const handleNominatePlayer = async (playerToNominate: Pick<PlayerSuggestion, 'personId' | 'firstName' | 'lastName'>) => {
    const { personId, firstName, lastName } = playerToNominate;
    if (isNominating || busyPlayer[personId]) return;
    if (topPlayersRef.current.some((p) => p.personId === personId)) {
      setMessage(`${firstName} ${lastName} is already in the Top 100.`);
      setSearchTerm('');
      setSuggestions([]);
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    let identity: VoteIdentity;
    try {
      identity = resolveVoteIdentity(user?.id);
    } catch (e) {
      console.error('Failed to get anonymous ID:', e);
      setMessage('Nomination requires localStorage. Please disable private browsing or enable cookies.');
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setIsNominating(true);
    setBusyPlayer((prev) => ({ ...prev, [personId]: true }));
    setMessage(`Nominating ${firstName} ${lastName}...`);
    try {
      let existingQuery = supabase.from('playervotes').select('vote_type, created_at').eq('player_id', personId);
      existingQuery = identity.userId
        ? existingQuery.eq('user_id', identity.userId)
        : existingQuery.eq('anonymous_id', identity.anonymousId!);
      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) throw existingError;

      const alreadyThisCycle =
        existing?.vote_type === 1 &&
        existing.created_at != null &&
        Date.parse(existing.created_at) >= Date.parse(cycleStartIso);

      if (alreadyThisCycle) {
        setMessage(`You already nominated ${firstName} ${lastName} this cycle.`);
      } else {
        const result = await writeTop100Vote(identity, personId, 1);
        if (!result.ok) throw new Error(result.message);
        setMessage(`${firstName} ${lastName} nominated successfully! This counts as an upvote.`);
      }
      setSearchTerm('');
      setSuggestions([]);
      loadBubblePlayers();
    } catch (error: unknown) {
      let msg = 'Failed to nominate player.';
      if (error instanceof Error) msg = error.message;
      else if (typeof error === 'string') msg = error;
      console.error('Error nominating player:', error);
      setMessage(`Error: ${msg}`);
    } finally {
      setIsNominating(false);
      setBusyPlayer((prev) => ({ ...prev, [personId]: false }));
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div id="nominate" className="px-4 md:px-6 pb-8 scroll-mt-4">
      <div className="max-w-2xl mx-auto bg-gray-100 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-transparent">
        <h2 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-3 text-center">Nominate a Player for Top 100</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 text-center">
          Search for a player not in the Top 100. Each nomination counts as an upvote.
        </p>
        <div className="max-w-md mx-auto relative">
          <input
            type="text"
            placeholder="Search player name to nominate..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={isNominating}
            className="w-full p-2.5 rounded-md bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 border border-gray-300 dark:border-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-600">
              {suggestions.map((playerSugg) => (
                <li
                  key={playerSugg.personId}
                  className={`p-2.5 hover:bg-sky-500 dark:hover:bg-sky-600 hover:text-white dark:hover:text-white cursor-pointer border-b border-gray-200 dark:border-slate-600 last:border-b-0 ${isNominating || busyPlayer[playerSugg.personId] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !(isNominating || busyPlayer[playerSugg.personId]) && handleNominatePlayer(playerSugg)}
                >
                  {playerSugg.firstName} {playerSugg.lastName}
                </li>
              ))}
            </ul>
          )}
          {message && (
            <p className={`mt-3 text-sm text-center ${message.includes('Error:') || message.includes('Failed') || message.includes('already') ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {message}
            </p>
          )}
        </div>
        {bubblePlayers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center mb-3">
              On the bubble this cycle
            </p>
            <ul className="max-w-md mx-auto space-y-2">
              {bubblePlayers.map((b) => (
                <li key={b.personId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-200">
                    <Link href={`/player/${b.personId}`} className="font-medium hover:underline">
                      {b.firstName} {b.lastName}
                    </Link>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">
                      {b.nominations} nomination{b.nominations === 1 ? '' : 's'}
                    </span>
                  </span>
                  <button
                    onClick={() => handleNominatePlayer(b)}
                    disabled={isNominating || busyPlayer[b.personId]}
                    className="flex-none px-3 py-1 text-xs font-bold rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                  >
                    +1
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
              Nominated players join the Top 100 at the next reshuffle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
