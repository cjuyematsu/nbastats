# Top 100 RPC internals (source of truth: Supabase dashboard)

Captured 2026-07-03 via `pg_get_functiondef`. If these are edited in the dashboard,
update this file. The `migrations/` folder stays empty by design.

## perform_weekly_player_rearrangement()

What it actually does, in order:

1. `window_start := NOW() - INTERVAL '48 hours'` (hardcoded; this is why the cron
   route freshens vote timestamps for the 3-day cadence).
2. Archives ALL of `currentweeklyrankings` into `rankinghistory` stamped
   `(EXTRACT(YEAR), EXTRACT(WEEK))` of NOW. Two runs in one ISO week collide on
   `uq_history_year_week_player` and ABORT the whole function (the cron route
   clears the bucket first to prevent this).
3. Vote-weighted reordering of the current 100:
   `weighted_rank = ((rank*2*sameSpot) + (rank-1)*up + (rank+1)*down) / (up + down + 2*sameSpot)`,
   no votes = keep rank. New order = `ORDER BY ROUND(weighted_rank, 2) ASC, current_rank DESC`
   (the DESC tie-break means a rank-22 player with net +1 jumps ABOVE an unvoted rank-21).
4. Promotion: top 3 nominees outside the 100 by net score (needs >= 1 upvote in
   window) enter at `weighted_rank = 101 - 0.5*net_score`; the same number of
   players from ranks 91-100 with the lowest `net_movement_score` are relegated.
5. `TRUNCATE currentweeklyrankings`, re-insert the new board.
6. **`DELETE FROM playervotes WHERE created_at >= window_start`** — votes in the
   window are CONSUMED. Votes older than 48h (or outside the window) survive as
   dead rows; this is why "your vote" reads must be cycle-scoped.

Return string: `Rearrangement completed. Archived: N, Promoted: N, Ranks Created: N, Votes Cleared: N`.

Known quirks (harmless today, fix if ever edited):
- Uses `EXTRACT(YEAR)` + `EXTRACT(WEEK)` (not ISOYEAR): year/week stamps disagree
  around New Year.
- The window should ideally be a parameter (`p_window_start`); then the cron
  route's freshen step can be deleted.

## get_aggregated_weekly_votes_for_players(player_ids_array, p_week_start_time)

Straight per-player up/down/sameSpot counts from `playervotes` where
`created_at >= p_week_start_time`. The client passes `getLastRearrangementIso()`.

## get_players_ranking_histories_with_current(player_ids_array)

Last-5-weeks history from `rankinghistory` as jsonb + `last_week_rank` (most
recent archived week) + `current_rank` from `currentweeklyrankings` +
`weekly_change = last_rank - current_rank` (positive = climbed).

## Scheduling (as of 2026-07-06)

- **The Vercel Hobby cron silently did not fire on 2026-07-03 and 2026-07-06**
  (both boundaries missed; the board sat at the 07-04 manual run and votes were
  never consumed). The route code is correct: hitting it by hand with the bearer
  token applied the 07-06 boundary cleanly ("Archived 100, Ranks Created 100,
  Votes Cleared 100", 68/100 players moved). So the failure mode to watch is the
  **scheduled trigger not invoking the route**, not the route logic. First things
  to check when the board looks stale: (1) `CRON_SECRET` is set in Vercel
  Production env (Vercel only sends `Authorization: Bearer <CRON_SECRET>` when it
  is; missing -> the route 401s every fire); (2) Vercel dashboard shows the cron
  with recent invocations. A redundant **GitHub Actions** trigger
  (`.github/workflows/top100-reshuffle.yml`, 08:30 UTC + manual dispatch) now
  backs up the Hobby cron; the `planRearrangement` gate makes a double fire a
  no-op. The page also shows an honest "reshuffle pending" banner
  (`isBoundaryUnapplied` in `lib/top100Time.ts`) when the board predates the last
  boundary, instead of resetting the countdown as if a missed reshuffle had
  succeeded.
- Archive keying (confirmed empirically 2026-07-06): the RPC archives under the
  **board's own `(year, week_of_year)` stamp**, not `EXTRACT(WEEK)` of NOW (board
  stamped w27 archived to w27; the freshly created board is stamped the current
  week, w28). This is exactly the bucket the route's clear step deletes
  (`board.year`/`board.week_of_year`), so the clear and the archive always agree.
- Vercel cron (`vercel.json`): daily 08:00 UTC (Hobby allows one run/day; fires
  can be ~1h late, or skip entirely) -> `/api/cron/weekly-rankings`. The route acts when the
  board's `ranked_at` predates the last LA-midnight cycle boundary (every 3rd
  day, epoch 2026-07-03) and skips otherwise, so late or missed fires self-heal
  at the next daily fire instead of losing the cycle (a [-5min, +90min] window
  gate did exactly that on 2026-07-03). It clears the history bucket, freshens
  the ending cycle's vote timestamps, then calls the RPC. This is the ONLY
  scheduler that should call the RPC. The run/skip decision and freshen math
  are pure (`planRearrangement` in `lib/top100Cron.ts`); `npm test` proves the
  invariants under simulated schedules (tests/top100CronSimulation.test.ts):
  every boundary applies exactly once with fires up to 2 days late, no vote is
  counted twice, and votes are lost ONLY if zero fires happen for an entire
  3-day cycle (they then remain as harmless dead rows).
- pg_cron job 12 `weekly-player-rearrangement` (`0 7 */2 * *`, odd days of
  month) called the RPC DIRECTLY, bypassing the bucket-clear and freshen. It
  was the root cause of the flaky era: same-ISO-week double runs aborted on the
  unique constraint, and when it ran first in a fresh ISO week it reranked
  off-cycle and consumed 48h of votes early. **It must stay unscheduled**
  (`select cron.unschedule('weekly-player-rearrangement');`). pg_cron jobs 9
  and 10 (daily game generation) are unrelated; keep them.
