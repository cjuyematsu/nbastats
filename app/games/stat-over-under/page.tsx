// app/games/stat-over-under/page.tsx

import type { Metadata } from 'next';
import SelectEraClient from './SelectEraClient';
import GameAbout from '@/components/GameAbout';

export const metadata: Metadata = {
  title: 'NBA Stat Over/Under Game | Daily Basketball Trivia Challenge',
  description: 'Play the daily NBA Stat Over/Under game. Choose an era and guess if a player\'s stats land over or under the line. A fun trivia challenge for NBA fans.',
  keywords: [
    'nba trivia game',
    'stat over/under',
    'basketball stats game',
    'nba knowledge test',
    'daily nba game',
    'player stats trivia',
    'nba trivia questions',
    'basketball trivia',
    'nba trivia'
  ],
};

export default function StatOverUnderPage() {
  return (
    <>
      <SelectEraClient />
      <GameAbout
        title="About Stat Over/Under"
        paragraphs={[
          'Stat Over/Under is a daily NBA guessing game: you get a player, a stat, and a line, and you call over or under. Every question is built on real regular-season numbers.',
          'Pick the modern era or go back through the decades. Correct calls build your streak, and finishing a round counts toward your site-wide daily challenge streak, no account needed.',
        ]}
      />
    </>
  );
}