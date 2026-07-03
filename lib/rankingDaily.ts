// lib/rankingDaily.ts
//
// Deterministic daily round for the Ranking Game: everyone gets the same
// category, season, and players on a given LA date. Prefers the
// get_ranking_daily_challenge RPC (scripts/sql/daily-challenge-rpcs.sql);
// falls back to equivalent client-side generation if the RPC is missing.

import { supabase } from '@/lib/supabaseClient';
import { getLaDateString } from '@/lib/dailyTime';
import { dayNumber, seededRng, seededShuffle } from '@/lib/dailySeed';

export interface RankingDailyRow {
  personId: number;
  firstName: string;
  lastName: string;
  SeasonYear: number;
  statValue: number;
  categoryName: string;
  categoryOptions: string[];
}

export interface RankingDailyGame {
  correctOrder: RankingDailyRow[];
  players: RankingDailyRow[];
}

interface CategoryConfig {
  column: string;
  label: string;
  minGames?: number;
  firstSeason: number;
}

const CATEGORIES: CategoryConfig[] = [
  { column: 'PTS_per_g', label: 'Points Per Game', minGames: 50, firstSeason: 1960 },
  { column: 'AST_per_g', label: 'Assists Per Game', minGames: 50, firstSeason: 1960 },
  { column: 'TRB_per_g', label: 'Rebounds Per Game', minGames: 50, firstSeason: 1960 },
  { column: 'STL_per_g', label: 'Steals Per Game', minGames: 50, firstSeason: 1980 },
  { column: 'BLK_per_g', label: 'Blocks Per Game', minGames: 50, firstSeason: 1980 },
  { column: 'MP_per_g', label: 'Minutes Per Game', minGames: 50, firstSeason: 1960 },
  { column: 'PTS_total', label: 'Total Points', firstSeason: 1960 },
  { column: 'AST_total', label: 'Total Assists', firstSeason: 1960 },
  { column: 'TRB_total', label: 'Total Rebounds', firstSeason: 1960 },
  { column: 'FG3M_total', label: 'Three-Pointers Made', firstSeason: 1985 },
];

const LAST_SEASON = 2026;

type StatRow = {
  personId: number;
  firstName: string | null;
  lastName: string | null;
  SeasonYear: number | null;
} & Record<string, unknown>;

export async function generateRankingDaily(
  laDate: string = getLaDateString()
): Promise<RankingDailyGame | null> {
  const fromRpc = await generateFromRpc(laDate);
  if (fromRpc) return fromRpc;
  return generateLocally(laDate);
}

async function generateFromRpc(laDate: string): Promise<RankingDailyGame | null> {
  try {
    const { data, error } = await supabase.rpc('get_ranking_daily_challenge', { p_date: laDate });
    if (error || !data || data.length < 4) return null;
    const correctOrder = data
      .map((r) => ({
        personId: r.personId,
        firstName: r.firstName ?? '',
        lastName: r.lastName ?? '',
        SeasonYear: r.SeasonYear,
        statValue: Number(r.statValue),
        categoryName: r.categoryName,
        categoryOptions: r.categoryOptions,
      }))
      .sort((a, b) => b.statValue - a.statValue);
    const rng = seededRng(dayNumber(laDate) * 104729 + 3);
    return { correctOrder, players: seededShuffle(correctOrder, rng) };
  } catch {
    return null;
  }
}

async function generateLocally(laDate: string): Promise<RankingDailyGame | null> {
  try {
    const rng = seededRng(dayNumber(laDate) * 104729 + 3);
    const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
    const season =
      category.firstSeason + Math.floor(rng() * (LAST_SEASON - category.firstSeason + 1));

    let query = supabase
      .from('regularseasonstats')
      .select(`personId, firstName, lastName, SeasonYear, ${category.column}`)
      .eq('SeasonYear', season)
      .not(category.column, 'is', null)
      .order(category.column, { ascending: false })
      .order('personId', { ascending: true })
      .limit(24);
    if (category.minGames) query = query.gte('G', category.minGames);

    const { data, error } = await query.returns<StatRow[]>();
    if (error || !data || data.length < 8) return null;

    const shuffledIdx = seededShuffle([...data.keys()], rng);
    const picked: StatRow[] = [];
    const seen = new Set<number>();
    for (const i of shuffledIdx) {
      const value = Number(data[i][category.column]);
      if (!Number.isFinite(value) || seen.has(value)) continue;
      seen.add(value);
      picked.push(data[i]);
      if (picked.length === 4) break;
    }
    if (picked.length < 4) return null;

    picked.sort(
      (a, b) => Number(b[category.column]) - Number(a[category.column])
    );

    const decoys = seededShuffle(
      CATEGORIES.filter((c) => c.label !== category.label).map((c) => c.label),
      rng
    ).slice(0, 3);
    const categoryOptions = seededShuffle([category.label, ...decoys], rng);

    const correctOrder = picked.map((p) => ({
      personId: p.personId,
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      SeasonYear: p.SeasonYear ?? season,
      statValue: Number(p[category.column]),
      categoryName: category.label,
      categoryOptions,
    }));
    return { correctOrder, players: seededShuffle(correctOrder, rng) };
  } catch {
    return null;
  }
}
