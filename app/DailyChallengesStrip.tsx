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
import { GAME_META } from '@/lib/dailyGames';
import { readAllLocalStatOuDates } from '@/lib/statOuDaily';
import { readAllLocalDailyResults } from '@/lib/sixDegreesDaily';
import { computeSixDegreesStats } from '@/lib/sixDegreesStats';
import { buildDailySevenShare } from '@/lib/shareText';
import ShareResult from '@/components/ShareResult';
import { COLLECTION_EVENT, countCollection, readCollection } from '@/lib/collection';

const GAMES: { game: DailyGame; label: string; href: string }[] = DAILY_GAMES.map((game) => ({
  game,
  ...GAME_META[game],
}));

export default function DailyChallengesStrip({
  className = 'mb-10 scroll-mt-24',
}: { className?: string } = {}) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [siteStreak, setSiteStreak] = useState(0);
  const [gameStreaks, setGameStreaks] = useState<Partial<Record<DailyGame, number>>>({});
  const [collectedCount, setCollectedCount] = useState(0);
  const nextMidnightIso = useMemo(() => getNextLaMidnightIso(), []);

  useEffect(() => {
    const refresh = () => {
      setProgress(readTodayProgress());
      setSiteStreak(computeSiteStreak());
      setCollectedCount(countCollection(readCollection()).collected);
      const streaks: Partial<Record<DailyGame, number>> = {
        sixDegrees: computeSixDegreesStats(readAllLocalDailyResults(), getLaDateString()).currentStreak,
        statOu: computeDailyStreak(readAllLocalStatOuDates()),
      };
      setGameStreaks(streaks);
    };
    refresh();
    setMounted(true);
    window.addEventListener(DAILY_PROGRESS_EVENT, refresh);
    window.addEventListener(COLLECTION_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(DAILY_PROGRESS_EVENT, refresh);
      window.removeEventListener(COLLECTION_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user]);

  useEffect(() => {
    if (mounted) track('site_streak', { value: computeSiteStreak() });
  }, [mounted]);

  const done = progress ? countCompleted(progress) : 0;

  return (
    <section id="daily" className={`text-left ${className}`}>
      {!mounted || !progress ? (
        <>
          <div className="h-7 w-64 mb-3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="flex gap-3 overflow-x-hidden sm:grid sm:grid-cols-4 lg:grid-cols-7">
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
              {collectedCount > 0 && (
                <Link
                  href="/collection"
                  className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 rounded-full px-2 py-0.5 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                >
                  {collectedCount} collected
                </Link>
              )}
            </div>
            <CountdownTimer
              compact
              targetTimeIso={nextMidnightIso}
              label="Resets in"
              completedText="New challenges are live. Refresh!"
            />
          </div>
          {done === DAILY_GAMES.length && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Perfect day: all {DAILY_GAMES.length} challenges done. New puzzles at midnight.
              </p>
              <ShareResult
                shareText={buildDailySevenShare({ completed: done, total: DAILY_GAMES.length, streak: siteStreak })}
                game="dailySeven"
                surface="home_strip"
                label="Share your day"
              />
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible sm:pb-0">
            {GAMES.map(({ game, label, href }) => {
              const isDone = progress[game];
              const streak = gameStreaks[game] ?? 0;
              return (
                <Link
                  key={game}
                  href={href}
                  onClick={() => track('daily_hub_click', { game })}
                  className={`min-w-[9rem] shrink-0 sm:min-w-0 p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md ${
                    isDone
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 hover:border-green-400'
                      : 'bg-slate-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:border-sky-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="min-w-0 break-words text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                    {isDone && (
                      <span className="shrink-0 leading-none text-green-600 dark:text-green-400 font-bold" aria-label="Done">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {isDone ? (
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">Done</span>
                    ) : (
                      <span className="text-xs font-semibold text-white bg-sky-500 dark:bg-sky-600 rounded-full px-2 py-0.5">
                        Play
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
