// app/api/articles/is-admin/route.ts
//
// Lightweight check the navbar uses to decide whether to show the owner-only
// "Review" link. Admin status comes from public.players.is_admin (verified
// server-side). The actual review actions are still gated in
// app/api/articles/review/route.ts; this endpoint only drives the link.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/articleAdmin';

export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  return NextResponse.json({ admin: gate.ok });
}
