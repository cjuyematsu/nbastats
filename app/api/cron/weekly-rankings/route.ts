// app/api/cron/weekly-rankings/route.ts
//
// Vercel Cron target (see vercel.json): fires once daily at 08:00 UTC (Hobby
// allows only one run per day, and fires can be late by up to ~an hour).
// The run/skip decision and vote-freshen math live in lib/top100Cron.ts
// (planRearrangement), which is covered by `npm test`: if the current board's
// ranked_at predates the last LA-midnight cycle boundary, a rearrangement is
// owed and this run settles it, no matter how late the fire is. A missed or
// refused fire self-heals at the next daily fire. Applies accumulated votes
// by calling the perform_weekly_player_rearrangement RPC as service role.
// Vercel sends Authorization: Bearer <CRON_SECRET> automatically when the
// env var is set. Pass ?force=1 to rearrange off-cycle (manual escape hatch).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { planRearrangement } from '@/lib/top100Cron';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get('force') === '1';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase server credentials' }, { status: 500 });
  }

  const admin = createClient<Database>(url, serviceKey);

  const { data: boardRows, error: boardError } = await admin
    .from('currentweeklyrankings')
    .select('year, week_of_year, ranked_at')
    .limit(1);
  if (boardError) {
    return NextResponse.json({ error: boardError.message }, { status: 500 });
  }
  const board = boardRows?.[0];
  if (!board) {
    return NextResponse.json({ ok: true, skipped: 'no current rankings' });
  }

  const plan = planRearrangement({ force, rankedAt: board.ranked_at });
  if (plan.action === 'skip') {
    return NextResponse.json({
      ok: true,
      skipped: plan.reason,
      boundary: plan.boundaryIso,
      rankedAt: board.ranked_at,
    });
  }

  // The RPC archives currentweeklyrankings under the (year, week) those rows
  // are stamped with. When two runs land in the same ISO week, the second
  // run's output keeps that week's stamp and the NEXT run collides with the
  // uq_history_year_week_player constraint (this is what silently killed
  // reranking in April 2026). Clearing the incoming stamp's bucket first
  // gives "last rankings of the week win" semantics at any cadence.
  const { error: clearError } = await admin
    .from('rankinghistory')
    .delete()
    .eq('year', board.year)
    .eq('week_of_year', board.week_of_year);
  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  // The RPC only counts votes from roughly the last 48 hours (it was built
  // for a 2-day cadence). Refresh the timestamps of the ending cycle's votes
  // so a full 3-day cycle's worth lands inside that window; see
  // lib/top100Cron.ts for the stamp/window semantics.
  const { error: freshenError } = await admin
    .from('playervotes')
    .update({ created_at: plan.stampIso, updated_at: plan.stampIso })
    .or(plan.freshenFilter);
  if (freshenError) {
    return NextResponse.json({ error: freshenError.message }, { status: 500 });
  }

  const { data, error } = await admin.rpc('perform_weekly_player_rearrangement');
  if (error) {
    console.error('weekly-rankings cron failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    mode: plan.mode,
    boundary: plan.boundaryIso,
    previousRankedAt: board.ranked_at,
    result: data,
  });
}
