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
