# Articles (AI-generated, draft → review → publish)

The Articles tab is populated by an agentic pipeline that takes a current NBA storyline
(web search), grounds it in this app's own data, and writes a draft. A human reviews and
publishes. Pipeline surface: **Claude API + tool use** run server-side (not Managed Agents).

## One-time setup

### 1. Create the `articles` table (Supabase SQL editor)

`migrations/` is intentionally empty (schema is managed in the dashboard), so run this in the
Supabase SQL editor:

```sql
create table public.articles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  dek             text,
  summary         text,
  body_markdown   text not null,
  sources         jsonb,
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'rejected')),
  generation_meta jsonb,
  author          text default 'Hoops Data Staff',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);

alter table public.articles enable row level security;

-- Anon/auth browser client may read ONLY published articles. Drafts stay private;
-- the service-role key (cron + review API) bypasses RLS for everything else.
create policy "Public can read published articles"
  on public.articles for select
  using (status = 'published');

create index articles_status_published_at_idx
  on public.articles (status, published_at desc);
```

### 2. Regenerate types (keeps `types/supabase.ts` authoritative)

```bash
npx supabase gen types typescript --project-id <your-project-ref> --schema public > types/supabase.ts
```

The `articles` table is currently hand-added to `types/supabase.ts` so the app compiles before
you regenerate; regenerating will reproduce it from the live schema.

### 3. Environment variables (`.env.local`, server-only)

```
ANTHROPIC_API_KEY=sk-ant-...   # Claude API key for the generation pipeline
# already present: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY
```

Admins are NOT set by env var. Review/publish access is a per-account flag on the user's
`public.players` profile row.

### 4. Grant review/publish access (admin)

```sql
alter table public.players add column if not exists is_admin boolean not null default false;

-- grant admin to your account (creates the profile row if it doesn't exist yet)
insert into public.players (id, is_admin)
  select id, true from auth.users where email = 'cjuyematsu@gmail.com'
  on conflict (id) do update set is_admin = true;
```

The review API and the navbar's owner-only "Review" link both read `players.is_admin`
server-side (via the service-role client), so it can't be spoofed from the browser.

## Generating an article

POST to the cron route with the cron secret:

```bash
curl -X POST http://localhost:3000/api/cron/generate-article \
  -H "Authorization: Bearer $CRON_SECRET"
```

On Vercel, `vercel.json` schedules this automatically. Each run inserts one `draft` row.

## Reviewing

Sign in as an admin account (a `public.players` row with `is_admin = true`), go to
`/articles/review`, read the draft (stats are grounded in real DB rows, cross-check the
`sources`), then Approve (sets published) or Reject. Published articles appear at `/articles`
and `/articles/<slug>`.

## Cost

~$0.40–$0.90 per article (Sonnet draft + Opus polish; Haiku for ideation). Dominated by research
(web search + DB rows re-processed across the loop), not writing. Watch `generation_meta` on each
row for per-article token usage and estimated cost before scaling the cron cadence.

---

# Forum: voting, comments, and the analysis articles

`/articles` is a **forum**: every article (AI-generated *and* the three former `/analysis/*`
pages) can be upvoted/downvoted and commented on. The old analysis pages now live as
**component articles**: the article shell renders their existing interactive chart components
(`SalaryAnalysisClient`, `GrowthPageClient`, `DraftPointsClient`) instead of markdown.

- **Voting** is open to guests (mirrors `playervotes`: keyed by `user_id` or the 7-day
  `getAnonymousId()`).
- **Commenting** requires sign-in. Comments are flat with a single reply level
  (`parent_comment_id`), and an author can soft-delete their own.
- The owner (`ARTICLE_ADMIN_EMAIL`) can hide any comment from `/articles/review` (this calls the
  review API's `delete-comment` action via the service-role client).

## One-time setup (run in the Supabase SQL editor, then regenerate types)

> **Fresh database?** The steps below assume the base `articles` table from
> [§ Create the `articles` table](#1-create-the-articles-table-supabase-sql-editor) already
> exists. If it doesn't, step 1's `ALTER` will fail with `relation "public.articles" does not
> exist`. Create the table first (or run the consolidated bootstrap script kept alongside this
> doc). The `kind` / `component_key` columns can also just be folded into that `CREATE TABLE`.

### 1. Add `kind` / `component_key` to `articles`

```sql
alter table public.articles
  add column if not exists kind text not null default 'markdown'
    check (kind in ('markdown', 'component')),
  add column if not exists component_key text,
  add column if not exists author text default 'Hoops Data Staff',
  add column if not exists updated_at timestamptz not null default now();
```

### 2. `article_votes` (mirrors `playervotes`)

```sql
create table public.article_votes (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references public.articles(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  anonymous_id  text,
  vote_type     smallint not null check (vote_type in (-1, 1)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint article_votes_one_identity
    check ((user_id is not null) <> (anonymous_id is not null))
);

create unique index article_votes_user_unique
  on public.article_votes (article_id, user_id) where user_id is not null;
create unique index article_votes_anon_unique
  on public.article_votes (article_id, anonymous_id) where anonymous_id is not null;

alter table public.article_votes enable row level security;

create policy "Public can read article votes"
  on public.article_votes for select using (true);

create policy "Users manage own article votes"
  on public.article_votes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Guests vote via anonymous_id only (no user_id); same trust model as playervotes.
create policy "Anon insert article votes"
  on public.article_votes for insert
  with check (user_id is null and anonymous_id is not null);
create policy "Anon update article votes"
  on public.article_votes for update
  using (user_id is null and anonymous_id is not null)
  with check (user_id is null and anonymous_id is not null);
create policy "Anon delete article votes"
  on public.article_votes for delete
  using (user_id is null and anonymous_id is not null);
```

### 3. `article_comments` (sign-in required)

```sql
create table public.article_comments (
  id                uuid primary key default gen_random_uuid(),
  article_id        uuid not null references public.articles(id) on delete cascade,
  parent_comment_id uuid references public.article_comments(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  author_name       text not null,
  body              text not null,
  status            text not null default 'visible' check (status in ('visible', 'deleted')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index article_comments_article_idx
  on public.article_comments (article_id, created_at);

alter table public.article_comments enable row level security;

create policy "Public can read visible comments"
  on public.article_comments for select using (status = 'visible');
create policy "Users insert own comments"
  on public.article_comments for insert with check (auth.uid() = user_id);
create policy "Users update own comments"
  on public.article_comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own comments"
  on public.article_comments for delete using (auth.uid() = user_id);
```

Single-level threading (only top-level comments get a reply box) is enforced in the UI, not the
DB. Owner moderation hides comments by flipping `status` to `'deleted'` via the service-role key.

### 4. Forum-index RPC (one round-trip for the list)

```sql
create or replace function public.get_published_articles_with_engagement()
returns table (
  id uuid, slug text, title text, dek text, summary text, author text,
  kind text, component_key text, published_at timestamptz, updated_at timestamptz,
  upvotes bigint, downvotes bigint, score bigint, comment_count bigint
)
language sql stable security definer set search_path = public
as $$
  select
    a.id, a.slug, a.title, a.dek, a.summary, a.author, a.kind, a.component_key, a.published_at, a.updated_at,
    coalesce(v.upvotes, 0),
    coalesce(v.downvotes, 0),
    coalesce(v.upvotes, 0) - coalesce(v.downvotes, 0) as score,
    coalesce(c.comment_count, 0)
  from public.articles a
  left join (
    select article_id,
      count(*) filter (where vote_type = 1)  as upvotes,
      count(*) filter (where vote_type = -1) as downvotes
    from public.article_votes group by article_id
  ) v on v.article_id = a.id
  left join (
    select article_id, count(*) as comment_count
    from public.article_comments where status = 'visible' group by article_id
  ) c on c.article_id = a.id
  where a.status = 'published'
  order by a.published_at desc nulls last;
$$;

grant execute on function public.get_published_articles_with_engagement() to anon, authenticated;
```

### 5. Seed the analysis articles (recent weekly cadence)

Two component articles, dated a week apart on the Monday cron cadence so they read as a current
series. `updated_at` carries the "Updated X ago" label. (NBA Salary vs. Performance was dropped
from the published feed; its `/analysis/salary-vs-points` URL redirects to `/articles`.)

```sql
insert into public.articles
  (slug, title, dek, summary, body_markdown, kind, component_key, status, created_at, published_at, updated_at)
values
('draft-points',
 'NBA Draft Analysis: Top Scorers by Pick',
 'Which draft slots have actually produced points, and which picks outran their position.',
 'An analysis of the top-scoring NBA players by draft pick number, showing which draft positions historically produce the most points.',
 $md$Where a player is drafted shapes expectations, but career scoring tells you who actually delivered. This breakdown ranks the top five career scorers at each draft slot, first overall down through the late first round, so you can see which positions have historically produced points and which picks outran their draft position.

Click any player to dig into their full career.$md$,
 'component', 'draft-points', 'published',
 timestamptz '2026-06-22 14:00:00+00', timestamptz '2026-06-22 14:00:00+00', timestamptz '2026-06-27 14:00:00+00'),
('growth-of-nba',
 'The Growth of the NBA: Salary & Viewership Over Time',
 'Three decades of compounding growth, told through salaries and the Finals audience.',
 'A data-driven look at the NBA''s growth: player salaries since 1990 and NBA Finals viewership by year.',
 $md$The NBA of today barely resembles the league of 1990, not in style, and certainly not in dollars. This piece traces three decades of growth through the numbers the league cares about most: average and total player salaries, and the audience tuning in for the Finals.

The charts below follow salaries climbing from millions into the hundreds of millions, set against a viewership story that's more nuanced than the money. Together they tell a story of sustained, compounding growth.$md$,
 'component', 'growth-of-nba', 'published',
 timestamptz '2026-06-29 14:00:00+00', timestamptz '2026-06-29 14:00:00+00', timestamptz '2026-06-30 14:00:00+00');
```

### 6. Regenerate types

```bash
npx supabase gen types typescript --project-id <your-project-ref> --schema public > types/supabase.ts
```

The new columns, the `article_votes` / `article_comments` tables, and the engagement RPC are
hand-added to `types/supabase.ts` so the app compiles before you regenerate.
