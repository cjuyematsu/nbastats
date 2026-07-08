// lib/compareExplore.ts
//
// Related-comparison links for the compare tool: curated matchups first, then
// strategic pairs, matched against the currently selected player names. Lives
// outside app/data to avoid a compareMatchups <-> strategicPlayers cycle.

import { COMPARE_MATCHUPS, buildCompareSlug } from '@/app/data/compareMatchups';
import { strategicComparePairs } from '@/app/data/strategicPlayers';

export interface ExploreLink {
  slug: string;
  a: string;
  b: string;
}

export function exploreLinksForNames(
  names: string[],
  excludeSlug?: string | null,
  count = 6,
): ExploreLink[] {
  if (names.length === 0) return [];
  const nameSet = new Set(names);
  const seen = new Set<string>();
  const out: ExploreLink[] = [];

  const add = (slug: string, a: string, b: string) => {
    const canonical = buildCompareSlug(a, b);
    if (seen.has(canonical) || canonical === excludeSlug) return;
    seen.add(canonical);
    out.push({ slug, a, b });
  };

  for (const m of COMPARE_MATCHUPS) {
    if (nameSet.has(m.a) || nameSet.has(m.b)) add(m.slug, m.a, m.b);
  }
  for (const p of strategicComparePairs()) {
    if (out.length >= count) break;
    if (nameSet.has(p.a) || nameSet.has(p.b)) add(p.slug, p.a, p.b);
  }

  return out.slice(0, count);
}
