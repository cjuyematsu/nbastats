// app/api/newsletter/confirm/route.ts
//
// Double opt-in landing target. The confirm link in the confirmation email hits
// this; we flip the subscriber to 'confirmed' (service role) and redirect to a
// friendly page. Invalid/expired tokens redirect too, so we never render errors.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NEWSLETTER_HOST } from '@/lib/newsletterTemplates';

export const dynamic = 'force-dynamic';

const BASE = `https://${NEWSLETTER_HOST}`;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (token) {
    const { data } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('confirm_token', token)
      .maybeSingle();
    if (data && data.status !== 'confirmed') {
      await supabaseAdmin
        .from('newsletter_subscribers')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', data.id);
    }
  }
  return NextResponse.redirect(`${BASE}/newsletter/confirmed`);
}
