// app/degrees-of-separation/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import DegreesOfSeparationClient from './DegreesOfSeparationClient';

export const metadata: Metadata = {
  title: 'NBA Degrees of Separation | Player Connections',
  description: 'Explore how any two NBA players are connected through shared teammates. Visualize the path and find their degrees of separation in the NBA network.',
  keywords: [
    'degrees of separation',
    'six degrees',
    'six degrees of kevin bacon',
    'nba player connection',
    'nba player comparison tool',
    'nba analytics',
    'nba data visualization',
    'compare nba players',
    'nba stats',
    'nba player network',
    'teammate finder',
  ],
};

function LoadingState() {
  return (
    <div className="w-full bg-gray-800 text-slate-100">
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl text-slate-300">Loading connection analysis tool...</p>
      </div>
    </div>
  );
}

export default function DegreesOfSeparationPage() {
  return (
    <>
      <h1 className="text-3xl sm:text-4xl font-bold text-center text-sky-500 dark:text-sky-400 pt-6 pb-2">
        NBA Degrees of Separation
      </h1>
      <Suspense fallback={<LoadingState />}>
        <DegreesOfSeparationClient />
      </Suspense>
    </>
  );
}