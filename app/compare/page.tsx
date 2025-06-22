// app/compare/page.tsx

import React, { Suspense } from 'react';
import PlayerComparisonChart from '@/components/PlayerComparisonChart';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NBA Player Comparison Tool | Compare Stats Side-by-Side',
  description: 'Use our free NBA player comparison tool to compare careers. Settle the debate on who is better by comparing stats like PPG, RPG, APG, and advanced metrics by age.',
};


export default function ComparePlayersPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl md:text-6xl">
          NBA Player Comparison Tool
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300">
          Ever debated whether LeBron James or Michael Jordan had a better season at age 28? Our player comparison tool lets you compare NBA players&apos; stats side-by-side across their entire careers. Select up to five players, choose a statistic, and see how they stack up.
        </p>
      </header>

      <Suspense fallback={<div className="text-center p-10">Loading Comparison Chart...</div>}>
        <PlayerComparisonChart />
      </Suspense>

      <section className="mt-12 text-left max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">How to Compare Players</h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-400">
            <li><strong>Select Players:</strong> Start typing a player&apos;s name in one of the search boxes above.</li>
            <li><strong>Choose a Statistic:</strong> Pick from a wide range of stats like Points Per Game (PPG), Assists (APG), or advanced metrics like True Shooting % (TS%).</li>
            <li><strong>Select Season Type:</strong> Toggle between Regular Season and Playoffs to see performance in different contexts.</li>
            <li><strong>Analyze the Chart:</strong> The chart displays each player&apos;s performance by age, making it easy to see peaks, declines, and breakout seasons.</li>
        </ol>

        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-10 mb-4">Popular Comparisons</h2>
        <p className="text-slate-700 dark:text-slate-400 mb-4">
          Check out some commonly debated matchups in NBA history. 
        </p>
        <div className="flex flex-wrap gap-4">
            <Link href="/compare?players=LeBron+James,Michael+Jordan" className="text-sky-600 dark:text-sky-400 hover:underline">LeBron James vs Michael Jordan</Link>
            <Link href="/compare?players=Kobe+Bryant,Tim+Duncan" className="text-sky-600 dark:text-sky-400 hover:underline">Kobe Bryant vs Tim Duncan</Link>
            <Link href="/compare?players=Larry+Bird,Magic+Johnson" className="text-sky-600 dark:text-sky-400 hover:underline">Larry Bird vs Magic Johnson</Link>
            <Link href="/compare?players=Shaquille+O'Neal,Hakeem+Olajuwon" className="text-sky-600 dark:text-sky-400 hover:underline">Shaquille O&apos;Neal vs Hakeem Olajuwon</Link>
        </div>
      </section>
    </div>
  );
}