// components/NextUpCard.tsx
//
// Single-CTA funnel shown on game result screens: daily progress, site
// streak, and one button to the next unplayed daily game.

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import CountdownTimer from '@/components/CountdownTimer';
import { getNextLaMidnightIso } from '@/lib/dailyTime';
import { DAILY_GAMES, DailyGame, GAME_META, pickNextGame } from '@/lib/dailyGames';
import {
  DAILY_PROGRESS_EVENT,
  DailyProgress,
  computeSiteStreak,
  countCompleted,
  readTodayProgress,
} from '@/lib/dailyProgress';

export default function NextUpCard({
  currentGame,
  className = '',
}: {
  currentGame?: DailyGame;
  className?: string;
}) {
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [siteStreak, setSiteStreak] = useState(0);
  const nextMidnightIso = useMemo(() => getNextLaMidnightIso(), []);

  useEffect(() => {
    const refresh = () => {
      setProgress(readTodayProgress());
      setSiteStreak(computeSiteStreak());
    };
    refresh();
    window.addEventListener(DAILY_PROGRESS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(DAILY_PROGRESS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!progress) return null;

  const next = pickNextGame(progress, currentGame);
  const done = countCompleted(progress);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Daily challenges: <span className="text-sky-600 dark:text-sky-400">{done}/{DAILY_GAMES.length}</span>
        </span>
        {siteStreak > 1 && (
          <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-full px-2 py-0.5">
            {siteStreak} day streak
          </span>
        )}
      </div>
      {next ? (
        <Link
          href={GAME_META[next].href}
          onClick={() => track('next_up_click', { from: currentGame ?? 'none', to: next })}
          className="px-5 py-2 rounded-lg bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 text-white font-semibold transition-colors"
        >
          Next: {GAME_META[next].label}
        </Link>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
            All done for today
          </span>
          <CountdownTimer
            compact
            targetTimeIso={nextMidnightIso}
            label="Resets in"
            completedText="New challenges are live. Refresh!"
          />
          <Link href="/games" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
            All games
          </Link>
        </div>
      )}
    </div>
  );
}
