// lib/commonTeammateDaily.ts
//
// Deterministic daily rounds for Common Teammate, built from the teammates
// table: pairs of prominent players who never played together, where the goal
// is naming anyone who played with both. Same puzzle for everyone on a given
// LA date. Prefers the get_common_teammate_daily RPC
// (scripts/sql/career-arc-common-teammate-rpcs.sql); falls back to seeded
// client-side generation if the RPC is missing.

import { supabase } from '@/lib/supabaseClient';
import { getLaDateString } from '@/lib/dailyTime';
import { dayNumber, seededRng, seededShuffle } from '@/lib/dailySeed';
import {
  CT_ROUNDS,
  buildRound,
  type CtMate,
  type CtPlayer,
  type CtRound,
} from '@/lib/commonTeammateCore';

export type { CtRound } from '@/lib/commonTeammateCore';

const MAX_PAIR_ATTEMPTS = 20;

// The ANCHORS star list from oddManOutDaily, resolved once against the
// teammates table (names there match exactly, e.g. "Jimmy Butler III").
// Hardcoded ids keep generation deterministic and query-free.
const POOL: CtPlayer[] = [
  { personId: 2544, name: 'LeBron James' },
  { personId: 977, name: 'Kobe Bryant' },
  { personId: 893, name: 'Michael Jordan' },
  { personId: 406, name: "Shaquille O'Neal" },
  { personId: 1495, name: 'Tim Duncan' },
  { personId: 708, name: 'Kevin Garnett' },
  { personId: 1717, name: 'Dirk Nowitzki' },
  { personId: 959, name: 'Steve Nash' },
  { personId: 467, name: 'Jason Kidd' },
  { personId: 1718, name: 'Paul Pierce' },
  { personId: 951, name: 'Ray Allen' },
  { personId: 1713, name: 'Vince Carter' },
  { personId: 2548, name: 'Dwyane Wade' },
  { personId: 101108, name: 'Chris Paul' },
  { personId: 2546, name: 'Carmelo Anthony' },
  { personId: 201142, name: 'Kevin Durant' },
  { personId: 201939, name: 'Stephen Curry' },
  { personId: 201566, name: 'Russell Westbrook' },
  { personId: 201935, name: 'James Harden' },
  { personId: 202681, name: 'Kyrie Irving' },
  { personId: 203081, name: 'Damian Lillard' },
  { personId: 202691, name: 'Klay Thompson' },
  { personId: 203507, name: 'Giannis Antetokounmpo' },
  { personId: 203999, name: 'Nikola Jokic' },
  { personId: 203954, name: 'Joel Embiid' },
  { personId: 202710, name: 'Jimmy Butler III' },
  { personId: 202695, name: 'Kawhi Leonard' },
  { personId: 202331, name: 'Paul George' },
  { personId: 203076, name: 'Anthony Davis' },
  { personId: 252, name: 'Karl Malone' },
  { personId: 304, name: 'John Stockton' },
  { personId: 787, name: 'Charles Barkley' },
  { personId: 121, name: 'Patrick Ewing' },
  { personId: 165, name: 'Hakeem Olajuwon' },
  { personId: 937, name: 'Scottie Pippen' },
  { personId: 397, name: 'Reggie Miller' },
  { personId: 947, name: 'Allen Iverson' },
  { personId: 77142, name: 'Magic Johnson' },
  { personId: 1449, name: 'Larry Bird' },
];

async function fetchMateMaps(ids: number[]): Promise<Map<number, Map<number, CtMate>> | null> {
  try {
    const [asPlayer, asTeammate] = await Promise.all([
      supabase
        .from('teammates')
        .select('PlayerID, TeammateID, TeammateName, SharedGamesTotal')
        .in('PlayerID', ids),
      supabase
        .from('teammates')
        .select('TeammateID, PlayerID, PlayerName, SharedGamesTotal')
        .in('TeammateID', ids),
    ]);
    if (asPlayer.error || asTeammate.error) return null;
    const maps = new Map<number, Map<number, CtMate>>(ids.map((id) => [id, new Map()]));
    for (const r of asPlayer.data ?? []) {
      if (r.PlayerID == null || r.TeammateID == null) continue;
      maps.get(r.PlayerID)?.set(r.TeammateID, {
        id: r.TeammateID,
        name: r.TeammateName,
        shared: r.SharedGamesTotal ?? 0,
      });
    }
    for (const r of asTeammate.data ?? []) {
      if (r.TeammateID == null || r.PlayerID == null || r.PlayerName == null) continue;
      maps.get(r.TeammateID)?.set(r.PlayerID, {
        id: r.PlayerID,
        name: r.PlayerName,
        shared: r.SharedGamesTotal ?? 0,
      });
    }
    return maps;
  } catch {
    return null;
  }
}

export async function generateCommonTeammateDaily(
  laDate: string = getLaDateString()
): Promise<CtRound[] | null> {
  const fromRpc = await generateFromRpc(laDate);
  if (fromRpc) return fromRpc;
  return generateLocally(laDate);
}

async function generateFromRpc(laDate: string): Promise<CtRound[] | null> {
  try {
    const { data, error } = await supabase.rpc('get_common_teammate_daily', { p_date: laDate });
    if (error || !data || data.length < CT_ROUNDS) return null;
    const rounds: CtRound[] = [];
    for (const row of [...data].sort((x, y) => x.round_no - y.round_no)) {
      const a = row.a as CtPlayer | null;
      const b = row.b as CtPlayer | null;
      const answers = row.answers as CtMate[] | null;
      if (!a || !b || !answers || answers.length === 0 || !row.aMateIds || !row.bMateIds) return null;
      rounds.push({ a, b, aMateIds: row.aMateIds, bMateIds: row.bMateIds, answers });
    }
    return rounds.slice(0, CT_ROUNDS);
  } catch {
    return null;
  }
}

async function generateLocally(laDate: string): Promise<CtRound[] | null> {
  try {
    const rng = seededRng(dayNumber(laDate) * 49979687 + 23);

    const order = seededShuffle(POOL, rng);
    const rounds: CtRound[] = [];
    let cursor = 0;
    let attempts = 0;
    while (rounds.length < CT_ROUNDS && attempts < MAX_PAIR_ATTEMPTS && cursor + 1 < order.length) {
      const a = order[cursor];
      const b = order[cursor + 1];
      cursor += 2;
      attempts += 1;

      const maps = await fetchMateMaps([a.personId, b.personId]);
      if (!maps) return null;
      const round = buildRound(a, b, maps.get(a.personId)!, maps.get(b.personId)!);
      if (round) rounds.push(round);
    }
    return rounds.length === CT_ROUNDS ? rounds : null;
  } catch {
    return null;
  }
}
