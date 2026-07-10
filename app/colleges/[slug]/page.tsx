// app/colleges/[slug]/page.tsx
//
// Per-school draft history: every NBA draft pick from one college, high
// school, or international club.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSchoolGroups } from '@/lib/collegeData';

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = (await getSchoolGroups()).get(slug);
  if (!group) return { title: 'School Not Found', robots: { index: false } };

  const years = group.picks.map((p) => p.year);
  const range = `${Math.min(...years)}-${Math.max(...years)}`;
  const title = `NBA Players from ${group.name}: All Draft Picks`;
  const description = `Every NBA draft pick from ${group.name}: ${group.picks.length} player${
    group.picks.length === 1 ? '' : 's'
  } drafted between ${range}, with round, pick number, team, and career stats.`;

  return {
    title,
    description,
    alternates: { canonical: `/colleges/${slug}` },
    openGraph: { title, description },
  };
}

export default async function CollegePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = (await getSchoolGroups()).get(slug);
  if (!group) notFound();

  const label =
    group.kind === 'college' ? 'college' : group.kind === 'high-school' ? 'high school' : 'club';

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="mb-4 text-sm">
          <Link href="/colleges" className="text-sky-600 dark:text-sky-400 hover:underline">
            All schools
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            NBA Draft Picks from {group.name}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
            {group.picks.length} player{group.picks.length === 1 ? '' : 's'} drafted into the NBA
            from this {label}. Click any player for full career stats, or any year for the whole
            draft class.
          </p>
        </header>

        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-slate-600 mb-10">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
            <thead className="bg-gray-50 dark:bg-slate-600">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Year</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Player</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Round / Pick</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider hidden sm:table-cell">NBA Team</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600">
              {group.picks.map((p) => (
                <tr key={`${p.year}-${p.round}-${p.pick}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <Link href={`/draft/${p.year}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                      {p.year}
                    </Link>
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
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    R{p.round} P{p.pick}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                    {p.team ?? 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="flex flex-wrap items-center gap-4">
          <Link href="/colleges" className="text-sky-600 dark:text-sky-400 hover:underline">
            Players by college
          </Link>
          <Link href="/draft" className="text-sky-600 dark:text-sky-400 hover:underline">
            Draft classes by year
          </Link>
          <Link href="/compare" className="text-sky-600 dark:text-sky-400 hover:underline">
            Compare any two players
          </Link>
        </section>
      </div>
    </div>
  );
}
