// app/embed/compare/[matchup]/page.tsx
//
// Self-contained comparison widget for third-party iframes. No nav/ads/chart:
// ConditionalChrome renders /embed/* bare. robots:noindex so it never competes
// with the real /compare page.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveMatchupBySlug } from '@/lib/serverStats';
import EmbedAttribution from '@/components/EmbedAttribution';
import { CareerStatsData } from '@/types/stats';

export const revalidate = 86400;
export const metadata: Metadata = { robots: { index: false } };

const fmt = (v: number | null | undefined, d = 1) => (v != null ? v.toFixed(d) : 'N/A');
const fmtPct = (v: number | null | undefined) => (v != null ? `${(v * 100).toFixed(1)}%` : 'N/A');
const fmtInt = (v: number | null | undefined) => (v != null ? v.toLocaleString() : 'N/A');

const ROWS: { label: string; value: (s: CareerStatsData) => string }[] = [
  { label: 'PPG', value: (s) => fmt(s.pts_per_g) },
  { label: 'RPG', value: (s) => fmt(s.trb_per_g) },
  { label: 'APG', value: (s) => fmt(s.ast_per_g) },
  { label: 'FG%', value: (s) => fmtPct(s.fg_pct) },
  { label: '3P%', value: (s) => fmtPct(s.fg3_pct) },
  { label: 'Points', value: (s) => fmtInt(s.pts_total) },
];

export default async function EmbedComparePage({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup: slug } = await params;
  const m = await resolveMatchupBySlug(slug);
  if (!m) notFound();

  const { a, b, pa, pb } = m;
  const sa = pa.stats!;
  const sb = pb.stats!;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-lg font-bold text-center mb-3">
          {a} <span className="text-slate-400">vs</span> {b}
        </h1>
        <table className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-3 py-2 text-right font-semibold">{a}</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Career</th>
              <th className="px-3 py-2 text-left font-semibold">{b}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-1.5 text-right font-mono">{row.value(sa)}</td>
                <td className="px-3 py-1.5 text-center text-xs text-slate-500 dark:text-slate-400">{row.label}</td>
                <td className="px-3 py-1.5 text-left font-mono">{row.value(sb)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <EmbedAttribution href={`/compare/${m.canonicalSlug}`} />
      </div>
    </div>
  );
}
