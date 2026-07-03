// app/games/six-degrees/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import SixDegreesLobbyClient from './SixDegreesLobbyClient';

export const metadata: Metadata = {
  title: 'Six Degrees of NBA | The Ultimate Player Connection Game',
  description: 'Play Six Degrees of NBA: connect any two players through a chain of former teammates. Try the daily challenge or a random game and track your stats.',
  keywords: [
    'six degrees of separation',
    'six degrees game',
    'nba trivia game',
    'nba trivia',
    'nba player connections',
    'basketball trivia',
    'daily nba game',
    'nba stats game',
    'kevin bacon game nba',
  ],
};

function Loading() {
    return (
        <div className="w-full flex flex-col items-center justify-center min-h-screen bg-gray-800 text-slate-100 rounded-lg">
            <p className="text-xl text-slate-300">Loading Game...</p>
        </div>
    );
}

export default function SixDegreesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SixDegreesLobbyClient />
    </Suspense>
  );
}