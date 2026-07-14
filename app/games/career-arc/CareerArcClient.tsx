// app/games/career-arc/CareerArcClient.tsx

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { debounce } from 'lodash';
import { track } from '@vercel/analytics';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { getLaDateString, getNextLaMidnightIso } from '@/lib/dailyTime';
import { generateCareerArcDaily, type CareerArcDailyData } from '@/lib/careerArcDaily';
import { markDailyPlayed } from '@/lib/dailyProgress';
import { buildCareerArcShare, type GuessResult } from '@/lib/shareText';
import { PlayerSuggestion } from '@/types/stats';
import ShareResult from '@/components/ShareResult';
import CountdownTimer from '@/components/CountdownTimer';
import DailyChallengesStrip from '@/app/DailyChallengesStrip';
import NextUpCard from '@/components/NextUpCard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const MAX_GUESSES = 5;
const GAME_ID = 'CAREER_ARC_DAILY_V1';

interface DayRecord {
  guessNames: string[];
  results: GuessResult[];
  won: boolean;
  done: boolean;
}

const recordKey = (date: string) => `hd:careerArcDaily_${date}`;
const cacheKey = (date: string) => `careerArcGame_${date}`;

function readRecord(date: string): DayRecord | null {
  try {
    const raw = localStorage.getItem(recordKey(date));
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (rec && Array.isArray(rec.guessNames) && Array.isArray(rec.results)) return rec as DayRecord;
  } catch {
    // ignore malformed storage
  }
  return null;
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

export default function CareerArcClient() {
  const { user } = useAuth();
  const today = useMemo(() => getLaDateString(), []);
  const nextMidnightIso = useMemo(() => getNextLaMidnightIso(), []);

  const [status, setStatus] = useState<'loading' | 'playing' | 'done' | 'error'>('loading');
  const [puzzle, setPuzzle] = useState<CareerArcDailyData | null>(null);
  const [guessNames, setGuessNames] = useState<string[]>([]);
  const [results, setResults] = useState<GuessResult[]>([]);
  const [won, setWon] = useState(false);
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let data: CareerArcDailyData | null = null;
      try {
        const cached = sessionStorage.getItem(cacheKey(today));
        if (cached) data = JSON.parse(cached);
      } catch {
        // ignore storage failures
      }
      if (!data) {
        data = await generateCareerArcDaily(today);
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
      setPuzzle(data);
      const rec = readRecord(today);
      if (rec) {
        setGuessNames(rec.guessNames);
        setResults(rec.results);
        setWon(rec.won);
        setStatus(rec.done ? 'done' : 'playing');
      } else {
        setStatus('playing');
      }
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

  const saveScore = useCallback(
    async (finalWon: boolean, guessCount: number) => {
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
          points: finalWon ? MAX_GUESSES + 1 - guessCount : 0,
          potential_points: MAX_GUESSES,
        });
      } catch {
        // score save is best-effort
      }
    },
    [user, today]
  );

  const submitGuess = (picked: { id: number; name: string }) => {
    if (status !== 'playing' || !puzzle) return;
    if (guessNames.includes(picked.name)) {
      setTerm('');
      setOpen(false);
      return;
    }
    const hit = picked.id === puzzle.personId;
    const nextNames = [...guessNames, picked.name];
    const nextResults: GuessResult[] = [...results, hit ? 'hit' : 'miss'];
    const finished = hit || nextNames.length >= MAX_GUESSES;

    setGuessNames(nextNames);
    setResults(nextResults);
    setWon(hit);
    setTerm('');
    setSuggestions([]);
    setOpen(false);
    writeRecord(today, { guessNames: nextNames, results: nextResults, won: hit, done: finished });

    if (finished) {
      setStatus('done');
      markDailyPlayed('careerArc');
      track('daily_played', { game: 'career_arc', won: hit, guesses: nextNames.length });
      saveScore(hit, nextNames.length);
    }
  };

  const wrongCount = results.filter((r) => r === 'miss').length;
  const revealsShown = status === 'done' ? puzzle?.reveals.length ?? 0 : Math.min(wrongCount, puzzle?.reveals.length ?? 0);

  const chartData = useMemo(() => {
    const points = puzzle?.points ?? [];
    const revealYears = status === 'done';
    return {
      labels: points.map((p, i) => (revealYears ? String(p.year) : `Yr ${i + 1}`)),
      datasets: [
        {
          data: points.map((p) => p.ppg),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#0ea5e9',
        },
      ],
    };
  }, [puzzle, status]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
        y: {
          beginAtZero: true,
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          title: { display: true, text: 'Points per game', color: '#94a3b8' },
        },
      },
    }),
    []
  );

  if (status === 'loading') {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <p className="text-lg text-slate-500 dark:text-slate-400">Loading today&apos;s arc...</p>
      </div>
    );
  }

  if (status === 'error' || !puzzle) {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg text-slate-500 dark:text-slate-400 text-center">
          Could not load today&apos;s puzzle. Please try again later.
        </p>
        <Link href="/games" className="text-sky-600 dark:text-sky-400 underline">
          Browse all games
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <span className="inline-block mb-2 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/40 border border-sky-300 dark:border-sky-700 rounded-full px-3 py-0.5">
            Daily Challenge
          </span>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Career Arc</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            One mystery player. Their points per game, season by season. Who is it?
          </p>
        </div>

        <div className="h-64 sm:h-72 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600">
          <Line data={chartData} options={chartOptions} />
        </div>

        {revealsShown > 0 && (
          <div className="space-y-2 mb-4">
            {puzzle.reveals.slice(0, revealsShown).map((r) => (
              <div
                key={r.label}
                className="flex items-baseline gap-2 p-2.5 rounded-md bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 text-sm"
              >
                <span className="font-bold text-sky-700 dark:text-sky-300 shrink-0">{r.label}:</span>
                <span className="text-slate-700 dark:text-slate-200">{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {guessNames.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {guessNames.map((g, i) => (
              <span
                key={g}
                className={`text-sm px-3 py-1 rounded-full border ${
                  results[i] === 'hit'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                }`}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {status === 'playing' && (
          <>
            <div ref={boxRef} className="relative mb-2">
              <input
                type="text"
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  debouncedFetch(e.target.value);
                }}
                placeholder="Guess a player..."
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Guess {guessNames.length + 1} of {MAX_GUESSES}. Each miss unlocks a clue.
            </p>
          </>
        )}

        {status === 'done' && (
          <div className="text-center animate-fadeIn">
            <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {won ? `Got it in ${guessNames.length}` : 'Out of guesses'}
            </p>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-3">
              The player was{' '}
              <Link href={`/player/${puzzle.personId}`} className="font-bold text-sky-600 dark:text-sky-400 hover:underline">
                {puzzle.name}
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-3">
              <ShareResult
                shareText={buildCareerArcShare({ guessResults: results, won })}
                game="career_arc"
                surface="game_end"
              />
              <Link
                href={`/player/${puzzle.personId}`}
                className="inline-flex items-center rounded-md bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold px-3 py-1.5 transition-colors"
              >
                Full career stats
              </Link>
              <Link
                href={`/compare?players=${encodeURIComponent(puzzle.name)}`}
                className="inline-flex items-center rounded-md bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm font-semibold px-3 py-1.5 transition-colors"
              >
                Compare {puzzle.name}
              </Link>
            </div>
            <div className="mb-6">
              <CountdownTimer
                compact
                targetTimeIso={nextMidnightIso}
                label="Next arc in"
                completedText="A new arc is live. Refresh to play!"
              />
            </div>
            <div className="mt-8 w-full max-w-3xl mx-auto border-t border-gray-200 dark:border-gray-700 pt-8 text-left">
              <NextUpCard currentGame="careerArc" className="mb-6" />
              <DailyChallengesStrip className="" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
