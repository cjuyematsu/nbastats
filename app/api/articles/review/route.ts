// app/api/articles/review/route.ts
//
// Owner-gated review endpoint. Drafts are private (RLS hides non-published rows
// from the anon client), so listing and publishing both go through here:
// verify the caller's Supabase auth token, check it matches ARTICLE_ADMIN_EMAIL,
// then read/write with the service-role admin client.

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/articleAdmin';
import { submitToIndexNow, INDEXNOW_HOST } from '@/lib/indexnow';

export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, slug, title, dek, summary, body_markdown, kind, component_key, status, created_at, generation_meta, sources')
    .in('status', ['draft', 'rejected'])
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recently published articles power the "Send newsletter" panel (the send is
  // manual and one-shot per article, guarded by newsletter_sent_at).
  const { data: published, error: pubErr } = await supabaseAdmin
    .from('articles')
    .select('id, slug, title, dek, published_at, newsletter_sent_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);
  if (pubErr) return NextResponse.json({ error: pubErr.message }, { status: 500 });

  return NextResponse.json({ articles: data ?? [], published: published ?? [] });
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  let body: { id?: string; action?: string; commentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { id, action } = body;

  // Owner moderation: soft-delete any comment (bypasses RLS via the service role).
  if (action === 'delete-comment') {
    if (!body.commentId) {
      return NextResponse.json(
        { error: 'Provide { action: "delete-comment", commentId }.' },
        { status: 400 },
      );
    }
    const { data, error } = await supabaseAdmin
      .from('article_comments')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', body.commentId)
      .select('id, status')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, comment: data });
  }

  if (!id || (action !== 'publish' && action !== 'reject')) {
    return NextResponse.json(
      {
        error:
          'Provide { id, action: "publish" | "reject" } or { action: "delete-comment", commentId }.',
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const update =
    action === 'publish'
      ? { status: 'published', published_at: now, updated_at: now }
      : { status: 'rejected', published_at: null };

  const { data, error } = await supabaseAdmin
    .from('articles')
    .update(update)
    .eq('id', id)
    .select('id, slug, status')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The homepage (ISR, revalidate=3600) features the newest published article and
  // the /articles forum lists them; publishing or unpublishing changes both, so
  // bust their caches on demand instead of waiting out the hourly window.
  revalidatePath('/');
  revalidatePath('/articles');
  if (data?.slug) revalidatePath(`/articles/${data.slug}`);

  // Announce the new article to IndexNow (Bing, DuckDuckGo, Yandex). No-throw.
  if (action === 'publish' && data?.slug) {
    const base = `https://${INDEXNOW_HOST}`;
    await submitToIndexNow([`${base}/articles/${data.slug}`, `${base}/`, `${base}/articles`]);
  }

  return NextResponse.json({ ok: true, article: data });
}
