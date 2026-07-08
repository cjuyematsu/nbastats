// app/games/odd-man-out/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import OddManOutClient from './OddManOutClient';
import GameAbout from '@/components/GameAbout';

export const metadata: Metadata = {
  title: 'NBA Odd Man Out | Basketball Trivia Game',
  description: "Play Odd Man Out, the NBA trivia game. Three players share a pre-draft bond. Can you spot the one who doesn't belong? Test your knowledge and build a streak.",
  keywords: [
    'nba odd one out',
    'nba trivia game',
    'basketball trivia',
    'nba player history',
    'which player doesn\'t belong',
    'nba quiz',
    'daily nba game',
    'nba trivia'
  ],
};

function Loading() {
  return (
    <div className="w-full rounded-lg flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white">
      <div className="text-center p-10 text-slate-100">Loading New Round...</div>
    </div>
  );
}

export default function OddManOutPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-sky-600 dark:text-sky-400 text-center pt-6 pb-2">
        Odd Man Out
      </h1>
      <Suspense fallback={<Loading />}>
        <OddManOutClient />
      </Suspense>
      <GameAbout
        title="About Odd Man Out"
        paragraphs={[
          'Odd Man Out is an NBA connections-style game: a group of players shares something in common, and one does not belong. Spot the odd man out before your guesses run dry.',
          'A new round is generated every day from real rosters and teammate history, so the connections come from what actually happened on the court.',
        ]}
      />
    </>
  );
}