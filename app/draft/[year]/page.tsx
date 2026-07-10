// app/draft/[year]/page.tsx

import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { canonicalSchool, schoolSlug } from '@/lib/collegeSlugs';
import AdSlot from '@/components/AdSlot';

export const revalidate = 86400;

const FIRST_DRAFT_YEAR = 1955;

export function generateStaticParams() {
  const latest = new Date().getFullYear();
  return Array.from({ length: latest - FIRST_DRAFT_YEAR + 1 }, (_, i) => ({
    year: String(FIRST_DRAFT_YEAR + i),
  }));
}

interface DraftPick {
  round: number;
  pick: number;
  name: string;
  playerId: number | null;
  team: string | null;
  school: string | null;
  games: number;
  points: number;
  ppg: number | null;
}

const getDraftClass = cache(async (year: number): Promise<DraftPick[]> => {
  const { data: picks } = await supabase
    .from('draft')
    .select('*')
    .eq('Year', year)
    .order('Round')
    .order('Pick');
  if (!picks || picks.length === 0) return [];

  const ids = [...new Set(picks.map((p) => p.playerId).filter((id): id is number => id != null))];
  const totals = new Map<number, { games: number; points: number }>();
  if (ids.length > 0) {
    // Season rows can exceed one page; paginate until exhausted.
    for (let from = 0; ; from += 1000) {
      const { data: rows } = await supabase
        .from('regularseasonstats')
        .select('personId, G, PTS_total')
        .in('personId', ids)
        .range(from, from + 999);
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
        const t = totals.get(r.personId) ?? { games: 0, points: 0 };
        t.games += r.G ?? 0;
        t.points += r.PTS_total ?? 0;
        totals.set(r.personId, t);
      }
      if (rows.length < 1000) break;
    }
  }

  return picks.map((p) => {
    const t = p.playerId != null ? totals.get(p.playerId) : undefined;
    const games = t?.games ?? 0;
    const points = t?.points ?? 0;
    return {
      round: p.Round,
      pick: p.Pick,
      name: `${p.FirstName ?? ''} ${p.LastName ?? ''}`.trim() || 'Unknown',
      playerId: p.playerId,
      team: p['NBA Team'],
      school: p['School/Club Team'],
      games,
      points,
      ppg: games > 0 ? points / games : null,
    };
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year)) return { title: 'NBA Draft', robots: { index: false } };

  const picks = await getDraftClass(year);
  if (picks.length === 0) return { title: 'NBA Draft', robots: { index: false } };

  const first = picks.find((p) => p.round === 1 && p.pick === 1);
  const title = `${year} NBA Draft Class: All Picks & Career Stats`;
  const description = first
    ? `Every pick in the ${year} NBA draft, headlined by No. 1 pick ${first.name}. Full first and second round results with career points, games, and PPG for each player.`
    : `Every pick in the ${year} NBA draft. Full first and second round results with career points, games, and PPG for each player.`;

  return {
    title,
    description,
    alternates: { canonical: `/draft/${year}` },
    openGraph: { title, description },
  };
}

export default async function DraftYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year)) notFound();

  const picks = await getDraftClass(year);
  if (picks.length === 0) notFound();

  const first = picks.find((p) => p.round === 1 && p.pick === 1);
  const topScorer = [...picks].sort((a, b) => b.points - a.points)[0];
  const latest = new Date().getFullYear();
  const hasStats = picks.some((p) => p.games > 0);

  const faqs = [
    first && {
      q: `Who was the number 1 pick in the ${year} NBA draft?`,
      a: `${first.name} was selected first overall in the ${year} NBA draft${first.team ? ` by the ${first.team}` : ''}.`,
    },
    topScorer && topScorer.points > 0 && {
      q: `Who scored the most career points from the ${year} NBA draft class?`,
      a: `${topScorer.name} (pick ${topScorer.pick}${topScorer.round > 1 ? `, round ${topScorer.round}` : ''}) leads the ${year} class with ${topScorer.points.toLocaleString()} career regular-season points.`,
    },
    {
      q: `How many players were drafted in the ${year} NBA draft?`,
      a: `The ${year} NBA draft included ${picks.length} picks across the first two rounds.`,
    },
  ].filter(Boolean) as { q: string; a: string }[];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            {year} NBA Draft Class
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300">
            Every pick from the {year} NBA draft
            {first ? `, headlined by No. 1 overall pick ${first.name}` : ''}
            {topScorer && topScorer.points > 0 && topScorer.pick !== 1
              ? `. ${topScorer.name} (pick ${topScorer.pick}) went on to score the most career points in the class`
              : ''}
            . Click any player for full career stats.
          </p>
        </header>

        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-slate-600 mb-10">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
            <thead className="bg-gray-50 dark:bg-slate-600">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Pick</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Player</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Team</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider hidden sm:table-cell">School / Club</th>
                {hasStats && (
                  <>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">G</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">PTS</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">PPG</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600">
              {picks.map((p) => (
                <tr key={`${p.round}-${p.pick}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    {p.round === 2 ? `R2 · ${p.pick}` : p.pick}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold">
                    {p.playerId != null ? (
                      <Link href={`/player/${p.playerId}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="text-slate-800 dark:text-slate-100">{p.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{p.team ?? 'N/A'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                    {p.school ? (
                      <Link
                        href={`/colleges/${schoolSlug(canonicalSchool(p.school))}`}
                        className="hover:text-sky-600 dark:hover:text-sky-400 hover:underline"
                      >
                        {p.school}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  {hasStats && (
                    <>
                      <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">{p.games > 0 ? p.games.toLocaleString() : 'N/A'}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">{p.points > 0 ? p.points.toLocaleString() : 'N/A'}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">{p.ppg != null ? p.ppg.toFixed(1) : 'N/A'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mb-10 max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            {year} NBA Draft: Frequently Asked Questions
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

        <AdSlot slot="draft-page" className="mb-10 max-w-4xl mx-auto" />

        <section className="flex flex-wrap items-center gap-4">
          {year > FIRST_DRAFT_YEAR && (
            <Link href={`/draft/${year - 1}`} className="text-sky-600 dark:text-sky-400 hover:underline">
              ← {year - 1} draft class
            </Link>
          )}
          {year < latest && (
            <Link href={`/draft/${year + 1}`} className="text-sky-600 dark:text-sky-400 hover:underline">
              {year + 1} draft class →
            </Link>
          )}
          <Link href={`/games/draft-quiz/${year}`} className="text-sky-600 dark:text-sky-400 hover:underline">
            Think you know this class? Play the {year} draft quiz
          </Link>
          <Link href="/analysis/draft-points" className="text-sky-600 dark:text-sky-400 hover:underline">
            Points by draft position
          </Link>
        </section>
      </div>
    </div>
  );
}
