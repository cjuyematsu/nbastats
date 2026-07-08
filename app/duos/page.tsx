// app/duos/page.tsx

import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import DuosClient from './DuosClient';
import { DUO_PAGES } from '@/app/data/duoPages';

export const metadata: Metadata = {
  title: 'NBA Duos: Games, Record & Teams Together',
  description:
    'See how any two NBA teammates performed together: games played side by side, their win-loss record as a duo, shared teams, and years together.',
  keywords: ['nba duos', 'nba teammates record', 'games played together nba', 'best nba duos', 'nba duo stats'],
  alternates: {
    canonical: '/duos',
  },
  openGraph: {
    title: 'NBA Duos: Games, Record & Teams Together',
    description:
      'See how any two NBA teammates performed together: games, win-loss record, and shared teams.',
    url: '/duos',
  },
};

export default function DuosPage() {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <header className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          NBA Duos
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-slate-600 dark:text-slate-300">
          Pick any two players who shared a locker room and see how they did together:
          games played, win-loss record, and every team they suited up for side by side.
        </p>
      </header>
      <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
        <DuosClient />
      </Suspense>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <section className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Famous NBA Duos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {DUO_PAGES.slice(0, 24).map((d) => (
              <Link key={d.slug} href={`/duos/${d.slug}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                {d.a} &amp; {d.b}
              </Link>
            ))}
          </div>
          <p className="mt-4">
            <Link href="/duos/all" className="font-semibold text-sky-600 dark:text-sky-400 hover:underline">
              Browse all duos &rarr;
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
