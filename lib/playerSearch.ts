// lib/playerSearch.ts
//
// Pure client-side player search over the generated PLAYER_DIRECTORY, plus
// merge logic for combining instant local matches with RPC results. Kept free
// of React/Supabase so tests/playerSearch.test.ts can exercise it directly.

import type { PlayerSuggestion } from '@/types/stats';

// Structurally compatible with DirectoryPlayer before and after the generator
// starts emitting startYear/endYear.
export interface LocalDirectoryEntry {
  id: number;
  name: string;
  points: number;
  startYear?: number;
  endYear?: number;
}

export function normalizeSearchText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function toSuggestion(p: LocalDirectoryEntry): PlayerSuggestion {
  const tokens = p.name.trim().split(/\s+/);
  return {
    personId: p.id,
    firstName: tokens[0] ?? '',
    lastName: tokens.slice(1).join(' '),
    startYear: p.startYear ?? null,
    endYear: p.endYear ?? null,
  };
}

// Rank: match at the start of any name word beats a mid-word substring;
// career points desc breaks ties.
export function searchDirectory(
  players: readonly LocalDirectoryEntry[],
  query: string,
  limit = 8,
): PlayerSuggestion[] {
  const q = normalizeSearchText(query);
  if (q.length < 2) return [];

  const wordStart: LocalDirectoryEntry[] = [];
  const substring: LocalDirectoryEntry[] = [];
  for (const p of players) {
    const name = normalizeSearchText(p.name);
    const idx = name.indexOf(q);
    if (idx === -1) continue;
    if (idx === 0 || name[idx - 1] === ' ' || name[idx - 1] === '-') {
      wordStart.push(p);
    } else {
      substring.push(p);
    }
  }
  const byPoints = (a: LocalDirectoryEntry, b: LocalDirectoryEntry) => b.points - a.points;
  wordStart.sort(byPoints);
  substring.sort(byPoints);
  return [...wordStart, ...substring].slice(0, limit).map(toSuggestion);
}

// Local order first; ids present in both keep their local position but take the
// remote row's fields (the RPC has startYear/endYear); remote-only rows are
// appended in RPC order; dedupe by personId; cap at limit.
export function mergeSuggestions(
  local: PlayerSuggestion[],
  remote: PlayerSuggestion[],
  limit = 8,
): PlayerSuggestion[] {
  const remoteById = new Map(remote.map((r) => [r.personId, r]));
  const merged: PlayerSuggestion[] = [];
  const seen = new Set<number>();
  for (const l of local) {
    if (seen.has(l.personId)) continue;
    seen.add(l.personId);
    merged.push(remoteById.get(l.personId) ?? l);
  }
  for (const r of remote) {
    if (seen.has(r.personId)) continue;
    seen.add(r.personId);
    merged.push(r);
  }
  return merged.slice(0, limit);
}

export function createLruCache<V>(maxEntries: number) {
  const map = new Map<string, V>();
  return {
    get(key: string): V | undefined {
      if (!map.has(key)) return undefined;
      const value = map.get(key) as V;
      map.delete(key);
      map.set(key, value);
      return value;
    },
    set(key: string, value: V): void {
      map.delete(key);
      map.set(key, value);
      if (map.size > maxEntries) {
        map.delete(map.keys().next().value as string);
      }
    },
  };
}
