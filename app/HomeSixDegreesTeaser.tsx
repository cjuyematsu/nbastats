// app/HomeSixDegreesTeaser.tsx

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';
import { track } from '@vercel/analytics';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { readDailyResult, writeDailyResult, readAllLocalDailyResults } from '@/lib/sixDegreesDaily';
import { computeSixDegreesStats, ScoreHistoryRecord } from '@/lib/sixDegreesStats';
import { getLaDateString, getNextLaMidnightIso, sixDegreesPuzzleNumber } from '@/lib/dailyTime';
import { GuessResult, buildSixDegreesShare, buildSixDegreesShareFromCount } from '@/lib/shareText';
import ShareResult from '@/components/ShareResult';
import CountdownTimer from '@/components/CountdownTimer';
import { PlayerSuggestion } from '@/types/stats';

const COLOR_A = '#00b060';
const COLOR_B = '#0090b0';
const MAX_GUESSES = 6;

export interface SixDegreesPuzzle {
  game_date: string;
  player_a_id: number;
  player_a_name: string;
  player_b_id: number;
  player_b_name: string;
  solution_path_names: string[];
  solution_path_ids?: number[] | null;
}

interface Guess {
  id: number;
  name: string;
}

type Status = 'playing' | 'won' | 'lost' | 'empty';

async function areTeammates(a: number, b: number): Promise<boolean> {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const { data } = await supabase
    .from('teammates')
    .select('PlayerID')
    .eq('PlayerID', lo)
    .eq('TeammateID', hi)
    .maybeSingle();
  return !!data;
}

function PlayerSearch({
  onSelect,
  placeholder,
  disabled,
}: {
  onSelect: (g: Guess) => void;
  placeholder: string;
  disabled: boolean;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Guess[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const debouncedFetch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.rpc('get_player_suggestions', { search_term: query });
        setResults(
          (data || []).map((p: PlayerSuggestion) => ({
            id: p.personId,
            name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
          }))
        );
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pick = (g: Guess) => {
    setTerm('');
    setResults([]);
    setOpen(false);
    onSelect(g);
  };

  return (
    <div ref={ref} className="relative min-w-[10rem] flex-1">
      <input
        type="text"
        value={term}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setTerm(e.target.value);
          debouncedFetch(e.target.value);
        }}
        onFocus={() => term.length >= 2 && results.length > 0 && setOpen(true)}
        className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-t-2 border-b-2 border-sky-600 rounded-full animate-spin" />
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {results.map((r) => (
            <li
              key={r.id}
              onMouseDown={() => pick(r)}
              className="p-2 text-sm cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-800 dark:text-gray-200 hover:bg-sky-500 hover:text-white"
            >
              {r.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-sm font-medium border"
      style={color ? { color, borderColor: color, backgroundColor: `${color}1a` } : undefined}
    >
      <span className={color ? '' : 'text-slate-700 dark:text-slate-200'}>{name}</span>
    </span>
  );
}

const Arrow = ({ muted }: { muted?: boolean }) => (
  <span
    className={`text-lg ${muted ? 'text-slate-300 dark:text-slate-600' : ''}`}
    style={muted ? undefined : { color: COLOR_A }}
    aria-hidden
  >
    &rarr;
  </span>
);

export default function HomeSixDegreesTeaser({ initialPuzzle }: { initialPuzzle: SixDegreesPuzzle | null }) {
  const puzzle = initialPuzzle;
  const [status, setStatus] = useState<Status>(puzzle ? 'playing' : 'empty');
  const [path, setPath] = useState<Guess[]>(
    puzzle ? [{ id: puzzle.player_a_id, name: puzzle.player_a_name }] : []
  );
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [guessResults, setGuessResults] = useState<GuessResult[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [checking, setChecking] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Restore today's completed result (shared with the full daily game) so the
  // outcome is reflected on refresh and across both surfaces.
  useEffect(() => {
    if (!puzzle) return;
    const saved = readDailyResult(puzzle.game_date);
    if (!saved) return;
    setStatus(saved.status);
    setPath(saved.path);
    setGuessesUsed(saved.guessesUsed);
    setGuessResults(saved.guessResults ?? []);
    setFeedback(
      saved.status === 'won'
        ? `Solved in ${saved.guessesUsed} guess${saved.guessesUsed === 1 ? '' : 'es'}!`
        : 'Out of guesses.'
    );
  }, [puzzle]);

  // Streak for the end state and share text, computed the same way as the full game.
  useEffect(() => {
    if (!puzzle || (status !== 'won' && status !== 'lost')) return;
    let cancelled = false;
    const wonToday = status === 'won';
    const load = async () => {
      const todayLA = getLaDateString();
      if (user) {
        const { data } = await supabase.rpc('get_six_degrees_history', { p_user_id: user.id });
        if (cancelled) return;
        const records = (data ?? []) as ScoreHistoryRecord[];
        const todayIncluded = records.some((r) => r.game_date === puzzle.game_date);
        let current = computeSixDegreesStats(records, todayLA).currentStreak;
        if (!todayIncluded) current = wonToday ? current + 1 : 0;
        setStreak(current);
      } else {
        setStreak(computeSixDegreesStats(readAllLocalDailyResults(), todayLA).currentStreak);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [status, user, puzzle]);

  const persist = (s: 'won' | 'lost', p: Guess[], used: number, results: GuessResult[]) => {
    if (!puzzle) return;
    writeDailyResult(puzzle.game_date, {
      status: s,
      path: p,
      guessesUsed: used,
      solutionPathNames: puzzle.solution_path_names,
      guessResults: results,
    });
  };

  // Record today's daily result so it counts as played (only for signed-in users, mirroring the full game).
  const saveDaily = async (isSuccess: boolean, finalPath: Guess[], used: number) => {
    if (!user || !puzzle) return;
    try {
      const { data: existing } = await supabase
        .from('six_degrees_scores')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_date', puzzle.game_date)
        .maybeSingle();
      if (existing) return;
      const guessedNames = isSuccess
        ? [...finalPath, { id: puzzle.player_b_id, name: puzzle.player_b_name }].map((p) => p.name)
        : finalPath.map((p) => p.name);
      await supabase.from('six_degrees_scores').insert({
        user_id: user.id,
        game_date: puzzle.game_date,
        is_successful: isSuccess,
        guess_count: used,
        solution_path_names: puzzle.solution_path_names,
        guessed_path_names: guessedNames,
      });
    } catch {
      // ignore save failures; localStorage still holds the result locally
    }
  };

  const handleGuess = async (g: Guess) => {
    if (status !== 'playing' || checking || !puzzle) return;
    const last = path[path.length - 1];
    if (g.id === last.id) return;

    setChecking(true);
    const linkOk = await areTeammates(last.id, g.id);
    const newUsed = guessesUsed + 1;
    setGuessesUsed(newUsed);
    const newResults: GuessResult[] = [...guessResults, linkOk ? 'hit' : 'miss'];
    setGuessResults(newResults);

    if (!linkOk) {
      setChecking(false);
      if (newUsed >= MAX_GUESSES) {
        setStatus('lost');
        setFeedback(`Out of guesses. ${g.name} was not a teammate of ${last.name}.`);
        persist('lost', path, newUsed, newResults);
        saveDaily(false, path, newUsed);
        track('daily_played', { game: 'six_degrees', surface: 'home_teaser', result: 'lost', guesses: newUsed });
      } else {
        setFeedback(`${g.name} was not a teammate of ${last.name}. Try again.`);
      }
      return;
    }

    const newPath = [...path, g];
    setPath(newPath);
    const winOk = g.id === puzzle.player_b_id ? true : await areTeammates(g.id, puzzle.player_b_id);
    setChecking(false);

    if (winOk) {
      setStatus('won');
      setFeedback(`Solved in ${newUsed} guess${newUsed === 1 ? '' : 'es'}!`);
      persist('won', newPath, newUsed, newResults);
      saveDaily(true, newPath, newUsed);
      track('daily_played', { game: 'six_degrees', surface: 'home_teaser', result: 'won', guesses: newUsed });
    } else if (newUsed >= MAX_GUESSES) {
      setStatus('lost');
      setFeedback('Out of guesses!');
      persist('lost', newPath, newUsed, newResults);
      saveDaily(false, newPath, newUsed);
      track('daily_played', { game: 'six_degrees', surface: 'home_teaser', result: 'lost', guesses: newUsed });
    } else {
      setFeedback(`Linked! Now find a teammate of ${g.name}.`);
    }
  };

  const guessesLeft = MAX_GUESSES - guessesUsed;
  const nextDailyIso = useMemo(() => getNextLaMidnightIso(), []);

  const shareText = useMemo(() => {
    if (!puzzle || (status !== 'won' && status !== 'lost')) return null;
    const puzzleNumber = sixDegreesPuzzleNumber(puzzle.game_date);
    const won = status === 'won';
    if (guessResults.length > 0) {
      return buildSixDegreesShare({ puzzleNumber, guessResults, won, streak: streak ?? undefined });
    }
    return buildSixDegreesShareFromCount({
      puzzleNumber,
      won,
      guessCount: won ? Math.max(path.length - 1, 1) : guessesUsed,
      streak: streak ?? undefined,
    });
  }, [puzzle, status, guessResults, path, guessesUsed, streak]);

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
          Six Degrees: today&apos;s connection
        </h2>
        {status === 'playing' && (
          <span
            className={`text-xs font-semibold whitespace-nowrap ${guessesLeft <= 2 ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {guessesLeft} guess{guessesLeft === 1 ? '' : 'es'} left
          </span>
        )}
      </div>

      {status === 'empty' || !puzzle ? (
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Today&apos;s puzzle isn&apos;t ready yet. Play a practice round in the full game.
          </p>
          <Link
            href="/games/six-degrees"
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            Play full game
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Link <span className="font-semibold" style={{ color: COLOR_A }}>{puzzle.player_a_name}</span> to{' '}
            <span className="font-semibold" style={{ color: COLOR_B }}>{puzzle.player_b_name}</span> through shared teammates.
            Each pick must be a teammate of the last player.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {path.map((p, i) => (
              <React.Fragment key={`${p.id}-${i}`}>
                {i > 0 && <Arrow />}
                <Chip name={p.name} color={i === 0 ? COLOR_A : undefined} />
              </React.Fragment>
            ))}

            {status === 'playing' && (
              <>
                <Arrow muted />
                <PlayerSearch
                  onSelect={handleGuess}
                  placeholder={`Teammate of ${path[path.length - 1]?.name}...`}
                  disabled={checking}
                />
              </>
            )}

            {status === 'won' ? (
              <>
                <Arrow />
                <Chip name={puzzle.player_b_name} color={COLOR_B} />
              </>
            ) : (
              <>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                  &middot;&middot;&middot;
                </span>
                <Chip name={puzzle.player_b_name} color={COLOR_B} />
              </>
            )}
          </div>

          <div className="min-h-[1.5rem] mt-3">
            {feedback && (
              <p
                className={`text-sm font-medium ${
                  status === 'won'
                    ? 'text-green-600 dark:text-green-400'
                    : status === 'lost'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {feedback}
              </p>
            )}
            {status === 'lost' && puzzle.solution_path_names?.length > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                One solution: {puzzle.solution_path_names.join(' → ')}
              </p>
            )}
          </div>

          {(status === 'won' || status === 'lost') && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {shareText && (
                  <ShareResult
                    shareText={shareText}
                    game="six_degrees"
                    surface="home_teaser"
                    className="inline-flex items-center gap-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
                  />
                )}
                <Link
                  href={`/compare?players=${encodeURIComponent(puzzle.player_a_name)},${encodeURIComponent(puzzle.player_b_name)}`}
                  onClick={() => track('post_game_profile_click', { game: 'six_degrees', target: 'compare' })}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
                >
                  Compare {puzzle.player_a_name} vs {puzzle.player_b_name}
                </Link>
                <button
                  onClick={() => router.push(`/games/six-degrees/${uuidv4()}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2 transition-colors w-fit"
                >
                  Play a random game
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <CountdownTimer
                  compact
                  targetTimeIso={nextDailyIso}
                  label="Next daily in"
                  completedText="New daily available. Refresh to play!"
                />
                {streak !== null && streak > 0 && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Streak: <span className="font-semibold">{streak}</span>
                  </span>
                )}
                <Link
                  href={`/player/${puzzle.player_a_id}?name=${encodeURIComponent(puzzle.player_a_name)}`}
                  onClick={() => track('post_game_profile_click', { game: 'six_degrees', target: 'player' })}
                  className="text-sm underline text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                >
                  {puzzle.player_a_name} career stats
                </Link>
                <Link
                  href={`/player/${puzzle.player_b_id}?name=${encodeURIComponent(puzzle.player_b_name)}`}
                  onClick={() => track('post_game_profile_click', { game: 'six_degrees', target: 'player' })}
                  className="text-sm underline text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                >
                  {puzzle.player_b_name} career stats
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
