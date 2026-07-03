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
import { getLastRearrangementIso, getPreviousRearrangementIso, getRunInstantIso, isRearrangementDay } from '@/lib/top100Time';
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
  // Scheduled runs settle the cycle ending at TODAY's 07:00 boundary, even
  // if the scheduler fires a few minutes off. Runs earlier in the UTC day
  // (e.g. a manual curl) are refused: they would rearrange hours early and,
  // without the pinned boundary, mis-stamp the live cycle's votes (happened
  // 2026-07-03, 111 rows repaired).
  const boundaryIso = force ? getLastRearrangementIso() : getRunInstantIso();
  if (!force && Date.now() < Date.parse(boundaryIso) - 5 * 60_000) {
    return NextResponse.json({ ok: true, skipped: 'before the 07:00 UTC run instant' });
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
  // for a 2-day cadence). Refresh the timestamps of every vote from the
  // cycle being applied so a full 3-day cycle's votes land inside that
  // window. Boundary runs stamp them just before the boundary (never in the
  // future, in case the RPC's window is capped at now()) so they stay out
  // of the new cycle's counts and highlight queries. A force run mid-cycle
  // stamps now instead, so the current cycle's UI counts survive the
  // rerank. (A late same-day non-force catch-up absorbs any post-boundary
  // votes into the old cycle; acceptable, the window is minutes.)
  const windowStartIso = force
    ? boundaryIso
    : getPreviousRearrangementIso(new Date(Date.parse(boundaryIso)));
  const stampIso = force
    ? new Date().toISOString()
    : new Date(Math.min(Date.now(), Date.parse(boundaryIso) - 1000)).toISOString();
  const { error: freshenError } = await admin
    .from('playervotes')
    .update({ created_at: stampIso, updated_at: stampIso })
    .or(`created_at.gte.${windowStartIso},updated_at.gte.${windowStartIso}`);
  if (freshenError) {
    return NextResponse.json({ error: freshenError.message }, { status: 500 });
  }

  const { data, error } = await admin.rpc('perform_weekly_player_rearrangement');
  if (error) {
    console.error('weekly-rankings cron failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, mode: force ? 'forced' : 'boundary', result: data });
}
