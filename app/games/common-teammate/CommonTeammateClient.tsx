// app/games/common-teammate/CommonTeammateClient.tsx

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { debounce } from 'lodash';
import { track } from '@vercel/analytics';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { getLaDateString, getNextLaMidnightIso } from '@/lib/dailyTime';
import { generateCommonTeammateDaily, type CtRound } from '@/lib/commonTeammateDaily';
import {
  CT_GUESSES_PER_ROUND,
  CT_POTENTIAL_POINTS,
  CT_ROUNDS,
  feedbackForGuess,
  pointsForRound,
} from '@/lib/commonTeammateCore';
import { markDailyPlayed } from '@/lib/dailyProgress';
import { recordPlayers } from '@/lib/collection';
import { buildCommonTeammateShare } from '@/lib/shareText';
import { findDuoSlugForPair } from '@/app/data/duoPages';
import { PlayerSuggestion } from '@/types/stats';
import ShareResult from '@/components/ShareResult';
import CountdownTimer from '@/components/CountdownTimer';
import DailyChallengesStrip from '@/app/DailyChallengesStrip';
import NextUpCard from '@/components/NextUpCard';

const GAME_ID = 'COMMON_TEAMMATE_DAILY_V1';

interface DayRecord {
  solved: boolean[];
  guessesUsed: number[];
  completed: number;
  done: boolean;
}

const recordKey = (date: string) => `hd:commonTeammateDaily_${date}`;
const cacheKey = (date: string) => `commonTeammateGame_${date}`;

function emptyRecord(): DayRecord {
  return { solved: [], guessesUsed: [], completed: 0, done: false };
}

function readRecord(date: string): DayRecord {
  try {
    const raw = localStorage.getItem(recordKey(date));
    if (!raw) return emptyRecord();
    const rec = JSON.parse(raw);
    if (rec && Array.isArray(rec.solved) && Array.isArray(rec.guessesUsed)) return rec as DayRecord;
  } catch {
    // ignore malformed storage
  }
  return emptyRecord();
}

function writeRecord(date: string, rec: DayRecord): void {
  try {
    localStorage.setItem(recordKey(date), JSON.stringify(rec));
  } catch {
    // ignore storage failures
  }
}

function playerName(p: PlayerSuggestion): string {
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

export default function CommonTeammateClient() {
  const { user } = useAuth();
  const today = useMemo(() => getLaDateString(), []);
  const nextMidnightIso = useMemo(() => getNextLaMidnightIso(), []);

  const [status, setStatus] = useState<'loading' | 'playing' | 'done' | 'error'>('loading');
  const [rounds, setRounds] = useState<CtRound[]>([]);
  const [record, setRecord] = useState<DayRecord>(emptyRecord());
  const [roundGuesses, setRoundGuesses] = useState(0);
  const [roundSolvedBy, setRoundSolvedBy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [betweenRounds, setBetweenRounds] = useState(false);
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let data: CtRound[] | null = null;
      try {
        const cached = sessionStorage.getItem(cacheKey(today));
        if (cached) data = JSON.parse(cached);
      } catch {
        // ignore storage failures
      }
      if (!data) {
        data = await generateCommonTeammateDaily(today);
        if (data) {
          try {
            sessionStorage.setItem(cacheKey(today), JSON.stringify(data));
          } catch {
            // ignore storage failures
          }
        }
      }
      if (cancelled) return;
      if (!data) {
        setStatus('error');
        return;
      }
      setRounds(data);
      const rec = readRecord(today);
      setRecord(rec);
      setRoundGuesses(rec.done ? 0 : rec.guessesUsed[rec.completed] ?? 0);
      setStatus(rec.done ? 'done' : 'playing');
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [today]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      try {
        const { data } = await supabase.rpc('get_player_suggestions', { search_term: query });
        setSuggestions((data || []).map((p: PlayerSuggestion) => ({ id: p.personId, name: playerName(p) })));
        setOpen(true);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const totalPoints = (rec: DayRecord) =>
    rec.solved.reduce((sum, s, i) => sum + pointsForRound(s, rec.guessesUsed[i] ?? CT_GUESSES_PER_ROUND), 0);

  const saveScore = useCallback(
    async (points: number) => {
      if (!user) return;
      try {
        const { data: existing } = await supabase
          .from('gamescores')
          .select('points')
          .eq('user_id', user.id)
          .eq('game_id', GAME_ID)
          .eq('played_on_date', today)
          .maybeSingle();
        if (existing) return;
        await supabase.from('gamescores').insert({
          user_id: user.id,
          played_on_date: today,
          game_id: GAME_ID,
          points,
          potential_points: CT_POTENTIAL_POINTS,
        });
      } catch {
        // score save is best-effort
      }
    },
    [user, today]
  );

  const finishRound = (solved: boolean, guessesUsed: number, solvedByName: string | null) => {
    const nextRecord: DayRecord = {
      solved: [...record.solved, solved],
      guessesUsed: [...record.guessesUsed.slice(0, record.completed), guessesUsed],
      completed: record.completed + 1,
      done: record.completed + 1 >= CT_ROUNDS,
    };
    setRecord(nextRecord);
    writeRecord(today, nextRecord);
    setRoundSolvedBy(solvedByName);
    setBetweenRounds(true);

    if (nextRecord.done) {
      const points = totalPoints(nextRecord);
      markDailyPlayed('commonTeammate');
      track('daily_played', { game: 'common_teammate', points });
      saveScore(points);
    }
  };

  const submitGuess = (picked: { id: number; name: string }) => {
    if (status !== 'playing' || betweenRounds) return;
    const round = rounds[record.completed];
    if (!round) return;

    setTerm('');
    setSuggestions([]);
    setOpen(false);

    const result = feedbackForGuess(round, picked.id);
    const used = roundGuesses + 1;

    if (result === 'correct') {
      setFeedback(null);
      recordPlayers(
        [
          { name: round.a.name, personId: round.a.personId },
          { name: round.b.name, personId: round.b.personId },
          { name: picked.name, personId: picked.id },
        ],
        { status: 'collected', via: 'commonTeammate' }
      );
      finishRound(true, used, picked.name);
      return;
    }

    const message =
      result === 'a-only'
        ? `${picked.name} played with ${round.a.name} but never ${round.b.name}.`
        : result === 'b-only'
        ? `${picked.name} played with ${round.b.name} but never ${round.a.name}.`
        : `${picked.name} never played with either of them.`;

    if (used >= CT_GUESSES_PER_ROUND) {
      setFeedback(message);
      recordPlayers(
        [
          { name: round.a.name, personId: round.a.personId },
          { name: round.b.name, personId: round.b.personId },
        ],
        { status: 'seen', via: 'commonTeammate' }
      );
      finishRound(false, used, null);
      return;
    }

    setRoundGuesses(used);
    setFeedback(message);
    const nextRecord: DayRecord = {
      ...record,
      guessesUsed: [...record.guessesUsed.slice(0, record.completed), used],
    };
    setRecord(nextRecord);
    writeRecord(today, nextRecord);
  };

  const advance = () => {
    setBetweenRounds(false);
    setRoundSolvedBy(null);
    setFeedback(null);
    setRoundGuesses(0);
    if (record.done) setStatus('done');
  };

  if (status === 'loading') {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <p className="text-lg text-slate-500 dark:text-slate-400">Loading today&apos;s pairs...</p>
      </div>
    );
  }

  if (status === 'error' || rounds.length === 0) {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg text-slate-500 dark:text-slate-400 text-center">
          Could not load today&apos;s challenge. Please try again later.
        </p>
        <Link href="/games" className="text-sky-600 dark:text-sky-400 underline">
          Browse all games
        </Link>
      </div>
    );
  }

  const points = totalPoints(record);
  const shareText = buildCommonTeammateShare({
    roundResults: record.solved,
    points,
    total: CT_POTENTIAL_POINTS,
    pairs: rounds.map((r) => [r.a.name, r.b.name] as [string, string]),
  });
  const roundIndex = Math.min(record.completed, CT_ROUNDS - 1);
  const round = rounds[betweenRounds ? record.completed - 1 : roundIndex];
  const bestAnswer = round.answers[0];
  const duoSlugA = bestAnswer ? findDuoSlugForPair(round.a.name, bestAnswer.name) : null;
  const duoSlugB = bestAnswer ? findDuoSlugForPair(round.b.name, bestAnswer.name) : null;

  return (
    <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <span className="inline-block mb-2 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/40 border border-sky-300 dark:border-sky-700 rounded-full px-3 py-0.5">
            Daily Challenge
          </span>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Common Teammate</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            These two never played together. Name anyone who played with both.
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5" aria-label="Round progress">
            {Array.from({ length: CT_ROUNDS }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i < record.completed
                    ? record.solved[i]
                      ? 'bg-green-500'
                      : 'bg-red-400'
                    : i === record.completed && status !== 'done'
                    ? 'bg-sky-500'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {status !== 'done' && (
          <>
            <div className="flex items-stretch gap-2 sm:gap-3 mb-4">
              <div className="flex-1 p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 text-center">
                <span className="block text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  {round.a.name}
                </span>
              </div>
              <div className="flex items-center justify-center px-2">
                <span
                  className={`text-sm font-bold px-3 py-1.5 rounded-full border ${
                    betweenRounds && roundSolvedBy
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-700 dark:text-green-300'
                      : 'bg-slate-100 dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {betweenRounds && roundSolvedBy ? roundSolvedBy : '?'}
                </span>
              </div>
              <div className="flex-1 p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 text-center">
                <span className="block text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  {round.b.name}
                </span>
              </div>
            </div>

            {betweenRounds ? (
              <div className="text-center animate-fadeIn">
                {roundSolvedBy ? (
                  <p className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
                    Correct: {roundSolvedBy} played with both
                  </p>
                ) : (
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                    Out of guesses
                  </p>
                )}
                {feedback && !roundSolvedBy && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{feedback}</p>
                )}
                {bestAnswer && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    Most games with the pair:{' '}
                    <Link href={`/player/${bestAnswer.id}`} className="font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                      {bestAnswer.name}
                    </Link>
                    {round.answers.length > 1 && ` (${round.answers.length} valid answers)`}
                    {duoSlugA && (
                      <>
                        {' '}
                        <Link href={`/duos/${duoSlugA}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                          with {round.a.name}
                        </Link>
                      </>
                    )}
                    {duoSlugB && (
                      <>
                        {' '}
                        <Link href={`/duos/${duoSlugB}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                          with {round.b.name}
                        </Link>
                      </>
                    )}
                  </p>
                )}
                <button
                  onClick={advance}
                  className="px-6 py-2.5 rounded-lg bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 text-white font-semibold transition-colors"
                >
                  {record.done ? 'See results' : 'Next round'}
                </button>
              </div>
            ) : (
              <>
                <div ref={boxRef} className="relative mb-2">
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => {
                      setTerm(e.target.value);
                      debouncedFetch(e.target.value);
                    }}
                    placeholder="Name a player who played with both..."
                    className="w-full p-3 text-lg border rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600 text-slate-900 dark:text-white"
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoFocus
                  />
                  {open && suggestions.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 shadow-lg">
                      {suggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => submitGuess(s)}
                            className="w-full text-left px-3 py-2 hover:bg-sky-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100"
                          >
                            {s.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {feedback && (
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">{feedback}</p>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Round {record.completed + 1} of {CT_ROUNDS}. Guess {roundGuesses + 1} of {CT_GUESSES_PER_ROUND}.
                </p>
              </>
            )}
          </>
        )}

        {status === 'done' && (
          <div className="text-center animate-fadeIn">
            <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">
              You scored {points} of {CT_POTENTIAL_POINTS}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Solved {record.solved.filter(Boolean).length} of {CT_ROUNDS} pairs
            </p>
            <div className="flex justify-center mb-3">
              <ShareResult shareText={shareText} game="common_teammate" surface="game_end" />
            </div>
            <div className="mb-6">
              <CountdownTimer
                compact
                targetTimeIso={nextMidnightIso}
                label="New pairs in"
                completedText="New pairs are live. Refresh to play!"
              />
            </div>
            <div className="mt-8 w-full max-w-3xl mx-auto border-t border-gray-200 dark:border-gray-700 pt-8 text-left">
              <NextUpCard currentGame="commonTeammate" className="mb-6" />
              <DailyChallengesStrip className="" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
