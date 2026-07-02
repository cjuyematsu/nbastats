// app/api/articles/comments/route.ts
//
// Moderated comment insert. Article comments used to be written straight from the
// browser under RLS; this route is now the only writer so every comment passes the
// word-list check first. Verify the caller's Supabase token, run checkComment(),
// then insert with the service-role client (bypasses RLS) using a user_id taken
// from the token, never the request body.

import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { userFromRequest } from '@/lib/articleAdmin';
import { checkComment } from '@/lib/commentModeration';

const SELECT = 'id, parent_comment_id, user_id, author_name, body, status, created_at';

function displayName(user: User): string {
  const meta = user.user_metadata as
    | { full_name?: string; name?: string; user_name?: string }
    | undefined;
  return (
    meta?.full_name ||
    meta?.name ||
    meta?.user_name ||
    (user.email ? user.email.split('@')[0] : 'User')
  );
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }

  let payload: { articleId?: string; parentCommentId?: string | null; body?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { articleId, parentCommentId, body } = payload;
  if (!articleId || typeof body !== 'string') {
    return NextResponse.json(
      { error: 'Provide { articleId, body, parentCommentId? }.' },
      { status: 400 },
    );
  }

  const reason = checkComment(body);
  if (reason) {
    return NextResponse.json({ error: reason }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('article_comments')
    .insert({
      article_id: articleId,
      parent_comment_id: parentCommentId ?? null,
      user_id: user.id,
      author_name: displayName(user),
      body: body.trim(),
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
