//app/games/draft-quiz/[year]/page.tsx

import type { Metadata } from 'next';
import DraftQuizYearClient from './DraftQuizYearClient';

const MIN_YEAR = 1955;
const MAX_YEAR = 2026;

export function generateStaticParams() {
  return Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => ({
    year: String(MIN_YEAR + i),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} NBA Draft Quiz | Name Every Pick`,
    description: `How many picks from the ${year} NBA Draft can you name? Fill in the first round from memory.`,
  };
}

export default function DraftQuizYearPage() {
  return <DraftQuizYearClient />;
}
