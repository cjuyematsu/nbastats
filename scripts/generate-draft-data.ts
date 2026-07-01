// scripts/generate-draft-data.ts

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// .env.local wins (server secrets); fall back to .env for anything missing.
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
const TOP_N_PER_PICK = 5; // rows kept per pick (matches current dataset)
const CANDIDATES_PER_PICK = 15; // how many to verify per pick via the RPC
const RPC_CONCURRENCY = 15;
const OUTPUT_PATH = resolve(process.cwd(), 'app/data/draftData.ts');

type DraftRow = { Pick: number; Round: number; playerId: number | null };
type RoughStatRow = { personId: number; PTS_total: number | null };

interface DraftEntry {
  personId: number;
  Round: number;
  Pick: number;
  playerrank: number;
  firstName: string;
  lastName: string;
  careerpoints: number;
  pointspergame: string;
  yearsactive: string;
}

/** Page through a PostgREST select and return every row. */
async function fetchAll<T>(
  table: 'draft' | 'regularseasonstats',
  columns: string,
  refine?: (q: ReturnType<typeof supabase.from> extends never ? never : any) => any,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query: any = supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (refine) query = refine(query);
    const { data, error } = await query;
    if (error) throw new Error(`Failed reading ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Run an async fn over items with a bounded concurrency pool. */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  // 1. Drafted players for picks 1-60 (across all draft years).
  console.log('Loading draft picks 1-60…');
  const draftRows = await fetchAll<DraftRow>('draft', 'Pick, Round, playerId', (q) =>
    q.gte('Pick', 1).lte('Pick', 60).not('playerId', 'is', null),
  );
  // playerId -> { Pick, Round }. If a player somehow appears twice, keep the first.
  const draftByPlayer = new Map<number, { Pick: number; Round: number }>();
  for (const r of draftRows) {
    if (r.playerId != null && !draftByPlayer.has(r.playerId)) {
      draftByPlayer.set(r.playerId, { Pick: r.Pick, Round: r.Round });
    }
  }
  console.log(`  ${draftByPlayer.size} distinct drafted players.`);

  // 2. Rough career points per drafted player (used only to pick candidates to verify).
  console.log('Scanning regularseasonstats for rough totals…');
  const statRows = await fetchAll<RoughStatRow>('regularseasonstats', 'personId, PTS_total');
  const roughTotals = new Map<number, number>();
  for (const s of statRows) {
    if (!draftByPlayer.has(s.personId)) continue;
    roughTotals.set(s.personId, (roughTotals.get(s.personId) ?? 0) + (s.PTS_total ?? 0));
  }

  // 3. Top CANDIDATES_PER_PICK per pick by rough total -> candidate id set.
  const byPick = new Map<number, number[]>();
  for (const id of roughTotals.keys()) {
    const pick = draftByPlayer.get(id)!.Pick;
    (byPick.get(pick) ?? byPick.set(pick, []).get(pick)!).push(id);
  }
  const candidateIds = new Set<number>();
  for (const [, ids] of byPick) {
    ids
      .sort((a, b) => (roughTotals.get(b) ?? 0) - (roughTotals.get(a) ?? 0))
      .slice(0, CANDIDATES_PER_PICK)
      .forEach((id) => candidateIds.add(id));
  }
  console.log(`  Verifying ${candidateIds.size} candidates via calculate_player_career_stats…`);

  // 4. Exact career stats per candidate via the canonical RPC.
  const entries: DraftEntry[] = [];
  await mapPool([...candidateIds], RPC_CONCURRENCY, async (personId) => {
    const { data, error } = await supabase.rpc('calculate_player_career_stats', {
      p_person_id: personId,
    });
    if (error) throw new Error(`RPC failed for ${personId}: ${error.message}`);
    const row = data?.[0];
    if (!row || !row.games_played) return;
    const { Pick, Round } = draftByPlayer.get(personId)!;
    entries.push({
      personId,
      Round,
      Pick,
      playerrank: 0, // assigned after ranking
      firstName: row.firstName,
      lastName: row.lastName,
      careerpoints: Math.round(row.pts_total),
      pointspergame: (row.pts_total / row.games_played).toFixed(2),
      yearsactive: `${row.startYear}-${row.endYear}`,
    });
  });

  // 5. Rank within each pick by career points; keep top N; assign playerrank 1..N.
  const finalByPick = new Map<number, DraftEntry[]>();
  for (const e of entries) (finalByPick.get(e.Pick) ?? finalByPick.set(e.Pick, []).get(e.Pick)!).push(e);

  const output: DraftEntry[] = [];
  for (const pick of [...finalByPick.keys()].sort((a, b) => a - b)) {
    const top = finalByPick
      .get(pick)!
      .sort((a, b) => b.careerpoints - a.careerpoints || a.personId - b.personId)
      .slice(0, TOP_N_PER_PICK);
    top.forEach((e, i) => {
      e.playerrank = i + 1;
      output.push(e);
    });
  }

  // 6. Emit, matching the existing file shape (key order + 2-space indentation).
  const body = output
    .map((e) =>
      [
        '    {',
        `      "personId": ${e.personId},`,
        `      "Round": ${e.Round},`,
        `      "Pick": ${e.Pick},`,
        `      "playerrank": ${e.playerrank},`,
        `      "firstName": ${JSON.stringify(e.firstName)},`,
        `      "lastName": ${JSON.stringify(e.lastName)},`,
        `      "careerpoints": ${e.careerpoints},`,
        `      "pointspergame": "${e.pointspergame}",`,
        `      "yearsactive": "${e.yearsactive}"`,
        '    }',
      ].join('\n'),
    )
    .join(',\n');

  const file = `export const draftData = [\n${body}\n  ]\n`;
  writeFileSync(OUTPUT_PATH, file);
  console.log(`Wrote ${output.length} rows for ${finalByPick.size} picks to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
