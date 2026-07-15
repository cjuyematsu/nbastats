# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Note: this file was rewritten to describe **this** project. An earlier copy described an
> unrelated app ("PastPic") and was committed here by mistake — ignore any memory of that.

## What this app is

**Hoops Data** (hoopsdata.net) is an NBA-statistics web app: side-by-side player comparison,
a community-voted Top 100, an "analysis" section (salary vs. performance, league growth,
points-by-draft-position), and five trivia games. It's a **Next.js 15 App Router** app
(React 19, TypeScript strict, Tailwind) backed by **Supabase** (Postgres + Auth + RPC) and
deployed on **Vercel**.

## Commands

```bash
npm run dev      # next dev   — primary dev workflow (http://localhost:3000)
npm run build    # next build — production build; this is also how you catch type errors
npm start        # next start — serve a production build
npm run lint     # next lint  — ESLint 9 flat config (next/core-web-vitals + next/typescript)
npm test         # tsx --test tests/*.test.ts — node:test via tsx (no jest/vitest installed)
```

Tests cover the Top 100 cycle clock (`lib/top100Time.ts`), the cron run/skip planner
(`lib/top100Cron.ts`), and a simulation of the vote/rearrangement lifecycle under late,
missed, and forced cron fires. Run them for ANY change touching that logic. There is **no
separate typecheck script** — type errors surface in the editor and at `next build`.

## Architecture

### App Router shell + client components
`app/layout.tsx` is the root: it mounts `AuthProvider`, the global `Navbar`/`Header`,
Vercel `Analytics`/`SpeedInsights`, the `Inter` font, and all SEO metadata (plus
`sitemap.ts` / `robots.ts`). Each feature is a route segment under `app/`.

The dominant pattern is a thin **server `page.tsx` shell that renders a `'use client'`
`*Client.tsx`** which holds the interactivity and queries Supabase directly (e.g.
`app/top-100-players/page.tsx` → `Top100PlayersClient.tsx`, `app/games/odd-man-out/page.tsx`
→ `OddManOutClient.tsx`). When adding a feature, follow this shape rather than putting heavy
client logic in `page.tsx`.

Routes: `compare/`, `player/[playerId]/`, `top-100-players/`, `degrees-of-separation/`,
`analysis/{salary-vs-points,growth-of-nba,draft-points}/`,
`games/{stat-over-under,draft-quiz,ranking-game,odd-man-out,six-degrees}/`, `signin/`,
`signup/`. Several games use dynamic segments: `games/draft-quiz/[year]`,
`games/six-degrees/[pageId]`, `games/stat-over-under/[era]`.

### Supabase is the spine
- **One shared browser client**: `lib/supabaseClient.ts` exports `supabase` (typed with
  `Database` from `types/supabase.ts`). Import it via the `@/` alias; don't create new
  clients in components.
- **Auth via Context, not per-component**: `app/contexts/AuthContext.tsx` provides
  `AuthProvider` (mounted in the layout) and the `useAuth()` hook returning
  `{ supabase, session, user, isLoading, signOut }`. Use `useAuth()`; gate on `isLoading`
  before trusting `user`/`session`. It listens to `onAuthStateChange`.
- **Data access = RPC + typed table queries.** Most reads/writes go through **Postgres RPC
  functions** (`supabase.rpc(...)`) defined in Supabase, e.g. `get_player_suggestions`,
  `get_ranking_game_data`, `get_odd_man_out_game_data`, `get_current_ranking_with_details`,
  `submit_player_vote`, `perform_weekly_player_rearrangement`. **Prefer an existing RPC over
  ad-hoc SQL/queries.** Both RPCs and tables are typed by the generated `types/supabase.ts`.

### A couple of API routes (server-side) do exist
Most data flows client→Supabase, but `app/api/` holds the exceptions:
- `app/api/degrees/route.ts` — **Six Degrees** BFS. Loads `public/adjacency_list.json`
  (~4 MB) + `public/player_map.json` from disk, **caches them in module-level vars**
  (`adjList`/`playerMap`), runs BFS (max 10 degrees), then enriches each hop from the
  Supabase `teammates` table. The big JSON graph is a precomputed static asset, not in the DB.
- `app/api/quiz/save/route.ts` — upserts draft-quiz progress into `quiz_attempts`. It reads
  the `Authorization: Bearer <token>` header, verifies the user with Supabase, then writes as
  that user.
- `app/api/account/delete/route.ts` — self-service account deletion, driven by the Danger Zone
  on `/account` (typed-email confirm; hidden for admins, and the route 403s them so the owner
  can't lock itself out of article review). Order is load-bearing: **app rows first, then
  `auth.admin.deleteUser`** — the FKs to `auth.users` do NOT cascade, so deleting the auth user
  while rows remain fails `23503` (`gamescores_user_id_fkey`). Comments are anonymized
  (`user_id` null + `author_name` 'Deleted user'), not deleted, so reply threads survive; the
  client then calls `clearLocalUserData()` (`lib/localUserData.ts`) since `signOut` clears only
  the session, never the per-user localStorage.
- `app/api/cron/weekly-rankings/route.ts` — Vercel Cron target (`vercel.json`, once daily at
  **08:00 UTC**; Hobby allows one cron/day and fires can be **up to ~1h late**, so never gate
  on a tight time window — a late-refused fire on 2026-07-03 silently lost a whole cycle.
  Scheduled runs instead gate on an **unapplied boundary**: if the board's `ranked_at`
  predates `getLastRearrangementIso()` (LA-midnight boundary every third day,
  `lib/top100Time.ts`, which also drives the page countdowns), a rearrangement is owed and
  the run settles it however late; otherwise it skips. Missed fires self-heal the next day;
  `?force=1` rearranges off-cycle. The gate + freshen math is the pure
  `planRearrangement` in `lib/top100Cron.ts`, exercised by `npm test`). Auths
  `Authorization: Bearer <CRON_SECRET>`, then, as
  service role: (1) clears the `rankinghistory` bucket matching the incoming rankings'
  (year, week) stamp, because the `perform_weekly_player_rearrangement` RPC archives under
  that stamp and two runs in one ISO week otherwise poison the next run with a
  `uq_history_year_week_player` violation (this is what silently killed reranking
  2026-04-25 to 2026-07-02); (2) freshens the ending cycle's vote timestamps (bounded to
  [prev boundary, boundary) so late catch-ups don't drag new votes backward) to
  **boundary minus 1s** (floored at now minus 47h), because the RPC only counts votes from
  roughly the last 48 hours and that stamp keeps them out of the NEW cycle's counts and
  highlight reads (`?force=1` stamps `now` instead so mid-cycle counts survive); (3) calls
  the RPC. The Top 100 page opens its vote window at the board's **`ranked_at`** (last
  APPLIED rearrangement), not the theoretical boundary, so votes stay visible until a run
  actually consumes them. Vote writers also reset `created_at` when a user changes an
  existing vote so re-votes count as new.

### Anonymous identity for guests
`lib/anonymousIdentifier.ts` (`getAnonymousId`) mints/stores a localStorage `anon_*` id with
a **7-day expiry** so guests can vote / track game streaks without an account. Voting and
some game records key on either `user_id` (signed in) or this anonymous id.

### Top 100 voting model
The page is a compact leaderboard: `Top100PlayersClient.tsx` is the container,
`PlayerRow`/`RecapStrip`/`TrendingStrip`/`NominateSection` live beside it (`TrendingStrip` =
live current-cycle vote momentum, distinct from `RecapStrip`'s already-applied rank changes).
A dynamic `/top-100-players/opengraph-image` renders the live top 10, and the page offers a
"share my ballot" button (`buildTop100BallotShare`). All vote writes go through
`lib/top100Votes.ts` (select-then-insert/update on `playervotes`, delete on un-vote; upsert
breaks anonymous identities) — the home quick-vote and nominations use it too. Voting is
deliberately NOT a daily-hub task (user decision). "Your vote" reads MUST be cycle-scoped
(`.gte('created_at', cycle start)`) to match the aggregated counts; unscoped reads re-light
vote buttons from prior cycles. The rearrangement RPC **consumes** (deletes) the votes it
counts. Full RPC internals + the pg_cron history: `docs/top-100-rpcs.md`. Only the Vercel
cron route may call `perform_weekly_player_rearrangement`; a direct pg_cron job doing so
was the source of the flaky-reranking era. Reports that the board "didn't reshuffle" are often
a LATE fire, not a real failure: the LA-midnight boundary is 07:00 UTC in summer but the fire
can land ~1h+ later (on 2026-07-12 it applied at 08:35 UTC), and during that window the page
shows the amber "Reshuffle in progress" banner and looks broken. **Always check
`currentweeklyrankings.ranked_at` first** (curl the route locally with the `.env.local`
`CRON_SECRET`, or read the column) before assuming a stranding — a `skipped: "boundary already
applied"` with a same-day `rankedAt` means it worked. Only if `ranked_at` predates the boundary
is it truly stuck; then check `CRON_SECRET` is set in Vercel Production (missing = route 401s,
redeploy after setting) and the GH repo secrets (`CRON_SECRET`, `PRODUCTION_URL`) are set. The
redundant GitHub Actions trigger (`.github/workflows/top100-reshuffle.yml`) polls **every 2h**
so the 08:00 UTC fire settles the board promptly and one skipped fire can't strand it; it also
offers a manual "Run workflow" catch-up. The page shows the honest "reshuffle pending" banner
(`isBoundaryUnapplied`) instead of resetting the countdown when a boundary has not applied.

## Data & schema

Supabase Postgres is the **source of truth**; the `migrations/` folder is **empty by design**
(schema is managed in the Supabase dashboard, not via tracked migrations). When the schema
changes, **regenerate `types/supabase.ts`** so RPC/table types stay accurate.

Notable tables: `regularseasonstats`, `playoffstats`, `draft`, `teammates`, `players`,
`playervotes`, `currentweeklyrankings`, `rankinghistory`, `daily_connection_games`,
`quiz_attempts`, `ranking_game_streaks`, `odd_man_out_streaks`, `six_degrees_scores`,
`stat_ou_daily_challenges`, `gamescores`. Domain TS interfaces (career/per-game stats,
suggestions) live in `types/stats.ts`.

`teammates` (~150k pair rows) is derived from the game-log dump `data/PlayerStatistics.csv`
(not in git, ~390 MB): a shared game = both players in the same team's box score for a
**regular season or playoff** game (preseason, All-Star, Play-In, and NBA Cup finals are
excluded, matching official NBA stats — `INCLUDE_TYPES` in `scripts/refresh-teammates.ts`);
sparse roster rows with no minutes still count, and postponed games repeat a gameId under two
dates where only the final date is real. The table also carries `CombinedPtsPerGame`/`CombinedAstPerGame`/`CombinedRebPerGame` (each
duo's combined per-game output over games BOTH logged minutes; null when they never both
played), shown on `/duos`, `/duos/[slug]`, and the greatest-duos article cards.
`npm run refresh:teammates` recomputes, diffs, and (with `--apply`) updates/inserts/deletes to
sync the table after a new season's CSV lands; the exhibition-exclusion migration ran
2026-07-06 (185,297 → 149,560 rows). Schema changes go in the Supabase SQL editor (no DB
password in env), then hand-add columns to `types/supabase.ts` and re-run `--apply` to backfill.

Static / hardcoded data:
- `public/` — team logo PNGs and the Six Degrees graph JSON (`adjacency_list.json`,
  `player_map.json`).
- `app/data/` — historical datasets used by the analysis pages
  (`salaryData.ts`, `draftData.ts`, `viewershipData.ts`). `draftData.ts` is **generated**, not
  hand-edited: run `npm run generate:draft-data` (script `scripts/generate-draft-data.ts`) to
  recompute the top-5 career scorers per draft pick from `regularseasonstats` via the
  `calculate_player_career_stats` RPC — rerun it after a new season lands in the DB.

## Conventions

- **Path alias**: `@/*` → repo root (`tsconfig.json`), e.g. `@/lib/supabaseClient`,
  `@/types/supabase`.
- **TypeScript strict** is on; keep things typed against the generated Supabase types.
- **Client components** that use hooks/state/Supabase must start with `'use client'`.
- **Styling**: Tailwind CSS 3, with dark-mode utility classes throughout and CSS variables
  (`--background`/`--foreground`) in `app/globals.css`.
- **Charts**: Chart.js + `react-chartjs-2` and Recharts are both present; match whatever the
  neighboring page already uses.
- **Search inputs** are debounced (`use-debounce` / lodash `debounce`) to avoid hammering
  Supabase RPCs — keep that when adding autocomplete.
- **Drag-and-drop** (the ranking game) uses `@hello-pangea/dnd`.
- **SEO**: per-route `metadata`, plus `app/sitemap.ts` and `app/robots.ts` — update these
  when adding public routes.

## Environment & secrets

- `.env` — public, client-exposed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `.env.local` — server-only: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `PRODUCTION_URL`.
- **Never import the service-role key into a client component** or expose it via a
  `NEXT_PUBLIC_*` var — it bypasses row-level security. Use it only in server routes/jobs.

## Gotchas

- **Tests are node:test via tsx** (`tests/*.test.ts`, `npm test`) — no jest/vitest. Keep new
  logic in pure, importable functions (like `lib/top100Cron.ts`) so it's testable this way;
  the BFS path-building and scoring/streak math are still untested candidates.
- **Schema drift**: a Supabase change that isn't reflected in `types/supabase.ts` will pass
  the editor but produce wrong/`any` types — regenerate after schema edits.
- `migrations/` being empty is **intentional** — don't treat it as missing setup.
- **`article_comments.author_name` is assigned by a DB trigger** (pseudonyms like `hoopsfan27`)
  which overrides whatever the insert passes — so `displayName()` in
  `app/api/articles/comments/route.ts` is effectively dead. The trigger is INSERT-only, which is
  why the deletion route can still rewrite it to 'Deleted user' on UPDATE.
- **Pre-1971 box scores are missing minutes and shot attempts** for many games (league TS%
  computed from the logs reads 84% in 1958; recorded MPG is single-digit league-wide in the
  50s/60s). Points and games ARE complete for all eras. Gate any MPG/per-36/TS%/FGA-derived
  stat to 1971+ seasons — precedent: `DETAIL_RELIABLE_FROM` in
  `scripts/generate-playoff-risers.ts` (plus a 75% coverage rule, null + dash in the UI).
- **Daily challenges are LA-date seeded.** `lib/dailySeed.ts` (deterministic RNG),
  `lib/rankingDaily.ts` and `lib/oddManOutDaily.ts` (client-side generated dailies from
  `regularseasonstats` / `teammates`), `lib/dailyProgress.ts` (cross-game completion +
  site streak in localStorage, `hd:dailyProgress_<date>`, plus a DB merge for signed-in
  users). Keep any new daily on the LA clock (`lib/dailyTime.ts`).

## Maintaining this file

- Fold in anything learned that prevents a repeat mistake; prune detail that's no longer true.
- Keep this file in the ~120–200 line range. If a topic outgrows a few lines, move it to a
  `docs/<topic>.md` and leave a one-line pointer here.
