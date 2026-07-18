// scripts/generate-stat-percentiles.ts
//
// Regenerates app/data/statPercentiles.ts: sorted arrays of career averages
// AND career totals for the qualifying-player pools (regular season and
// playoffs), so player pages can show "Xth percentile" / "Nth all-time" with a
// binary search at render time — no runtime DB work. Rerun after a new season:
//   npm run generate:percentiles
//
// Pools: regular season = players with >= QUALIFYING_GAMES career games;
// playoffs = players with >= PLAYOFF_QUALIFYING_GAMES career playoff games
// (playoff careers are roughly a quarter the length, so the games floor and
// attempt minimums scale down). Stats with incomplete history are further
// gated by the player's first season (steals and blocks weren't recorded until
// 1974; shot-attempt data is unreliable before 1971 — see the pre-1971 gotcha
// in CLAUDE.md) and by attempt minimums so percentage percentiles aren't
// skewed by tiny samples. Playoff pool keys are prefixed "p_".

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE_SIZE = 1000;
const QUALIFYING_GAMES = 100;
const PLAYOFF_QUALIFYING_GAMES = 10;
const OUTPUT_PATH = resolve(process.cwd(), 'app/data/statPercentiles.ts');

// Era gates (keep in sync with lib/percentiles.ts, which mirrors them for the
// viewed player). See that file for the full rationale: stats either didn't
// exist yet, or their attempt counts weren't fully logged until later.
const STL_BLK_FROM = 1974;
// Turnovers weren't recorded until the 1977-78 season.
const TOV_FROM = 1978;
// Field-goal attempts aren't fully logged before ~1980, so FG-attempt rates
// (FG%, eFG%, TS%) are inflated before then. Free-throw attempts are complete
// in every era (no gate). Three-point percentages stabilize from the 1982-83
// season.
const FG_FROM = 1980;
const THREE_FROM = 1983;

interface ScopeConfig {
  table: 'regularseasonstats' | 'playoffstats';
  prefix: string;
  minGames: number;
  minFga: number;
  minFg3a: number;
  minFta: number;
}

const SCOPES: ScopeConfig[] = [
  { table: 'regularseasonstats', prefix: '', minGames: QUALIFYING_GAMES, minFga: 2000, minFg3a: 500, minFta: 1000 },
  { table: 'playoffstats', prefix: 'p_', minGames: PLAYOFF_QUALIFYING_GAMES, minFga: 500, minFg3a: 125, minFta: 250 },
];

type SeasonRow = {
  personId: number;
  SeasonYear: number;
  G: number | null;
  PTS_total: number | null;
  TRB_total: number | null;
  AST_total: number | null;
  STL_total: number | null;
  BLK_total: number | null;
  FGA_total: number | null;
  FGM_total: number | null;
  FG3A_total: number | null;
  FG3M_total: number | null;
  FTA_total: number | null;
  FTM_total: number | null;
  TOV_total: number | null;
  PF_total: number | null;
};

interface Agg {
  startYear: number;
  g: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  fga: number;
  fgm: number;
  fg3a: number;
  fg3m: number;
  fta: number;
  ftm: number;
  tov: number;
  pf: number;
}

async function fetchAll(table: ScopeConfig['table']): Promise<SeasonRow[]> {
  const rows: SeasonRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(
        'personId, SeasonYear, G, PTS_total, TRB_total, AST_total, STL_total, BLK_total, FGA_total, FGM_total, FG3A_total, FG3M_total, FTA_total, FTM_total, TOV_total, PF_total',
      )
      .order('personId')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed reading ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as SeasonRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

const asc = (arr: number[]) => [...arr].sort((a, b) => a - b);
const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

async function buildScope(scope: ScopeConfig): Promise<Record<string, number[]>> {
  console.log(`Scanning ${scope.table}…`);
  const seasonRows = await fetchAll(scope.table);

  const byId = new Map<number, Agg>();
  for (const row of seasonRows) {
    let a = byId.get(row.personId);
    if (!a) {
      a = { startYear: row.SeasonYear, g: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, fga: 0, fgm: 0, fg3a: 0, fg3m: 0, fta: 0, ftm: 0, tov: 0, pf: 0 };
      byId.set(row.personId, a);
    }
    a.startYear = Math.min(a.startYear, row.SeasonYear);
    a.g += row.G ?? 0;
    a.pts += row.PTS_total ?? 0;
    a.trb += row.TRB_total ?? 0;
    a.ast += row.AST_total ?? 0;
    a.stl += row.STL_total ?? 0;
    a.blk += row.BLK_total ?? 0;
    a.fga += row.FGA_total ?? 0;
    a.fgm += row.FGM_total ?? 0;
    a.fg3a += row.FG3A_total ?? 0;
    a.fg3m += row.FG3M_total ?? 0;
    a.fta += row.FTA_total ?? 0;
    a.ftm += row.FTM_total ?? 0;
    a.tov += row.TOV_total ?? 0;
    a.pf += row.PF_total ?? 0;
  }

  const pool = [...byId.values()].filter((a) => a.g >= scope.minGames);

  const pools: Record<string, number[]> = {
    ppg: [], rpg: [], apg: [], games: [], spg: [], bpg: [], tovpg: [], pfpg: [],
    fg_pct: [], fg3_pct: [], ft_pct: [], efg_pct: [], ts_pct: [],
    pts_total: [], trb_total: [], ast_total: [], stl_total: [], blk_total: [],
    fgm_total: [], fg3m_total: [], ftm_total: [], tov_total: [], pf_total: [],
  };

  for (const a of pool) {
    pools.games.push(a.g);
    pools.ppg.push(r2(a.pts / a.g));
    pools.rpg.push(r2(a.trb / a.g));
    pools.apg.push(r2(a.ast / a.g));
    // Fouls have been recorded since the beginning; turnovers only since
    // 1977-78. Ranked by volume like everything else (1st = most).
    pools.pfpg.push(r2(a.pf / a.g));
    pools.pf_total.push(a.pf);
    if (a.startYear >= TOV_FROM) {
      pools.tovpg.push(r2(a.tov / a.g));
      pools.tov_total.push(a.tov);
    }
    pools.pts_total.push(a.pts);
    pools.trb_total.push(a.trb);
    pools.ast_total.push(a.ast);
    if (a.startYear >= STL_BLK_FROM) {
      pools.spg.push(r2(a.stl / a.g));
      pools.bpg.push(r2(a.blk / a.g));
      pools.stl_total.push(a.stl);
      pools.blk_total.push(a.blk);
    }
    // Free throws are complete in every era, so no era gate.
    pools.ftm_total.push(a.ftm);
    if (a.fta >= scope.minFta) {
      pools.ft_pct.push(r4(a.ftm / a.fta));
    }
    if (a.startYear >= FG_FROM) {
      pools.fgm_total.push(a.fgm);
      if (a.fga >= scope.minFga) {
        pools.fg_pct.push(r4(a.fgm / a.fga));
        pools.efg_pct.push(r4((a.fgm + 0.5 * a.fg3m) / a.fga));
        pools.ts_pct.push(r4(a.pts / (2 * (a.fga + 0.44 * a.fta))));
      }
    }
    if (a.startYear >= THREE_FROM) {
      pools.fg3m_total.push(a.fg3m);
      if (a.fg3a >= scope.minFg3a) {
        pools.fg3_pct.push(r4(a.fg3m / a.fg3a));
      }
    }
  }

  console.log(`  ${scope.table}: pool ${pool.length} players (>= ${scope.minGames} games).`);
  const out: Record<string, number[]> = {};
  for (const [key, arr] of Object.entries(pools)) out[`${scope.prefix}${key}`] = asc(arr);
  return out;
}

async function main() {
  const merged: Record<string, number[]> = {};
  for (const scope of SCOPES) Object.assign(merged, await buildScope(scope));

  const body = Object.entries(merged)
    .map(([key, arr]) => `  ${key}: [${arr.join(', ')}],`)
    .join('\n');

  const file = `// app/data/statPercentiles.ts
//
// GENERATED by scripts/generate-stat-percentiles.ts — do not edit by hand.
// Sorted career averages and totals for the qualifying pools (regular season:
// >= ${QUALIFYING_GAMES} games; playoffs, keys prefixed "p_": >= ${PLAYOFF_QUALIFYING_GAMES} games; era/attempt
// gates per stat), used by lib/percentiles.ts to place a player's career
// numbers on an all-time percentile or exact rank. Rerun
// \`npm run generate:percentiles\` after a new season.

export const QUALIFYING_GAMES = ${QUALIFYING_GAMES};
export const PLAYOFF_QUALIFYING_GAMES = ${PLAYOFF_QUALIFYING_GAMES};

export const STAT_POOLS: Record<string, number[]> = {
${body}
};
`;

  writeFileSync(OUTPUT_PATH, file);
  console.log(`Wrote ${Object.keys(merged).length} pools to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
