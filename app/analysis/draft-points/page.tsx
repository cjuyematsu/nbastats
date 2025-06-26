// app/analysis/draft-points/page.tsx

import type { Metadata } from 'next';
import DraftPointsClient from './DraftPointsClient';

export const metadata: Metadata = {
  title: 'NBA Draft Analysis: Top Scorers by Pick',
  description: 'Explore an in-depth analysis of the top-scoring NBA players based on their draft pick number. See which draft positions have historically produced the most points.',
  keywords: ['NBA draft', 'draft analysis', 'NBA top scorers', 'basketball stats', 'draft pick value', 'player points'],
};

export default function DraftPointsPage() {
  return <DraftPointsClient />;
}
