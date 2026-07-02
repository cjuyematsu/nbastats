// app/duos/page.tsx

import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import DuosClient from './DuosClient';

export const metadata: Metadata = {
  title: 'NBA Duos: Games, Record & Teams Together',
  description:
    'Pick any two NBA teammates and see how they performed together: games played side by side, their win-loss record as a duo, shared teams, and years together.',
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
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-screen border border-gray-200 dark:border-gray-700">
      <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
        <DuosClient />
      </Suspense>
    </div>
  );
}
