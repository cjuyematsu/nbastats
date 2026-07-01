// lib/articleTools.ts
//
// The `query_nba_stats` custom tool. This is the core anti-hallucination
// mechanism: instead of recalling numbers, the model asks for real rows from a
// FIXED, SAFE set of queries that map onto existing RPCs / table reads (per
// CLAUDE.md, prefer an existing RPC over ad-hoc SQL). Server-only; it uses the
// service-role admin client.

import type Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { salaryData } from '@/app/data/salaryData';
import { viewershipData } from '@/app/data/viewershipData';

// Friendly stat name -> real regularseasonstats column (rank season leaders by).
const SEASON_STAT_COLUMNS = {
  points: 'PTS_total',
  assists: 'AST_total',
  rebounds: 'TRB_total',
  steals: 'STL_total',
  blocks: 'BLK_total',
  three_pointers: 'FG3M_total',
  points_per_game: 'PTS_per_g',
  assists_per_game: 'AST_per_g',
  rebounds_per_game: 'TRB_per_g',
} as const;

type SeasonStat = keyof typeof SEASON_STAT_COLUMNS;

export const QUERY_NBA_STATS_TOOL: Anthropic.Tool = {
  name: 'query_nba_stats',
  description:
    "Fetch REAL NBA data from Hoops Data's database to ground every statistic in an article. " +
    'Always use this for any number you cite; never state a stat from memory. ' +
    'Choose an operation and supply only the relevant parameters.',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: [
          'search_players',
          'player_career',
          'player_playoff_career',
          'current_top_rankings',
          'season_leaders',
          'salary_history',
          'viewership_history',
        ],
        description:
          'search_players: find a personId by name. player_career / player_playoff_career: ' +
          'career totals + per-game averages for a personId. current_top_rankings: this week’s ' +
          'top community-ranked players with stats. season_leaders: top players in one stat ' +
          '(optionally for one season). salary_history: league salary totals by season ' +
          '(1990–2024). viewership_history: NBA Finals TV ratings by year (1991–2024).',
      },
      search_term: { type: 'string', description: 'For search_players: a player name fragment.' },
      person_id: {
        type: 'integer',
        description: 'For player_career / player_playoff_career: the personId (from search_players).',
      },
      stat: {
        type: 'string',
        enum: Object.keys(SEASON_STAT_COLUMNS),
        description: 'For season_leaders: which stat to rank by.',
      },
      season_year: {
        type: 'integer',
        description: 'For season_leaders: optional single season to filter to (the starting year).',
      },
      limit: { type: 'integer', description: 'Max rows to return (default 15, capped at 25).' },
    },
    required: ['operation'],
  },
};

interface ArticleToolInput {
  operation?: string;
  search_term?: string;
  person_id?: number;
  stat?: string;
  season_year?: number;
  limit?: number;
}

function clampLimit(limit?: number): number {
  if (typeof limit !== 'number' || Number.isNaN(limit)) return 15;
  return Math.max(1, Math.min(25, Math.floor(limit)));
}

/** Executes a query_nba_stats tool call and returns a JSON/string result for the model. */
export async function runArticleTool(name: string, input: unknown): Promise<string> {
  if (name !== 'query_nba_stats') {
    return `Unknown tool "${name}".`;
  }
  const args = (input ?? {}) as ArticleToolInput;
  const limit = clampLimit(args.limit);

  switch (args.operation) {
    case 'search_players': {
      if (!args.search_term) return 'search_players requires "search_term".';
      const { data, error } = await supabaseAdmin.rpc('get_player_suggestions_2025', {
        search_term: args.search_term,
      });
      if (error) return `Query error: ${error.message}`;
      return JSON.stringify((data ?? []).slice(0, limit));
    }

    case 'player_career': {
      if (typeof args.person_id !== 'number') return 'player_career requires numeric "person_id".';
      const { data, error } = await supabaseAdmin.rpc('calculate_player_career_stats', {
        p_person_id: args.person_id,
      });
      if (error) return `Query error: ${error.message}`;
      return JSON.stringify(data ?? []);
    }

    case 'player_playoff_career': {
      if (typeof args.person_id !== 'number')
        return 'player_playoff_career requires numeric "person_id".';
      const { data, error } = await supabaseAdmin.rpc('calculate_player_career_playoff_stats', {
        p_person_id: args.person_id,
      });
      if (error) return `Query error: ${error.message}`;
      return JSON.stringify(data ?? []);
    }

    case 'current_top_rankings': {
      const { data, error } = await supabaseAdmin.rpc('get_current_ranking_with_details');
      if (error) return `Query error: ${error.message}`;
      return JSON.stringify((data ?? []).slice(0, limit));
    }

    case 'season_leaders': {
      const statKey = (args.stat ?? 'points') as SeasonStat;
      const column = SEASON_STAT_COLUMNS[statKey] ?? SEASON_STAT_COLUMNS.points;
      const base = supabaseAdmin
        .from('regularseasonstats')
        .select(
          'personId, firstName, lastName, SeasonYear, playerteamName, PTS_total, AST_total, TRB_total, STL_total, BLK_total, FG3M_total, PTS_per_g, AST_per_g, TRB_per_g',
        );
      const filtered =
        typeof args.season_year === 'number' ? base.eq('SeasonYear', args.season_year) : base;
      const { data, error } = await filtered.order(column, { ascending: false }).limit(limit);
      if (error) return `Query error: ${error.message}`;
      return JSON.stringify({ ranked_by: column, rows: data ?? [] });
    }

    case 'salary_history':
      return JSON.stringify(salaryData);

    case 'viewership_history':
      return JSON.stringify(viewershipData);

    default:
      return `Unknown operation "${args.operation}". Valid: search_players, player_career, player_playoff_career, current_top_rankings, season_leaders, salary_history, viewership_history.`;
  }
}
