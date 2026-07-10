// lib/collegeData.ts
//
// Server-side shared fetch for the /colleges pages: the whole draft table
// (3.3k rows, paged past PostgREST's 1000-row cap) grouped by canonical
// school slug. cache() dedupes within a request; ISR handles across requests.

import { cache } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { canonicalSchool, classifySchool, schoolSlug, type SchoolKind } from '@/lib/collegeSlugs';

export interface SchoolPick {
  year: number;
  round: number;
  pick: number;
  name: string;
  playerId: number | null;
  team: string | null;
}

export interface SchoolGroup {
  slug: string;
  name: string;
  kind: SchoolKind;
  picks: SchoolPick[];
}

export interface CareerTotals {
  games: number;
  points: number;
  rebounds: number;
  assists: number;
}

// Career regular-season totals for a set of players, keyed by personId. Same
// paged .in() aggregation the draft year pages use.
export const getCareerTotals = cache(
  async (personIds: number[]): Promise<Map<number, CareerTotals>> => {
    const totals = new Map<number, CareerTotals>();
    if (personIds.length === 0) return totals;
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await supabase
        .from('regularseasonstats')
        .select('personId, G, PTS_total, TRB_total, AST_total')
        .in('personId', personIds)
        .range(from, from + 999);
      if (error || !rows || rows.length === 0) break;
      for (const r of rows) {
        if (r.personId == null) continue;
        const t = totals.get(r.personId) ?? { games: 0, points: 0, rebounds: 0, assists: 0 };
        t.games += r.G ?? 0;
        t.points += r.PTS_total ?? 0;
        t.rebounds += r.TRB_total ?? 0;
        t.assists += r.AST_total ?? 0;
        totals.set(r.personId, t);
      }
      if (rows.length < 1000) break;
    }
    return totals;
  }
);

export const getSchoolGroups = cache(async (): Promise<Map<string, SchoolGroup>> => {
  const groups = new Map<string, SchoolGroup>();
  for (let from = 0; ; from += 1000) {
    const { data: rows, error } = await supabase
      .from('draft')
      .select('Year, Round, Pick, FirstName, LastName, playerId, "NBA Team", "School/Club Team"')
      .order('Year', { ascending: false })
      .order('Round', { ascending: true })
      .order('Pick', { ascending: true })
      .range(from, from + 999);
    if (error || !rows || rows.length === 0) break;
    for (const r of rows) {
      const raw = r['School/Club Team'];
      if (!raw) continue;
      const name = canonicalSchool(raw);
      const slug = schoolSlug(name);
      if (!slug) continue;
      let group = groups.get(slug);
      if (!group) {
        group = { slug, name, kind: classifySchool(name), picks: [] };
        groups.set(slug, group);
      }
      group.picks.push({
        year: r.Year,
        round: r.Round,
        pick: r.Pick,
        name: `${r.FirstName ?? ''} ${r.LastName ?? ''}`.trim() || 'Unknown',
        playerId: r.playerId,
        team: r['NBA Team'],
      });
    }
    if (rows.length < 1000) break;
  }
  return groups;
});
