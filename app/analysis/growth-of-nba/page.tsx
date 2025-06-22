// app/analysis/growth-of-nba/page.tsx

import type { Metadata } from 'next';
import GrowthPageClient from './GrowthPageClient'; // Import the new client component

// Metadata correctly lives in the Server Component
export const metadata: Metadata = {
  title: 'The Growth of the NBA: Salary & Viewership Statistics by Year',
  description: 'A data-driven analysis of the NBA\'s growth. Explore trends in NBA player salaries since 1990 and see NBA Finals viewership statistics by year.',
};

// This is now a simple Server Component that renders your client component
export default function GrowthAnalysisPage() {
  return <GrowthPageClient />;
}