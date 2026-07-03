-- Daily challenge RPCs. Run once in the Supabase SQL editor, then regenerate
-- types/supabase.ts. All three are deterministic per date (md5 date-salted
-- ordering), so every visitor gets the same puzzle on a given LA date.
-- The client passes p_date = the LA date string (YYYY-MM-DD).

-- 1. Name That Pick: three top-5 picks from three different draft years.
create or replace function get_draft_daily_challenge(p_date date)
returns table (
  year integer,
  round integer,
  pick integer,
  "firstName" text,
  "lastName" text,
  team text,
  school text
)
language sql
stable
as $$
  with years as (
    select y
    from generate_series(1975, 2025) as y
    order by md5(p_date::text || ':draft-year:' || y)
    limit 3
  ),
  slots as (
    select
      y as slot_year,
      1 + mod(('x' || substr(md5(p_date::text || ':draft-pick:' || y), 1, 8))::bit(32)::int & 2147483647, 5) as slot_pick
    from years
  )
  select
    d."Year"::int,
    d."Round"::int,
    d."Pick"::int,
    d."FirstName"::text,
    d."LastName"::text,
    d."NBA Team"::text,
    d."School/Club Team"::text
  from slots s
  join draft d
    on d."Year" = s.slot_year
   and d."Round" = 1
   and d."Pick" = s.slot_pick
  order by md5(p_date::text || ':draft-order:' || d."Year");
$$;

-- 2. Ranking Game daily: one seeded category + season, four players with
--    distinct stat values, returned in correct order (highest first).
--    Same row shape as get_ranking_game_data.
create or replace function get_ranking_daily_challenge(p_date date)
returns table (
  "personId" bigint,
  "firstName" text,
  "lastName" text,
  "SeasonYear" integer,
  "statValue" numeric,
  "categoryName" text,
  "categoryOptions" text[]
)
language plpgsql
stable
as $$
declare
  cats constant text[] := array[
    'PTS_per_g|Points Per Game|50|1960',
    'AST_per_g|Assists Per Game|50|1960',
    'TRB_per_g|Rebounds Per Game|50|1960',
    'STL_per_g|Steals Per Game|50|1980',
    'BLK_per_g|Blocks Per Game|50|1980',
    'MP_per_g|Minutes Per Game|50|1960',
    'PTS_total|Total Points|0|1960',
    'AST_total|Total Assists|0|1960',
    'TRB_total|Total Rebounds|0|1960',
    'FG3M_total|Three-Pointers Made|0|1985'
  ];
  chosen text;
  col text;
  label text;
  min_games int;
  first_season int;
  season int;
  h int;
  decoys text[];
  opts text[];
begin
  select c into chosen
  from unnest(cats) c
  order by md5(p_date::text || ':rank-cat:' || c)
  limit 1;

  col := split_part(chosen, '|', 1);
  label := split_part(chosen, '|', 2);
  min_games := split_part(chosen, '|', 3)::int;
  first_season := split_part(chosen, '|', 4)::int;

  h := ('x' || substr(md5(p_date::text || ':rank-season:'), 1, 8))::bit(32)::int & 2147483647;
  season := first_season + mod(h, 2026 - first_season + 1);

  select array_agg(l) into decoys from (
    select split_part(c, '|', 2) as l
    from unnest(cats) c
    where split_part(c, '|', 2) <> label
    order by md5(p_date::text || ':rank-decoy:' || c)
    limit 3
  ) t;

  select array_agg(o) into opts from (
    select o
    from unnest(decoys || label) o
    order by md5(p_date::text || ':rank-opt:' || o)
  ) t;

  return query execute format($f$
    with pool as (
      select
        r."personId"::bigint as pid,
        r."firstName"::text as fn,
        r."lastName"::text as ln,
        r."SeasonYear"::int as sy,
        r.%1$I::numeric as v
      from regularseasonstats r
      where r."SeasonYear" = $1
        and r.%1$I is not null
        and ($2 = 0 or r."G" >= $2)
      order by r.%1$I desc, r."personId"
      limit 24
    ),
    dedup as (
      select distinct on (v) pid, fn, ln, sy, v
      from pool
      order by v desc, md5($3 || ':rank-dedup:' || pid)
    ),
    pick4 as (
      select *
      from dedup
      order by md5($3 || ':rank-pick:' || pid)
      limit 4
    )
    select pid, fn, ln, sy, v, $4::text, $5::text[]
    from pick4
    order by v desc
  $f$, col)
  using season, min_games, p_date::text, label, opts;
end;
$$;

-- 3. Odd Man Out daily: three players who shared the court with the same star
--    plus one who never did. players is a pre-shuffled JSON array of
--    {FirstName, LastName}, matching get_odd_man_out_game_data.
create or replace function get_odd_man_out_daily(p_date date)
returns table (
  players json,
  "oddManOutName" text,
  "connectionName" text,
  question text
)
language plpgsql
stable
as $$
declare
  anchors constant text[] := array[
    'LeBron James', 'Kobe Bryant', 'Michael Jordan', 'Shaquille O''Neal', 'Tim Duncan',
    'Kevin Garnett', 'Dirk Nowitzki', 'Steve Nash', 'Jason Kidd', 'Paul Pierce',
    'Ray Allen', 'Vince Carter', 'Dwyane Wade', 'Chris Paul', 'Carmelo Anthony',
    'Kevin Durant', 'Stephen Curry', 'Russell Westbrook', 'James Harden', 'Kyrie Irving',
    'Damian Lillard', 'Klay Thompson', 'Giannis Antetokounmpo', 'Nikola Jokic',
    'Joel Embiid', 'Jimmy Butler', 'Kawhi Leonard', 'Paul George', 'Anthony Davis',
    'Karl Malone', 'John Stockton', 'Charles Barkley', 'Patrick Ewing',
    'Hakeem Olajuwon', 'Scottie Pippen', 'Reggie Miller', 'Allen Iverson',
    'Magic Johnson', 'Larry Bird'
  ];
  anchor text;
  mates text[];
  odd text;
begin
  for anchor in
    select a from unnest(anchors) a order by md5(p_date::text || ':omo-anchor:' || a)
  loop
    select array_agg(nm) into mates from (
      select t."TeammateName" as nm
      from teammates t
      where t."PlayerName" = anchor
      order by t."SharedGamesTotal" desc nulls last, t."TeammateName"
      limit 40
    ) top40;

    if mates is null or array_length(mates, 1) < 10 then
      continue;
    end if;

    select array_agg(nm) into mates from (
      select nm
      from unnest(mates) nm
      order by md5(p_date::text || ':omo-mate:' || nm)
      limit 3
    ) chosen;

    select a into odd
    from unnest(anchors) a
    where a <> anchor
      and not exists (
        select 1 from teammates t
        where t."PlayerName" = anchor and t."TeammateName" = a
      )
    order by md5(p_date::text || ':omo-odd:' || a)
    limit 1;

    if odd is null then
      continue;
    end if;

    return query
    select
      (
        select json_agg(
          json_build_object(
            'FirstName', split_part(nm, ' ', 1),
            'LastName', ltrim(substr(nm, length(split_part(nm, ' ', 1)) + 1))
          )
          order by md5(p_date::text || ':omo-shuffle:' || nm)
        )
        from unnest(mates || odd) nm
      ),
      odd,
      'playing with ' || anchor,
      'Three of these players shared the court with the same NBA star. Pick the odd one out...'::text;
    return;
  end loop;
  return;
end;
$$;

grant execute on function get_draft_daily_challenge(date) to anon, authenticated;
grant execute on function get_ranking_daily_challenge(date) to anon, authenticated;
grant execute on function get_odd_man_out_daily(date) to anon, authenticated;
