// app/duos/[slug]/page.tsx

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import AdSlot from '@/components/AdSlot';
import CopyEmbedCode from '@/components/CopyEmbedCode';
import { DUO_PAGES, relatedDuos } from '@/app/data/duoPages';
import { compareHref } from '@/app/data/compareMatchups';
import { type DuoRow, parseRecord, cleanSharedTeams } from '@/lib/duos';
import { resolveDuoBySlug } from '@/lib/serverStats';

export const revalidate = 86400;

export function generateStaticParams() {
  return DUO_PAGES.map((d) => ({ slug: d.slug }));
}

interface DuoFact {
  q: string;
  a: string;
}

function buildDuoFacts(a: string, b: string, row: DuoRow): DuoFact[] {
  const facts: DuoFact[] = [];
  const years =
    row.StartYearTogether && row.EndYearTogether
      ? row.StartYearTogether === row.EndYearTogether
        ? `in ${row.StartYearTogether}`
        : `from ${row.StartYearTogether} to ${row.EndYearTogether}`
      : '';
  const teams = cleanSharedTeams(row.SharedTeams, [a, b]);

  facts.push({
    q: `Did ${a} and ${b} play together in the NBA?`,
    a: `Yes. ${a} and ${b} were teammates${years ? ` ${years}` : ''}${teams ? ` on the ${teams}` : ''}${
      row.SharedGamesTotal ? `, appearing in ${row.SharedGamesTotal.toLocaleString()} games together` : ''
    }.`,
  });

  if (row.SharedGamesTotal) {
    facts.push({
      q: `How many games did ${a} and ${b} play together?`,
      a: `${a} and ${b} played ${row.SharedGamesTotal.toLocaleString()} games together${years ? ` ${years}` : ''}.`,
    });
  }

  const record = parseRecord(row.SharedGamesRecord);
  if (record && record.wins + record.losses > 0) {
    const pct = ((record.wins / (record.wins + record.losses)) * 100).toFixed(1);
    facts.push({
      q: `What was ${a} and ${b}'s record together?`,
      a: `In games where both played, their teams went ${record.wins}-${record.losses}, a ${pct}% win percentage.`,
    });
  }

  return facts;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveDuoBySlug(slug);
  if (!resolved) return { title: 'NBA Duo', robots: { index: false } };

  const a = resolved.data.a.name;
  const b = resolved.data.b.name;
  const games = resolved.data.row?.SharedGamesTotal;

  const title = `${a} & ${b}: Games Played Together, Record & Teams`;
  const description = games
    ? `Did ${a} and ${b} play together? Yes: ${games.toLocaleString()} games as teammates. See their win-loss record together, shared teams, and years side by side.`
    : `Did ${a} and ${b} play together? See their games as teammates, win-loss record together, shared teams, and years side by side.`;

  const canonical = `/duos/${resolved.canonicalSlug}`;
  return {
    title,
    description,
    alternates: {
      canonical,
      types: {
        'application/json+oembed': `https://hoopsdata.net/api/oembed?url=${encodeURIComponent(`https://hoopsdata.net${canonical}`)}&format=json`,
      },
    },
    openGraph: { title, description },
  };
}

export default async function DuoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveDuoBySlug(slug);
  if (!resolved) notFound();
  if (slug !== resolved.canonicalSlug) permanentRedirect(`/duos/${resolved.canonicalSlug}`);

  const { data, canonicalSlug } = resolved;
  const { a, b, row } = data;
  if (!row) notFound();
  const record = parseRecord(row.SharedGamesRecord);
  const winPct =
    record && record.wins + record.losses > 0
      ? ((record.wins / (record.wins + record.losses)) * 100).toFixed(1)
      : null;
  const teams = cleanSharedTeams(row.SharedTeams, [a.name, b.name]);
  const facts = buildDuoFacts(a.name, b.name, row);
  const related = relatedDuos({ slug: canonicalSlug, a: a.name, b: b.name });

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: facts.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            {a.name} &amp; {b.name}
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300">
            {facts[0].a} Here is how the duo did side by side.
          </p>
        </header>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/60 p-6 mb-10">
          <div className="flex flex-wrap justify-around text-center gap-6">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {row.SharedGamesTotal?.toLocaleString() ?? 'N/A'}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Games Together</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{row.SharedGamesRecord ?? 'N/A'}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Record Together</p>
            </div>
            {winPct && (
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{winPct}%</p>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Win Percentage</p>
              </div>
            )}
          </div>
          {row.CombinedPtsPerGame != null && (
            <div className="mt-6">
              <p className="text-center text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                Combined per game
              </p>
              <div className="flex flex-wrap justify-around text-center gap-6">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {row.CombinedPtsPerGame.toFixed(1)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Points</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {row.CombinedAstPerGame?.toFixed(1) ?? 'N/A'}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Assists</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {row.CombinedRebPerGame?.toFixed(1) ?? 'N/A'}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rebounds</p>
                </div>
              </div>
            </div>
          )}
          {teams && (
            <div className="text-center mt-6">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Shared Teams</p>
              <p className="text-slate-800 dark:text-slate-200">{teams}</p>
            </div>
          )}
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            {a.name} &amp; {b.name}: Frequently Asked Questions
          </h2>
          <div className="space-y-5">
            {facts.map((f) => (
              <div key={f.q}>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{f.q}</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <AdSlot slot="duo-page" className="mb-10 max-w-4xl mx-auto" />

        <section className="text-left">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <Link href={`/player/${a.id}`} className="text-sky-600 dark:text-sky-400 hover:underline">
              {a.name} career stats
            </Link>
            <Link href={`/player/${b.id}`} className="text-sky-600 dark:text-sky-400 hover:underline">
              {b.name} career stats
            </Link>
            <Link
              href={`/compare/${compareHref(a.name, b.name)}`}
              className="text-sky-600 dark:text-sky-400 hover:underline"
            >
              Compare their stats
            </Link>
            <Link href="/duos" className="text-sky-600 dark:text-sky-400 hover:underline">
              Look up any duo
            </Link>
            <CopyEmbedCode
              embedPath={`/embed/duos/${canonicalSlug}`}
              canonicalPath={`/duos/${canonicalSlug}`}
              title={`${a.name} & ${b.name}`}
            />
          </div>

          {related.length > 0 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">More Duos</h2>
              <div className="flex flex-wrap gap-4">
                {related.map((d) => (
                  <Link key={d.slug} href={`/duos/${d.slug}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                    {d.a} &amp; {d.b}
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
