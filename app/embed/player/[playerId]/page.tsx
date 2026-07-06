// app/embed/player/[playerId]/page.tsx
//
// Self-contained single-player stat card for third-party iframes.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCareerStats, getPlayoffStats } from '@/lib/serverStats';
import EmbedAttribution from '@/components/EmbedAttribution';

export const revalidate = 86400;
export const metadata: Metadata = { robots: { index: false } };

export default async function EmbedPlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const id = Number(playerId);
  if (!Number.isFinite(id)) notFound();

  const [regular, playoffs] = await Promise.all([getCareerStats(id), getPlayoffStats(id)]);
  const player = regular ?? playoffs;
  if (!player) notFound();

  const name = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();
  const years = player.startYear && player.endYear ? `${player.startYear} - ${player.endYear}` : '';

  const stat = (value: number | null, label: string) => (
    <div className="text-center">
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value != null ? value.toFixed(1) : 'N/A'}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-center text-sky-600 dark:text-sky-400">{name}</h1>
        {years && <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-4">Career {years}</p>}
        <div className="flex flex-wrap justify-around gap-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 p-4 mt-2">
          {stat(player.pts_per_g, 'PPG')}
          {stat(player.trb_per_g, 'RPG')}
          {stat(player.ast_per_g, 'APG')}
        </div>
        <EmbedAttribution href={`/player/${id}`} />
      </div>
    </div>
  );
}
