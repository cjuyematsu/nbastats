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
```

There is **no test script and no separate typecheck script** — type errors surface in the
editor and at `next build`. Don't reference `npm test`/`jest`; none is installed.

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
- `app/api/cron/weekly-rankings/` — directory exists but is currently an **empty stub** (no
  `route.ts` yet). A `CRON_SECRET` env var is reserved for it; the weekly reshuffle currently
  lives in the `perform_weekly_player_rearrangement` RPC.

### Anonymous identity for guests
`lib/anonymousIdentifier.ts` (`getAnonymousId`) mints/stores a localStorage `anon_*` id with
a **7-day expiry** so guests can vote / track game streaks without an account. Voting and
some game records key on either `user_id` (signed in) or this anonymous id.

## Data & schema

Supabase Postgres is the **source of truth**; the `migrations/` folder is **empty by design**
(schema is managed in the Supabase dashboard, not via tracked migrations). When the schema
changes, **regenerate `types/supabase.ts`** so RPC/table types stay accurate.

Notable tables: `regularseasonstats`, `playoffstats`, `draft`, `teammates`, `players`,
`playervotes`, `currentweeklyrankings`, `rankinghistory`, `daily_connection_games`,
`quiz_attempts`, `ranking_game_streaks`, `odd_man_out_streaks`, `six_degrees_scores`,
`stat_ou_daily_challenges`, `gamescores`. Domain TS interfaces (career/per-game stats,
suggestions) live in `types/stats.ts`.

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

- **No test framework** is installed yet. If you add one, keep new logic in pure, importable
  functions (e.g. the BFS path-building, scoring/streak math) so it's unit-testable.
- **Schema drift**: a Supabase change that isn't reflected in `types/supabase.ts` will pass
  the editor but produce wrong/`any` types — regenerate after schema edits.
- The `app/api/cron/weekly-rankings/` route is a **stub** (no handler); don't assume it runs.
- `migrations/` being empty is **intentional** — don't treat it as missing setup.

## Maintaining this file

- Fold in anything learned that prevents a repeat mistake; prune detail that's no longer true.
- Keep this file in the ~120–200 line range. If a topic outgrows a few lines, move it to a
  `docs/<topic>.md` and leave a one-line pointer here.
