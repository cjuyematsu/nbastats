'use client';

// Shared autocomplete data source: instant local results from the generated
// player directory (lazy-loaded so it stays out of initial bundles), a shared
// LRU cache of RPC responses, a 200ms-debounced get_player_suggestions call,
// and a sequence guard so stale responses never overwrite newer queries.

import { useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { supabase } from '@/lib/supabaseClient';
import type { PlayerSuggestion } from '@/types/stats';
import {
  createLruCache,
  mergeSuggestions,
  normalizeSearchText,
  searchDirectory,
  type LocalDirectoryEntry,
} from '@/lib/playerSearch';

let directory: LocalDirectoryEntry[] | null = null;
let directoryPromise: Promise<LocalDirectoryEntry[]> | null = null;

function loadDirectory(): Promise<LocalDirectoryEntry[]> {
  if (!directoryPromise) {
    directoryPromise = import('@/app/data/playerDirectory').then((m) => {
      directory = m.PLAYER_DIRECTORY;
      return directory;
    });
  }
  return directoryPromise;
}

const remoteCache = createLruCache<PlayerSuggestion[]>(50);

export interface UsePlayerSuggestionsOptions {
  minChars?: number;
  limit?: number;
  debounceMs?: number;
}

export function usePlayerSuggestions(
  query: string,
  opts: UsePlayerSuggestionsOptions = {},
) {
  const { minChars = 2, limit = 8, debounceMs = 200 } = opts;
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);
  const [directoryVersion, setDirectoryVersion] = useState(directory ? 1 : 0);

  const debouncedRpc = useMemo(
    () =>
      debounce(async (term: string, norm: string, seq: number) => {
        try {
          const { data, error: rpcError } = await supabase.rpc('get_player_suggestions', {
            search_term: term,
          });
          if (seqRef.current !== seq) return;
          if (rpcError) throw new Error(rpcError.message);
          const remote = (data ?? []) as PlayerSuggestion[];
          remoteCache.set(norm, remote);
          const local = directory ? searchDirectory(directory, norm, limit) : [];
          setSuggestions(mergeSuggestions(local, remote, limit));
          setError(null);
        } catch (e) {
          if (seqRef.current !== seq) return;
          const local = directory ? searchDirectory(directory, norm, limit) : [];
          setSuggestions(local);
          if (local.length === 0) {
            setError(e instanceof Error ? e.message : 'Failed to fetch suggestions.');
          }
        } finally {
          if (seqRef.current === seq) setIsLoading(false);
        }
      }, debounceMs),
    [debounceMs, limit],
  );

  useEffect(() => () => debouncedRpc.cancel(), [debouncedRpc]);

  useEffect(() => {
    const seq = ++seqRef.current;
    const norm = normalizeSearchText(query);
    if (norm.length < minChars) {
      debouncedRpc.cancel();
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!directory) {
      loadDirectory().then(() => {
        if (seqRef.current === seq) setDirectoryVersion((v) => v + 1);
      });
    }

    const local = directory ? searchDirectory(directory, norm, limit) : [];
    const cachedRemote = remoteCache.get(norm);
    if (cachedRemote) {
      debouncedRpc.cancel();
      setSuggestions(mergeSuggestions(local, cachedRemote, limit));
      setIsLoading(false);
      setError(null);
      return;
    }

    setSuggestions(local);
    setError(null);
    setIsLoading(local.length === 0);
    debouncedRpc(query, norm, seq);
  }, [query, minChars, limit, debouncedRpc, directoryVersion]);

  return { suggestions, isLoading, error };
}
