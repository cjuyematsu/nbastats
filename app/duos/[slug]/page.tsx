// app/duos/[slug]/page.tsx

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import AdSlot from '@/components/AdSlot';
import ShareResult from '@/components/ShareResult';
import { DUO_PAGES, relatedDuos } from '@/app/data/duoPages';
import { compareHref } from '@/app/data/compareMatchups';
import { cleanSharedTeams, DUO_ACCENT_A, DUO_ACCENT_B } from '@/lib/duos';
import { resolveDuoBySlug } from '@/lib/serverStats';
import { buildDuoShare } from '@/lib/shareText';
import DuoStats from '@/app/duos/DuoStats';

export const revalidate = 86400;

export function generateStaticParams() {
  return DUO_PAGES.map((d) => ({ slug: d.slug }));
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

  const title = `${a} & ${b}: Games Played Together`;
  const ogTitle = `${a} & ${b}: Games Played Together, Record & Teams`;
  const description = games
    ? `Did ${a} and ${b} play together? Yes: ${games.toLocaleString()} games as teammates. See their win-loss record together, shared teams, and years side by side.`
    : `Did ${a} and ${b} play together? See their games as teammates, win-loss record together, shared teams, and years side by side.`;

  const canonical = `/duos/${resolved.canonicalSlug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { title: ogTitle, description },
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
  const teams = cleanSharedTeams(row.SharedTeams, [a.name, b.name]);
  const related = relatedDuos({ slug: canonicalSlug, a: a.name, b: b.name });

  const years =
    row.StartYearTogether && row.EndYearTogether
      ? row.StartYearTogether === row.EndYearTogether
        ? `in ${row.StartYearTogether}`
        : `from ${row.StartYearTogether} to ${row.EndYearTogether}`
      : '';
  const lead = `${a.name} and ${b.name} were teammates${years ? ` ${years}` : ''}${teams ? ` on the ${teams}` : ''}${
    row.SharedGamesTotal ? `, appearing in ${row.SharedGamesTotal.toLocaleString()} games together` : ''
  }.`;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span style={{ color: DUO_ACCENT_A }}>{a.name}</span>
            <span className="text-slate-400 dark:text-slate-500"> &amp; </span>
            <span style={{ color: DUO_ACCENT_B }}>{b.name}</span>
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300">
            {lead} Here is how the duo did side by side.
          </p>
        </header>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/60 p-6 mb-10">
          <DuoStats row={row} teams={teams} />
        </div>

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
            <ShareResult
              shareText={buildDuoShare({ nameA: a.name, nameB: b.name, url: `hoopsdata.net/duos/${canonicalSlug}` })}
              game="duos"
              surface="duo_page"
              className="inline-flex items-center justify-center rounded-lg bg-green-500 hover:bg-green-600 dark:bg-[rgb(60,192,103)] dark:hover:bg-green-400 text-white text-sm font-semibold px-4 py-1.5 transition-all"
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
