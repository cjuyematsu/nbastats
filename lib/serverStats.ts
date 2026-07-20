// lib/serverStats.ts
//
// Shared server-side data fetchers reused by the /compare, /duos and /player
// pages, their /embed widgets, and the dynamic OG images. Each is wrapped in
// React cache() so it dedupes per request.

import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { CareerStatsData, PlayerSuggestion } from '@/types/stats';
import type { DuoRow } from '@/lib/duos';
import { findMatchup, parseCompareSlug, buildCompareSlug } from '@/app/data/compareMatchups';
import { findDuo, parseDuoSlug, buildDuoSlug } from '@/app/data/duoPages';

const fullName = (p: PlayerSuggestion) => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();

export type ResolvedPlayer = {
  suggestion: PlayerSuggestion;
  stats: CareerStatsData | null;
};

export const getPlayerByName = cache(async (name: string): Promise<ResolvedPlayer | null> => {
  const { data, error } = await supabaseAdmin.rpc('get_player_suggestions', { search_term: name });
  if (error) throw new Error(`getPlayerByName(${name}): ${error.message}`);
  const p = data && data.length > 0 ? (data[0] as PlayerSuggestion) : null;
  if (!p) return null;
  const { data: s, error: sErr } = await supabaseAdmin.rpc('calculate_player_career_stats', { p_person_id: p.personId });
  if (sErr) throw new Error(`getPlayerByName(${name}) stats: ${sErr.message}`);
  return { suggestion: p, stats: s && s.length > 0 ? (s[0] as CareerStatsData) : null };
});

export const getCareerStats = cache(async (personId: number): Promise<CareerStatsData | null> => {
  const { data, error } = await supabaseAdmin.rpc('calculate_player_career_stats', { p_person_id: personId });
  if (error) throw new Error(`getCareerStats(${personId}): ${error.message}`);
  return data && data.length > 0 ? (data[0] as CareerStatsData) : null;
});

export const getPlayoffStats = cache(async (personId: number): Promise<CareerStatsData | null> => {
  const { data, error } = await supabaseAdmin.rpc('calculate_player_career_playoff_stats', { p_person_id: personId });
  if (error) throw new Error(`getPlayoffStats(${personId}): ${error.message}`);
  return data && data.length > 0 ? (data[0] as CareerStatsData) : null;
});

export type ResolvedDuo = {
  a: { id: number; name: string };
  b: { id: number; name: string };
  row: DuoRow | null;
};

export const getDuoData = cache(async (nameA: string, nameB: string): Promise<ResolvedDuo | null> => {
  const resolve = async (name: string) => {
    const { data, error } = await supabaseAdmin.rpc('get_player_suggestions', { search_term: name });
    if (error) throw new Error(`getDuoData resolve(${name}): ${error.message}`);
    const p = data && data.length > 0 ? (data[0] as PlayerSuggestion) : null;
    return p ? { id: p.personId, name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() } : null;
  };
  const [a, b] = await Promise.all([resolve(nameA), resolve(nameB)]);
  if (!a || !b) return null;

  const lo = Math.min(a.id, b.id);
  const hi = Math.max(a.id, b.id);
  const { data, error } = await supabaseAdmin
    .from('teammates')
    .select('*')
    .eq('PlayerID', lo)
    .eq('TeammateID', hi)
    .maybeSingle();
  if (error) throw new Error(`getDuoData teammates(${lo},${hi}): ${error.message}`);
  return { a, b, row: (data as DuoRow) ?? null };
});

// Resolve a /compare/<slug>, whether curated or an open (arbitrary) pair. Returns
// null when the slug is unparseable or either player has no real career stats
// (the thin-content gate). canonicalSlug is where the page should live: the
// curated slug when one exists, else the sorted open slug.
export type ResolvedMatchup = {
  a: string;
  b: string;
  pa: ResolvedPlayer;
  pb: ResolvedPlayer;
  canonicalSlug: string;
  curated: boolean;
};

export const resolveMatchupBySlug = cache(async (slug: string): Promise<ResolvedMatchup | null> => {
  const found = findMatchup(slug);
  if (found) {
    const [pa, pb] = await Promise.all([getPlayerByName(found.matchup.a), getPlayerByName(found.matchup.b)]);
    if (!pa?.stats || !pb?.stats) return null;
    return { a: found.matchup.a, b: found.matchup.b, pa, pb, canonicalSlug: found.matchup.slug, curated: true };
  }
  const names = parseCompareSlug(slug);
  if (!names) return null;
  const [pa, pb] = await Promise.all([getPlayerByName(names.a), getPlayerByName(names.b)]);
  if (!pa?.stats || !pb?.stats) return null;
  const a = fullName(pa.suggestion);
  const b = fullName(pb.suggestion);
  return { a, b, pa, pb, canonicalSlug: buildCompareSlug(a, b), curated: false };
});

// Resolve a /duos/<slug>, curated or open. Requires a real teammates row.
export const resolveDuoBySlug = cache(
  async (slug: string): Promise<{ data: ResolvedDuo; canonicalSlug: string; curated: boolean } | null> => {
    const found = findDuo(slug);
    if (found) {
      const data = await getDuoData(found.duo.a, found.duo.b);
      if (!data || !data.row) return null;
      return { data, canonicalSlug: found.duo.slug, curated: true };
    }
    const names = parseDuoSlug(slug);
    if (!names) return null;
    const data = await getDuoData(names.a, names.b);
    if (!data || !data.row) return null;
    return { data, canonicalSlug: buildDuoSlug(data.a.name, data.b.name), curated: false };
  },
);
