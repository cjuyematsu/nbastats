//player/[playerId]/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getCareerStats, getPlayoffStats } from '@/lib/serverStats';
import { StatsTable, SeasonBySeasonTable, type SeasonRow } from './PlayerStatsTables';
import { ViewTeammatesButton } from './ViewTeammatesButton';
import ShareResult from '@/components/ShareResult';
import AdSlot from '@/components/AdSlot';
import { buildPlayerShare } from '@/lib/shareText';
import { COMPARE_MATCHUPS } from '@/app/data/compareMatchups';
import { duoHref } from '@/app/data/duoPages';
import { strategicComparePairs } from '@/app/data/strategicPlayers';

export const revalidate = 86400;

const getSeasonStats = cache(async (personId: number): Promise<SeasonRow[]> => {
  try {
    const { data } = await supabase
      .from('regularseasonstats')
      .select('SeasonYear, playerteamName, G, PTS_per_g, TRB_per_g, AST_per_g, FG_PCT, FG3_PCT')
      .eq('personId', personId)
      .order('SeasonYear');
    return (data as SeasonRow[]) ?? [];
  } catch {
    return [];
  }
});

// Pairs in the teammates table are stored once (lower id first), so both
// orientations have to be queried to get everyone this player played with.
const getTopTeammates = cache(async (personId: number) => {
  try {
    const [asPlayer, asTeammate] = await Promise.all([
      supabase.from('teammates').select('TeammateID, TeammateName, SharedGamesTotal').eq('PlayerID', personId),
      supabase.from('teammates').select('PlayerID, PlayerName, SharedGamesTotal').eq('TeammateID', personId),
    ]);
    const rows = [
      ...(asPlayer.data ?? []).map((r) => ({ id: r.TeammateID, name: r.TeammateName, games: r.SharedGamesTotal ?? 0 })),
      ...(asTeammate.data ?? []).map((r) => ({ id: r.PlayerID, name: r.PlayerName ?? '', games: r.SharedGamesTotal ?? 0 })),
    ].filter((r) => r.name);
    rows.sort((a, b) => b.games - a.games);
    return rows.slice(0, 8);
  } catch {
    return [];
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await params;
  const id = Number(playerId);
  if (!Number.isFinite(id)) return { title: 'Player Not Found', robots: { index: false } };

  const [regular, playoffs] = await Promise.all([getCareerStats(id), getPlayoffStats(id)]);
  const p = regular ?? playoffs;
  if (!p) return { title: 'Player Not Found', robots: { index: false } };

  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  const years = p.startYear && p.endYear ? ` (${p.startYear}-${p.endYear})` : '';
  const statBits = [
    p.pts_per_g != null ? `${p.pts_per_g.toFixed(1)} PPG` : null,
    p.trb_per_g != null ? `${p.trb_per_g.toFixed(1)} RPG` : null,
    p.ast_per_g != null ? `${p.ast_per_g.toFixed(1)} APG` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const title = `${name} Career Stats${years}`;
  const description = statBits
    ? `${name} NBA career statistics: ${statBits}. Regular season and playoff totals, averages, and shooting percentages.`
    : `${name} NBA career statistics: regular season and playoff totals, averages, and shooting percentages.`;

  const canonical = `/player/${playerId}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description },
  };
}

export default async function PlayerStatsPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const id = Number(playerId);
  if (!Number.isFinite(id)) notFound();

  const [regular, playoffs, teammates, seasons] = await Promise.all([
    getCareerStats(id),
    getPlayoffStats(id),
    getTopTeammates(id),
    getSeasonStats(id),
  ]);
  const player = regular ?? playoffs;
  if (!player) notFound();

  const name = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();

  // Curated + strategic head-to-head pages that involve this player, so the
  // player page feeds crawlable links into the compare leaf graph (no new URLs).
  const comparisons = (() => {
    const seen = new Set<string>();
    const out: { slug: string; other: string }[] = [];
    const add = (slug: string, other: string) => {
      if (seen.has(slug)) return;
      seen.add(slug);
      out.push({ slug, other });
    };
    for (const m of COMPARE_MATCHUPS) {
      if (m.a === name) add(m.slug, m.b);
      else if (m.b === name) add(m.slug, m.a);
    }
    for (const p of strategicComparePairs()) {
      if (p.a === name) add(p.slug, p.b);
      else if (p.b === name) add(p.slug, p.a);
    }
    return out;
  })();

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: `https://hoopsdata.net/player/${id}`,
    jobTitle: 'Professional Basketball Player',
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 transition-colors duration-200 border border-gray-200 dark:border-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <div className="p-4 md:py-6">
        <div className="p-5 bg-gray-50 dark:bg-slate-700/60 rounded-xl shadow-md border border-gray-200 dark:border-slate-600 transition-colors duration-200">
          <div className="text-left mb-6">
            <h1 className="text-[1.91rem] font-bold text-sky-600 dark:text-sky-400 transition-colors duration-200">
              {name}
            </h1>
            {player.startYear && player.endYear && (
              <p className="text-[1.2rem] text-slate-500 dark:text-slate-400 font-medium transition-colors duration-200">
                Career ({player.startYear} - {player.endYear})
              </p>
            )}
          </div>

          {teammates.length > 0 && <ViewTeammatesButton />}

          <StatsTable stats={regular} title="Regular Season Career Stats" statType="Averages" />
          <SeasonBySeasonTable seasons={seasons} />
          <StatsTable stats={regular} title="Regular Season Career Totals" statType="Totals" />

          <StatsTable stats={playoffs} title="Playoff Career Stats" statType="Averages" />
          <StatsTable stats={playoffs} title="Playoff Career Totals" statType="Totals" />

          <AdSlot slot="player-page" className="mt-8" />

          {teammates.length > 0 && (
            <section id="teammates" className="mt-8 scroll-mt-4">
              <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-gray-200 dark:border-slate-600 pb-2 transition-colors duration-200">
                Most Frequent Teammates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teammates.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-sky-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <Link href={`/player/${t.id}`} className="font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                      {t.name}
                    </Link>
                    <span className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">
                      {t.games.toLocaleString()} games together
                    </span>
                    <Link
                      href={`/duos/${duoHref(name, t.name)}`}
                      className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-sky-500 text-white hover:bg-sky-400 dark:bg-sky-600 dark:hover:bg-sky-500 shadow-sm hover:shadow-md hover:scale-105 transition-all"
                    >
                      See their record
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {comparisons.length > 0 && (
            <section className="mt-8">
              <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-gray-200 dark:border-slate-600 pb-2 transition-colors duration-200">
                {name} Head-to-Head
              </h2>
              <div className="flex flex-wrap gap-2">
                {comparisons.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/compare/${c.slug}`}
                    className="text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-600 transition-colors"
                  >
                    vs {c.other}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/compare?players=${encodeURIComponent(name)}`}
              className="px-5 py-2 rounded-lg bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 text-white font-semibold transition-colors"
            >
              Compare {name} with any player
            </Link>
            <Link
              href="/games/six-degrees"
              className="px-5 py-2 rounded-lg bg-green-500 hover:bg-green-600 dark:bg-[rgb(60,192,103)] dark:hover:bg-green-400 text-white font-semibold transition-colors"
            >
              Play Six Degrees of NBA
            </Link>
            <Link
              href="/degrees-of-separation"
              className="px-5 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold transition-colors"
            >
              Explore teammate connections
            </Link>
          </section>

          <section className="mt-6">
            <ShareResult
              shareText={buildPlayerShare({ name, url: `hoopsdata.net/player/${id}` })}
              game="player"
              surface="player_page"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
