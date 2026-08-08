-- Six Degrees puzzle generator, rewritten against the real teammate graph.
-- Run in the Supabase SQL editor AFTER six-degrees-path-integrity.sql.
--
-- What changes vs the original generate_connection_game:
--
-- 1. Teammate checks query `teammates` (same box score, the graph the game is
--    played on) instead of joining regularseasonstats on (SeasonYear,
--    playerteamName), i.e. same roster. The roster join is what routed paths
--    through pairs like Anunoby/Barrett who were traded for each other and
--    never shared a floor. It also drifts when a new season's stats land and
--    retroactively rewrite who overlapped with whom (the 2026-01-12
--    Mobley/Harden daily passed its direct-teammate check because Harden's
--    Cavaliers rows had not been loaded yet).
--
-- 2. The pair is guaranteed to be EXACTLY 3 degrees apart: no direct edge and
--    no common teammate. The old function only excluded direct teammates, so
--    404 of its 425 dailies had a common teammate and were solvable in one
--    guess while displaying a three-hop solution. With true distance 3 the
--    minimum is 2 guesses, so "solved in 1" can no longer undercut the shown
--    answer. (To allow easier 2-degree dailies again, delete the block marked
--    DISTANCE-2 GUARD.)
--
-- 3. is_daily := true is refused for PostgREST callers (anon/authenticated).
--    The client legitimately calls is_daily := false for practice mode, but the
--    daily branch DELETEs and re-INSERTs today's row -- previously any visitor
--    with the public anon key could regenerate the live daily for everyone.
--    pg_cron and the SQL editor connect directly (no JWT), so they still work,
--    as does the service-role key.
--
-- The path-integrity trigger (six-degrees-path-integrity.sql) still recomputes
-- solution_path_ids on insert, so even this generator's constructed path is
-- re-verified and minimized at the table boundary. Belt and suspenders.
--
-- If CREATE OR REPLACE fails with "cannot change return type" (42P13), the
-- original declared different column types: run
--   select pg_get_functiondef('public.generate_connection_game(boolean)'::regprocedure);
-- and swap this header's types for the original ones (the body is unchanged by
-- that), or DROP FUNCTION first and re-grant EXECUTE to anon and authenticated
-- (practice mode needs it).

create or replace function public.generate_connection_game(is_daily boolean)
returns table (
  player_a_id bigint,
  player_a_name text,
  player_b_id bigint,
  player_b_name text,
  solution_path_ids bigint[],
  solution_path_names text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  player_a public.player_info;
  teammate_1 public.player_info;
  teammate_2 public.player_info;
  player_b public.player_info;

  relevant_players public.player_info[];
  max_attempts int := 200;
  attempt_count int := 0;

  -- PostgREST sets request.jwt.claims; a direct DB session (pg_cron, SQL
  -- editor) has none, and the service-role key claims 'service_role'.
  v_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  if is_daily and v_role in ('anon', 'authenticated') then
    raise exception 'generate_connection_game(is_daily := true) is server-only';
  end if;

  -- Pool of recognizable players: 1000+ career games, or recently active with
  -- at least one 15+ PPG season over 40+ games.
  with career_games as (
    select p."personId", sum(p."G") as total_games
    from public.regularseasonstats p
    group by p."personId"
  ),
  active_players as (
    select distinct "personId" from public.regularseasonstats
    where "SeasonYear" >= extract(year from now()) - 2
  ),
  high_scorers as (
    select distinct "personId"
    from public.regularseasonstats
    where "PTS_per_g" >= 15 and "G" >= 40
  ),
  eligible_pool as (
    select p."personId", (p."firstName" || ' ' || p."lastName") as full_name
    from public.regularseasonstats p
    join career_games cg on p."personId" = cg."personId"
    where (cg.total_games >= 1000
           or (p."personId" in (select "personId" from active_players)
               and p."personId" in (select "personId" from high_scorers)))
    group by p."personId", full_name
  )
  select array(
    select row(ep."personId", ep.full_name)::public.player_info
    from eligible_pool ep
    order by random()
  )
  into relevant_players;

  loop
    attempt_count := attempt_count + 1;
    if attempt_count > max_attempts then
      raise warning 'Could not generate a valid connection game after % attempts.', max_attempts;
      return;
    end if;

    -- 1. Random hub player (Teammate 1)
    teammate_1 := relevant_players[1 + floor(random() * array_length(relevant_players, 1))];

    -- 2. Player A: a REAL teammate of T1 (shared a box score) from the pool
    select rp.id, rp.name into player_a
    from unnest(relevant_players) rp
    where rp.id <> teammate_1.id
      and exists (
        select 1 from public.teammates t
        where t."PlayerID"   = least(teammate_1.id, rp.id)
          and t."TeammateID" = greatest(teammate_1.id, rp.id)
      )
    order by random() limit 1;

    if player_a.id is null then continue; end if;

    -- 3. Teammate 2: another real teammate of T1
    select rp.id, rp.name into teammate_2
    from unnest(relevant_players) rp
    where rp.id not in (teammate_1.id, player_a.id)
      and exists (
        select 1 from public.teammates t
        where t."PlayerID"   = least(teammate_1.id, rp.id)
          and t."TeammateID" = greatest(teammate_1.id, rp.id)
      )
    order by random() limit 1;

    if teammate_2.id is null then continue; end if;

    -- 4. Player B: a real teammate of T2
    select rp.id, rp.name into player_b
    from unnest(relevant_players) rp
    where rp.id not in (teammate_1.id, player_a.id, teammate_2.id)
      and exists (
        select 1 from public.teammates t
        where t."PlayerID"   = least(teammate_2.id, rp.id)
          and t."TeammateID" = greatest(teammate_2.id, rp.id)
      )
    order by random() limit 1;

    if player_b.id is null then continue; end if;

    -- 5. A and B must not be direct teammates (distance 1)
    if exists (
      select 1 from public.teammates t
      where t."PlayerID"   = least(player_a.id, player_b.id)
        and t."TeammateID" = greatest(player_a.id, player_b.id)
    ) then
      continue;
    end if;

    -- 6. DISTANCE-2 GUARD: A and B must share no common teammate, so the true
    --    distance is exactly 3 (a 3-hop route exists by construction). Delete
    --    this block to allow easier 2-degree dailies.
    if exists (
      with a_neighbors as (
        select case when t."PlayerID" = player_a.id
                    then t."TeammateID" else t."PlayerID" end as x
        from public.teammates t
        where t."PlayerID" = player_a.id or t."TeammateID" = player_a.id
      )
      select 1
      from a_neighbors n
      join public.teammates t2
        on t2."PlayerID"   = least(n.x, player_b.id)
       and t2."TeammateID" = greatest(n.x, player_b.id)
    ) then
      continue;
    end if;

    raise notice 'Found valid path: % -> % -> % -> %',
      player_a.name, teammate_1.name, teammate_2.name, player_b.name;

    if is_daily then
      delete from public.daily_connection_games d where d.game_date = current_date;
      insert into public.daily_connection_games
        (game_date, player_a_id, player_a_name, player_b_id, player_b_name,
         solution_path_ids, solution_path_names)
      values (
        current_date,
        player_a.id, player_a.name,
        player_b.id, player_b.name,
        array[player_a.id, teammate_1.id, teammate_2.id, player_b.id],
        array[player_a.name, teammate_1.name, teammate_2.name, player_b.name]
      );
    end if;

    return query select
      player_a.id, player_a.name,
      player_b.id, player_b.name,
      array[player_a.id, teammate_1.id, teammate_2.id, player_b.id],
      array[player_a.name, teammate_1.name, teammate_2.name, player_b.name];

    return;
  end loop;
end;
$$;
