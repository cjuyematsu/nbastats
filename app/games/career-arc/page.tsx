// app/games/career-arc/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import CareerArcClient from './CareerArcClient';
import GameAbout from '@/components/GameAbout';

export const metadata: Metadata = {
  title: 'NBA Career Arc | Guess the Player by Scoring Curve',
  description:
    'A daily NBA guessing game: one mystery player, one unlabeled points-per-game curve across their whole career. Read the shape, use the hints, name the player in five guesses.',
  keywords: [
    'nba guessing game',
    'guess the nba player',
    'nba daily game',
    'nba career stats game',
    'nba trivia',
    'basketball guessing game',
  ],
  alternates: {
    canonical: '/games/career-arc',
  },
};

function Loading() {
  return (
    <div className="w-full rounded-lg flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700">
      <div className="text-center p-10 text-gray-700 dark:text-slate-100">Loading today&apos;s arc...</div>
    </div>
  );
}

export default function CareerArcPage() {
  return (
    <>
      <h1 className="sr-only">NBA Career Arc</h1>
      <Suspense fallback={<Loading />}>
        <CareerArcClient />
      </Suspense>
      <GameAbout
        title="About Career Arc"
        paragraphs={[
          'Career Arc is a daily NBA guessing game built on the shape of a career. You see one mystery player\'s points per game for every season they played, with the years hidden, and you have five guesses to name them.',
          'Each wrong guess unlocks a real clue: where they were drafted, the teams they played for, the teammate they shared the most games with, and where they played before the NBA. One new player every day, the same puzzle for everyone.',
        ]}
      />
    </>
  );
}
