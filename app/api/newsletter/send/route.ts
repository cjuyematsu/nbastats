// app/api/newsletter/send/route.ts
//
// Admin-only broadcast. Triggered by the "Send newsletter" button in the article
// review UI. Guards on newsletter_sent_at so a re-publish can't double-send
// (?force via body.force), fans the teaser out to confirmed subscribers, then
// stamps newsletter_sent_at.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/articleAdmin';
import { planNewsletterSend, sendArticleNewsletter } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  let body: { articleId?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.articleId) {
    return NextResponse.json({ error: 'Provide { articleId }.' }, { status: 400 });
  }

  const { data: article, error: artErr } = await supabaseAdmin
    .from('articles')
    .select('id, slug, title, dek, summary, status, newsletter_sent_at')
    .eq('id', body.articleId)
    .maybeSingle();
  if (artErr) return NextResponse.json({ error: artErr.message }, { status: 500 });
  if (!article) return NextResponse.json({ error: 'Article not found.' }, { status: 404 });

  const plan = planNewsletterSend({
    status: article.status,
    newsletter_sent_at: article.newsletter_sent_at,
    force: body.force,
  });
  if (!plan.ok) return NextResponse.json({ error: plan.message }, { status: plan.status });

  const { data: subs, error: subErr } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('email, unsubscribe_token')
    .eq('status', 'confirmed');
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  let recipientCount = 0;
  try {
    recipientCount = await sendArticleNewsletter(subs ?? [], {
      title: article.title,
      dek: article.dek,
      summary: article.summary,
      slug: article.slug,
    });
  } catch (err) {
    console.error('Newsletter send failed:', err);
    return NextResponse.json({ error: 'Send failed. Check RESEND_API_KEY / domain.' }, { status: 502 });
  }

  await supabaseAdmin
    .from('articles')
    .update({ newsletter_sent_at: new Date().toISOString() })
    .eq('id', article.id);

  return NextResponse.json({ ok: true, recipientCount });
}
