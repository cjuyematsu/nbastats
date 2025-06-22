// app/degrees-of-separation/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import DegreesOfSeparationClient from './DegreesOfSeparationClient';

export const metadata: Metadata = {
  title: 'NBA Six Degrees of Separation | Player Connection Analysis Tool',
  description: "An analytics tool to explore the connections between any two NBA players through their shared teammates. Visualize the path and discover the 'Degrees of Separation' in the NBA network.",
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
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-sky-400">
          NBA Degrees of Separation
        </h1>
        <p className="text-xl text-slate-300">Loading connection analysis tool...</p>
      </div>
    </div>
  );
}

export default function DegreesOfSeparationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DegreesOfSeparationClient />
    </Suspense>
  );
}