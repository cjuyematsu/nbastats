// app/games/common-teammate/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import CommonTeammateClient from './CommonTeammateClient';
import GameAbout from '@/components/GameAbout';

export const metadata: Metadata = {
  title: 'NBA Common Teammate | Daily Basketball Trivia Game',
  description:
    'A daily NBA trivia game: two stars who never played together, and you have three guesses to name anyone who played with both. Five rounds, new pairs every day.',
  keywords: [
    'nba trivia game',
    'nba teammates quiz',
    'basketball trivia',
    'nba connections game',
    'daily nba game',
    'nba quiz',
  ],
  alternates: {
    canonical: '/games/common-teammate',
  },
};

function Loading() {
  return (
    <div className="w-full rounded-lg flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700">
      <div className="text-center p-10 text-gray-700 dark:text-slate-100">Loading today&apos;s pairs...</div>
    </div>
  );
}

export default function CommonTeammatePage() {
  return (
    <>
      <h1 className="sr-only">NBA Common Teammate</h1>
      <Suspense fallback={<Loading />}>
        <CommonTeammateClient />
      </Suspense>
      <GameAbout
        title="About Common Teammate"
        paragraphs={[
          'Common Teammate flips the connections quiz on its head: instead of linking two players through a chain, you bridge them in one move. Each round shows two NBA players who never shared the court, and any player who suited up with both counts as a correct answer.',
          'There are five rounds a day with three guesses each, and wrong guesses tell you which side of the bridge they connect to. The pairs are generated from real roster history, so every answer actually happened.',
        ]}
      />
    </>
  );
}
