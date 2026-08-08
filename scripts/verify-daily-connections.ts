// scripts/verify-daily-connections.ts
//
// Audit every stored Six Degrees daily against the teammate graph: each
// consecutive pair in solution_path_ids must be a real row in `teammates`, the
// path must start and end on the puzzle's own two players, and the path must be
// a SHORTEST one (a walkable-but-longer route shows players a worse solution
// than the one they found). Exits 1 if any puzzle fails, so it works as a
// regression check after applying scripts/sql/six-degrees-path-integrity.sql.
//
//   npm run verify:daily-connections
//   npm run verify:daily-connections -- --limit 100
//
// Uses PostgREST over fetch rather than supabase-js so it runs on any Node
// version (supabase-js eagerly builds a RealtimeClient that needs Node 22+).

import { resolve } from 'node:path';
import { config } from 'dotenv';
import { pairKey, auditPath, shortestPath, type PairKey } from '../lib/sixDegreesPath';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');

const limitIdx = process.argv.indexOf('--limit');
const LIMIT = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : Infinity;
const PAGE_SIZE = 1000;

const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface Graph {
  edges: Set<PairKey>;
  adjacency: Map<number, number[]>;
}

async function loadGraph(): Promise<Graph> {
  const edges = new Set<PairKey>();
  const adjacency = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    const list = adjacency.get(a);
    if (list) list.push(b);
    else adjacency.set(a, [b]);
  };
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await getJson<{ PlayerID: number; TeammateID: number }[]>(
      `teammates?select=PlayerID,TeammateID&order=PlayerID.asc,TeammateID.asc` +
        `&offset=${offset}&limit=${PAGE_SIZE}`,
    );
    for (const r of rows) {
      edges.add(pairKey(r.PlayerID, r.TeammateID));
      link(r.PlayerID, r.TeammateID);
      link(r.TeammateID, r.PlayerID);
    }
    process.stdout.write(`\r  loaded ${edges.size} edges`);
    if (rows.length < PAGE_SIZE) break;
  }
  process.stdout.write('\n');
  return { edges, adjacency };
}

interface DailyRow {
  game_date: string;
  player_a_id: number;
  player_b_id: number;
  player_a_name: string;
  player_b_name: string;
  solution_path_ids: number[] | null;
  solution_path_names: string[] | null;
}

async function main() {
  console.log('Loading teammate graph...');
  const { edges, adjacency } = await loadGraph();

  console.log('Loading dailies...');
  const dailies: DailyRow[] = [];
  for (let offset = 0; dailies.length < LIMIT; offset += PAGE_SIZE) {
    const rows = await getJson<DailyRow[]>(
      `daily_connection_games?select=*&order=game_date.desc&offset=${offset}&limit=${PAGE_SIZE}`,
    );
    dailies.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  const checked = dailies.slice(0, Math.min(dailies.length, LIMIT));

  const failures: string[] = [];
  const degreeHistogram = new Map<number, number>();
  let brokenLinkCount = 0;

  for (const row of checked) {
    const audit = auditPath(
      row.solution_path_ids,
      row.player_a_id,
      row.player_b_id,
      edges,
    );
    degreeHistogram.set(audit.degrees, (degreeHistogram.get(audit.degrees) ?? 0) + 1);

    const namesMatch =
      (row.solution_path_ids?.length ?? 0) === (row.solution_path_names?.length ?? 0);

    // Walkable is not enough: a stored 3-hop route over a 2-hop truth showed
    // players a worse solution than the one they found ("Solved in 1 guess!"
    // above a three-name path). The stored route must also be minimal.
    const best = shortestPath(row.player_a_id, row.player_b_id, adjacency);
    const minimal = best !== null && audit.degrees === best.length - 1;

    if (audit.ok && namesMatch && minimal) continue;

    brokenLinkCount += audit.brokenLinks.length;
    const detail = audit.brokenLinks
      .map((l) => {
        const from = row.solution_path_names?.[l.index] ?? l.from;
        const to = row.solution_path_names?.[l.index + 1] ?? l.to;
        return `${from} -> ${to}`;
      })
      .join(', ');
    const reasons = [
      audit.endpointsOk ? null : 'endpoints do not match the puzzle',
      namesMatch ? null : 'ids and names differ in length',
      detail ? `not teammates: ${detail}` : null,
      minimal ? null : `not minimal: stored ${audit.degrees} hops, shortest is ${best ? best.length - 1 : '?'}`,
    ].filter(Boolean);
    failures.push(`  ${row.game_date}  ${row.player_a_name} -> ${row.player_b_name}  [${reasons.join('; ')}]`);
  }

  console.log(`\nChecked ${checked.length} dailies against ${edges.size} edges.`);
  const degrees = [...degreeHistogram.entries()].sort((a, b) => a[0] - b[0]);
  console.log(`Stored path length: ${degrees.map(([d, n]) => `${d} degrees x${n}`).join(', ')}`);

  if (!failures.length) {
    console.log('PASS: every stored solution path is walkable and minimal.');
    return;
  }

  console.log(`\nFAIL: ${failures.length} puzzles, ${brokenLinkCount} invalid links.`);
  for (const line of failures.slice(0, 40)) console.log(line);
  if (failures.length > 40) console.log(`  ...and ${failures.length - 40} more`);
  console.log('\nRepair with: select * from repair_daily_connection_paths(false);');
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
