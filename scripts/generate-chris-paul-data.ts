// scripts/generate-chris-paul-data.ts
//
// Regenerates app/data/chrisPaulData.ts: Chris Paul's season-by-season arc across 21
// seasons, his per-36 scoring and passing rates, and his career totals set against the
// actual all-time assist leaderboard (computed from the full regularseasonstats table,
// not a hand-picked peer list).
//
// Method:
//  1. Season rows come from `regularseasonstats`, grouped by SeasonYear and summed, so a
//     midseason trade counts as one season rather than two. Per-game and per-36 figures
//     are computed from the summed totals (games- and minutes-weighted), never averaged
//     across team rows or derived from already-rounded rates.
//  2. The all-time leaderboard scans every player's career by the same grouping and
//     ranks by career assists. Ranks for assists and steals are positions in that full
//     scan, not within a curated subset.
//  3. Playoff career totals come from `playoffstats` by the same method.
//
// Era coverage: Paul debuted in 2006, so every stat on his rows clears the gates in
// lib/percentiles.ts. The all-time steals rank only reaches back to 1973-74, when the
// league started recording steals; assist and point totals are complete in every era.
// Minutes (for per-36) are complete for Paul's whole career.
//
// Bad-row guard: a player-season whose team rows sum past MAX_SEASON_GAMES is dropped as
// a merged-identity artifact. Reported to stdout.
//
// Reconciliation assert: each season's per-36 rate recomputed from the rounded per-game
// fields must agree with the totals-derived rate within rounding, so the chart and the
// prose can never disagree.
//
// Rerun after a new season lands in the DB.
// Usage: npm run generate:chris-paul

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

// A traded player can exceed 82 when his old and new teams' schedules overlap; the
// single-season record is 88 (Walt Bellamy, 1968-69), so anything past that is two
// people sharing a personId, not a schedule.
const MAX_SEASON_GAMES = 88;

const CHRIS_PAUL = 101108;
const LEADERBOARD_SIZE = 8;
const PAGE_SIZE = 1000;

const OUTPUT_PATH = resolve(process.cwd(), 'app/data/chrisPaulData.ts');

interface StatRow {
  personId: number;
  firstName: string | null;
  lastName: string | null;
  SeasonYear: number;
  playerteamName: string;
  G: number | null;
  MP_total: number | null;
  PTS_total: number | null;
  AST_total: number | null;
  STL_total: number | null;
}

const COLUMNS =
  'personId, firstName, lastName, SeasonYear, playerteamName, G, MP_total, PTS_total, AST_total, STL_total';

async function fetchAll(
  table: 'regularseasonstats' | 'playoffstats',
  personId?: number,
): Promise<StatRow[]> {
  const rows: StatRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(COLUMNS).range(from, from + PAGE_SIZE - 1);
    if (personId !== undefined) query = query.eq('personId', personId);
    const { data, error } = await query;
    if (error) throw new Error(`${table} query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as StatRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

interface SeasonTotals {
  season: number;
  teams: string[];
  games: number;
  minutes: number;
  points: number;
  assists: number;
  steals: number;
}

function groupBySeason(rows: StatRow[], who?: string): SeasonTotals[] {
  const bySeason = new Map<number, SeasonTotals>();
  for (const row of rows) {
    const games = row.G ?? 0;
    if (games <= 0) continue;
    let entry = bySeason.get(row.SeasonYear);
    if (!entry) {
      entry = { season: row.SeasonYear, teams: [], games: 0, minutes: 0, points: 0, assists: 0, steals: 0 };
      bySeason.set(row.SeasonYear, entry);
    }
    if (row.playerteamName && !entry.teams.includes(row.playerteamName)) {
      entry.teams.push(row.playerteamName);
    }
    entry.games += games;
    entry.minutes += row.MP_total ?? 0;
    entry.points += row.PTS_total ?? 0;
    entry.assists += row.AST_total ?? 0;
    entry.steals += row.STL_total ?? 0;
  }
  const kept: SeasonTotals[] = [];
  for (const entry of [...bySeason.values()].sort((a, b) => a.season - b.season)) {
    if (entry.games > MAX_SEASON_GAMES) {
      console.log(
        `  dropped ${who ?? 'unknown'} season ${entry.season}: ${entry.games} games exceeds ${MAX_SEASON_GAMES} (merged identity)`,
      );
      continue;
    }
    kept.push(entry);
  }
  return kept;
}

function seasonLabel(season: number): string {
  return `${season - 1}-${String(season).slice(2)}`;
}

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function perGame(total: number, games: number, places = 1): number {
  return games > 0 ? round(total / games, places) : 0;
}

function per36(total: number, minutes: number): number {
  return minutes > 0 ? round((total / minutes) * 36) : 0;
}

function sumTotals(seasons: SeasonTotals[]) {
  return seasons.reduce(
    (acc, s) => ({
      games: acc.games + s.games,
      minutes: acc.minutes + s.minutes,
      points: acc.points + s.points,
      assists: acc.assists + s.assists,
      steals: acc.steals + s.steals,
    }),
    { games: 0, minutes: 0, points: 0, assists: 0, steals: 0 },
  );
}

interface CareerAgg {
  personId: number;
  name: string;
  seasons: number;
  games: number;
  points: number;
  assists: number;
  steals: number;
  assistsPerGame: number;
}

async function main() {
  console.log('Fetching all regular season rows (full table scan for the leaderboard)');
  const regularRows = await fetchAll('regularseasonstats');
  console.log(`  ${regularRows.length} rows`);
  console.log('Fetching playoff rows');
  const playoffRows = await fetchAll('playoffstats', CHRIS_PAUL);

  const byPlayer = new Map<number, StatRow[]>();
  for (const row of regularRows) {
    const list = byPlayer.get(row.personId);
    if (list) list.push(row);
    else byPlayer.set(row.personId, [row]);
  }

  const careers: CareerAgg[] = [];
  for (const [personId, rows] of byPlayer) {
    const latest = rows.reduce((a, b) => (b.SeasonYear > a.SeasonYear ? b : a));
    const name = `${latest.firstName ?? ''} ${latest.lastName ?? ''}`.trim() || `Player ${personId}`;
    const grouped = groupBySeason(rows, name);
    const totals = sumTotals(grouped);
    if (totals.games === 0) continue;
    careers.push({
      personId,
      name,
      seasons: grouped.length,
      games: totals.games,
      points: totals.points,
      assists: totals.assists,
      steals: totals.steals,
      assistsPerGame: perGame(totals.assists, totals.games),
    });
  }

  const byAssists = [...careers].sort((a, b) => b.assists - a.assists);
  const bySteals = [...careers].sort((a, b) => b.steals - a.steals);
  const leaders = byAssists.slice(0, LEADERBOARD_SIZE);

  const assistsAllTimeRank = byAssists.findIndex((p) => p.personId === CHRIS_PAUL) + 1;
  const stealsAllTimeRank = bySteals.findIndex((p) => p.personId === CHRIS_PAUL) + 1;
  if (assistsAllTimeRank === 0 || stealsAllTimeRank === 0) {
    throw new Error('Chris Paul missing from the all-time scan');
  }
  const assistLeader = byAssists[0];
  const paulCareer = byAssists[assistsAllTimeRank - 1];
  const pointsRankAmongLeaders =
    [...leaders].sort((a, b) => b.points - a.points).findIndex((p) => p.personId === CHRIS_PAUL) + 1;

  const paulSeasons = groupBySeason(byPlayer.get(CHRIS_PAUL) ?? [], 'Chris Paul');
  if (!paulSeasons.length) throw new Error('no Chris Paul seasons found');

  const seasons = paulSeasons.map((s) => ({
    season: s.season,
    label: seasonLabel(s.season),
    team: s.teams.join(' / '),
    games: s.games,
    minutesPerGame: perGame(s.minutes, s.games),
    pointsPerGame: perGame(s.points, s.games),
    assistsPerGame: perGame(s.assists, s.games),
    stealsPerGame: perGame(s.steals, s.games, 2),
    pointsPer36: per36(s.points, s.minutes),
    assistsPer36: per36(s.assists, s.minutes),
  }));

  // The chart and the prose must not disagree: the per-36 rate recomputed from the
  // rounded per-game fields has to land within rounding of the totals-derived rate.
  for (const s of seasons) {
    if (s.minutesPerGame <= 0) continue;
    const fromRounded = (s.pointsPerGame / s.minutesPerGame) * 36;
    const fromRoundedAst = (s.assistsPerGame / s.minutesPerGame) * 36;
    if (Math.abs(fromRounded - s.pointsPer36) > 0.3 || Math.abs(fromRoundedAst - s.assistsPer36) > 0.3) {
      throw new Error(
        `per-36 reconciliation failed for ${s.label}: totals say ${s.pointsPer36}/${s.assistsPer36}, per-game fields say ${round(fromRounded)}/${round(fromRoundedAst)}`,
      );
    }
  }

  const career = sumTotals(paulSeasons);
  const playoffSeasons = groupBySeason(playoffRows, 'Chris Paul (playoffs)');
  const playoffs = sumTotals(playoffSeasons);

  // Peaks are derived, never hardcoded, so the prose survives a data refresh.
  const peakScoring = seasons.reduce((a, b) => (b.pointsPerGame > a.pointsPerGame ? b : a));
  const peakAssists = seasons.reduce((a, b) => (b.assistsPerGame > a.assistsPerGame ? b : a));
  const peakAssistRate = seasons.reduce((a, b) => (b.assistsPer36 > a.assistsPer36 ? b : a));
  const peakScoringRate = seasons.reduce((a, b) => (b.pointsPer36 > a.pointsPer36 ? b : a));
  const finalSeason = seasons[seasons.length - 1];
  const rookieSeason = seasons[0];
  const teams = [...new Set(paulSeasons.flatMap((s) => s.teams))];
  const full82 = seasons.filter((s) => s.games >= 82);

  const context = {
    seasonCount: seasons.length,
    firstSeasonLabel: rookieSeason.label,
    finalSeasonLabel: finalSeason.label,
    firstTeam: rookieSeason.team,
    finalTeam: finalSeason.team,
    games: career.games,
    points: career.points,
    assists: career.assists,
    steals: career.steals,
    pointsPerGame: perGame(career.points, career.games),
    assistsPerGame: perGame(career.assists, career.games),
    stealsPerGame: perGame(career.steals, career.games, 1),
    teamCount: teams.length,
    peakScoringLabel: peakScoring.label,
    peakScoringPoints: peakScoring.pointsPerGame,
    peakScoringAssists: peakScoring.assistsPerGame,
    peakAssistsLabel: peakAssists.label,
    peakAssistsPerGame: peakAssists.assistsPerGame,
    peakScoringRateLabel: peakScoringRate.label,
    peakPointsPer36: peakScoringRate.pointsPer36,
    peakAssistRateLabel: peakAssistRate.label,
    peakAssistRatePer36: peakAssistRate.assistsPer36,
    peakAssistRateSeasonNumber: seasons.indexOf(peakAssistRate) + 1,
    peakAssistRateTeam: peakAssistRate.team,
    rookiePointsPerGame: rookieSeason.pointsPerGame,
    rookieStealsPerGame: rookieSeason.stealsPerGame,
    rookieAssistsPer36: rookieSeason.assistsPer36,
    finalGames: finalSeason.games,
    finalPointsPerGame: finalSeason.pointsPerGame,
    finalMinutesPerGame: finalSeason.minutesPerGame,
    finalPointsPer36: finalSeason.pointsPer36,
    finalAssistsPer36: finalSeason.assistsPer36,
    full82Count: full82.length,
    full82FirstLabel: full82[0]?.label ?? '',
    full82LastLabel: full82[full82.length - 1]?.label ?? '',
    full82LastSeasonNumber: full82.length ? seasons.indexOf(full82[full82.length - 1]) + 1 : 0,
    full82LastTeam: full82[full82.length - 1]?.team ?? '',
    playoffGames: playoffs.games,
    playoffPoints: playoffs.points,
    playoffAssists: playoffs.assists,
    playoffPointsPerGame: perGame(playoffs.points, playoffs.games),
    playoffAssistsPerGame: perGame(playoffs.assists, playoffs.games),
    leaderCount: leaders.length,
    assistsAllTimeRank,
    stealsAllTimeRank,
    pointsRankAmongLeaders,
    assistLeaderName: assistLeader.name,
    assistsBehindLeader: assistLeader.assists - paulCareer.assists,
  };

  const file = `// GENERATED by scripts/generate-chris-paul-data.ts. Do not hand-edit.
//
// Chris Paul's season-by-season regular season arc (per-game and per-36 rates, both
// computed from summed season totals so a midseason trade is one season), plus the
// all-time career assist leaderboard computed from a full scan of regularseasonstats.
// Ranks are positions in that full scan, not within a curated peer list.
//
// Paul debuted in 2006, so all of his figures clear the era-coverage gates in
// lib/percentiles.ts. Steals exist as an official stat only from 1973-74, so the
// all-time steals rank covers the steal era. Playoff figures cover ${context.playoffGames} games.
//
// Box scores: Eoin A Moore's Kaggle dataset (CC0 1.0), spot-checked by hand against
// Basketball Reference. Data current through the 2026 season.

export interface CareerSeason {
  season: number;
  label: string;
  team: string;
  games: number;
  minutesPerGame: number;
  pointsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  pointsPer36: number;
  assistsPer36: number;
}

export interface LeaderCareer {
  personId: number;
  name: string;
  seasons: number;
  games: number;
  points: number;
  assists: number;
  steals: number;
  assistsPerGame: number;
}

export const seasons: CareerSeason[] = ${JSON.stringify(seasons, null, 2)};

// Top ${leaders.length} all-time in career assists, in order.
export const leaders: LeaderCareer[] = ${JSON.stringify(leaders, null, 2)};

// Deliberately not \`as const\`: the article compares ranks and matches season labels at
// runtime, and literal-narrowed values make those checks unreachable to the compiler.
export const context: {
  seasonCount: number;
  firstSeasonLabel: string;
  finalSeasonLabel: string;
  firstTeam: string;
  finalTeam: string;
  games: number;
  points: number;
  assists: number;
  steals: number;
  pointsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  teamCount: number;
  peakScoringLabel: string;
  peakScoringPoints: number;
  peakScoringAssists: number;
  peakAssistsLabel: string;
  peakAssistsPerGame: number;
  peakScoringRateLabel: string;
  peakPointsPer36: number;
  peakAssistRateLabel: string;
  peakAssistRatePer36: number;
  peakAssistRateSeasonNumber: number;
  peakAssistRateTeam: string;
  rookiePointsPerGame: number;
  rookieStealsPerGame: number;
  rookieAssistsPer36: number;
  finalGames: number;
  finalPointsPerGame: number;
  finalMinutesPerGame: number;
  finalPointsPer36: number;
  finalAssistsPer36: number;
  full82Count: number;
  full82FirstLabel: string;
  full82LastLabel: string;
  full82LastSeasonNumber: number;
  full82LastTeam: string;
  playoffGames: number;
  playoffPoints: number;
  playoffAssists: number;
  playoffPointsPerGame: number;
  playoffAssistsPerGame: number;
  leaderCount: number;
  assistsAllTimeRank: number;
  stealsAllTimeRank: number;
  pointsRankAmongLeaders: number;
  assistLeaderName: string;
  assistsBehindLeader: number;
} = ${JSON.stringify(context, null, 2)};
`;

  writeFileSync(OUTPUT_PATH, file);

  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`  ${seasons.length} seasons, ${context.games} games, ${context.teamCount} teams`);
  console.log(
    `  career ${context.pointsPerGame} pts / ${context.assistsPerGame} ast / ${context.stealsPerGame} stl`,
  );
  console.log(
    `  peak per-36: ${context.peakPointsPer36} pts (${context.peakScoringRateLabel}), ${context.peakAssistRatePer36} ast (${context.peakAssistRateLabel}, season ${context.peakAssistRateSeasonNumber})`,
  );
  console.log(
    `  final ${context.finalSeasonLabel}: ${context.finalGames} games, ${context.finalPointsPerGame} pts in ${context.finalMinutesPerGame} min (${context.finalPointsPer36}/${context.finalAssistsPer36} per 36)`,
  );
  console.log(
    `  82-game seasons: ${context.full82Count} (${context.full82FirstLabel}, ${context.full82LastLabel} in season ${context.full82LastSeasonNumber})`,
  );
  console.log(
    `  all-time ranks: assists ${context.assistsAllTimeRank} (${fmtNum(context.assistsBehindLeader)} behind ${context.assistLeaderName}), steals ${context.stealsAllTimeRank}, points ${context.pointsRankAmongLeaders} of the top ${context.leaderCount} passers`,
  );
  console.log(`  playoffs: ${context.playoffGames} games, ${context.playoffPointsPerGame} pts, ${context.playoffAssistsPerGame} ast`);
  console.log('  all-time assist leaderboard:');
  leaders.forEach((p, i) => {
    console.log(
      `    ${String(i + 1).padStart(2)}. ${p.name.padEnd(18)} ${String(p.assists).padStart(6)} ast, ${String(p.steals).padStart(5)} stl, ${String(p.points).padStart(6)} pts in ${p.games} games`,
    );
  });
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
