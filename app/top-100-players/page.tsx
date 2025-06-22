// app/top-100-players/page.tsx

import type { Metadata } from 'next';
import Top100PlayersClient from './Top100PlayersClient';

export const revalidate = 3600; 

export const metadata: Metadata = {
  title: 'NBA Player Rankings 2025: Top 100 Best Players & Stats',
  description: 'View the official Top 100 NBA player rankings for 2025. Compare NBA player stats, vote on the best players in the league, and see who rises to the top. Your vote helps shape the list!',
  keywords: [
    'top 100 nba players',
    'nba player rankings',
    'best nba players',
    'nba player rankings 2025',
    'top nba players',
    'nba player stats',
    'nba statistics',
    'nba stat leaders',
    'compare nba players',
    'nba player comparison',
    'fan-voted nba rankings',
    'official nba rankings',
  ],
};

export default async function Top100PlayersPage() {
  return (
    <>
      <Top100PlayersClient/>
    </>
  );
}