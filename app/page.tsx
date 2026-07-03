//app/page.tsx

import Link from 'next/link';
import type { Metadata } from 'next';
import { Users, TrendingUp, Gamepad2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { PlayerSuggestion, CareerStatsData } from '@/types/stats';
import HomeCompareHero, { HeroSide } from './HomeCompareHero';
import HomeSixDegreesTeaser, { SixDegreesPuzzle } from './HomeSixDegreesTeaser';
import DailyChallengesStrip from './DailyChallengesStrip';
import HomeTop100Teaser from './HomeTop100Teaser';
import HomeForumLatest from './HomeForumLatest';
import HomeFeaturedArticle, { FeaturedArticle } from './HomeFeaturedArticle';
import { getTodaysMatchup } from './data/featuredMatchups';

export const metadata: Metadata = {
  title: 'NBA Player Comparison Tool, Stats & Trivia | HoopsData',
  description: 'Free NBA player comparison tool. Compare any two NBA players side-by-side, vote on Top 100 player rankings, and play basketball trivia games. The ultimate hub for NBA stats and analytics.',
  keywords: ['nba player comparison', 'compare nba players', 'nba player comparison tool', 'nba stats', 'nba player stats', 'nba trivia', 'top 100 nba players', 'basketball stats', 'nba analytics'],
  alternates: {
    canonical: '/',
  },
};

// Re-resolve the featured matchup and article hourly.
export const revalidate = 3600;

async function loadFeaturedArticle(): Promise<FeaturedArticle | null> {
  try {
    const { data } = await supabase.rpc('get_published_articles_with_engagement');
    if (!data || data.length === 0) return null;
    const rows = data as unknown as Array<{
      slug: string;
      title: string;
      dek: string | null;
      author: string | null;
      published_at: string | null;
      comment_count: number | null;
    }>;
    const newest = rows
      .filter((r) => r.published_at)
      .sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime())[0];
    if (!newest?.published_at) return null;
    return {
      slug: newest.slug,
      title: newest.title,
      dek: newest.dek ?? null,
      author: newest.author ?? null,
      published_at: newest.published_at,
      comment_count: newest.comment_count ?? 0,
    };
  } catch {
    return null;
  }
}

async function loadDailySixDegrees(): Promise<SixDegreesPuzzle | null> {
  try {
    const gameDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const { data } = await supabase
      .from('daily_connection_games')
      .select('game_date, player_a_id, player_a_name, player_b_id, player_b_name, solution_path_names, solution_path_ids')
      .eq('game_date', gameDate)
      .maybeSingle();
    return (data as SixDegreesPuzzle) ?? null;
  } catch {
    return null;
  }
}

async function loadSide(name: string): Promise<HeroSide | null> {
  try {
    const { data } = await supabase.rpc('get_player_suggestions', { search_term: name });
    const p = data && data.length > 0 ? (data[0] as PlayerSuggestion) : null;
    if (!p) return null;
    const { data: s } = await supabase.rpc('calculate_player_career_stats', { p_person_id: p.personId });
    return {
      name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
      stats: s && s.length > 0 ? (s[0] as CareerStatsData) : null,
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const matchup = getTodaysMatchup();
  const [initialA, initialB, featuredArticle, dailySixDegrees] = await Promise.all([
    loadSide(matchup.a),
    loadSide(matchup.b),
    loadFeaturedArticle(),
    loadDailySixDegrees(),
  ]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center pt-8 mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            <span className="block text-sky-600 dark:text-sky-400">A Hub for NBA Stats</span>
          </h1>
          <h2 className="mt-2 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            Explore NBA Player Stats, NBA Player Comparisons, and NBA Trivia
          </h2>
        </header>

        <HomeFeaturedArticle article={featuredArticle} />

        <DailyChallengesStrip />

        <div className="grid grid-cols-1 gap-5 mb-12">
          <HomeCompareHero initialA={initialA} initialB={initialB} />
          <HomeSixDegreesTeaser initialPuzzle={dailySixDegrees} />
          <HomeTop100Teaser />
        </div>

        <section className="mb-12 text-left">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-1">Explore everything</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Stats, analysis, five trivia games, and a community forum.
          </p>

          <h3 className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Players &amp; Connections
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Link href="/compare" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Compare Players</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Compare player stats side-by-side. Settle debates on who is the better player based on hard data.
              </p>
            </Link>
            <Link href="/duos" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">NBA Duos</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Pick two teammates and see their games, win-loss record, and teams together.
              </p>
            </Link>
            <Link href="/degrees-of-separation" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Teammate Connections</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Discover how players are connected through shared teammates across different eras.
              </p>
            </Link>
            <Link href="/games/six-degrees" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Six Degrees</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Find connections between players through shared teammates.
              </p>
            </Link>
          </div>

          <h3 className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-3 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" />
            Trivia Games
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Link href="/games/stat-over-under" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Stat Over/Under</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Guess whether a player&apos;s stats are over or under the given line.
              </p>
            </Link>
            <Link href="/games/draft-quiz" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Draft Quiz</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Test your knowledge of NBA draft history by filling in missing picks.
              </p>
            </Link>
            <Link href="/games/ranking-game" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Guess the Ranking</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Try to order players correctly based on their statistical rankings.
              </p>
            </Link>
            <Link href="/games/odd-man-out" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Odd Man Out</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Identify which player doesn&apos;t belong based on statistical patterns.
              </p>
            </Link>
          </div>

          <h3 className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analysis &amp; Community
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/analysis/salary-vs-points" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Salary vs. Performance</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Analyze the relationship between player salaries and their on-court production.
              </p>
            </Link>
            <Link href="/analysis/growth-of-nba" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">NBA Growth Trends</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Explore how the NBA has evolved over time through statistical trends.
              </p>
            </Link>
            <Link href="/analysis/draft-points" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Points Leaders</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                View points leaders at each draft position.
              </p>
            </Link>
            <Link href="/articles" className="block bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-sky-400 hover:shadow-md">
              <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Forum</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Data-driven NBA articles and debates. Read, vote, and join the discussion.
              </p>
            </Link>
          </div>
        </section>

        <HomeForumLatest excludeSlug={featuredArticle?.slug} />

        <footer className="text-center pt-8 border-t border-gray-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-500 pb-6">
            Hoops Data &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}
