// app/api/cron/weekly-rankings/route.ts
//
// Vercel Cron target (see vercel.json): fires daily at 07:00 UTC, but only
// rearranges the Top 100 every third day (lib/top100Time.ts keeps the page
// countdown on the same clock). Applies accumulated votes by calling the
// perform_weekly_player_rearrangement RPC as service role. Vercel sends
// Authorization: Bearer <CRON_SECRET> automatically when the env var is set.
// Pass ?force=1 to rearrange off-cycle (manual catch-up).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getLastRearrangementIso, isRearrangementDay } from '@/lib/top100Time';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get('force') === '1';
  if (!force && !isRearrangementDay()) {
    return NextResponse.json({ ok: true, skipped: 'not a rearrangement day' });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase server credentials' }, { status: 500 });
  }

  const admin = createClient<Database>(url, serviceKey);

  // The RPC archives currentweeklyrankings under the (year, week) those rows
  // are stamped with. When two runs land in the same ISO week, the second
  // run's output keeps that week's stamp and the NEXT run collides with the
  // uq_history_year_week_player constraint (this is what silently killed
  // reranking in April 2026). Clearing the incoming stamp's bucket first
  // gives "last rankings of the week win" semantics at any cadence.
  const { data: stampRows, error: stampError } = await admin
    .from('currentweeklyrankings')
    .select('year, week_of_year')
    .limit(1);
  if (stampError) {
    return NextResponse.json({ error: stampError.message }, { status: 500 });
  }
  const stamp = stampRows?.[0];
  if (stamp) {
    const { error: clearError } = await admin
      .from('rankinghistory')
      .delete()
      .eq('year', stamp.year)
      .eq('week_of_year', stamp.week_of_year);
    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }
  }

  // The RPC only counts votes from roughly the last 48 hours (it was built
  // for a 2-day cadence). Refresh the timestamps of every vote cast or
  // changed during the current cycle so a 3-day cycle's votes all land
  // inside that window.
  const cycleStart = getLastRearrangementIso();
  const nowIso = new Date().toISOString();
  const { error: freshenError } = await admin
    .from('playervotes')
    .update({ created_at: nowIso, updated_at: nowIso })
    .or(`created_at.gte.${cycleStart},updated_at.gte.${cycleStart}`);
  if (freshenError) {
    return NextResponse.json({ error: freshenError.message }, { status: 500 });
  }

  const { data, error } = await admin.rpc('perform_weekly_player_rearrangement');
  if (error) {
    console.error('weekly-rankings cron failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result: data });
}
