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

// Era gates, mirroring the generator.
const STL_BLK_FROM = 1974;
const SHOOTING_FROM = 1971;
const THREE_FROM = 1980;
const TOV_FROM = 1978;

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

  if (startYear >= TOV_FROM) {
    put('tovpg', stats.tov_per_g);
    put('tov_total', stats.tov_total);
  }
  if (startYear >= STL_BLK_FROM) {
    put('spg', stats.stl_per_g);
    put('bpg', stats.blk_per_g);
    put('stl_total', stats.stl_total);
    put('blk_total', stats.blk_total);
  }
  if (startYear >= SHOOTING_FROM) {
    put('fgm_total', stats.fgm_total);
    put('ftm_total', stats.ftm_total);
    if ((stats.fga_total ?? 0) >= cfg.minFga) {
      put('fg_pct', stats.fg_pct);
      put('efg_pct', stats.efg_pct);
      put('ts_pct', stats.ts_pct);
    }
    if ((stats.fta_total ?? 0) >= cfg.minFta) {
      put('ft_pct', stats.ft_pct);
    }
  }
  if (startYear >= THREE_FROM) {
    put('fg3m_total', stats.fg3m_total);
    if ((stats.fg3a_total ?? 0) >= cfg.minFg3a) {
      put('fg3_pct', stats.fg3_pct);
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}
