//games/stat-over-under/[era]/page.tsx

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StatOverUnderEraClient from './StatOverUnderEraClient';

const ERA_NAMES: Record<string, string> = {
  modern: 'Modern Era (2011-2025)',
  '2000s': '2000s (2001-2010)',
  '1990s': '1990s (1991-2000)',
  '1980s': '1980s (1980-1990)',
};

export function generateStaticParams() {
  return Object.keys(ERA_NAMES).map((era) => ({ era }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ era: string }>;
}): Promise<Metadata> {
  const { era } = await params;
  const eraName = ERA_NAMES[era];
  if (!eraName) {
    return { title: 'NBA Stat Over/Under' };
  }
  return {
    title: `NBA Stat Over/Under: ${eraName}`,
    description: `Daily NBA Stat Over/Under for the ${eraName}: guess whether real player stat lines land over or under. New challenge every day.`,
  };
}

export default async function StatOverUnderEraPage({
  params,
}: {
  params: Promise<{ era: string }>;
}) {
  const { era } = await params;
  const eraName = ERA_NAMES[era];
  if (!eraName) notFound();
  return (
    <>
      <h1 className="sr-only">NBA Stat Over/Under: {eraName}</h1>
      <StatOverUnderEraClient />
    </>
  );
}
