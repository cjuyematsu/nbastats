// app/api/newsletter/subscribe/route.ts
//
// Anonymous double opt-in signup. Writes the subscriber row with the service
// role (the table has RLS on and no anon policies) and emails a confirm link.
// Always returns a generic success so the endpoint can't be used to probe which
// emails are already on the list.

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendConfirmationEmail } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const { data: existing, error: readErr } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id, status, confirm_token')
    .eq('email', email)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }

  // Already active: no email, generic success (don't leak membership).
  if (existing?.status === 'confirmed') {
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  // New or re-subscribing (pending/unsubscribed): (re)issue a confirm token.
  const confirmToken = randomUUID();
  if (existing) {
    const { error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .update({ status: 'pending', confirm_token: confirmToken, unsubscribed_at: null })
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert({ email, status: 'pending', confirm_token: confirmToken });
    if (error) return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }

  try {
    await sendConfirmationEmail(email, confirmToken);
  } catch (err) {
    console.error('Confirmation email failed:', err);
    return NextResponse.json(
      { error: "Couldn't send the confirmation email. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
