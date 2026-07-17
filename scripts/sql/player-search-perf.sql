-- Performance work for player search and the player page.
-- APPLIED 2026-07-16 in the Supabase SQL editor: the pg_trgm extension, the
-- three trigram indexes, idx_teammates_teammateid, and idx_draft_playerid.
-- The personId btrees below were NOT applied: the regularseasonstats and
-- playoffstats primary keys already lead with "personId". Kept here so a
-- rebuilt database can replay the whole file.
-- No signature changes, so types/supabase.ts does not need regenerating.

-- get_player_suggestions already has LIMIT 10 (verified 2026-07-16). Its cost
-- is the scan: it aggregates regularseasonstats per player, filtering on
--   "firstName" ILIKE term || '%'
--   "lastName" ILIKE term || '%'
--   ("firstName" || ' ' || "lastName") ILIKE '%' || term || '%'
-- The three trigram indexes below match those expressions exactly so the OR
-- can use a BitmapOr of index scans instead of a seq scan. Trigram matching
-- kicks in from 3-character terms; 2-character queries may still scan.

create extension if not exists pg_trgm;

create index if not exists idx_rss_firstname_trgm
  on regularseasonstats using gin ("firstName" gin_trgm_ops);

create index if not exists idx_rss_lastname_trgm
  on regularseasonstats using gin ("lastName" gin_trgm_ops);

create index if not exists idx_rss_fullname_trgm
  on regularseasonstats using gin ((("firstName" || ' ' || "lastName")) gin_trgm_ops);

-- Btree indexes backing the player page's per-player lookups and the two
-- career RPCs. Check what already exists first and skip covered columns
-- (a primary key with the column leading counts):
--   select tablename, indexname, indexdef from pg_indexes
--   where schemaname = 'public'
--     and tablename in ('regularseasonstats','playoffstats','teammates','draft')
--   order by tablename;

-- Already covered by primary keys as of 2026-07-16; replay only on a rebuild:
-- create index if not exists idx_regularseasonstats_personid on regularseasonstats ("personId");
-- create index if not exists idx_playoffstats_personid on playoffstats ("personId");
-- create index if not exists idx_teammates_playerid on teammates ("PlayerID");

create index if not exists idx_teammates_teammateid on teammates ("TeammateID");
create index if not exists idx_draft_playerid on draft ("playerId");

-- Also applied 2026-07-16 to get_player_suggestions (dashboard-managed body):
-- 1. Early return on empty term (was `trimmed_search_term = '' OR ...` in the
--    WHERE, which made an empty term match everything and let cached generic
--    plans skip the trigram indexes):
--      IF trimmed_search_term = '' THEN RETURN; END IF;
--    with that OR arm removed from the WHERE.
-- 2. Force per-call planning so the ILIKE patterns are known to the planner
--    and the trigram indexes are always used (generic plans seq-scanned,
--    ~19ms; custom plans run ~1ms + ~4ms planning):
alter function public.get_player_suggestions(text) set plan_cache_mode = force_custom_plan;

-- Verify afterwards:
--   explain analyze select * from get_player_suggestions('curry');
