// app/DailyChallengesStrip.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { useAuth } from '@/app/contexts/AuthContext';
import CountdownTimer from '@/components/CountdownTimer';
import { getLaDateString, getNextLaMidnightIso } from '@/lib/dailyTime';
import {
  DAILY_GAMES,
  DAILY_PROGRESS_EVENT,
  DailyGame,
  DailyProgress,
  computeSiteStreak,
  countCompleted,
  readTodayProgress,
} from '@/lib/dailyProgress';
import { computeDailyStreak } from '@/lib/dailyStreak';
import { readAllLocalStatOuDates } from '@/lib/statOuDaily';
import { readAllLocalDailyResults } from '@/lib/sixDegreesDaily';
import { computeSixDegreesStats } from '@/lib/sixDegreesStats';

const GAMES: { game: DailyGame; label: string; href: string; cta?: string }[] = [
  { game: 'sixDegrees', label: 'Six Degrees', href: '/games/six-degrees/daily' },
  { game: 'statOu', label: 'Stat Over/Under', href: '/games/stat-over-under' },
  { game: 'ranking', label: 'Guess the Ranking', href: '/games/ranking-game' },
  { game: 'oddManOut', label: 'Odd Man Out', href: '/games/odd-man-out' },
  { game: 'draftQuiz', label: 'Name That Pick', href: '/games/draft-quiz/daily' },
  { game: 'top100Vote', label: 'Top 100 Vote', href: '/top-100-players', cta: 'Vote' },
];

function readRunStreak(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const rec = JSON.parse(raw);
    return typeof rec.current_streak === 'number' ? rec.current_streak : 0;
  } catch {
    return 0;
  }
}

export default function DailyChallengesStrip() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [siteStreak, setSiteStreak] = useState(0);
  const [gameStreaks, setGameStreaks] = useState<Partial<Record<DailyGame, number>>>({});
  const nextMidnightIso = useMemo(() => getNextLaMidnightIso(), []);

  useEffect(() => {
    const refresh = () => {
      setProgress(readTodayProgress());
      setSiteStreak(computeSiteStreak());
      const streaks: Partial<Record<DailyGame, number>> = {
        sixDegrees: computeSixDegreesStats(readAllLocalDailyResults(), getLaDateString()).currentStreak,
        statOu: computeDailyStreak(readAllLocalStatOuDates()),
      };
      if (!user) {
        streaks.ranking = readRunStreak('rankingGameGuestStreak_v1');
        streaks.oddManOut = readRunStreak('oddManOutGuestStreak_v1');
      }
      setGameStreaks(streaks);
    };
    refresh();
    setMounted(true);
    window.addEventListener(DAILY_PROGRESS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(DAILY_PROGRESS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user]);

  useEffect(() => {
    if (mounted) track('site_streak', { value: computeSiteStreak() });
  }, [mounted]);

  const done = progress ? countCompleted(progress) : 0;

  return (
    <section id="daily" className="mb-10 scroll-mt-24 text-left">
      {!mounted || !progress ? (
        <>
          <div className="h-7 w-64 mb-3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="flex gap-3 overflow-x-hidden sm:grid sm:grid-cols-3 lg:grid-cols-6">
            {GAMES.map((g) => (
              <div
                key={g.game}
                className="min-w-[9rem] shrink-0 sm:min-w-0 h-[5.25rem] rounded-lg bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 animate-pulse"
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                Today&apos;s Challenges
              </h2>
              <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{done}/{DAILY_GAMES.length}</span>
              {siteStreak > 1 && (
                <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-full px-2 py-0.5">
                  {siteStreak} day streak
                </span>
              )}
            </div>
            <CountdownTimer
              compact
              targetTimeIso={nextMidnightIso}
              label="Resets in"
              completedText="New challenges are live. Refresh!"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible sm:pb-0">
            {GAMES.map(({ game, label, href, cta }) => {
              const isDone = progress[game];
              const streak = gameStreaks[game] ?? 0;
              return (
                <Link
                  key={game}
                  href={href}
                  onClick={() => track('daily_hub_click', { game })}
                  className={`min-w-[9rem] shrink-0 sm:min-w-0 p-4 rounded-lg border transition-all hover:shadow-md ${
                    isDone
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 hover:border-green-400'
                      : 'bg-slate-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:border-sky-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                    {isDone && (
                      <span className="text-green-600 dark:text-green-400 font-bold" aria-label="Done">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {isDone ? (
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">Done</span>
                    ) : (
                      <span className="text-xs font-semibold text-white bg-sky-500 dark:bg-sky-600 rounded-full px-2 py-0.5">
                        {cta ?? 'Play'}
                      </span>
                    )}
                    {streak > 1 && (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {streak} streak
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
