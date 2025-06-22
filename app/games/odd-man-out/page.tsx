// app/games/odd-man-out/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import OddManOutClient from './OddManOutClient';

export const metadata: Metadata = {
  title: 'NBA Odd Man Out | Basketball Trivia Game',
  description: "Play Odd Man Out, the NBA trivia game! Three players share a common bond from before their draft—can you spot the one who doesn't belong? Test your basketball knowledge and build your streak.",
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
    <div className="w-full rounded-lg shadow-2xl flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white">
      <div className="text-center p-10 text-slate-100">Loading New Round...</div>
    </div>
  );
}

export default function OddManOutPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OddManOutClient />
    </Suspense>
  );
}