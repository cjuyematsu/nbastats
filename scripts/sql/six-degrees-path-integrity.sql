-- Six Degrees daily path integrity. Run once in the Supabase SQL editor.
--
-- Problem this fixes: generate_connection_game builds a solution path and
-- stores it in daily_connection_games, but nothing verified that path against
-- the graph the client actually plays on. An audit of 424 dailies found 86
-- (20.3%) containing at least one link that is NOT an edge in `teammates`.
--
-- Root cause is two different definitions of "teammate":
--   * the graph (teammates table, public/adjacency_list.json) = both players
--     appeared in the same team's box score in a regular season or playoff game
--   * the generator = the two players share a (SeasonYear, team) row, i.e. same
--     roster in the same season, which they can do without ever playing together
-- Anunoby and Barrett were traded FOR EACH OTHER, so they share both the 2024
-- Knicks and the 2024 Raptors and were never once on the floor together. The
-- generator will happily route a solution through that pair.
--
-- Second problem, found after the first fix shipped: the generator always emits
-- a 3-hop route, but the true shortest path is 2 hops for 323 of 425 puzzles and
-- 1 hop for one of them. So 76% of stored solutions were longer than necessary
-- even once every link was real. A player who solved #425 in a single guess was
-- shown a three-name "Solution", which reads as a broken game.
--
-- Approach: enforce the invariant at the TABLE boundary rather than rewriting
-- the generator's pair-selection logic. A BEFORE INSERT OR UPDATE trigger always
-- replaces solution_path_ids with a BFS shortest path over `teammates`. That
-- holds no matter what writes the row (pg_cron, the RPC, a manual insert), and it
-- does not disturb the generator's pair selection, only the route it claims
-- between the pair.
--
-- The stored path must be BOTH walkable and minimal. Walkable alone is not
-- enough: it still lets the game show an answer worse than the one the player
-- found.
--
-- Depth cap is 6. The client's MAX_GUESSES is 6 and its win condition also
-- accepts landing on a teammate of player_b, so a d-degree path needs d-1
-- guesses: a 6-degree path is still winnable. Historical dailies are all 1 to 3
-- degrees, so anything deeper is a signal worth looking at, not a normal case.

-- Reverse-direction lookups. `teammates` stores one normalized row per pair
-- (PlayerID < TeammateID), so a neighbour scan has to read both columns and the
-- primary key only covers the leading one.
create index if not exists idx_teammates_teammateid_playerid
  on teammates ("TeammateID", "PlayerID");

-- Canonical display name for a graph node. Every node in the graph appears in
-- `teammates` by construction; regularseasonstats is the fallback.
create or replace function six_degrees_player_name(p_id bigint)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select t."TeammateName" from teammates t where t."TeammateID" = p_id limit 1),
    (select t."PlayerName"   from teammates t where t."PlayerID"   = p_id limit 1),
    (select r."firstName" || ' ' || r."lastName"
       from regularseasonstats r where r."personId" = p_id limit 1)
  );
$$;

-- True when every consecutive pair in the path is a real edge in `teammates`.
create or replace function six_degrees_path_is_valid(p_path bigint[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_path is not null
     and array_length(p_path, 1) >= 2
     and not exists (
       select 1
       from generate_subscripts(p_path, 1) i
       where i < array_length(p_path, 1)
         and not exists (
           select 1
           from teammates t
           where t."PlayerID"   = least(p_path[i], p_path[i + 1])
             and t."TeammateID" = greatest(p_path[i], p_path[i + 1])
         )
     );
$$;

-- Breadth-first shortest path over `teammates`. Returns the node path inclusive
-- of both endpoints, or null when no path exists within p_max_depth.
-- Expansion is level-by-level and set-based: each iteration is one query over
-- the whole frontier rather than one query per node.
create or replace function six_degrees_shortest_path(
  p_a bigint,
  p_b bigint,
  p_max_depth int default 6
)
returns bigint[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_frontier bigint[] := array[p_a];
  v_visited  bigint[] := array[p_a];
  v_depth    jsonb    := jsonb_build_object(p_a::text, 0);
  v_next     bigint[];
  v_d        int := 0;
  v_path     bigint[];
  v_cur      bigint;
  v_prev     bigint;
  v_i        int;
begin
  if p_a is null or p_b is null then
    return null;
  end if;
  if p_a = p_b then
    return array[p_a];
  end if;

  while v_d < p_max_depth loop
    select coalesce(array_agg(distinct s.nb), '{}'::bigint[])
      into v_next
    from (
      select case when t."PlayerID" = any(v_frontier)
                  then t."TeammateID"
                  else t."PlayerID"
             end as nb
      from teammates t
      where t."PlayerID" = any(v_frontier)
         or t."TeammateID" = any(v_frontier)
    ) s
    where s.nb <> all(v_visited);

    exit when array_length(v_next, 1) is null;

    v_d := v_d + 1;
    v_visited := v_visited || v_next;
    v_depth := v_depth || (
      select jsonb_object_agg(n::text, v_d) from unnest(v_next) n
    );

    if p_b = any(v_next) then
      -- Walk back from the target, each step to any neighbour one level shallower.
      v_path := array[p_b];
      v_cur := p_b;
      for v_i in reverse (v_d - 1) .. 1 loop
        select s.nb
          into v_prev
        from (
          select case when t."PlayerID" = v_cur then t."TeammateID" else t."PlayerID" end as nb,
                 t."SharedGamesTotal" as shared
          from teammates t
          where t."PlayerID" = v_cur or t."TeammateID" = v_cur
        ) s
        where (v_depth ->> s.nb::text)::int = v_i
        -- Every candidate at this depth yields an equally short path, so break the
        -- tie on the beefiest teammate relationship: a link built over hundreds of
        -- shared games reads as a real pairing, a three-game cameo does not.
        order by s.shared desc nulls last
        limit 1;

        if v_prev is null then
          return null;
        end if;

        v_path := array[v_prev] || v_path;
        v_cur := v_prev;
      end loop;
      return array[p_a] || v_path;
    end if;

    v_frontier := v_next;
  end loop;

  return null;
end;
$$;

-- Enforce the invariant on write. The stored route is always recomputed rather
-- than merely checked: an incoming path can be perfectly walkable and still be
-- longer than the real answer, which is exactly what shipped the "solved in 1
-- guess" / three-name-solution mismatch. Repairs rather than rejects, because the
-- pair is always fine and only the route through it is wrong.
create or replace function daily_connection_games_verify_path()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path bigint[];
begin
  v_path := six_degrees_shortest_path(new.player_a_id, new.player_b_id, 6);
  if v_path is null then
    raise exception
      'six degrees: no verified path between % and % within 6 degrees',
      new.player_a_id, new.player_b_id;
  end if;

  new.solution_path_ids := v_path;
  new.solution_path_names := (
    select array_agg(six_degrees_player_name(u.n) order by u.ord)
    from unnest(v_path) with ordinality as u(n, ord)
  );
  return new;
end;
$$;

drop trigger if exists trg_daily_connection_games_verify_path on daily_connection_games;
create trigger trg_daily_connection_games_verify_path
  before insert or update on daily_connection_games
  for each row
  execute function daily_connection_games_verify_path();

-- Backfill for the rows written before the trigger existed. Dry run by default;
-- pass false to write. Returns one row per puzzle it wants to change.
--   select * from repair_daily_connection_paths();       -- report only
--   select * from repair_daily_connection_paths(false);   -- apply
create or replace function repair_daily_connection_paths(p_dry_run boolean default true)
returns table (
  puzzle_date date,
  player_a text,
  player_b text,
  old_path bigint[],
  new_path bigint[],
  action text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_new bigint[];
  v_len int;
begin
  for r in
    select d.game_date, d.player_a_id, d.player_b_id,
           d.player_a_name, d.player_b_name, d.solution_path_ids
    from daily_connection_games d
    order by d.game_date
  loop
    v_len := coalesce(array_length(r.solution_path_ids, 1), 0);
    v_new := six_degrees_shortest_path(r.player_a_id, r.player_b_id, 6);

    -- Skip only when the stored route is already the shortest one. Walkable but
    -- longer than necessary still counts as broken.
    if v_new is not null
       and v_len = array_length(v_new, 1)
       and r.solution_path_ids[1] = r.player_a_id
       and r.solution_path_ids[v_len] = r.player_b_id
       and six_degrees_path_is_valid(r.solution_path_ids)
    then
      continue;
    end if;

    puzzle_date := r.game_date;
    player_a := r.player_a_name;
    player_b := r.player_b_name;
    old_path := r.solution_path_ids;
    new_path := v_new;

    if v_new is null then
      action := 'FAILED: no path within 6 degrees';
    elsif p_dry_run then
      action := 'would repair';
    else
      update daily_connection_games d
         set solution_path_ids = v_new,
             solution_path_names = (
               select array_agg(six_degrees_player_name(u.n) order by u.ord)
               from unnest(v_new) with ordinality as u(n, ord)
             )
       where d.game_date = r.game_date;
      action := 'repaired';
    end if;

    return next;
  end loop;
end;
$$;

-- Lock the new functions down. Postgres grants EXECUTE to PUBLIC by default, and
-- Supabase exposes every public-schema function as a PostgREST RPC, so without
-- this the anon key (which ships in the client bundle) can call
-- repair_daily_connection_paths(false) -- a security definer WRITE that scans the
-- whole table and runs a BFS per broken row. Harmless in effect, since the repair
-- is idempotent, but it is free compute for anyone who wants to burn it.
--
-- Nothing in the app calls these: the client validates against the static
-- adjacency_list.json, and the trigger runs as its definer regardless of grants.
-- The service role bypasses grants, so the SQL editor and server routes still work.
revoke execute on function six_degrees_player_name(bigint) from public, anon, authenticated;
revoke execute on function six_degrees_path_is_valid(bigint[]) from public, anon, authenticated;
revoke execute on function six_degrees_shortest_path(bigint, bigint, int) from public, anon, authenticated;
revoke execute on function repair_daily_connection_paths(boolean) from public, anon, authenticated;

-- service_role inherits EXECUTE through PUBLIC, so the revoke above would strip it
-- too. Grant it back: that key is server-only and already bypasses RLS, and a
-- future server-side win check would need these.
grant execute on function six_degrees_player_name(bigint) to service_role;
grant execute on function six_degrees_path_is_valid(bigint[]) to service_role;
grant execute on function six_degrees_shortest_path(bigint, bigint, int) to service_role;
grant execute on function repair_daily_connection_paths(boolean) to service_role;
