// app/games/stat-over-under/page.tsx

import type { Metadata } from 'next';
import SelectEraClient from './SelectEraClient';

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
  return <SelectEraClient />;
}