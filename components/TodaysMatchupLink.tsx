// components/TodaysMatchupLink.tsx
//
// Date-dependent, so it renders client-side only (same reason HomeCompareHero
// evaluates getTodaysMatchup in the browser).

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { getTodaysMatchup, type FeaturedMatchup } from '@/app/data/featuredMatchups';
import { buildCompareSlug } from '@/app/data/compareMatchups';

export default function TodaysMatchupLink({
  variant = 'inline',
  className = '',
}: {
  variant?: 'inline' | 'banner';
  className?: string;
}) {
  const [matchup, setMatchup] = useState<FeaturedMatchup | null>(null);

  useEffect(() => {
    setMatchup(getTodaysMatchup());
  }, []);

  if (!matchup) return null;

  const href = `/compare/${buildCompareSlug(matchup.a, matchup.b)}`;
  const onClick = () => track('todays_matchup_click', { surface: variant });

  if (variant === 'banner') {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Today&apos;s featured matchup:
        </span>
        <Link href={href} onClick={onClick} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline">
          {matchup.a} vs {matchup.b}
        </Link>
      </div>
    );
  }

  return (
    <p className={`text-sm text-slate-600 dark:text-slate-400 ${className}`}>
      Today&apos;s featured matchup:{' '}
      <Link href={href} onClick={onClick} className="font-semibold text-sky-600 dark:text-sky-400 hover:underline">
        {matchup.a} vs {matchup.b}
      </Link>
    </p>
  );
}
