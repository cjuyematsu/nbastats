-- Daily RPCs for Career Arc and Common Teammate, with materialized storage.
-- Run once in the Supabase SQL editor. Same date-salted determinism as
-- daily-challenge-rpcs.sql, but the result is also STORED: the first caller
-- of a given date computes the puzzle and inserts it; every later caller
-- reads the stored row, so the puzzle is immutable for the whole LA day even
-- if the stats tables change mid-day. No cron needed. The client libs
-- (lib/careerArcDaily.ts, lib/commonTeammateDaily.ts) call these first and
-- fall back to seeded client-side generation if they are missing.
--
-- The tables have RLS enabled with no policies: only these security definer
-- functions can touch them.

create table if not exists career_arc_daily_games (
  game_date date primary key,
  "personId" bigint not null,
  "name" text not null,
  points jsonb not null,
  reveals jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists common_teammate_daily_games (
  game_date date not null,
  round_no integer not null,
  a jsonb not null,
  b jsonb not null,
  a_mate_ids bigint[] not null,
  b_mate_ids bigint[] not null,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  primary key (game_date, round_no)
);

alter table career_arc_daily_games enable row level security;
alter table common_teammate_daily_games enable row level security;

-- 1. Career Arc: one prominent player with 8+ seasons; their PPG-by-season
--    curve plus the four progressive reveals.
create or replace function get_career_arc_daily(p_date date)
returns table (
  "personId" bigint,
  "name" text,
  points json,
  reveals json
)
language plpgsql
security definer
set search_path = public
as $$
declare
  pid bigint;
  pname text;
  pts jsonb;
  reveals_j jsonb;
  season_count int;
  draft_value text;
  prenba_value text;
  teams_value text;
  mate_value text;
begin
  return query
  select g."personId", g."name", g.points::json, g.reveals::json
  from career_arc_daily_games g where g.game_date = p_date;
  if found then
    return;
  end if;

  -- Pool: top 300 players by career points with 8+ seasons; seeded pick.
  -- Career points beats Prominence here: Prominence is season-scoped and
  -- recency-biased (it surfaced Landry Shamet as "prominent").
  with per_player as (
    select
      r."personId" as ppid,
      min(r."firstName") as fn,
      min(r."lastName") as ln,
      sum(r."PTS_total") as career_pts,
      count(distinct r."SeasonYear") as seasons
    from regularseasonstats r
    where r."personId" is not null
    group by r."personId"
    having count(distinct r."SeasonYear") >= 8
  ),
  pool as (
    select * from per_player order by career_pts desc nulls last, ppid limit 300
  )
  select ppid, trim(coalesce(fn, '') || ' ' || coalesce(ln, ''))
  into pid, pname
  from pool
  order by md5(p_date::text || ':arc-pick:' || ppid)
  limit 1;

  if pid is null then
    return;
  end if;

  -- One point per season; traded seasons merge on summed totals, with a
  -- per-game fallback from the biggest-G row when totals are null.
  select jsonb_agg(jsonb_build_object('year', sy, 'ppg', ppg) order by sy), count(*)
  into pts, season_count
  from (
    select
      r."SeasonYear" as sy,
      round(coalesce(
        sum(r."PTS_total") filter (where r."PTS_total" is not null and r."G" is not null)::numeric
          / nullif(sum(r."G") filter (where r."PTS_total" is not null and r."G" is not null), 0),
        (array_agg(r."PTS_per_g" order by r."G" desc nulls last))[1]::numeric
      ), 1) as ppg
    from regularseasonstats r
    where r."personId" = pid and r."SeasonYear" is not null
    group by r."SeasonYear"
  ) s
  where s.ppg is not null;

  select
    case when d."Year" is not null
      then 'Drafted ' || d."Year" ||
           case when d."Pick" is not null
             then ', Round ' || coalesce(d."Round", 1) || ' Pick ' || d."Pick"
             else '' end
      else null end,
    d."School/Club Team"
  into draft_value, prenba_value
  from draft d
  where d."playerId" = pid
  limit 1;

  select string_agg(tm, ', ' order by first_year)
  into teams_value
  from (
    select r."playerteamName" as tm, min(r."SeasonYear") as first_year
    from regularseasonstats r
    where r."personId" = pid and r."playerteamName" is not null
    group by r."playerteamName"
  ) t;

  -- Pairs are stored once, so both orientations are checked.
  select nm into mate_value
  from (
    select t."TeammateName" as nm, t."SharedGamesTotal" as sg
    from teammates t where t."PlayerID" = pid
    union all
    select t."PlayerName", t."SharedGamesTotal"
    from teammates t where t."TeammateID" = pid
  ) u
  order by sg desc nulls last, nm
  limit 1;

  reveals_j := jsonb_build_array(
    jsonb_build_object('label', 'Draft', 'value', coalesce(draft_value, 'Went undrafted')),
    jsonb_build_object('label', 'Teams', 'value', coalesce(teams_value, season_count || ' NBA seasons')),
    jsonb_build_object('label', 'Teammate', 'value',
      case when mate_value is not null then 'Played the most games with ' || mate_value
           else 'Teammate data unavailable' end),
    jsonb_build_object('label', 'Pre-NBA team', 'value', coalesce(prenba_value, 'Unknown'))
  );

  -- First caller of the day stores the puzzle; concurrent racers lose the
  -- insert and read the winner's identical row.
  insert into career_arc_daily_games (game_date, "personId", "name", points, reveals)
  values (p_date, pid, pname, pts, reveals_j)
  on conflict (game_date) do nothing;

  return query
  select g."personId", g."name", g.points::json, g.reveals::json
  from career_arc_daily_games g where g.game_date = p_date;
end;
$$;

-- 2. Common Teammate: five pairs of stars who never played together; the
--    answer set is everyone who played with both. Mate id arrays ship so the
--    client can give directional wrong-guess feedback with zero queries.
--    Pool ids resolved once from the teammates table (see
--    lib/commonTeammateDaily.ts POOL, same list).
create or replace function get_common_teammate_daily(p_date date)
returns table (
  round_no integer,
  a json,
  b json,
  "aMateIds" bigint[],
  "bMateIds" bigint[],
  answers json
)
language plpgsql
security definer
set search_path = public
as $$
declare
  pool constant text[] := array[
    '2544|LeBron James', '977|Kobe Bryant', '893|Michael Jordan', '406|Shaquille O''Neal',
    '1495|Tim Duncan', '708|Kevin Garnett', '1717|Dirk Nowitzki', '959|Steve Nash',
    '467|Jason Kidd', '1718|Paul Pierce', '951|Ray Allen', '1713|Vince Carter',
    '2548|Dwyane Wade', '101108|Chris Paul', '2546|Carmelo Anthony', '201142|Kevin Durant',
    '201939|Stephen Curry', '201566|Russell Westbrook', '201935|James Harden',
    '202681|Kyrie Irving', '203081|Damian Lillard', '202691|Klay Thompson',
    '203507|Giannis Antetokounmpo', '203999|Nikola Jokic', '203954|Joel Embiid',
    '202710|Jimmy Butler III', '202695|Kawhi Leonard', '202331|Paul George',
    '203076|Anthony Davis', '252|Karl Malone', '304|John Stockton', '787|Charles Barkley',
    '121|Patrick Ewing', '165|Hakeem Olajuwon', '937|Scottie Pippen', '397|Reggie Miller',
    '947|Allen Iverson', '77142|Magic Johnson', '1449|Larry Bird'
  ];
  ordered text[];
  idx integer := 1;
  rounds integer := 0;
  attempts integer := 0;
  a_id bigint;
  a_name text;
  b_id bigint;
  b_name text;
begin
  return query
  select c.round_no, c.a::json, c.b::json, c.a_mate_ids, c.b_mate_ids, c.answers::json
  from common_teammate_daily_games c where c.game_date = p_date order by c.round_no;
  if found then
    return;
  end if;

  select array_agg(p order by md5(p_date::text || ':ct-pool:' || p))
  into ordered
  from unnest(pool) p;

  while rounds < 5 and attempts < 20 and idx + 1 <= array_length(ordered, 1) loop
    a_id := split_part(ordered[idx], '|', 1)::bigint;
    a_name := split_part(ordered[idx], '|', 2);
    b_id := split_part(ordered[idx + 1], '|', 1)::bigint;
    b_name := split_part(ordered[idx + 1], '|', 2);
    idx := idx + 2;
    attempts := attempts + 1;

    if exists (
      select 1 from teammates t
      where (t."PlayerID" = a_id and t."TeammateID" = b_id)
         or (t."PlayerID" = b_id and t."TeammateID" = a_id)
    ) then
      continue;
    end if;

    insert into common_teammate_daily_games (game_date, round_no, a, b, a_mate_ids, b_mate_ids, answers)
    with a_mates as (
      select t."TeammateID" as id, t."TeammateName" as nm, coalesce(t."SharedGamesTotal", 0) as sg
      from teammates t where t."PlayerID" = a_id
      union all
      select t."PlayerID", t."PlayerName", coalesce(t."SharedGamesTotal", 0)
      from teammates t where t."TeammateID" = a_id
    ),
    b_mates as (
      select t."TeammateID" as id, t."TeammateName" as nm, coalesce(t."SharedGamesTotal", 0) as sg
      from teammates t where t."PlayerID" = b_id
      union all
      select t."PlayerID", t."PlayerName", coalesce(t."SharedGamesTotal", 0)
      from teammates t where t."TeammateID" = b_id
    ),
    common as (
      select am.id, am.nm, am.sg + bm.sg as shared
      from a_mates am
      join b_mates bm on bm.id = am.id
    )
    select
      p_date,
      rounds + 1,
      jsonb_build_object('personId', a_id, 'name', a_name),
      jsonb_build_object('personId', b_id, 'name', b_name),
      (select array_agg(m.id) from a_mates m),
      (select array_agg(m.id) from b_mates m),
      (select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.nm, 'shared', c.shared)
              order by c.shared desc, c.nm)
       from common c)
    where (select count(*) from common) >= 2
    on conflict do nothing;

    -- exists() rather than row_count so a concurrent racer's identical
    -- insert still advances the round counter.
    if exists (
      select 1 from common_teammate_daily_games c
      where c.game_date = p_date and c.round_no = rounds + 1
    ) then
      rounds := rounds + 1;
    end if;
  end loop;

  return query
  select c.round_no, c.a::json, c.b::json, c.a_mate_ids, c.b_mate_ids, c.answers::json
  from common_teammate_daily_games c where c.game_date = p_date order by c.round_no;
end;
$$;

grant execute on function get_career_arc_daily(date) to anon, authenticated;
grant execute on function get_common_teammate_daily(date) to anon, authenticated;
