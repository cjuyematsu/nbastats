// app/compare/[matchup]/page.tsx

import React, { Suspense, cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PlayerComparisonChart from '@/components/PlayerComparisonChart';
import ShareResult from '@/components/ShareResult';
import AdSlot from '@/components/AdSlot';
import { COMPARE_MATCHUPS, findMatchup, relatedMatchups } from '@/app/data/compareMatchups';
import { buildCompareShare } from '@/lib/shareText';
import { CareerStatsData, PlayerSuggestion } from '@/types/stats';

export const revalidate = 86400;

export function generateStaticParams() {
  return COMPARE_MATCHUPS.map((m) => ({ matchup: m.slug }));
}

type ResolvedPlayer = {
  suggestion: PlayerSuggestion;
  stats: CareerStatsData | null;
};

const getPlayerByName = cache(async (name: string): Promise<ResolvedPlayer | null> => {
  try {
    const { data } = await supabase.rpc('get_player_suggestions', { search_term: name });
    const p = data && data.length > 0 ? (data[0] as PlayerSuggestion) : null;
    if (!p) return null;
    const { data: s } = await supabase.rpc('calculate_player_career_stats', { p_person_id: p.personId });
    return { suggestion: p, stats: s && s.length > 0 ? (s[0] as CareerStatsData) : null };
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchup: string }>;
}): Promise<Metadata> {
  const { matchup: slug } = await params;
  const found = findMatchup(slug);
  if (!found || found.reversed) return { title: 'Player Comparison', robots: { index: false } };

  const { a, b } = found.matchup;
  const [pa, pb] = await Promise.all([getPlayerByName(a), getPlayerByName(b)]);
  const ppgLine = (name: string, p: ResolvedPlayer | null) =>
    p?.stats?.pts_per_g != null ? `${name} (${p.stats.pts_per_g.toFixed(1)} PPG)` : name;

  const title = `${a} vs ${b}: NBA Career Stats Comparison`;
  const description = `Compare ${ppgLine(a, pa)} and ${ppgLine(b, pb)} side by side: points, rebounds, assists, shooting percentages, and season-by-season curves.`;

  return {
    title,
    description,
    alternates: { canonical: `/compare/${found.matchup.slug}` },
    openGraph: { title, description },
  };
}

const fmt = (v: number | null | undefined, d = 1) => (v != null ? v.toFixed(d) : 'N/A');
const fmtPct = (v: number | null | undefined) => (v != null ? `${(v * 100).toFixed(1)}%` : 'N/A');
const fmtInt = (v: number | null | undefined) => (v != null ? v.toLocaleString() : 'N/A');

const TABLE_ROWS: { label: string; value: (s: CareerStatsData) => string }[] = [
  { label: 'Games Played', value: (s) => fmtInt(s.games_played) },
  { label: 'Career Points', value: (s) => fmtInt(s.pts_total) },
  { label: 'Points Per Game', value: (s) => fmt(s.pts_per_g) },
  { label: 'Rebounds Per Game', value: (s) => fmt(s.trb_per_g) },
  { label: 'Assists Per Game', value: (s) => fmt(s.ast_per_g) },
  { label: 'Field Goal %', value: (s) => fmtPct(s.fg_pct) },
  { label: '3-Point %', value: (s) => fmtPct(s.fg3_pct) },
  { label: 'True Shooting %', value: (s) => fmtPct(s.ts_pct) },
];

export default async function CompareMatchupPage({
  params,
}: {
  params: Promise<{ matchup: string }>;
}) {
  const { matchup: slug } = await params;
  const found = findMatchup(slug);
  if (!found) notFound();
  if (found.reversed) permanentRedirect(`/compare/${found.matchup.slug}`);

  const { a, b } = found.matchup;
  const [pa, pb] = await Promise.all([getPlayerByName(a), getPlayerByName(b)]);
  const sa = pa?.stats ?? null;
  const sb = pb?.stats ?? null;
  const years = (s: CareerStatsData | null) =>
    s?.startYear && s?.endYear ? ` (${s.startYear}-${s.endYear})` : '';

  const related = relatedMatchups(found.matchup);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl md:text-5xl">
            {a} vs {b}
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300">
            Career statistics for {a}{years(sa)} and {b}{years(sb)} side by side, with an
            interactive chart to compare any stat by age across regular season and playoffs.
          </p>
        </header>

        {(sa || sb) && (
          <section className="max-w-3xl mx-auto mb-10">
            <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-slate-600">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                <thead className="bg-gray-50 dark:bg-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Career</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">{a}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">{b}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600">
                  {TABLE_ROWS.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{row.label}</td>
                      <td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">{sa ? row.value(sa) : 'N/A'}</td>
                      <td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">{sb ? row.value(sb) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <Suspense fallback={<div className="text-center p-10">Loading Comparison Chart...</div>}>
          <PlayerComparisonChart initialPlayerNames={[a, b]} />
        </Suspense>

        <AdSlot slot="matchup-page" className="mt-8 max-w-4xl mx-auto" />

        <section className="mt-12 text-left max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <ShareResult
              shareText={buildCompareShare({
                nameA: a,
                nameB: b,
                url: `hoopsdata.net/compare/${found.matchup.slug}`,
              })}
              game="compare"
              surface="matchup_page"
              className="inline-flex items-center justify-center rounded-lg bg-green-500 hover:bg-green-600 dark:bg-[rgb(60,192,103)] dark:hover:bg-green-400 text-white text-sm font-semibold px-4 py-1.5 transition-all"
            />
            {pa && (
              <Link href={`/player/${pa.suggestion.personId}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                {a} career stats
              </Link>
            )}
            {pb && (
              <Link href={`/player/${pb.suggestion.personId}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                {b} career stats
              </Link>
            )}
            <Link href="/compare" className="text-sky-600 dark:text-sky-400 hover:underline">
              Compare any two players
            </Link>
          </div>

          {related.length > 0 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">More Comparisons</h2>
              <div className="flex flex-wrap gap-4">
                {related.map((m) => (
                  <Link key={m.slug} href={`/compare/${m.slug}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                    {m.a} vs {m.b}
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
