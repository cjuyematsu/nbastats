// app/games/six-degrees/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import SixDegreesLobbyClient from './SixDegreesLobbyClient';
import GameAbout from '@/components/GameAbout';

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
        <div className="w-full flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-800 text-gray-800 dark:text-slate-100 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xl text-gray-600 dark:text-slate-300">Loading Game...</p>
        </div>
    );
}

export default function SixDegreesPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <SixDegreesLobbyClient />
      </Suspense>
      <GameAbout
        title="About Six Degrees of NBA"
        paragraphs={[
          'Six Degrees of NBA is the basketball version of the Kevin Bacon game: connect any two players through a chain of shared teammates, in six hops or fewer.',
          'Over 5,000 players are linked through real rosters. Play the daily matchup, or generate a random pair and see how short you can make the chain.',
        ]}
      />
    </>
  );
}