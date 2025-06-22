// app/games/ranking-game/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import RankingGameClient from './RankingGameClient';

export const metadata: Metadata = {
  title: 'NBA Player Ranking Game | Guess the Stat Trivia',
  description: 'Play the NBA Ranking Game! Drag and drop players to rank them by a secret statistical category, then guess what the category was. A fun and challenging trivia game for basketball stats fans.',
  keywords: [
    'nba ranking game',
    'nba player rankings',
    'guess the stat game',
    'basketball stats trivia',
    'nba trivia game',
    'nba player quiz',
    'daily nba game',
  ],
};

function Loading() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen bg-gray-800 rounded-lg shadow-2xl">
        <div className="text-center p-10 text-slate-100">Loading Game...</div>
    </div>
  );
}

export default function RankingGamePage() {
  return (
    <Suspense fallback={<Loading />}>
      <RankingGameClient />
    </Suspense>
  );
}