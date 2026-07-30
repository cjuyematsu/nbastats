-- Odd Man Out daily performance. Run once in the Supabase SQL editor.
--
-- The original get_odd_man_out_daily (daily-challenge-rpcs.sql) recomputed the
-- puzzle on every call: an anchor loop with a PlayerName scan plus up to 38
-- not-exists pair probes per iteration against ~150k teammates rows, with no
-- index on PlayerName. This file (1) adds the missing index, (2) stores the
-- computed puzzle per date like career_arc_daily_games, so only the first
-- caller of a day pays the compute, and (3) fixes the 'Jimmy Butler' anchor to
-- 'Jimmy Butler III' to match the teammates data and lib/oddManOutDaily.ts.
--
-- The table has RLS enabled with no policies: only the security definer
-- function can touch it. Same return signature as before, no client changes.

create index if not exists idx_teammates_playername_teammatename
  on teammates ("PlayerName", "TeammateName");

create table if not exists odd_man_out_daily_games (
  game_date date primary key,
  players jsonb not null,
  odd_man_out_name text not null,
  connection_name text not null,
  question text not null,
  created_at timestamptz not null default now()
);

alter table odd_man_out_daily_games enable row level security;

create or replace function get_odd_man_out_daily(p_date date)
returns table (
  players json,
  "oddManOutName" text,
  "connectionName" text,
  question text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  anchors constant text[] := array[
    'LeBron James', 'Kobe Bryant', 'Michael Jordan', 'Shaquille O''Neal', 'Tim Duncan',
    'Kevin Garnett', 'Dirk Nowitzki', 'Steve Nash', 'Jason Kidd', 'Paul Pierce',
    'Ray Allen', 'Vince Carter', 'Dwyane Wade', 'Chris Paul', 'Carmelo Anthony',
    'Kevin Durant', 'Stephen Curry', 'Russell Westbrook', 'James Harden', 'Kyrie Irving',
    'Damian Lillard', 'Klay Thompson', 'Giannis Antetokounmpo', 'Nikola Jokic',
    'Joel Embiid', 'Jimmy Butler III', 'Kawhi Leonard', 'Paul George', 'Anthony Davis',
    'Karl Malone', 'John Stockton', 'Charles Barkley', 'Patrick Ewing',
    'Hakeem Olajuwon', 'Scottie Pippen', 'Reggie Miller', 'Allen Iverson',
    'Magic Johnson', 'Larry Bird'
  ];
  anchor text;
  mates text[];
  odd text;
begin
  return query
  select g.players::json, g.odd_man_out_name, g.connection_name, g.question
  from odd_man_out_daily_games g where g.game_date = p_date;
  if found then
    return;
  end if;

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

    -- First caller of the day stores the puzzle; concurrent racers lose the
    -- insert and read the winner's identical row.
    insert into odd_man_out_daily_games (game_date, players, odd_man_out_name, connection_name, question)
    select
      p_date,
      (
        select jsonb_agg(
          jsonb_build_object(
            'FirstName', split_part(nm, ' ', 1),
            'LastName', ltrim(substr(nm, length(split_part(nm, ' ', 1)) + 1))
          )
          order by md5(p_date::text || ':omo-shuffle:' || nm)
        )
        from unnest(mates || odd) nm
      ),
      odd,
      'playing with ' || anchor,
      'Three of these players shared the court with the same NBA star. Pick the odd one out...'
    on conflict (game_date) do nothing;

    return query
    select g.players::json, g.odd_man_out_name, g.connection_name, g.question
    from odd_man_out_daily_games g where g.game_date = p_date;
    return;
  end loop;
  return;
end;
$$;

grant execute on function get_odd_man_out_daily(date) to anon, authenticated;
