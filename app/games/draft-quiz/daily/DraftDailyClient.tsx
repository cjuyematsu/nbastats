// app/games/draft-quiz/daily/DraftDailyClient.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { supabase } from '@/lib/supabaseClient';
import { getLaDateString, getNextLaMidnightIso } from '@/lib/dailyTime';
import { dailyDraftSlots } from '@/lib/dailySeed';
import { markDailyPlayed } from '@/lib/dailyProgress';
import { buildDraftDailyShare } from '@/lib/shareText';
import ShareResult from '@/components/ShareResult';
import CountdownTimer from '@/components/CountdownTimer';
import DailyChallengesStrip from '@/app/DailyChallengesStrip';

interface DailyPick {
  compositeKey: string;
  year: number;
  pickNumber: number;
  name: string;
  team: string;
  school: string;
}

interface DailyRecord {
  correct: string[];
  missed: string[];
  done: boolean;
}

const recordKey = (date: string) => `draftDaily_${date}`;

function readRecord(date: string): DailyRecord | null {
  try {
    const raw = localStorage.getItem(recordKey(date));
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (rec && rec.year === undefined && Array.isArray(rec.correct) && Array.isArray(rec.missed)) {
      return rec as DailyRecord;
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

function writeRecord(date: string, rec: DailyRecord): void {
  try {
    localStorage.setItem(recordKey(date), JSON.stringify(rec));
  } catch {
    // ignore storage failures
  }
}

// Named picks carry over into each year's full quiz via its guest storage key;
// signed-in users get them persisted by that page's own save flow.
function mergeIntoYearQuiz(keys: string[]): void {
  keys.forEach((key) => {
    const year = key.split('-')[0];
    try {
      const storageKey = `draftQuizGuest_${year}`;
      const raw = localStorage.getItem(storageKey);
      const existing: string[] = raw ? JSON.parse(raw) : [];
      if (!existing.includes(key)) {
        localStorage.setItem(storageKey, JSON.stringify([...existing, key]));
      }
    } catch {
      // ignore storage failures
    }
  });
}

export default function DraftDailyClient() {
  const slots = useMemo(() => dailyDraftSlots(), []);
  const today = useMemo(() => getLaDateString(), []);
  const nextMidnightIso = useMemo(() => getNextLaMidnightIso(), []);

  const [picks, setPicks] = useState<DailyPick[]>([]);
  const [correct, setCorrect] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'loading' | 'playing' | 'done' | 'error'>('loading');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadFromRpc = async (): Promise<DailyPick[] | null> => {
      try {
        const { data, error } = await supabase.rpc('get_draft_daily_challenge', { p_date: today });
        if (error || !data || data.length !== 3) return null;
        return data.map((r) => ({
          compositeKey: `${r.year}-${r.round}-${r.pick}`,
          year: r.year,
          pickNumber: r.pick,
          name: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
          team: r.team || '',
          school: r.school || '',
        }));
      } catch {
        return null;
      }
    };

    const loadFromSlots = async (): Promise<DailyPick[] | null> => {
      const results = await Promise.all(
        slots.map((slot) =>
          supabase
            .from('draft')
            .select('Year, Round, Pick, FirstName, LastName, "NBA Team", "School/Club Team"')
            .eq('Year', slot.year)
            .eq('Round', 1)
            .eq('Pick', slot.pick)
            .maybeSingle()
        )
      );
      const rows = results.map((r) => r.data);
      if (rows.some((r) => !r)) return null;
      return rows.map((p) => ({
        compositeKey: `${p!.Year}-${p!.Round}-${p!.Pick}`,
        year: p!.Year,
        pickNumber: p!.Pick,
        name: `${p!.FirstName || ''} ${p!.LastName || ''}`.trim(),
        team: p!['NBA Team'] || '',
        school: p!['School/Club Team'] || '',
      }));
    };

    const load = async () => {
      const loaded = (await loadFromRpc()) ?? (await loadFromSlots());
      if (cancelled) return;
      if (!loaded) {
        setStatus('error');
        return;
      }
      setPicks(loaded);
      const rec = readRecord(today);
      if (rec) {
        setCorrect(new Set(rec.correct));
        setMissed(new Set(rec.missed));
        setStatus(rec.done ? 'done' : 'playing');
      } else {
        setStatus('playing');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slots, today]);

  const finish = (finalCorrect: Set<string>, finalMissed: Set<string>) => {
    writeRecord(today, {
      correct: Array.from(finalCorrect),
      missed: Array.from(finalMissed),
      done: true,
    });
    mergeIntoYearQuiz(Array.from(finalCorrect));
    markDailyPlayed('draftQuiz');
    track('daily_played', { game: 'draft_daily', named: finalCorrect.size });
    setStatus('done');
  };

  const handleGuessSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const guess = inputValue.trim();
    if (guess.length === 0 || status !== 'playing') return;

    const guessTokens = guess.toLowerCase().split(' ').filter(Boolean);
    const revealed = new Set<string>();
    picks.forEach((pick) => {
      if (correct.has(pick.compositeKey) || missed.has(pick.compositeKey)) return;
      const playerTokens = pick.name.toLowerCase().split(' ').filter(Boolean);
      const matches = guessTokens.every((g) => playerTokens.some((p) => p.startsWith(g)));
      if (matches) revealed.add(pick.compositeKey);
    });

    if (revealed.size > 0) {
      const nextCorrect = new Set([...correct, ...revealed]);
      setCorrect(nextCorrect);
      if (nextCorrect.size + missed.size >= picks.length) {
        finish(nextCorrect, missed);
      } else {
        writeRecord(today, {
          correct: Array.from(nextCorrect),
          missed: Array.from(missed),
          done: false,
        });
      }
    }
    setInputValue('');
  };

  const handleGiveUp = () => {
    const remaining = picks
      .filter((p) => !correct.has(p.compositeKey))
      .map((p) => p.compositeKey);
    const nextMissed = new Set([...missed, ...remaining]);
    setMissed(nextMissed);
    finish(correct, nextMissed);
  };

  const results = picks.map((p) => correct.has(p.compositeKey));
  const shareText = buildDraftDailyShare({
    slotLabels: picks.map((p) => `${p.year} #${p.pickNumber}`),
    correct: correct.size,
    total: picks.length || 3,
    results,
  });

  if (status === 'loading') {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <p className="text-lg text-slate-500 dark:text-slate-400">Loading today&apos;s draft challenge...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg text-slate-500 dark:text-slate-400 text-center">
          Could not load today&apos;s challenge. Please try again later.
        </p>
        <Link href="/games/draft-quiz" className="text-sky-600 dark:text-sky-400 underline">
          Browse all draft quizzes
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Name That Pick</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Three top-5 picks from three different drafts. Can you name them all?
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {picks.map((pick) => {
            const isNamed = correct.has(pick.compositeKey);
            const isMissed = missed.has(pick.compositeKey);
            const revealed = isNamed || isMissed;
            return (
              <div
                key={pick.compositeKey}
                className={`flex items-center p-3 rounded-md border transition-colors duration-300 ${
                  isNamed
                    ? 'bg-sky-500 dark:bg-sky-600 border-sky-600 text-white'
                    : isMissed
                    ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-slate-800 dark:text-slate-100'
                    : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-slate-800 dark:text-slate-100'
                }`}
              >
                <div className="w-20 flex-none">
                  <div className={`font-bold text-lg leading-tight ${revealed ? '' : 'text-slate-500 dark:text-slate-300'}`}>
                    {pick.year}
                  </div>
                  <div className={`text-sm font-semibold ${revealed ? '' : 'text-slate-400 dark:text-slate-400'}`}>
                    Pick #{pick.pickNumber}
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-lg truncate">{revealed ? pick.name : '???'}</div>
                  <div className={`text-sm flex justify-between gap-2 ${revealed ? '' : 'text-slate-500 dark:text-slate-400'}`}>
                    <span className="truncate">{pick.team}</span>
                    <span className="truncate text-right">{pick.school}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {status === 'playing' && (
          <>
            <form onSubmit={handleGuessSubmit} className="mb-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter player name..."
                className="w-full p-3 text-lg border rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600 text-slate-900 dark:text-white"
                autoCapitalize="off"
                autoCorrect="off"
                autoFocus
              />
            </form>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Named {correct.size} of {picks.length}
              </p>
              <button
                onClick={handleGiveUp}
                className="text-sm text-slate-500 dark:text-slate-400 underline hover:text-slate-700 dark:hover:text-slate-200"
              >
                Give up and reveal
              </button>
            </div>
          </>
        )}

        {status === 'done' && (
          <div className="text-center animate-fadeIn">
            <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              You named {correct.size} of {picks.length}
            </p>
            <div className="flex justify-center mb-3">
              <ShareResult shareText={shareText} game="draft_daily" surface="game_end" />
            </div>
            <div className="mb-6">
              <CountdownTimer
                compact
                targetTimeIso={nextMidnightIso}
                label="Next picks in"
                completedText="New picks are live. Refresh to play!"
              />
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span>Name every pick:</span>
              {picks.map((p) => (
                <Link
                  key={p.year}
                  href={`/games/draft-quiz/${p.year}`}
                  className="text-sky-600 dark:text-sky-400 underline hover:text-sky-700"
                >
                  {p.year}
                </Link>
              ))}
              <span className="mx-1">·</span>
              <Link href="/games/draft-quiz" className="text-sky-600 dark:text-sky-400 underline hover:text-sky-700">
                All draft quizzes
              </Link>
            </div>
            <div className="mt-8 w-full max-w-3xl mx-auto px-4 border-t border-gray-200 dark:border-gray-700 pt-8 text-left">
              <DailyChallengesStrip className="" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
