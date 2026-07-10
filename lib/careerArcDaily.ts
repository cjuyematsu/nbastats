// lib/careerArcDaily.ts
//
// Deterministic daily puzzle for Career Arc: a prominent player's PPG-by-season
// curve, guessed from its shape. Same puzzle for everyone on a given LA date.
// Prefers the get_career_arc_daily RPC
// (scripts/sql/career-arc-common-teammate-rpcs.sql); falls back to seeded
// client-side generation if the RPC is missing.

import { supabase } from '@/lib/supabaseClient';
import { getLaDateString } from '@/lib/dailyTime';
import { dayNumber, seededRng, seededShuffle } from '@/lib/dailySeed';
import {
  assembleReveals,
  buildCareerArcSeries,
  teamsInOrder,
  type CareerArcPoint,
  type CareerArcReveal,
} from '@/lib/careerArcCore';

export type { CareerArcPoint, CareerArcReveal } from '@/lib/careerArcCore';

export interface CareerArcDailyData {
  personId: number;
  name: string;
  points: CareerArcPoint[];
  reveals: CareerArcReveal[];
}

const MIN_SEASONS = 8;
const POOL_ROWS = 1500;
const MAX_CANDIDATES = 6;

async function topTeammateName(personId: number): Promise<string | null> {
  try {
    const [asPlayer, asTeammate] = await Promise.all([
      supabase
        .from('teammates')
        .select('TeammateName, SharedGamesTotal')
        .eq('PlayerID', personId)
        .order('SharedGamesTotal', { ascending: false })
        .order('TeammateName', { ascending: true })
        .limit(1),
      supabase
        .from('teammates')
        .select('PlayerName, SharedGamesTotal')
        .eq('TeammateID', personId)
        .order('SharedGamesTotal', { ascending: false })
        .order('PlayerName', { ascending: true })
        .limit(1),
    ]);
    const a = asPlayer.data?.[0];
    const b = asTeammate.data?.[0];
    if (a && b) {
      return (a.SharedGamesTotal ?? 0) >= (b.SharedGamesTotal ?? 0) ? a.TeammateName : b.PlayerName;
    }
    return a?.TeammateName ?? b?.PlayerName ?? null;
  } catch {
    return null;
  }
}

export async function generateCareerArcDaily(
  laDate: string = getLaDateString()
): Promise<CareerArcDailyData | null> {
  const fromRpc = await generateFromRpc(laDate);
  if (fromRpc) return fromRpc;
  return generateLocally(laDate);
}

async function generateFromRpc(laDate: string): Promise<CareerArcDailyData | null> {
  try {
    const { data, error } = await supabase.rpc('get_career_arc_daily', { p_date: laDate });
    const row = data?.[0];
    if (error || !row) return null;
    const points = row.points as CareerArcPoint[] | null;
    const reveals = row.reveals as CareerArcReveal[] | null;
    if (!points || points.length < 2 || !reveals || reveals.length === 0) return null;
    return { personId: row.personId, name: row.name, points, reveals };
  } catch {
    return null;
  }
}

async function generateLocally(laDate: string): Promise<CareerArcDailyData | null> {
  try {
    const rng = seededRng(dayNumber(laDate) * 32452843 + 19);

    const { data: poolRows, error } = await supabase
      .from('regularseasonstats')
      .select('personId, firstName, lastName, Prominence')
      .not('Prominence', 'is', null)
      .order('Prominence', { ascending: false })
      .order('personId', { ascending: true })
      .limit(POOL_ROWS);
    if (error || !poolRows) return null;

    const players: { personId: number; name: string }[] = [];
    const seenIds = new Set<number>();
    for (const r of poolRows) {
      if (r.personId == null || seenIds.has(r.personId)) continue;
      seenIds.add(r.personId);
      players.push({
        personId: r.personId,
        name: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
      });
    }

    const order = seededShuffle(players, rng);
    for (const candidate of order.slice(0, MAX_CANDIDATES)) {
      const { data: rows, error: rowsError } = await supabase
        .from('regularseasonstats')
        .select('SeasonYear, G, PTS_total, PTS_per_g, playerteamName')
        .eq('personId', candidate.personId)
        .order('SeasonYear', { ascending: true });
      if (rowsError) return null;
      if (!rows) continue;

      const points = buildCareerArcSeries(rows);
      if (points.length < MIN_SEASONS) continue;

      const [draftRes, teammateName] = await Promise.all([
        supabase
          .from('draft')
          .select('Year, Round, Pick, "School/Club Team"')
          .eq('playerId', candidate.personId)
          .maybeSingle(),
        topTeammateName(candidate.personId),
      ]);
      const draftRow = draftRes.data
        ? {
            Year: draftRes.data.Year,
            Round: draftRes.data.Round,
            Pick: draftRes.data.Pick,
            school: draftRes.data['School/Club Team'],
          }
        : null;

      return {
        personId: candidate.personId,
        name: candidate.name,
        points,
        reveals: assembleReveals({
          draftRow,
          teams: teamsInOrder(rows),
          teammateName,
          seasonCount: points.length,
        }),
      };
    }
    return null;
  } catch {
    return null;
  }
}
