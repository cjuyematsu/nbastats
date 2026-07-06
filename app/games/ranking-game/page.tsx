// app/games/ranking-game/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import RankingGameClient from './RankingGameClient';
import GameAbout from '@/components/GameAbout';

export const metadata: Metadata = {
  title: 'NBA Player Ranking Game | Guess the Stat Trivia',
  description: 'Play the NBA Ranking Game. Drag and drop players to rank them by a secret stat category, then guess the category. A fun trivia game for basketball fans.',
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
    <div className="w-full flex flex-col items-center justify-center min-h-screen bg-gray-800 rounded-lg">
        <div className="text-center p-10 text-slate-100">Loading Game...</div>
    </div>
  );
}

export default function RankingGamePage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <RankingGameClient />
      </Suspense>
      <GameAbout
        title="About Guess the Ranking"
        paragraphs={[
          'Guess the Ranking is a daily NBA puzzle: drag five players into the correct order for a hidden stat category, then guess what the category was.',
          'Green means a player is in the right spot, yellow means one away. A new board drops every day and streaks are tracked whether or not you sign in.',
        ]}
      />
    </>
  );
}