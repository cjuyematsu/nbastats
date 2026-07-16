// app/colleges/page.tsx
//
// Crawlable hub for the per-school draft pages. A client filter searches across
// hundreds of schools without hiding pills from the initial SSR HTML.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getSchoolGroups, type SchoolGroup } from '@/lib/collegeData';
import DirectoryFilter, { type FilterGroup } from '@/components/DirectoryFilter';
import { breadcrumbLd } from '@/lib/jsonLd';

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

  const filterGroups: FilterGroup[] = SECTIONS.map((section) => ({
    title: section.title,
    blurb: section.blurb,
    entries: all
      .filter((g) => g.kind === section.kind)
      .map((g) => ({
        key: g.slug,
        label: g.name,
        href: `/colleges/${g.slug}`,
        badge: g.picks.length,
      })),
  })).filter((g) => g.entries.length > 0);

  const breadcrumb = breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Players by College', path: '/colleges' },
  ]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
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

        <DirectoryFilter groups={filterGroups} variant="pills" placeholder="Filter schools by name…" />

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
