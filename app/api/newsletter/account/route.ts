// app/api/newsletter/account/route.ts
//
// Signed-in newsletter management, keyed on the caller's verified auth email.
// GET reports the subscription status for that email; POST { action:'unsubscribe' }
// flips it to unsubscribed. Reads/writes go through the service role because
// newsletter_subscribers has RLS with no user policies; safe because we only ever
// touch the row matching the authenticated user's own email.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Status = 'confirmed' | 'pending' | 'unsubscribed' | 'none';

async function getEmail(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const client = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user?.email) return null;
  return user.email.trim().toLowerCase();
}

export async function GET(request: Request) {
  const email = await getEmail(request);
  if (!email) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('status')
    .eq('email', email)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }

  const status: Status = (data?.status as Status) ?? 'none';
  return NextResponse.json({ email, status });
}

export async function POST(request: Request) {
  const email = await getEmail(request);
  if (!email) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (body.action !== 'unsubscribe') {
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('email', email);
  if (error) {
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: 'unsubscribed' });
}
