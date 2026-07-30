// lib/oddManOutDaily.ts
//
// Deterministic daily round for Odd Man Out, built from the teammates table:
// three players who shared the court with the same star, plus one who never
// did. Same puzzle for everyone on a given LA date. Prefers the
// get_odd_man_out_daily RPC (scripts/sql/daily-challenge-rpcs.sql); falls
// back to equivalent client-side generation if the RPC is missing.

import { supabase } from '@/lib/supabaseClient';
import { getLaDateString } from '@/lib/dailyTime';
import { dayNumber, seededRng, seededShuffle } from '@/lib/dailySeed';

export interface OddManOutDailyData {
  players: { FirstName: string; LastName: string }[];
  oddManOutName: string;
  connectionName: string;
  question: string;
}

export const ANCHORS = [
  'LeBron James', 'Kobe Bryant', 'Michael Jordan', "Shaquille O'Neal", 'Tim Duncan',
  'Kevin Garnett', 'Dirk Nowitzki', 'Steve Nash', 'Jason Kidd', 'Paul Pierce',
  'Ray Allen', 'Vince Carter', 'Dwyane Wade', 'Chris Paul', 'Carmelo Anthony',
  'Kevin Durant', 'Stephen Curry', 'Russell Westbrook', 'James Harden', 'Kyrie Irving',
  'Damian Lillard', 'Klay Thompson', 'Giannis Antetokounmpo', 'Nikola Jokic',
  'Joel Embiid', 'Jimmy Butler III', 'Kawhi Leonard', 'Paul George', 'Anthony Davis',
  'Karl Malone', 'John Stockton', 'Charles Barkley', 'Patrick Ewing',
  'Hakeem Olajuwon', 'Scottie Pippen', 'Reggie Miller', 'Allen Iverson',
  'Magic Johnson', 'Larry Bird',
];

const splitName = (full: string) => {
  const idx = full.indexOf(' ');
  if (idx === -1) return { FirstName: full, LastName: '' };
  return { FirstName: full.slice(0, idx), LastName: full.slice(idx + 1) };
};

export async function generateOddManOutDaily(
  laDate: string = getLaDateString()
): Promise<OddManOutDailyData | null> {
  const fromRpc = await generateFromRpc(laDate);
  if (fromRpc) return fromRpc;
  return generateLocally(laDate);
}

async function generateFromRpc(laDate: string): Promise<OddManOutDailyData | null> {
  try {
    const { data, error } = await supabase.rpc('get_odd_man_out_daily', { p_date: laDate });
    const row = data?.[0];
    if (error || !row) return null;
    const players = row.players as { FirstName: string; LastName: string }[] | null;
    if (!players || players.length < 4) return null;
    return {
      players,
      oddManOutName: row.oddManOutName,
      connectionName: row.connectionName,
      question: row.question,
    };
  } catch {
    return null;
  }
}

async function generateLocally(laDate: string): Promise<OddManOutDailyData | null> {
  try {
    const rng = seededRng(dayNumber(laDate) * 15485863 + 11);
    const anchorOrder = seededShuffle(ANCHORS, rng);

    for (const anchor of anchorOrder.slice(0, 5)) {
      const { data: mates, error } = await supabase
        .from('teammates')
        .select('TeammateName, SharedGamesTotal')
        .eq('PlayerName', anchor)
        .order('SharedGamesTotal', { ascending: false })
        .order('TeammateName', { ascending: true })
        .limit(40);
      if (error) return null;
      if (!mates || mates.length < 10) continue;

      const mateNames = new Set(mates.map((m) => m.TeammateName));
      const chosenMates = seededShuffle(mates, rng)
        .slice(0, 3)
        .map((m) => m.TeammateName);

      const oddCandidates = anchorOrder
        .filter((n) => n !== anchor && !mateNames.has(n))
        .slice(0, 4);
      // abort on error rather than guess, otherwise transient errors would
      // hand different users different puzzles
      const { data: pairs, error: pairsError } = await supabase
        .from('teammates')
        .select('TeammateName')
        .eq('PlayerName', anchor)
        .in('TeammateName', oddCandidates);
      if (pairsError) return null;
      const pairedNames = new Set((pairs ?? []).map((p) => p.TeammateName));
      const odd = oddCandidates.find((c) => !pairedNames.has(c)) ?? null;
      if (!odd) continue;

      return {
        players: seededShuffle([...chosenMates, odd], rng).map(splitName),
        oddManOutName: odd,
        connectionName: `playing with ${anchor}`,
        question: 'Three of these players shared the court with the same NBA star. Pick the odd one out...',
      };
    }
    return null;
  } catch {
    return null;
  }
}
