// lib/percentiles.ts
//
// Places a player's career averages and totals on an all-time percentile
// against the precomputed qualifying pools in app/data/statPercentiles.ts
// (generated, see scripts/generate-stat-percentiles.ts). Pure lookups — no DB
// work at render. Regular season and playoffs are separate pools (playoff pool
// keys prefixed "p_", smaller games floor and attempt minimums).
//
// A stat only gets a label when the viewed player would themselves qualify for
// that stat's pool (same games/era/attempt gates the generator applies), so a
// 50-game rookie or a 1960s center never gets a misleading rank. Every stat
// ranks by volume — including turnovers and fouls (user decision: "1st
// all-time" in turnovers means the most, which tracks usage and is more
// interesting than crowning whoever touched the ball least).
//
// Top of the pool (top 25) shows an exact rank ("3rd all-time") instead of a
// percentile: midrank math can never say 100th (the #1 player of 1,396 lands
// at 99.96th), and a leaderboard position is the stronger claim anyway.

import {
  STAT_POOLS,
  QUALIFYING_GAMES,
  PLAYOFF_QUALIFYING_GAMES,
} from '@/app/data/statPercentiles';
import type { CareerStatsData } from '@/types/stats';

// Era gates. Two kinds of gap drive these, both measured against the raw game
// logs in data/PlayerStatistics.csv:
//   1. The stat didn't exist yet: steals/blocks first recorded 1973-74,
//      turnovers 1977-78, the 3-point line 1979-80.
//   2. The stat existed but the logs are incomplete. Made shots, free throws,
//      and points reconcile exactly in every era, but *field-goal attempts* and
//      *minutes* were logged for a growing fraction of games and don't reach
//      ~99% coverage until ~1980, so any FG-attempt-based rate (FG%, eFG%, TS%)
//      is inflated before then. Free-throw attempts ARE complete in every era
//      (present ~100% back to the 1950s), so FT% needs no gate. Early 3-point
//      attempts are sparse and noisy until the 1982-83 season.
// Exported so the same gate that dashes a percentile also dashes the raw value
// on the player/compare surfaces.
export const STL_BLK_FROM = 1974;
export const TOV_FROM = 1978;
export const FG_FROM = 1980; // field-goal attempts / minutes fully logged
export const THREE_FROM = 1983; // 3-point percentages stabilize (1982-83 season)
export const MINUTES_FROM = 1980;

// Ranks this good display as "Nth all-time" instead of a percentile.
const RANK_CUTOFF = 25;

export type PercentileScope = 'regular' | 'playoff';

const SCOPES: Record<
  PercentileScope,
  { prefix: string; minGames: number; minFga: number; minFg3a: number; minFta: number }
> = {
  regular: { prefix: '', minGames: QUALIFYING_GAMES, minFga: 2000, minFg3a: 500, minFta: 1000 },
  playoff: { prefix: 'p_', minGames: PLAYOFF_QUALIFYING_GAMES, minFga: 500, minFg3a: 125, minFta: 250 },
};

// Percentile rank (0-100) of v within an ascending-sorted pool, midrank on
// ties: (count below + half the ties) / n.
export function percentileRank(sorted: number[], v: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  // Binary search for the first index >= v and the first index > v.
  const lowerBound = (target: number, strict: boolean) => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (strict ? sorted[mid] <= target : sorted[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const below = lowerBound(v, false);
  const notAbove = lowerBound(v, true);
  return ((below + (notAbove - below) / 2) / n) * 100;
}

// Standard competition ranking: 1 + count of pool values strictly greater
// than v. Ties share the better rank. v must already be rounded the same way
// as the pool so the player's own pool entry registers as a tie, not a beat.
export function rankInPool(sorted: number[], v: number): number {
  const n = sorted.length;
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= v) lo = mid + 1;
    else hi = mid;
  }
  return n - lo + 1;
}

// "1st", "2nd", "3rd", "11th", "23rd" for integer ranks.
export function ordinalRank(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? 'th' : mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

// "99.87th", "63.20th" — two decimals so elite players separate instead of
// all flattening to "99th", clamped to [0.01, 99.99] so nothing reads as 0th
// or 100th. Decimal ordinals conventionally always take "th" ("99.5th
// percentile"), so no st/nd/rd handling.
export function formatPercentile(rank: number): string {
  const n = Math.min(99.99, Math.max(0.01, rank));
  return `${n.toFixed(2)}th`;
}

// Compact form of the display labels below, for narrow surfaces (hero tiles,
// mobile table cells). Keeps the full ordinal and only swaps the long
// "percentile" word: "98.72th percentile" -> "98.72th pct". "3rd all-time" is
// already short and passes through unchanged.
export function compactPercentileLabel(label: string): string {
  const suffix = ' percentile';
  return label.endsWith(suffix) ? `${label.slice(0, -suffix.length)} pct` : label;
}

export type PercentileKey =
  // Per-game averages
  | 'ppg'
  | 'rpg'
  | 'apg'
  | 'spg'
  | 'bpg'
  | 'tovpg'
  | 'pfpg'
  | 'games'
  | 'fg_pct'
  | 'fg3_pct'
  | 'ft_pct'
  | 'efg_pct'
  | 'ts_pct'
  // Career totals
  | 'pts_total'
  | 'trb_total'
  | 'ast_total'
  | 'stl_total'
  | 'blk_total'
  | 'fgm_total'
  | 'fg3m_total'
  | 'ftm_total'
  | 'tov_total'
  | 'pf_total';

// Pool values are rounded by the generator (2 decimals for per-game stats, 4
// for percentages, exact for games and totals); round the player's value the
// same way so their own pool entry compares as an exact tie.
const ROUNDING: Record<PercentileKey, number> = {
  ppg: 100,
  rpg: 100,
  apg: 100,
  spg: 100,
  bpg: 100,
  tovpg: 100,
  pfpg: 100,
  games: 1,
  fg_pct: 10000,
  fg3_pct: 10000,
  ft_pct: 10000,
  efg_pct: 10000,
  ts_pct: 10000,
  pts_total: 1,
  trb_total: 1,
  ast_total: 1,
  stl_total: 1,
  blk_total: 1,
  fgm_total: 1,
  fg3m_total: 1,
  ftm_total: 1,
  tov_total: 1,
  pf_total: 1,
};

// First season each stat is reliable, keyed by percentile key. Keys absent
// here (ppg/rpg/apg/pfpg/games and the pts/trb/ast/pf totals) are complete in
// every era. Single source of truth for both the percentile column and the
// raw-value dashing.
const STAT_RELIABLE_FROM: Partial<Record<PercentileKey, number>> = {
  spg: STL_BLK_FROM,
  bpg: STL_BLK_FROM,
  stl_total: STL_BLK_FROM,
  blk_total: STL_BLK_FROM,
  tovpg: TOV_FROM,
  tov_total: TOV_FROM,
  // Field-goal attempt rates: incomplete attempt logs before ~1980.
  fg_pct: FG_FROM,
  efg_pct: FG_FROM,
  ts_pct: FG_FROM, // needs FGA (1980); FTA is complete in every era
  fgm_total: FG_FROM, // shown as FGM-FGA, so gated by attempt completeness
  // Free throws (ft_pct, ftm_total) are complete in every era, so they get no
  // gate here and are treated like points/rebounds/assists.
  // Three-pointers: line from 1979-80, percentages reliable from 1982-83.
  fg3_pct: THREE_FROM,
  fg3m_total: THREE_FROM,
};

// The first season a stat carries reliable data, or null if it's complete in
// every era.
export function statReliableFrom(key: PercentileKey): number | null {
  return STAT_RELIABLE_FROM[key] ?? null;
}

// Whether a player's CAREER value for a stat is era-reliable, gated on the
// career start year (matches how careerPercentiles decides the percentile).
export function isCareerStatReliable(
  startYear: number | null | undefined,
  key: PercentileKey,
): boolean {
  const from = STAT_RELIABLE_FROM[key];
  return from == null || (startYear ?? 0) >= from;
}

// Whether a single SEASON's value for a stat is era-reliable.
export function isSeasonStatReliable(
  seasonYear: number | null | undefined,
  key: PercentileKey,
): boolean {
  const from = STAT_RELIABLE_FROM[key];
  return from == null || (seasonYear ?? 0) >= from;
}

// ---------------------------------------------------------------------------
// Self-consistency gates
//
// The era gates above are statistical: they assume a stat is trustworthy once
// its era logged it well enough. Individual rows still violate that assumption,
// because PlayerStatistics.csv sometimes records makes for a game while leaving
// attempts at zero. The season then sums to more makes than attempts and the
// stored percentage exceeds 100% -- Eddie Johnson's 1984-85 3P% is 13/1, or
// 1300%, and it clears the 1983 three-point gate.
//
// These cases are missing data, not wrong data: the makes reconcile against
// points and FGM. So we blank the percentage and the attempts and keep the
// makes, rather than inventing an attempt count from an outside source.
//
// FT% is the reason this cannot be folded into the era table: free-throw
// attempts are complete in every era, so FT% carries no gate at all, yet 61
// rows still record more makes than attempts.

// A make/attempt pair is self-consistent when makes don't exceed attempts.
// Null means "not reported", which contradicts nothing. (0 makes on 0 attempts
// is consistent; any makes on 0 attempts is not.)
export function isShootingPairConsistent(
  made: number | null | undefined,
  attempted: number | null | undefined,
): boolean {
  if (made == null || attempted == null) return true;
  return made <= attempted;
}

// Which make/attempt pairs each stat depends on. eFG% mixes field goals and
// threes; TS% uses field-goal and free-throw attempts.
type ShootingGroup = 'fg' | 'fg3' | 'ft';
const STAT_DEPENDS_ON: Partial<Record<PercentileKey, ShootingGroup[]>> = {
  fg_pct: ['fg'],
  fgm_total: ['fg'],
  fg3_pct: ['fg3'],
  fg3m_total: ['fg3'],
  ft_pct: ['ft'],
  ftm_total: ['ft'],
  efg_pct: ['fg', 'fg3'],
  ts_pct: ['fg', 'ft'],
};

// Whether a stat's underlying make/attempt pairs hold together. Accepts either
// the career shape (lowercase, from the RPCs) or a season row (PascalCase).
export function isStatSelfConsistent(
  stats: ShootingTotals | null | undefined,
  key: PercentileKey,
): boolean {
  const groups = STAT_DEPENDS_ON[key];
  if (!groups || !stats) return true;
  const pairs: Record<ShootingGroup, [unknown, unknown]> = {
    fg: [stats.fgm_total ?? stats.FGM_total, stats.fga_total ?? stats.FGA_total],
    fg3: [stats.fg3m_total ?? stats.FG3M_total, stats.fg3a_total ?? stats.FG3A_total],
    ft: [stats.ftm_total ?? stats.FTM_total, stats.fta_total ?? stats.FTA_total],
  };
  return groups.every((g) => {
    const [made, att] = pairs[g];
    return isShootingPairConsistent(made as number | null, att as number | null);
  });
}

// Both shapes the app reads stats in, so one predicate serves career and season.
export type ShootingTotals = Partial<{
  fgm_total: number | null; fga_total: number | null;
  fg3m_total: number | null; fg3a_total: number | null;
  ftm_total: number | null; fta_total: number | null;
  FGM_total: number | null; FGA_total: number | null;
  FG3M_total: number | null; FG3A_total: number | null;
  FTM_total: number | null; FTA_total: number | null;
}>;

// Convenience: era gate AND self-consistency, which is what every display site
// actually wants before showing a value.
export function isCareerStatDisplayable(
  stats: (ShootingTotals & { startYear?: number | null }) | null | undefined,
  key: PercentileKey,
): boolean {
  return isCareerStatReliable(stats?.startYear, key) && isStatSelfConsistent(stats, key);
}

export function isSeasonStatDisplayable(
  seasonYear: number | null | undefined,
  stats: ShootingTotals | null | undefined,
  key: PercentileKey,
): boolean {
  return isSeasonStatReliable(seasonYear, key) && isStatSelfConsistent(stats, key);
}

// Self-contained display labels ("3rd all-time" for the top 25, "98.72th
// percentile" otherwise) for a player's career averages AND totals in one
// scope, or null when the player doesn't qualify at all. Pass the stats object
// matching the scope (regular-season RPC result vs. playoff RPC result).
export function careerPercentiles(
  stats: CareerStatsData,
  scope: PercentileScope = 'regular',
): Partial<Record<PercentileKey, string>> | null {
  const cfg = SCOPES[scope];
  const games = stats.games_played ?? 0;
  if (games < cfg.minGames) return null;
  const startYear = stats.startYear ?? 0;

  const out: Partial<Record<PercentileKey, string>> = {};
  const put = (key: PercentileKey, value: number | null | undefined) => {
    if (value == null) return;
    const pool = STAT_POOLS[`${cfg.prefix}${key}`];
    if (!pool || pool.length === 0) return;
    const factor = ROUNDING[key];
    const v = Math.round(value * factor) / factor;
    const rank = rankInPool(pool, v);
    out[key] =
      rank <= RANK_CUTOFF
        ? `${ordinalRank(rank)} all-time`
        : `${formatPercentile(percentileRank(pool, v))} percentile`;
  };

  put('ppg', stats.pts_per_g);
  put('rpg', stats.trb_per_g);
  put('apg', stats.ast_per_g);
  // Fouls: recorded in every era.
  put('pfpg', stats.pf_per_g);
  put('pf_total', stats.pf_total);
  // Longevity: games played vs. the same qualifying pool. No era gate — every
  // qualifier has a games count.
  put('games', games);
  put('pts_total', stats.pts_total);
  put('trb_total', stats.trb_total);
  put('ast_total', stats.ast_total);

  if (isCareerStatReliable(startYear, 'tovpg')) {
    put('tovpg', stats.tov_per_g);
    put('tov_total', stats.tov_total);
  }
  if (isCareerStatReliable(startYear, 'spg')) {
    put('spg', stats.stl_per_g);
    put('bpg', stats.blk_per_g);
    put('stl_total', stats.stl_total);
    put('blk_total', stats.blk_total);
  }
  // Free throws are complete in every era (no era gate). Attempt minimums are
  // percentile-only (enough shots to rank), separate from era reliability.
  put('ftm_total', stats.ftm_total);
  if ((stats.fta_total ?? 0) >= cfg.minFta) {
    put('ft_pct', stats.ft_pct);
  }
  if (isCareerStatReliable(startYear, 'fg_pct')) {
    put('fgm_total', stats.fgm_total);
    if ((stats.fga_total ?? 0) >= cfg.minFga) {
      put('fg_pct', stats.fg_pct);
      put('efg_pct', stats.efg_pct);
      put('ts_pct', stats.ts_pct);
    }
  }
  if (isCareerStatReliable(startYear, 'fg3_pct')) {
    put('fg3m_total', stats.fg3m_total);
    if ((stats.fg3a_total ?? 0) >= cfg.minFg3a) {
      put('fg3_pct', stats.fg3_pct);
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}
