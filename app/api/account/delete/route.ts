// app/api/account/delete/route.ts
//
// Self-service account deletion. Verify the caller's Supabase token, then wipe
// every row keyed to that user before deleting the auth user itself. Writes go
// through the service role because most of these tables have RLS with no user
// delete policies; safe because every statement is scoped to the id/email taken
// from the verified token, never the request body.
//
// Order matters: app rows first, auth.users last. If deleteUser fails the account
// still exists and the user can retry, and every step is idempotent so the retry
// settles cleanly. The reverse order could strand rows with no way to authenticate.
//
// Comments are anonymized rather than deleted so reply threads stay readable;
// author_name is user-supplied, so it has to go even though the body stays.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { userFromRequest, isUserAdmin } from '@/lib/articleAdmin';

export const dynamic = 'force-dynamic';

const USER_ID_TABLES = [
  'article_votes',
  'playervotes',
  'quiz_attempts',
  'ranking_game_streaks',
  'odd_man_out_streaks',
  'six_degrees_scores',
  'gamescores',
] as const;

function failed(step: string, error: unknown) {
  console.error(`Account deletion failed at ${step}:`, error);
  return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }

  // An admin deleting themselves would lock the article review surface out of its
  // only account. Rare enough to just refuse.
  if (await isUserAdmin(user.id)) {
    return NextResponse.json(
      { error: 'Admin accounts cannot be deleted from here.' },
      { status: 403 },
    );
  }

  const anonymized = await supabaseAdmin
    .from('article_comments')
    .update({ user_id: null, author_name: 'Deleted user' })
    .eq('user_id', user.id);
  if (anonymized.error) return failed('article_comments', anonymized.error);

  for (const table of USER_ID_TABLES) {
    const { error } = await supabaseAdmin.from(table).delete().eq('user_id', user.id);
    if (error) return failed(table, error);
  }

  if (user.email) {
    const { error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .delete()
      .eq('email', user.email.trim().toLowerCase());
    if (error) return failed('newsletter_subscribers', error);
  }

  // public.players is the profile table (PK = auth user id), not NBA players.
  const profile = await supabaseAdmin.from('players').delete().eq('id', user.id);
  if (profile.error) return failed('players', profile.error);

  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteUserError) return failed('auth.deleteUser', deleteUserError);

  return NextResponse.json({ ok: true });
}
