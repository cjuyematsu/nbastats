// app/api/newsletter/unsubscribe/route.ts
//
// One-click unsubscribe. GET is the human link in the email footer (redirects to
// a friendly page); POST backs the `List-Unsubscribe-Post` header so mail
// clients can unsubscribe without a round trip. Both key off unsubscribe_token.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NEWSLETTER_HOST } from '@/lib/newsletterTemplates';

export const dynamic = 'force-dynamic';

const BASE = `https://${NEWSLETTER_HOST}`;

async function unsubscribe(token: string | null): Promise<void> {
  if (!token) return;
  await supabaseAdmin
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token);
}

export async function GET(request: Request) {
  await unsubscribe(new URL(request.url).searchParams.get('token'));
  return NextResponse.redirect(`${BASE}/newsletter/unsubscribed`);
}

export async function POST(request: Request) {
  await unsubscribe(new URL(request.url).searchParams.get('token'));
  return NextResponse.json({ ok: true });
}
