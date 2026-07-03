// lib/top100Votes.ts
//
// Shared playervotes writer for the Top 100 (page, home quick vote,
// nominations). One row per (player, identity); select-then-insert/update
// instead of upsert so anonymous identities work (see commit 726ed7a).

import { supabase } from '@/lib/supabaseClient';
import { getAnonymousId } from '@/lib/anonymousIdentifier';
import { markDailyPlayed } from '@/lib/dailyProgress';

export interface VoteIdentity {
  userId: string | null;
  anonymousId: string | null;
}

// Throws if signed out and localStorage is unavailable; callers surface
// their own message.
export function resolveVoteIdentity(userId: string | null | undefined): VoteIdentity {
  if (userId) return { userId, anonymousId: null };
  return { userId: null, anonymousId: getAnonymousId() };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred.';
}

// voteType: 1 up, 2 same spot, -1 down, 0 removes the vote. Updates refresh
// created_at/updated_at so a changed vote counts as new for the
// rearrangement's recency window.
export async function writeTop100Vote(
  identity: VoteIdentity,
  playerId: number,
  voteType: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const matchFilter = identity.userId
    ? { player_id: playerId, user_id: identity.userId }
    : { player_id: playerId, anonymous_id: identity.anonymousId! };

  try {
    if (voteType === 0) {
      const { error } = await supabase.from('playervotes').delete().match(matchFilter);
      if (error) throw error;
      return { ok: true };
    }

    let existingQuery = supabase.from('playervotes').select('player_id').eq('player_id', playerId);
    existingQuery = identity.userId
      ? existingQuery.eq('user_id', identity.userId)
      : existingQuery.eq('anonymous_id', identity.anonymousId!);
    const { data: existing, error: selectError } = await existingQuery.maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('playervotes')
        .update({ vote_type: voteType, created_at: nowIso, updated_at: nowIso })
        .match(matchFilter);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('playervotes').insert({
        player_id: playerId,
        user_id: identity.userId,
        anonymous_id: identity.anonymousId,
        vote_type: voteType,
      });
      if (error) throw error;
    }

    markDailyPlayed('top100Vote');
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: errorMessage(error) };
  }
}
