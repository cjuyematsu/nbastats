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

## Scheduling (as of 2026-07-03)

- Vercel cron (`vercel.json`): daily 07:00 UTC -> `/api/cron/weekly-rankings`,
  which self-gates to every 3rd day (epoch 2026-07-03), clears the history
  bucket, freshens vote timestamps, then calls the RPC. This is the ONLY
  scheduler that should call the RPC.
- pg_cron job 12 `weekly-player-rearrangement` (`0 7 */2 * *`, odd days of
  month) called the RPC DIRECTLY, bypassing the bucket-clear and freshen. It
  was the root cause of the flaky era: same-ISO-week double runs aborted on the
  unique constraint, and when it ran first in a fresh ISO week it reranked
  off-cycle and consumed 48h of votes early. **It must stay unscheduled**
  (`select cron.unschedule('weekly-player-rearrangement');`). pg_cron jobs 9
  and 10 (daily game generation) are unrelated; keep them.
