// app/embed/duos/[slug]/page.tsx
//
// Self-contained "did they play together?" widget for third-party iframes.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveDuoBySlug } from '@/lib/serverStats';
import { parseRecord } from '@/lib/duos';
import EmbedAttribution from '@/components/EmbedAttribution';

export const revalidate = 86400;
export const metadata: Metadata = { robots: { index: false } };

export default async function EmbedDuoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveDuoBySlug(slug);
  if (!resolved) notFound();

  const { data, canonicalSlug } = resolved;
  const { a, b, row } = data;
  const record = parseRecord(row!.SharedGamesRecord);
  const winPct =
    record && record.wins + record.losses > 0
      ? ((record.wins / (record.wins + record.losses)) * 100).toFixed(1)
      : null;

  const stat = (value: string, label: string) => (
    <div className="text-center">
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-lg font-bold text-center mb-1">
          {a.name} &amp; {b.name}
        </h1>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-4">Played together in the NBA</p>
        <div className="flex flex-wrap justify-around gap-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 p-4">
          {stat(row!.SharedGamesTotal?.toLocaleString() ?? 'N/A', 'Games')}
          {stat(row!.SharedGamesRecord ?? 'N/A', 'Record')}
          {winPct && stat(`${winPct}%`, 'Win %')}
          {row!.CombinedPtsPerGame != null && stat(row!.CombinedPtsPerGame.toFixed(1), 'Comb. PPG')}
        </div>
        <EmbedAttribution href={`/duos/${canonicalSlug}`} />
      </div>
    </div>
  );
}
