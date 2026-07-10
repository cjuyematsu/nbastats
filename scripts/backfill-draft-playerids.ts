// scripts/backfill-draft-playerids.ts
//
// Link draft rows with a null playerId to their regularseasonstats personId by
// exact name match, guarded by era: a candidate only counts if their FIRST
// NBA season falls within [draft year, draft year + DEBUT_WINDOW], so old
// unlinked picks can never grab a modern namesake. Handles collapsed
// whitespace and name-order flips (Yang Hansen is stored as "Hansen Yang").
// Dry-run by default (prints the pending links); pass --apply to write.
//
//   npx tsx scripts/backfill-draft-playerids.ts
//   npx tsx scripts/backfill-draft-playerids.ts --apply

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

const APPLY = process.argv.includes('--apply');
const DEBUT_WINDOW = 4;
const PAGE_SIZE = 1000;

const norm = (first: string | null, last: string | null) =>
  `${first ?? ''} ${last ?? ''}`.toLowerCase().replace(/\s+/g, ' ').trim();

async function fetchAll<T>(fetchPage: (from: number) => Promise<T[] | null>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = await fetchPage(from);
    if (!rows || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function main() {
  const seasonRows = await fetchAll(async (from) => {
    const { data, error } = await supabase
      .from('regularseasonstats')
      .select('personId, firstName, lastName, SeasonYear')
      .order('personId', { ascending: true })
      .order('SeasonYear', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    return data;
  });

  const players = new Map<number, { name: string; flipped: string; firstSeason: number }>();
  for (const r of seasonRows) {
    if (r.personId == null || r.SeasonYear == null) continue;
    const existing = players.get(r.personId);
    if (existing) {
      existing.firstSeason = Math.min(existing.firstSeason, r.SeasonYear);
    } else {
      players.set(r.personId, {
        name: norm(r.firstName, r.lastName),
        flipped: norm(r.lastName, r.firstName),
        firstSeason: r.SeasonYear,
      });
    }
  }

  const byName = new Map<string, number[]>();
  for (const [id, p] of players) {
    for (const key of new Set([p.name, p.flipped])) {
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(id);
    }
  }

  const unlinked = await fetchAll(async (from) => {
    const { data, error } = await supabase
      .from('draft')
      .select('Year, Round, Pick, FirstName, LastName')
      .is('playerId', null)
      .order('Year', { ascending: true })
      .order('Round', { ascending: true })
      .order('Pick', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    return data;
  });

  const links: { year: number; round: number; pick: number; name: string; personId: number }[] = [];
  let ambiguous = 0;
  for (const row of unlinked) {
    const name = norm(row.FirstName, row.LastName);
    if (!name) continue;
    // A rookie season can be no earlier than the draft year (seasons are
    // labeled by their ending year, so the year-after-draft is the norm).
    const candidates = (byName.get(name) ?? []).filter((id) => {
      const p = players.get(id)!;
      return p.firstSeason >= row.Year && p.firstSeason <= row.Year + DEBUT_WINDOW;
    });
    if (candidates.length === 1) {
      links.push({
        year: row.Year,
        round: row.Round,
        pick: row.Pick,
        name: `${row.FirstName ?? ''} ${row.LastName ?? ''}`.trim(),
        personId: candidates[0],
      });
    } else if (candidates.length > 1) {
      ambiguous++;
      console.log(`AMBIGUOUS (left null): ${row.Year} ${name} -> ${candidates.join(', ')}`);
    }
  }

  console.log(`Unlinked draft rows: ${unlinked.length}`);
  console.log(`Unique era-guarded matches: ${links.length} (ambiguous skipped: ${ambiguous})`);
  for (const l of links) console.log(`  ${l.year} R${l.round} P${l.pick} ${l.name} -> ${l.personId}`);

  if (!APPLY) {
    console.log('\nDry run. Pass --apply to write these links.');
    return;
  }

  let applied = 0;
  for (const l of links) {
    const { error } = await supabase
      .from('draft')
      .update({ playerId: l.personId })
      .eq('Year', l.year)
      .eq('Round', l.round)
      .eq('Pick', l.pick)
      .is('playerId', null);
    if (error) throw error;
    applied++;
  }
  console.log(`Applied ${applied} links.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
