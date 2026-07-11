// lib/collection.ts
//
// The player collection: winning a game "collects" its featured players,
// pokedex-style; losing records them as "seen". Entries key on normalized
// name because some games only know names, not personIds; a later game that
// knows the id fills it in. mergeCollection is pure for tests; the
// localStorage wrapper and event live below.

import { getLaDateString } from '@/lib/dailyTime';

export type CollectionStatus = 'seen' | 'collected';

export interface CollectionEntry {
  name: string;
  personId?: number;
  status: CollectionStatus;
  firstDate: string;
  collectedDate?: string;
  via: string;
}

export interface CollectionState {
  players: Record<string, CollectionEntry>;
}

export interface CollectInput {
  name: string;
  personId?: number;
}

export const COLLECTION_EVENT = 'hd:collection';
const KEY = 'hd:collection_v1';

export const emptyCollection = (): CollectionState => ({ players: {} });

export const collectionKey = (name: string) => name.trim().toLowerCase();

export function mergeCollection(
  state: CollectionState,
  players: CollectInput[],
  { status, via, date }: { status: CollectionStatus; via: string; date: string }
): { state: CollectionState; newlyCollected: CollectionEntry[] } {
  const next: CollectionState = { players: { ...state.players } };
  const newlyCollected: CollectionEntry[] = [];

  for (const p of players) {
    const name = p.name.trim();
    if (!name) continue;
    const key = collectionKey(name);
    const existing = next.players[key];

    if (!existing) {
      const entry: CollectionEntry = {
        name,
        personId: p.personId,
        status,
        firstDate: date,
        via,
        ...(status === 'collected' ? { collectedDate: date } : {}),
      };
      next.players[key] = entry;
      if (status === 'collected') newlyCollected.push(entry);
      continue;
    }

    const upgraded = existing.status === 'seen' && status === 'collected';
    const entry: CollectionEntry = {
      ...existing,
      personId: existing.personId ?? p.personId,
      ...(upgraded ? { status: 'collected' as const, collectedDate: date, via } : {}),
    };
    next.players[key] = entry;
    if (upgraded) newlyCollected.push(entry);
  }

  return { state: next, newlyCollected };
}

export function countCollection(state: CollectionState): { collected: number; seen: number } {
  let collected = 0;
  let seen = 0;
  for (const entry of Object.values(state.players)) {
    if (entry.status === 'collected') collected++;
    else seen++;
  }
  return { collected, seen };
}

export function readCollection(): CollectionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyCollection();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.players !== 'object' || parsed.players === null) {
      return emptyCollection();
    }
    return { players: parsed.players };
  } catch {
    return emptyCollection();
  }
}

/** Record featured players from a finished game. Returns how many were newly collected. */
export function recordPlayers(
  players: CollectInput[],
  opts: { status: CollectionStatus; via: string }
): number {
  try {
    const date = getLaDateString();
    const { state, newlyCollected } = mergeCollection(readCollection(), players, {
      ...opts,
      date,
    });
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(COLLECTION_EVENT));
    return newlyCollected.length;
  } catch {
    return 0;
  }
}
