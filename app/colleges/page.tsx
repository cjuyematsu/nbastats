// app/colleges/page.tsx
//
// Crawlable hub for the per-school draft pages.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getSchoolGroups, type SchoolGroup } from '@/lib/collegeData';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'NBA Players by College: Draft Picks by School',
  description:
    'Browse every college, high school, and international club that has produced an NBA draft pick, from Duke and Kentucky to Real Madrid. Full pick lists with career stat links.',
  alternates: {
    canonical: '/colleges',
  },
};

const SECTIONS: { kind: SchoolGroup['kind']; title: string; blurb: string }[] = [
  {
    kind: 'college',
    title: 'Colleges',
    blurb: 'Every college program with at least one NBA draft pick since 1955.',
  },
  {
    kind: 'high-school',
    title: 'High Schools',
    blurb: 'Players drafted straight out of high school, mostly from the prep-to-pro era.',
  },
  {
    kind: 'club',
    title: 'International Clubs and Other',
    blurb: 'Overseas clubs, G League teams, and other pre-NBA stops.',
  },
];

export default async function CollegesIndexPage() {
  const groups = await getSchoolGroups();
  const all = [...groups.values()].sort(
    (a, b) => b.picks.length - a.picks.length || a.name.localeCompare(b.name)
  );

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            NBA Players by College
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
            Every school and club that has sent a player to the NBA draft. Pick a school to see
            all of its draft picks with links to full career stats.
          </p>
        </header>

        {SECTIONS.map((section) => {
          const schools = all.filter((g) => g.kind === section.kind);
          if (schools.length === 0) return null;
          return (
            <section key={section.kind} className="mb-10">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                {section.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{section.blurb}</p>
              <div className="flex flex-wrap gap-2">
                {schools.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/colleges/${g.slug}`}
                    className="text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-600 transition-colors"
                  >
                    {g.name}
                    <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {g.picks.length}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="flex flex-wrap items-center gap-4">
          <Link href="/draft" className="text-sky-600 dark:text-sky-400 hover:underline">
            Browse draft classes by year
          </Link>
          <Link href="/players" className="text-sky-600 dark:text-sky-400 hover:underline">
            All players A to Z
          </Link>
        </section>
      </div>
    </div>
  );
}
