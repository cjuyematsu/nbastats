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
import { COMPARE_TABLE_ROWS } from '@/lib/compareCareer';
import { CareerStatsData } from '@/types/stats';

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

interface Faq {
  q: string;
  a: string;
}

// Question-form long-tail queries ("who has more points, A or B") get a
// server-rendered answer with real numbers, mirrored into FAQPage JSON-LD.
function buildFaqs(a: string, b: string, sa: CareerStatsData | null, sb: CareerStatsData | null): Faq[] {
  if (!sa || !sb) return [];
  const faqs: Faq[] = [];

  const add = (
    q: string,
    va: number | null | undefined,
    vb: number | null | undefined,
    phrase: (winner: string, hi: string, lo: string) => string,
    tie: (v: string) => string,
    format: (v: number) => string,
  ) => {
    if (va == null || vb == null) return;
    if (va === vb) {
      faqs.push({ q, a: tie(format(va)) });
    } else {
      const [winner, hi, lo] = va > vb ? [a, format(va), format(vb)] : [b, format(vb), format(va)];
      faqs.push({ q, a: phrase(winner, hi, lo) });
    }
  };

  add(
    `Who scored more career points, ${a} or ${b}?`,
    sa.pts_total, sb.pts_total,
    (w, hi, lo) => `${w} scored more career points, ${hi} to ${lo}, in the NBA regular season.`,
    (v) => `It is a dead heat: both scored ${v} career regular-season points.`,
    (v) => v.toLocaleString(),
  );
  add(
    `Who averaged more points per game, ${a} or ${b}?`,
    sa.pts_per_g, sb.pts_per_g,
    (w, hi, lo) => `${w} averaged more points per game for his career, ${hi} PPG to ${lo} PPG.`,
    (v) => `Both averaged exactly ${v} points per game for their careers.`,
    (v) => v.toFixed(1),
  );
  add(
    `Who averaged more rebounds, ${a} or ${b}?`,
    sa.trb_per_g, sb.trb_per_g,
    (w, hi, lo) => `${w} averaged more rebounds per game, ${hi} RPG to ${lo} RPG.`,
    (v) => `Both averaged ${v} rebounds per game.`,
    (v) => v.toFixed(1),
  );
  add(
    `Who averaged more assists, ${a} or ${b}?`,
    sa.ast_per_g, sb.ast_per_g,
    (w, hi, lo) => `${w} averaged more assists per game, ${hi} APG to ${lo} APG.`,
    (v) => `Both averaged ${v} assists per game.`,
    (v) => v.toFixed(1),
  );
  add(
    `Who was the better three-point shooter, ${a} or ${b}?`,
    sa.fg3_pct, sb.fg3_pct,
    (w, hi, lo) => `${w} shot better from three for his career, ${hi} to ${lo}.`,
    (v) => `Both shot ${v} from three for their careers.`,
    (v) => `${(v * 100).toFixed(1)}%`,
  );
  add(
    `Who was the more efficient scorer, ${a} or ${b}?`,
    sa.ts_pct, sb.ts_pct,
    (w, hi, lo) => `${w} posted the higher career true shooting percentage, ${hi} to ${lo}.`,
    (v) => `Both posted a ${v} career true shooting percentage.`,
    (v) => `${(v * 100).toFixed(1)}%`,
  );

  return faqs;
}

const cell = (s: CareerStatsData | null, row: (typeof COMPARE_TABLE_ROWS)[number]) => {
  const v = s ? row.get(s) : null;
  return v != null ? row.format(v) : 'N/A';
};

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
  const faqs = buildFaqs(a, b, sa, sb);
  const faqJsonLd = faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
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
                  {COMPARE_TABLE_ROWS.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{row.label}</td>
                      <td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">{cell(sa, row)}</td>
                      <td className="px-4 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">{cell(sb, row)}</td>
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

        {faqs.length > 0 && (
          <section className="mt-12 text-left max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              {a} vs {b}: Frequently Asked Questions
            </h2>
            <div className="space-y-5">
              {faqs.map((f) => (
                <div key={f.q}>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{f.q}</h3>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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
        </section>
      </div>
    </div>
  );
}
