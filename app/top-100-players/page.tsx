// app/top-100-players/page.tsx

import type { Metadata } from 'next';
import Top100PlayersClient from './Top100PlayersClient';

export const revalidate = 3600; 

export const metadata: Metadata = {
  title: 'Top 100 NBA Players 2026: Vote To Change Rankings',
  description: 'View and vote on the Top 100 NBA player rankings for 2026. No sign-in required! Compare NBA player stats, nominate players, and see who rises to the top. Updated weekly based on fan votes.',
  keywords: [
    'top 100 nba players',
    'top 100 nba players 2026',
    'top 100 nba players 2025',
    'nba player rankings',
    'best nba players',
    'nba player rankings 2026',
    'top nba players',
    'nba player stats',
    'nba statistics',
    'nba stat leaders',
    'compare nba players',
    'nba player comparison',
    'fan-voted nba rankings',
    'nba top 100',
    'top 100 players nba',
  ],
  alternates: {
    canonical: '/top-100-players',
  },
  openGraph: {
    title: 'Top 100 NBA Players 2026 | Fan-Voted Rankings',
    description: 'Vote on the Top 100 NBA players for 2026. No sign-in required. Rankings update weekly based on fan votes.',
    url: '/top-100-players',
  },
};

export default async function Top100PlayersPage() {
  return (
    <>
      <Top100PlayersClient/>
    </>
  );
}