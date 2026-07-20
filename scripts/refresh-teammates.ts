// scripts/refresh-teammates.ts
//
// Recompute the `teammates` pair aggregates from data/PlayerStatistics.csv and
// sync the Supabase table. Dry-run by default (prints a calibration report and
// the pending diff); pass --apply to write. Optional --dump <path> writes the
// top pairs (by shared games) to JSON for article/analysis use.
//
//   npx tsx scripts/refresh-teammates.ts
//   npx tsx scripts/refresh-teammates.ts --apply

import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// supabase-js constructs a RealtimeClient eagerly, which needs a native WebSocket.
// On Node < 22 that throws deep inside websocket-factory with a stack trace that
// gives no hint the real problem is the runtime version. Fail early and clearly.
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 22) {
  throw new Error(
    `Node ${process.versions.node} is too old: supabase-js needs native WebSocket (Node 22+).\n` +
      `Run this script under a newer runtime, e.g.:\n` +
      `  nvm use 24 && npm run refresh:teammates -- --apply`,
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CSV_PATH = resolve(process.cwd(), 'data/PlayerStatistics.csv');
const PAGE_SIZE = 1000;
const UPDATE_CONCURRENCY = 20;
const MAX_UPDATES = 200000;
const MAX_INSERTS = 500;
const MAX_DELETES = 40000;

// Game type is classified by the FIRST DIGIT of gameId, never the `gameType`
// column: that column carries 11 spellings (both 'Preseason' and 'Pre Season',
// four NBA Cup variants) plus blanks, and sparse roster rows sometimes leave it
// empty entirely.
//   1=Preseason  2=Regular Season  3=All-Star  4=Playoffs  5=Play-In  6=Cup final
// The graph models shared floor time, so Play-In and the Cup final count even
// though the NBA excludes the latter from official regular-season stats.
// Keep in sync with INCLUDED_GAME_ID_PREFIXES in the data repo's
// new_method/pull_teammates.py, which is the source of truth for this table.
const INCLUDED_GAME_ID_PREFIXES = new Set(['2', '4', '5', '6']);

const APPLY = process.argv.includes('--apply');
const dumpIdx = process.argv.indexOf('--dump');
const DUMP_PATH = dumpIdx > -1 ? process.argv[dumpIdx + 1] : null;

// CSV columns (header order in PlayerStatistics.csv)
const COL = {
  firstName: 0,
  lastName: 1,
  personId: 2,
  gameId: 3,
  gameDateTimeEst: 4,
  playerteamName: 6,
  gameType: 9,
  win: 13,
  numMinutes: 15,
  points: 16,
  assists: 17,
  reboundsTotal: 31,
  comment: 37,
} as const;

// Positive evidence that a player actually appeared. Minutes alone are NOT enough:
// ~94k rows (mostly 1940s-70s, when minutes went untracked) have numMinutes == 0
// but real box-score production, so a minutes-only test erases the pre-1980 era.
const APPEARANCE_STAT_COLS = [
  16, // points
  17, // assists
  18, // blocks
  19, // steals
  20, // fieldGoalsAttempted
  21, // fieldGoalsMade
  23, // threePointersAttempted
  26, // freeThrowsAttempted
  31, // reboundsTotal
  32, // foulsPersonal
  33, // turnovers
] as const;

// A row counts as an appearance only when there is no DNP/DND/NWT comment AND
// there is positive evidence of play.
function didPlay(f: string[]): boolean {
  const comment = (f[COL.comment] ?? '').trim();
  if (comment !== '') return false;
  if (Number(f[COL.numMinutes]) > 0) return true;
  return APPEARANCE_STAT_COLS.some((i) => Number(f[i]) > 0);
}

function splitCsvLine(line: string): string[] {
  if (!line.includes('"')) return line.split(',');
  const out: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

// Season-end year: Oct-Dec games belong to the season ending next year.
// Exception: the 2019-20 bubble ran into October 2020.
function seasonEndYear(dateStr: string): number {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  if (y === 2020 && m === 10) return 2020;
  return m >= 10 ? y + 1 : y;
}

interface TeamGame {
  ids: number[];
  pts: number[];
  ast: number[];
  reb: number[];
  played: boolean[];
  gameId: string;
  dates: string[];
  maxDate: string; // postponed games repeat a gameId; only the final date's rows are real
  win: boolean;
  team: string;
  year: number;
  type: string;
}

interface PairAgg {
  g: number; // shared box-score games
  w: number; // wins in those games
  pg: number; // shared games where BOTH appeared (equals g now that g is appearance-gated)
  cpts: number; // combined points across pg games
  cast: number; // combined assists across pg games
  creb: number; // combined rebounds across pg games
  teams: Set<string>;
  minY: number;
  maxY: number;
}

async function readCsv(): Promise<{
  teamGames: Map<string, TeamGame>;
  names: Map<number, string>;
}> {
  const teamGames = new Map<string, TeamGame>();
  const names = new Map<number, string>();
  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineNo = 0;
  let skipped = 0;

  for await (const raw of rl) {
    lineNo++;
    if (lineNo === 1) continue;
    const f = splitCsvLine(raw);
    if (f.length < 36) {
      skipped++;
      continue;
    }
    const personId = Number(f[COL.personId]);
    const gameId = f[COL.gameId];
    // ~110k sparse rows (roster/DNP entries) have no playerteamId, so group by
    // game + team NAME; the original table build included these rows.
    const team = f[COL.playerteamName];
    if (!personId || !gameId || !team) {
      skipped++;
      continue;
    }
    if (!names.has(personId)) {
      names.set(personId, `${f[COL.firstName]} ${f[COL.lastName]}`.trim());
    }
    const key = `${gameId}|${team}`;
    const date = f[COL.gameDateTimeEst].slice(0, 10);
    let tg = teamGames.get(key);
    if (!tg) {
      tg = {
        ids: [],
        pts: [],
        ast: [],
        reb: [],
        played: [],
        gameId,
        dates: [],
        maxDate: date,
        win: false,
        team,
        year: seasonEndYear(f[COL.gameDateTimeEst]),
        type: '',
      };
      teamGames.set(key, tg);
    }
    if (!tg.type && f[COL.gameType]) tg.type = f[COL.gameType];
    if (date > tg.maxDate) {
      tg.maxDate = date;
      tg.year = seasonEndYear(f[COL.gameDateTimeEst]);
    }
    // sparse rows carry win=0 even on wins; any row saying 1 means the team won
    if (f[COL.win] === '1') tg.win = true;
    tg.ids.push(personId);
    tg.pts.push(Number(f[COL.points]) || 0);
    tg.ast.push(Number(f[COL.assists]) || 0);
    tg.reb.push(Number(f[COL.reboundsTotal]) || 0);
    tg.played.push(didPlay(f));
    tg.dates.push(date);
  }
  console.log(`CSV: ${lineNo - 1} rows, ${teamGames.size} team-games, ${skipped} skipped.`);
  return { teamGames, names };
}

function buildPairs(teamGames: Map<string, TeamGame>): Map<string, PairAgg> {
  const pairs = new Map<string, PairAgg>();
  let excludedGames = 0;
  for (const tg of teamGames.values()) {
    if (!INCLUDED_GAME_ID_PREFIXES.has(tg.gameId.charAt(0))) {
      excludedGames++;
      continue;
    }
    const n = tg.ids.length;
    for (let i = 0; i < n; i++) {
      if (tg.dates[i] !== tg.maxDate) continue;
      if (!tg.played[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (tg.dates[j] !== tg.maxDate) continue;
        if (!tg.played[j]) continue;
        const a = tg.ids[i];
        const b = tg.ids[j];
        if (a === b) continue;
        const lo = a < b ? i : j;
        const hi = a < b ? j : i;
        const key = `${tg.ids[lo]}_${tg.ids[hi]}`;
        let p = pairs.get(key);
        if (!p) {
          p = { g: 0, w: 0, pg: 0, cpts: 0, cast: 0, creb: 0, teams: new Set(), minY: tg.year, maxY: tg.year };
          pairs.set(key, p);
        }
        p.g++;
        if (tg.win) p.w++;
        // Both players are known to have appeared -- the loops above skip the rest.
        p.pg++;
        p.cpts += tg.pts[i] + tg.pts[j];
        p.cast += tg.ast[i] + tg.ast[j];
        p.creb += tg.reb[i] + tg.reb[j];
        p.teams.add(tg.team);
        if (tg.year < p.minY) p.minY = tg.year;
        if (tg.year > p.maxY) p.maxY = tg.year;
      }
    }
  }
  console.log(`Excluded ${excludedGames} team-games (preseason/All-Star).`);
  return pairs;
}

type TeammateRow = Database['public']['Tables']['teammates']['Row'];

async function fetchTable(): Promise<TeammateRow[]> {
  const rows: TeammateRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('teammates')
      .select('*')
      .order('PlayerID', { ascending: true })
      .order('TeammateID', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed reading teammates: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

function teamsSet(s: string | null): Set<string> {
  return new Set(
    (s ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  );
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// Combined per-game output over games BOTH players logged minutes (null if none).
function combinedStats(agg: PairAgg): { ppg: number | null; apg: number | null; rpg: number | null } {
  if (agg.pg === 0) return { ppg: null, apg: null, rpg: null };
  const round1 = (x: number) => Math.round((x / agg.pg) * 10) / 10;
  return { ppg: round1(agg.cpts), apg: round1(agg.cast), rpg: round1(agg.creb) };
}

// PostgREST may hand back numeric columns as strings; compare with a small tolerance.
function numEq(existing: number | null, computed: number | null): boolean {
  if (existing == null || computed == null) return existing == null && computed == null;
  return Math.abs(Number(existing) - computed) < 0.05;
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function main() {
  const { teamGames, names } = await readCsv();
  const pairs = buildPairs(teamGames);
  console.log(`CSV pairs: ${pairs.size}`);

  console.log('Fetching teammates table…');
  const table = await fetchTable();
  console.log(`Table rows: ${table.length}`);

  let exact = 0;
  const changed: { row: TeammateRow; agg: PairAgg; patch: Partial<TeammateRow> }[] = [];
  const toDelete: TeammateRow[] = [];
  const tableKeys = new Set<string>();
  let onlyGames = 0;
  let onlyTeamsOrYear = 0;
  const changedByMaxY = new Map<number, number>();

  for (const row of table) {
    const key = `${row.PlayerID}_${row.TeammateID}`;
    tableKeys.add(key);
    const agg = pairs.get(key);
    if (!agg) {
      // no qualifying games left (exhibition-only pair) -> remove the row
      toDelete.push(row);
      continue;
    }
    const record = `${agg.w}-${agg.g - agg.w}`;
    const patch: Partial<TeammateRow> = {};
    if (row.SharedGamesTotal !== agg.g) patch.SharedGamesTotal = agg.g;
    if (row.SharedGamesRecord !== record) patch.SharedGamesRecord = record;
    if (row.StartYearTogether !== agg.minY) patch.StartYearTogether = agg.minY;
    if (row.EndYearTogether !== agg.maxY) patch.EndYearTogether = agg.maxY;
    const existingTeams = teamsSet(row.SharedTeams);
    if (!setsEqual(existingTeams, agg.teams)) {
      patch.SharedTeams = [...agg.teams].sort().join(', ');
    }
    const cs = combinedStats(agg);
    if (!numEq(row.CombinedPtsPerGame, cs.ppg)) patch.CombinedPtsPerGame = cs.ppg;
    if (!numEq(row.CombinedAstPerGame, cs.apg)) patch.CombinedAstPerGame = cs.apg;
    if (!numEq(row.CombinedRebPerGame, cs.rpg)) patch.CombinedRebPerGame = cs.rpg;
    if (Object.keys(patch).length === 0) {
      exact++;
      continue;
    }
    if (patch.SharedGamesTotal !== undefined || patch.SharedGamesRecord !== undefined) onlyGames++;
    else onlyTeamsOrYear++;
    changedByMaxY.set(agg.maxY, (changedByMaxY.get(agg.maxY) ?? 0) + 1);
    changed.push({ row, agg, patch });
  }
  const newPairs: { key: string; agg: PairAgg }[] = [];
  let skippedNameless = 0;
  for (const [key, agg] of pairs) {
    if (tableKeys.has(key)) continue;
    const [a, b] = key.split('_').map(Number);
    // some All-Star box scores carry ids with no name; the table excludes them
    if (!names.get(a) || !names.get(b)) {
      skippedNameless++;
      continue;
    }
    newPairs.push({ key, agg });
  }

  console.log('\n=== Diff report ===');
  console.log(`Exact matches:            ${exact} / ${table.length}`);
  console.log(`Rows needing update:      ${changed.length} (games/record: ${onlyGames}, teams/year only: ${onlyTeamsOrYear})`);
  console.log(`Rows to delete:           ${toDelete.length} (no qualifying games left)`);
  console.log(`In CSV, not in table:     ${newPairs.length} (+${skippedNameless} nameless ids ignored)`);
  console.log('Updates by last season together:');
  for (const [y, c] of [...changedByMaxY.entries()].sort((a, b) => b[0] - a[0])) {
    console.log(`  ${y}: ${c}`);
  }

  console.log('\nSample updates (top 15 by shared games):');
  for (const c of [...changed].sort((a, b) => b.agg.g - a.agg.g).slice(0, 15)) {
    console.log(
      `  ${c.row.PlayerName} & ${c.row.TeammateName}: ` +
        `${c.row.SharedGamesTotal} (${c.row.SharedGamesRecord}) -> ${c.agg.g} (${c.agg.w}-${c.agg.g - c.agg.w})` +
        (c.patch.SharedTeams ? ` teams: ${c.row.SharedTeams} -> ${c.patch.SharedTeams}` : ''),
    );
  }
  if (newPairs.length > 0) {
    console.log('\nSample new pairs:');
    for (const { key, agg } of newPairs.slice(0, 40)) {
      const [a, b] = key.split('_').map(Number);
      console.log(
        `  ${names.get(a) || '?'} (${a}) & ${names.get(b) || '?'} (${b}): ${agg.g} games, ${agg.minY}-${agg.maxY}, ${[...agg.teams].join('/')}`,
      );
    }
  }

  if (DUMP_PATH) {
    const top = [...pairs.entries()]
      .sort((a, b) => b[1].g - a[1].g)
      .slice(0, 2000)
      .map(([key, p]) => {
        const [a, b] = key.split('_').map(Number);
        return {
          aId: a,
          bId: b,
          aName: names.get(a),
          bName: names.get(b),
          games: p.g,
          wins: p.w,
          losses: p.g - p.w,
          winPct: +((p.w / p.g) * 100).toFixed(1),
          bothPlayedGames: p.pg,
          combinedPpg: p.pg > 0 ? +(p.cpts / p.pg).toFixed(1) : null,
          teams: [...p.teams].sort(),
          firstSeasonEnd: p.minY,
          lastSeasonEnd: p.maxY,
        };
      });
    writeFileSync(DUMP_PATH, JSON.stringify(top, null, 1));
    console.log(`\nDumped top ${top.length} pairs to ${DUMP_PATH}`);
  }

  if (toDelete.length > 0) {
    console.log('\nSample deletions (top 10 by shared games):');
    for (const row of [...toDelete].sort((a, b) => (b.SharedGamesTotal ?? 0) - (a.SharedGamesTotal ?? 0)).slice(0, 10)) {
      console.log(
        `  ${row.PlayerName} & ${row.TeammateName}: ${row.SharedGamesTotal} games, ${row.SharedTeams}`,
      );
    }
  }

  if (!APPLY) {
    console.log('\nDry run (no writes). Re-run with --apply to sync.');
    return;
  }
  if (changed.length > MAX_UPDATES) {
    throw new Error(`Refusing to apply: ${changed.length} updates exceeds the ${MAX_UPDATES} sanity gate.`);
  }
  if (newPairs.length > MAX_INSERTS) {
    throw new Error(`Refusing to apply: ${newPairs.length} inserts exceeds the ${MAX_INSERTS} sanity gate.`);
  }
  if (toDelete.length > MAX_DELETES) {
    throw new Error(`Refusing to apply: ${toDelete.length} deletes exceeds the ${MAX_DELETES} sanity gate.`);
  }

  console.log(`\nApplying ${changed.length} updates…`);
  let done = 0;
  await mapPool(changed, UPDATE_CONCURRENCY, async (c) => {
    const { error } = await supabase
      .from('teammates')
      .update(c.patch)
      .eq('PlayerID', c.row.PlayerID)
      .eq('TeammateID', c.row.TeammateID);
    if (error) throw new Error(`Update ${c.row.PlayerID}/${c.row.TeammateID} failed: ${error.message}`);
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${changed.length}`);
  });

  if (newPairs.length > 0) {
    console.log(`Inserting ${newPairs.length} new pairs…`);
    const inserts = newPairs.map(({ key, agg }) => {
      const [a, b] = key.split('_').map(Number);
      const cs = combinedStats(agg);
      return {
        PlayerID: a,
        TeammateID: b,
        PlayerName: names.get(a) ?? null,
        TeammateName: names.get(b) ?? '',
        SharedGamesTotal: agg.g,
        SharedGamesRecord: `${agg.w}-${agg.g - agg.w}`,
        SharedTeams: [...agg.teams].sort().join(', '),
        StartYearTogether: agg.minY,
        EndYearTogether: agg.maxY,
        CombinedPtsPerGame: cs.ppg,
        CombinedAstPerGame: cs.apg,
        CombinedRebPerGame: cs.rpg,
      };
    });
    for (let i = 0; i < inserts.length; i += 500) {
      const { error } = await supabase.from('teammates').insert(inserts.slice(i, i + 500));
      if (error) throw new Error(`Insert batch failed: ${error.message}`);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} exhibition-only pairs…`);
    let deleted = 0;
    await mapPool(toDelete, UPDATE_CONCURRENCY, async (row) => {
      const { error } = await supabase
        .from('teammates')
        .delete()
        .eq('PlayerID', row.PlayerID)
        .eq('TeammateID', row.TeammateID);
      if (error) throw new Error(`Delete ${row.PlayerID}/${row.TeammateID} failed: ${error.message}`);
      deleted++;
      if (deleted % 500 === 0) console.log(`  ${deleted}/${toDelete.length}`);
    });
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
