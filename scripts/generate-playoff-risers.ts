// scripts/generate-playoff-risers.ts
//
// Regenerates app/data/playoffRisersData.ts: regular season vs playoff scoring
// splits from regularseasonstats + playoffstats, computed PER SEASON and
// weighted by playoff exposure. Each playoff run is compared only against that
// same season's regular season average; the career diff is the playoff-game-
// weighted mean of those season diffs. Equivalently: poPpg is the player's true
// career playoff average, and rsPpg is the "expected" baseline, what he would
// have averaged had he scored at each season's regular season level in every
// playoff game he actually played. This kills both classic distortions: seasons
// where a player missed the playoffs never count, and a career whose playoff
// games cluster in low-role (or high-role) seasons is not skewed by the
// mismatch between regular season and playoff game weights.
// Rerun after a new season lands in the DB.
// Usage: npm run generate:playoff-risers

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
const MIN_PLAYOFF_GAMES = 50;
const MIN_MATCHED_REGULAR_GAMES = 150; // regular season games in playoff seasons only
const MIN_SEASON_REGULAR_GAMES = 5; // a season needs a real RS sample to set a baseline
const MIN_PLAYOFF_MPG_FOR_RATE = 15; // keeps garbage-time outliers off the per-36 list
// Game-log minutes AND shot attempts are incomplete before ~1971 (league-wide recorded
// MP per player-game only reaches the expected ~22+ from 1971 on, and league TS% computed
// from the logs is impossibly high before the mid-60s), so minutes- and attempt-derived
// stats (per-36, MPG, TS%) use 1971+ seasons only and are emitted as null when a career
// lacks enough covered games. Points and games are complete for all eras.
const DETAIL_RELIABLE_FROM = 1971;
const RATE_MIN_PLAYOFF_GAMES = 20;
const RATE_MIN_REGULAR_GAMES = 50;
// Rates must describe (nearly) the same career window as the volume stats, so a career
// whose games fall mostly before the minutes cutoff gets null rates rather than a
// late-career-only per-36 presented next to full-career PPG.
const RATE_MIN_COVERAGE = 0.75;
const OUTPUT_PATH = resolve(process.cwd(), 'app/data/playoffRisersData.ts');

const LEGEND_NAMES = [
  'Michael Jordan',
  'LeBron James',
  'Kareem Abdul-Jabbar',
  'Wilt Chamberlain',
  'Kobe Bryant',
  'Kevin Durant',
  'Stephen Curry',
  'Larry Bird',
  'Magic Johnson',
  "Shaquille O'Neal",
  'Tim Duncan',
  'Hakeem Olajuwon',
  'Dirk Nowitzki',
  'Allen Iverson',
  'Kawhi Leonard',
  'James Harden',
  'Giannis Antetokounmpo',
  'Nikola Jokic',
  'Luka Doncic',
  'Jayson Tatum',
  'Shai Gilgeous-Alexander',
  'Jalen Brunson',
  'Karl-Anthony Towns',
];

interface StatRow {
  personId: number;
  firstName: string | null;
  lastName: string | null;
  SeasonYear: number;
  G: number | null;
  PTS_total: number | null;
  MP_total: number | null;
  FGA_total: number | null;
  FTA_total: number | null;
}

interface SeasonAgg {
  G: number;
  PTS: number;
  MP: number;
  FGA: number;
  FTA: number;
}

async function fetchAll(table: 'regularseasonstats' | 'playoffstats'): Promise<StatRow[]> {
  const columns = 'personId, firstName, lastName, SeasonYear, G, PTS_total, MP_total, FGA_total, FTA_total';
  const rows: StatRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed reading ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as StatRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

// personId -> SeasonYear -> season totals (multiple team rows in a season fold together)
function aggregateBySeason(rows: StatRow[]): Map<number, Map<number, SeasonAgg>> {
  const m = new Map<number, Map<number, SeasonAgg>>();
  for (const r of rows) {
    const seasons = m.get(r.personId) ?? new Map<number, SeasonAgg>();
    const s = seasons.get(r.SeasonYear) ?? { G: 0, PTS: 0, MP: 0, FGA: 0, FTA: 0 };
    s.G += r.G ?? 0;
    s.PTS += r.PTS_total ?? 0;
    s.MP += r.MP_total ?? 0;
    s.FGA += r.FGA_total ?? 0;
    s.FTA += r.FTA_total ?? 0;
    seasons.set(r.SeasonYear, s);
    m.set(r.personId, seasons);
  }
  return m;
}

function nameById(rows: StatRow[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const r of rows) {
    if (!m.has(r.personId)) m.set(r.personId, `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim());
  }
  return m;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

interface Split {
  personId: number;
  name: string;
  rsPpg: number;
  poPpg: number;
  diff: number;
  rsP36: number | null;
  poP36: number | null;
  d36: number | null;
  rsTs: number | null;
  poTs: number | null;
  rsMpg: number | null;
  poMpg: number | null;
  rsG: number;
  poG: number;
  firstYear: number;
  lastYear: number;
}

async function main() {
  console.log('Loading regularseasonstats and playoffstats…');
  const [rsRows, poRows] = await Promise.all([fetchAll('regularseasonstats'), fetchAll('playoffstats')]);
  const rsBySeason = aggregateBySeason(rsRows);
  const poBySeason = aggregateBySeason(poRows);
  const names = nameById(rsRows);

  const qualified: Split[] = [];
  for (const [personId, poSeasons] of poBySeason) {
    const rsSeasons = rsBySeason.get(personId);
    if (!rsSeasons) continue;
    // Only seasons where the player logged both a real regular season sample and a
    // playoff appearance.
    const matchedYears = [...poSeasons.keys()].filter(
      (y) => (rsSeasons.get(y)?.G ?? 0) >= MIN_SEASON_REGULAR_GAMES && (poSeasons.get(y)?.G ?? 0) > 0,
    );
    if (matchedYears.length === 0) continue;
    const name = names.get(personId) ?? '';

    // Volume: actual playoff average vs the playoff-game-weighted regular season baseline.
    let poG = 0;
    let poPTS = 0;
    let rsG = 0;
    let baselinePts = 0; // sum over seasons of poG_s * rsPpg_s
    for (const y of matchedYears) {
      const po = poSeasons.get(y)!;
      const rs = rsSeasons.get(y)!;
      poG += po.G;
      poPTS += po.PTS;
      rsG += rs.G;
      baselinePts += po.G * (rs.PTS / rs.G);
    }
    if (poG < MIN_PLAYOFF_GAMES || rsG < MIN_MATCHED_REGULAR_GAMES) continue;
    const rsPpg = baselinePts / poG;
    const poPpg = poPTS / poG;

    // Minutes- and attempt-derived stats come only from seasons with reliable coverage,
    // using the same exposure weighting: actual playoff rates vs baselines weighted by
    // playoff minutes (per-36, MPG) or playoff true-shot attempts (TS%).
    const rateYears = matchedYears.filter((y) => {
      if (y < DETAIL_RELIABLE_FROM) return false;
      const po = poSeasons.get(y)!;
      const rs = rsSeasons.get(y)!;
      return po.MP > 0 && rs.MP > 0 && po.FGA + po.FTA > 0 && rs.FGA + rs.FTA > 0;
    });
    let ratePoG = 0;
    let rateRsG = 0;
    let poMP = 0;
    let poRatePTS = 0;
    let baseP36MP = 0; // sum of poMP_s * rsP36_s
    let baseMpgG = 0; // sum of poG_s * rsMpg_s
    let poTSA = 0; // playoff true-shot attempts: FGA + 0.44 * FTA
    let poTsPTS = 0;
    let baseTsPts = 0; // sum of poTSA_s * rsTs_s (as points per 2*TSA fraction)
    for (const y of rateYears) {
      const po = poSeasons.get(y)!;
      const rs = rsSeasons.get(y)!;
      ratePoG += po.G;
      rateRsG += rs.G;
      poMP += po.MP;
      poRatePTS += po.PTS;
      baseP36MP += po.MP * ((rs.PTS / rs.MP) * 36);
      baseMpgG += po.G * (rs.MP / rs.G);
      const seasonPoTsa = po.FGA + 0.44 * po.FTA;
      const seasonRsTsa = rs.FGA + 0.44 * rs.FTA;
      poTSA += seasonPoTsa;
      poTsPTS += po.PTS;
      baseTsPts += seasonPoTsa * (rs.PTS / (2 * seasonRsTsa)) * 100;
    }
    const ratesOk =
      rateYears.length > 0 &&
      ratePoG >= RATE_MIN_PLAYOFF_GAMES &&
      rateRsG >= RATE_MIN_REGULAR_GAMES &&
      ratePoG / poG >= RATE_MIN_COVERAGE &&
      rateRsG / rsG >= RATE_MIN_COVERAGE &&
      poMP > 0 &&
      poTSA > 0;
    const rsP36 = ratesOk ? r1(baseP36MP / poMP) : null;
    const poP36 = ratesOk ? r1((poRatePTS / poMP) * 36) : null;

    qualified.push({
      personId,
      name,
      rsPpg: r1(rsPpg),
      poPpg: r1(poPpg),
      diff: r1(poPpg - rsPpg),
      rsP36,
      poP36,
      d36: rsP36 !== null && poP36 !== null ? r1(poP36 - rsP36) : null,
      rsTs: ratesOk ? r1(baseTsPts / poTSA) : null,
      poTs: ratesOk ? r1((poTsPTS / (2 * poTSA)) * 100) : null,
      rsMpg: ratesOk ? r1(baseMpgG / ratePoG) : null,
      poMpg: ratesOk ? r1(poMP / ratePoG) : null,
      rsG,
      poG,
      firstYear: Math.min(...matchedYears),
      lastYear: Math.max(...matchedYears),
    });
  }
  console.log(`  ${qualified.length} players qualify (${MIN_PLAYOFF_GAMES}+ playoff G, ${MIN_MATCHED_REGULAR_GAMES}+ matched regular season G).`);

  const byDiff = [...qualified].sort((a, b) => b.diff - a.diff || b.poG - a.poG);
  const topRisers = byDiff.slice(0, 15);
  const starFallers = byDiff
    .filter((p) => p.rsPpg >= 15)
    .sort((a, b) => a.diff - b.diff || b.poG - a.poG)
    .slice(0, 10);
  const per36Risers = [...qualified]
    .filter((p) => p.d36 !== null && p.poMpg !== null && p.poMpg >= MIN_PLAYOFF_MPG_FOR_RATE)
    .sort((a, b) => b.d36! - a.d36! || b.poG - a.poG)
    .slice(0, 10);
  const activeRisers = byDiff.filter((p) => p.lastYear >= 2025).slice(0, 12);

  const legendSplits: Split[] = [];
  for (const name of LEGEND_NAMES) {
    const matches = qualified.filter((p) => p.name === name);
    if (matches.length === 0) {
      console.warn(`  WARNING: legend not found or unqualified: ${name}`);
      continue;
    }
    matches.sort((a, b) => b.rsG - a.rsG);
    legendSplits.push(matches[0]);
  }
  legendSplits.sort((a, b) => b.diff - a.diff);

  const n = qualified.length;
  const mean = (list: Split[], f: (p: Split) => number) =>
    r1(list.reduce((s, p) => s + f(p), 0) / list.length);
  const rated = qualified.filter((p) => p.d36 !== null);
  const leagueContext = {
    qualified: n,
    rated: rated.length,
    avgMpgDiff: mean(rated, (p) => p.poMpg! - p.rsMpg!),
    avgPpgDiff: mean(qualified, (p) => p.diff),
    avgP36Diff: mean(rated, (p) => p.d36!),
    avgTsDiff: mean(rated, (p) => p.poTs! - p.rsTs!),
    pctP36Drops: Math.round((rated.filter((p) => p.d36! < 0).length / rated.length) * 100),
    pctTsDrops: Math.round((rated.filter((p) => p.poTs! < p.rsTs!).length / rated.length) * 100),
  };
  console.log('  League context:', leagueContext);

  const scatterPlayers = [...qualified]
    .sort((a, b) => a.personId - b.personId)
    .map((p) => ({ personId: p.personId, name: p.name, rsPpg: p.rsPpg, poPpg: p.poPpg }));

  const emitSplit = (p: Split) =>
    `  { personId: ${p.personId}, name: ${JSON.stringify(p.name)}, rsPpg: ${p.rsPpg}, poPpg: ${p.poPpg}, diff: ${p.diff}, rsP36: ${p.rsP36}, poP36: ${p.poP36}, d36: ${p.d36}, rsTs: ${p.rsTs}, poTs: ${p.poTs}, rsMpg: ${p.rsMpg}, poMpg: ${p.poMpg}, rsG: ${p.rsG}, poG: ${p.poG}, firstYear: ${p.firstYear}, lastYear: ${p.lastYear} }`;
  const emitList = (list: Split[]) => list.map(emitSplit).join(',\n');

  const file = `// app/data/playoffRisersData.ts
//
// GENERATED by scripts/generate-playoff-risers.ts. Do not hand-edit.
// PER-SEASON, EXPOSURE-WEIGHTED regular season vs playoff splits from
// regularseasonstats + playoffstats. poPpg is the player's true career playoff average;
// rsPpg is the expected baseline: each season's regular season PPG weighted by that
// season's playoff games (what he would have averaged scoring at regular season level in
// every playoff game he played). diff = poPpg - rsPpg, so a season where a player missed
// the playoffs, or played a different role than when his playoff games happened, never
// distorts the comparison. Rates follow the same scheme, weighted by playoff minutes
// (per-36, MPG) or playoff true-shot attempts (TS%).
// Qualification: ${MIN_PLAYOFF_GAMES}+ playoff games and ${MIN_MATCHED_REGULAR_GAMES}+ regular season games in
// matched seasons, ${MIN_SEASON_REGULAR_GAMES}+ regular season games for a season to count (${n} players).
// Minutes- and attempt-derived stats use only ${DETAIL_RELIABLE_FROM}+ seasons because earlier game logs
// record minutes and shot attempts for a fraction of games; they are null when a career
// lacks ${RATE_MIN_PLAYOFF_GAMES}+ playoff and ${RATE_MIN_REGULAR_GAMES}+ regular season covered games. Points and games are
// complete for all eras. Per-36 leaderboard additionally requires ${MIN_PLAYOFF_MPG_FOR_RATE}+ playoff MPG.
// TS% = PTS / (2 * (FGA + 0.44 * FTA)). Data current through the ${Math.max(...qualified.map((p) => p.lastYear))} playoffs.

export interface PlayoffSplit {
  personId: number;
  name: string;
  rsPpg: number;
  poPpg: number;
  diff: number;
  rsP36: number | null;
  poP36: number | null;
  d36: number | null;
  rsTs: number | null;
  poTs: number | null;
  rsMpg: number | null;
  poMpg: number | null;
  rsG: number;
  poG: number;
  firstYear: number;
  lastYear: number;
}

export interface ScatterPlayer {
  personId: number;
  name: string;
  rsPpg: number;
  poPpg: number;
}

export const leagueContext = {
  qualified: ${leagueContext.qualified},
  rated: ${leagueContext.rated},
  avgMpgDiff: ${leagueContext.avgMpgDiff},
  avgPpgDiff: ${leagueContext.avgPpgDiff},
  avgP36Diff: ${leagueContext.avgP36Diff},
  avgTsDiff: ${leagueContext.avgTsDiff},
  pctP36Drops: ${leagueContext.pctP36Drops},
  pctTsDrops: ${leagueContext.pctTsDrops},
};

export const topRisers: PlayoffSplit[] = [
${emitList(topRisers)},
];

export const starFallers: PlayoffSplit[] = [
${emitList(starFallers)},
];

export const per36Risers: PlayoffSplit[] = [
${emitList(per36Risers)},
];

export const legendSplits: PlayoffSplit[] = [
${emitList(legendSplits)},
];

export const activeRisers: PlayoffSplit[] = [
${emitList(activeRisers)},
];

export const scatterPlayers: ScatterPlayer[] = [
${scatterPlayers.map((p) => `  { personId: ${p.personId}, name: ${JSON.stringify(p.name)}, rsPpg: ${p.rsPpg}, poPpg: ${p.poPpg} }`).join(',\n')},
];
`;

  writeFileSync(OUTPUT_PATH, file);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log('\nTop risers:');
  topRisers.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}: ${p.rsPpg} -> ${p.poPpg} (+${p.diff})`));
  console.log('\nStar fallers:');
  starFallers.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}: ${p.rsPpg} -> ${p.poPpg} (${p.diff})`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
