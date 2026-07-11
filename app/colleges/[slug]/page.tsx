// app/colleges/[slug]/page.tsx
//
// Per-school draft history: every NBA draft pick from one college, high
// school, or international club, with career stats and school leaders.

import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCareerTotals, getSchoolGroups, type CareerTotals, type SchoolGroup } from '@/lib/collegeData';

export const revalidate = 7776000;

interface Leader {
  label: string;
  playerId: number;
  name: string;
  value: string;
}

const getSchoolStats = cache(async (group: SchoolGroup) => {
  const ids = [...new Set(group.picks.map((p) => p.playerId).filter((id): id is number => id != null))];
  const totals = await getCareerTotals(ids);

  const leaderFor = (label: string, stat: keyof CareerTotals, unit: string): Leader | null => {
    let best: Leader | null = null;
    let bestValue = 0;
    for (const p of group.picks) {
      if (p.playerId == null) continue;
      const t = totals.get(p.playerId);
      if (!t || t[stat] <= bestValue) continue;
      bestValue = t[stat];
      best = { label, playerId: p.playerId, name: p.name, value: `${t[stat].toLocaleString()} ${unit}` };
    }
    return best;
  };

  const leaders = [
    leaderFor('Scoring leader', 'points', 'points'),
    leaderFor('Rebounding leader', 'rebounds', 'rebounds'),
    leaderFor('Assists leader', 'assists', 'assists'),
    leaderFor('Most games', 'games', 'games'),
  ].filter((l): l is Leader => l !== null);

  // Top scorers in order, for the prose answer to "who scored the most
  // points from {school}" style queries.
  const topScorers = group.picks
    .filter((p) => p.playerId != null && (totals.get(p.playerId)?.points ?? 0) > 0)
    .map((p) => ({ name: p.name, playerId: p.playerId as number, points: totals.get(p.playerId as number)!.points }))
    .sort((x, y) => y.points - x.points)
    .slice(0, 3);

  return { totals, leaders, topScorers };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = (await getSchoolGroups()).get(slug);
  if (!group) return { title: 'School Not Found', robots: { index: false } };

  const { leaders } = await getSchoolStats(group);
  const scorer = leaders.find((l) => l.label === 'Scoring leader');

  const years = group.picks.map((p) => p.year);
  const range = `${Math.min(...years)}-${Math.max(...years)}`;
  const title = `NBA Players from ${group.name}: Draft Picks & Career Leaders`;
  const description = scorer
    ? `Every NBA draft pick from ${group.name} (${group.picks.length} players, ${range}) with career stats. All-time NBA scoring leader: ${scorer.name} with ${scorer.value}.`
    : `Every NBA draft pick from ${group.name}: ${group.picks.length} player${
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

  const { totals, leaders, topScorers } = await getSchoolStats(group);
  const hasStats = leaders.length > 0;

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
            from this {label}, with career regular-season stats. Click any player for their full
            page, or any year for the whole draft class.
          </p>
        </header>

        {hasStats && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-100">
              {group.name} NBA Career Leaders
            </h2>
            {topScorers.length > 0 && (
              <p className="mb-4 max-w-3xl text-slate-600 dark:text-slate-300">
                <Link href={`/player/${topScorers[0].playerId}`} className="font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                  {topScorers[0].name}
                </Link>{' '}
                has scored the most career NBA points of any player drafted out of {group.name},
                with {topScorers[0].points.toLocaleString()}.
                {topScorers.length > 1 && (
                  <>
                    {' '}
                    {topScorers
                      .slice(1)
                      .map((s) => `${s.name} (${s.points.toLocaleString()})`)
                      .join(' and ')}{' '}
                    {topScorers.length > 2 ? 'are' : 'is'} next among {group.name} products.
                  </>
                )}
              </p>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {leaders.map((l) => (
                <div
                  key={l.label}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700"
                >
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {l.label}
                  </span>
                  <Link
                    href={`/player/${l.playerId}`}
                    className="block mt-1 font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    {l.name}
                  </Link>
                  <span className="block text-sm text-slate-600 dark:text-slate-300">{l.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-slate-600 mb-10">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
            <thead className="bg-gray-50 dark:bg-slate-600">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Year</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Player</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Round / Pick</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider hidden sm:table-cell">NBA Team</th>
                {hasStats && (
                  <>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider hidden sm:table-cell">G</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">PTS</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">PPG</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600">
              {group.picks.map((p) => {
                const t = p.playerId != null ? totals.get(p.playerId) : undefined;
                return (
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
                    {hasStats && (
                      <>
                        <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100 hidden sm:table-cell">
                          {t && t.games > 0 ? t.games.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">
                          {t && t.points > 0 ? t.points.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-mono text-slate-800 dark:text-slate-100">
                          {t && t.games > 0 ? (t.points / t.games).toFixed(1) : 'N/A'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
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
