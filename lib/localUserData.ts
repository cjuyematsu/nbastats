// lib/localUserData.ts
//
// Purges every localStorage key holding per-user game state. AuthContext's signOut
// only drops the Supabase session, so without this a deleted account would leave its
// streaks, daily results and admin flag behind for whoever uses the browser next.
// Prefix-matched so new dated keys (hd:dailyProgress_<date>, statOuDaily_<era>_<date>)
// are covered without touching this list.

import { clearAnonymousId } from '@/lib/anonymousIdentifier';

const PREFIXES = [
  'hd:', // isAdmin, dailyProgress_, careerArcDaily_, commonTeammateDaily_
  'sixDegreesDaily_',
  'statOuDaily_',
  'draftQuizGuest_',
  'draftDaily_',
];

const EXACT_KEYS = ['rankingGameGuestStreak_v1', 'oddManOutGuestStreak_v1'];

export function clearLocalUserData(): void {
  if (typeof window === 'undefined') return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (PREFIXES.some((p) => key.startsWith(p)) || EXACT_KEYS.includes(key)) {
        doomed.push(key);
      }
    }
    doomed.forEach((key) => localStorage.removeItem(key));
    clearAnonymousId();
  } catch (e) {
    console.error('Failed to clear local user data', e);
  }
}
