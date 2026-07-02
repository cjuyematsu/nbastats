// lib/adminCache.ts
//
// Optimistic client-side cache for the owner-only "Review" link. Admin status is
// authoritatively a server-verified DB flag (public.players.is_admin), fetched via
// /api/articles/is-admin; that fetch can only start after the session resolves, so
// first paint would otherwise always hide the link and then pop it in. We remember
// the last-known value here, keyed by user id, so the link can render on the first
// paint for a returning admin. This carries no security weight: the review page and
// its API still verify is_admin server-side.

const CACHE_KEY = 'hd:isAdmin';

/** True only if the cache holds admin === true for this exact user id. */
export function readCachedAdmin(userId: string | null): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const { uid, admin } = JSON.parse(raw);
    return uid === userId && admin === true;
  } catch {
    return false;
  }
}

/** Persist the authoritative admin result for this user. */
export function writeCachedAdmin(userId: string, admin: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ uid: userId, admin }));
  } catch {
    // ignore quota / disabled-storage errors
  }
}

// The one spot coupled to Supabase's persisted-session shape. Read synchronously so
// the useState initializer can key the cache on first paint. Kept defensive: any
// parse failure returns null, degrading to the pre-cache (one-fetch-cycle) behavior.
export function readPersistedUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        return parsed?.user?.id ?? parsed?.currentSession?.user?.id ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
