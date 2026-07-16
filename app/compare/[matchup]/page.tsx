// app/compare/[matchup]/page.tsx

import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import PlayerComparisonChart from '@/components/PlayerComparisonChart';
import ShareResult from '@/components/ShareResult';
import AdSlot from '@/components/AdSlot';
import { COMPARE_MATCHUPS, relatedMatchups } from '@/app/data/compareMatchups';
import { buildCompareShare } from '@/lib/shareText';
import { resolveMatchupBySlug, type ResolvedPlayer } from '@/lib/serverStats';
import { CareerStatsData } from '@/types/stats';
import TodaysMatchupLink from '@/components/TodaysMatchupLink';
import { breadcrumbLd } from '@/lib/jsonLd';

export const revalidate = 7776000;

export function generateStaticParams() {
  return COMPARE_MATCHUPS.map((m) => ({ matchup: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchup: string }>;
}): Promise<Metadata> {
  const { matchup: slug } = await params;
  const resolved = await resolveMatchupBySlug(slug);
  if (!resolved) return { title: 'Player Comparison', robots: { index: false } };

  const { a, b, pa, pb, canonicalSlug } = resolved;
  const ppgLine = (name: string, p: ResolvedPlayer | null) =>
    p?.stats?.pts_per_g != null ? `${name} (${p.stats.pts_per_g.toFixed(1)} PPG)` : name;

  const title = `${a} vs ${b}: NBA Career Stats`;
  const ogTitle = `${a} vs ${b}: NBA Career Stats Comparison`;
  const description = `Compare ${ppgLine(a, pa)} and ${ppgLine(b, pb)} side by side: points, rebounds, assists, shooting percentages, and season-by-season curves.`;

  const canonical = `/compare/${canonicalSlug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { title: ogTitle, description },
  };
}

export default async function CompareMatchupPage({
  params,
}: {
  params: Promise<{ matchup: string }>;
}) {
  const { matchup: slug } = await params;
  const resolved = await resolveMatchupBySlug(slug);
  if (!resolved) notFound();
  if (slug !== resolved.canonicalSlug) permanentRedirect(`/compare/${resolved.canonicalSlug}`);

  const { a, b, pa, pb, canonicalSlug } = resolved;
  const sa = pa?.stats ?? null;
  const sb = pb?.stats ?? null;
  const years = (s: CareerStatsData | null) =>
    s?.startYear && s?.endYear ? ` (${s.startYear}-${s.endYear})` : '';

  const related = relatedMatchups({ slug: canonicalSlug, a, b });

  // Breadcrumb + the two players as linked entities, so the compare graph ties
  // back to each player's canonical page. Name + url only — no unverified claims.
  const jsonLd = [
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Comparison Tool', path: '/compare' },
      { name: `${a} vs ${b}`, path: `/compare/${canonicalSlug}` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: a,
      url: `https://hoopsdata.net/player/${pa.suggestion.personId}`,
      jobTitle: 'Professional Basketball Player',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: b,
      url: `https://hoopsdata.net/player/${pb.suggestion.personId}`,
      jobTitle: 'Professional Basketball Player',
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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

        <Suspense fallback={<div className="text-center p-10">Loading Comparison Chart...</div>}>
          <PlayerComparisonChart
            initialPlayers={[pa.suggestion, pb.suggestion]}
            initialStats={{ [pa.suggestion.personId]: sa, [pb.suggestion.personId]: sb }}
          />
        </Suspense>

        <AdSlot slot="matchup-page" className="mt-8 max-w-4xl mx-auto" />

        <section className="mt-12 text-left max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <ShareResult
              shareText={buildCompareShare({
                nameA: a,
                nameB: b,
                url: `hoopsdata.net/compare/${canonicalSlug}`,
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
          <TodaysMatchupLink className="mt-6" />
        </section>
      </div>
    </div>
  );
}
