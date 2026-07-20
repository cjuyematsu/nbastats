// scripts/generate-article.ts
//
// Agentic weekly-article pipeline: researches current NBA storylines with web
// search, grounds every statistic in the Supabase database through typed
// read-only tools, drafts a short markdown article, runs a critique/fact-check
// pass against the tool log, validates house style, and inserts ONE
// status='draft' articles row for human review at /articles/review.
// Usage: npm run generate:article [-- --dry] [-- --topic "storyline"]

import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import type { Database, Json } from '../types/supabase';
import { STL_BLK_FROM, TOV_FROM, FG_FROM, THREE_FROM } from '../lib/percentiles';
import { duoHref } from '../app/data/duoPages';
import {
  assembleSources,
  buildCritiquePrompt,
  buildDraftKickoff,
  buildDraftSystemPrompt,
  buildGenerationMeta,
  CRITIQUE_SYSTEM_PROMPT,
  extractArticleJson,
  validateArticleDraft,
  type ArticleDraft,
  type SourceLink,
  type ToolLogEntry,
  type UsageTotals,
} from '../lib/articleGeneration';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY is required (add it to .env.local).');

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anthropic = new Anthropic({ apiKey: anthropicKey });

const MODEL = 'claude-opus-4-8';
const CURRENT_SEASON = 2026;
const DRY_RUN = process.argv.includes('--dry');
const topicFlag = process.argv.indexOf('--topic');
const TOPIC = topicFlag !== -1 ? process.argv[topicFlag + 1] : undefined;

const toolLog: ToolLogEntry[] = [];

function logTool(name: string, input: unknown, output: unknown): string {
  toolLog.push({ name, input, output });
  return JSON.stringify(output);
}

type CareerRow =
  Database['public']['Functions']['calculate_player_career_stats']['Returns'][number];

function gateCareerRow(row: CareerRow) {
  const gated: Record<string, unknown> = {
    ...row,
    name: `${row.firstName} ${row.lastName}`,
  };
  const notes: string[] = [];
  const drop = (keys: string[], note: string) => {
    for (const key of keys) delete gated[key];
    notes.push(note);
  };
  if (row.startYear < FG_FROM) {
    drop(
      ['fg_pct', 'efg_pct', 'ts_pct', 'fga_total', 'fgm_total', 'mp_per_g', 'mp_total'],
      `shooting rates and minutes unreliable for careers starting before ${FG_FROM}`,
    );
  }
  if (row.startYear < THREE_FROM) {
    drop(['fg3_pct', 'fg3a_total', 'fg3m_total'], `three-point data unreliable before ${THREE_FROM}`);
  }
  if (row.startYear < STL_BLK_FROM) {
    drop(
      ['stl_per_g', 'stl_total', 'blk_per_g', 'blk_total'],
      `steals and blocks not recorded before ${STL_BLK_FROM}`,
    );
  }
  if (row.startYear < TOV_FROM) {
    drop(['tov_per_g', 'tov_total'], `turnovers not recorded before ${TOV_FROM}`);
  }
  if (notes.length) gated.reliability_note = notes.join('; ');
  return gated;
}

const searchPlayers = betaTool({
  name: 'search_players',
  description:
    'Look up players in the Hoops Data database by name. Call this FIRST for every player you plan to write about, before any other database tool: it returns the personId every other tool requires, career start and end years, and whether the player is active. Never guess a personId.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Player name or partial name' },
    },
    required: ['query'],
    additionalProperties: false,
  } as const,
  run: async ({ query }) => {
    const { data, error } = await supabase.rpc('get_player_suggestions', { search_term: query });
    if (error) return logTool('search_players', { query }, { error: error.message });
    const rows = (data ?? []).slice(0, 8).map((r) => ({
      personId: r.personId,
      name: `${r.firstName} ${r.lastName}`,
      startYear: r.startYear,
      endYear: r.endYear,
      active: r.endYear >= CURRENT_SEASON,
      player_link: `/player/${r.personId}`,
    }));
    return logTool('search_players', { query }, rows);
  },
});

const getPlayerCareerStats = betaTool({
  name: 'get_player_career_stats',
  description:
    'Get a player career stat line (games, points, rebounds, assists, shooting percentages, per-game averages) from the database. Call this when you need career numbers for a player already resolved via search_players. Era-unreliable fields are omitted with a reliability_note.',
  inputSchema: {
    type: 'object',
    properties: {
      person_id: { type: 'number' },
      scope: { type: 'string', enum: ['regular', 'playoff'] },
    },
    required: ['person_id', 'scope'],
    additionalProperties: false,
  } as const,
  run: async ({ person_id, scope }) => {
    const fn =
      scope === 'playoff' ? 'calculate_player_career_playoff_stats' : 'calculate_player_career_stats';
    const { data, error } = await supabase.rpc(fn, { p_person_id: person_id });
    const input = { person_id, scope };
    if (error) return logTool('get_player_career_stats', input, { error: error.message });
    const row = data?.[0];
    if (!row) return logTool('get_player_career_stats', input, { error: 'no data for this player' });
    return logTool('get_player_career_stats', input, [gateCareerRow(row)]);
  },
});

const getPlayerSeasonStats = betaTool({
  name: 'get_player_season_stats',
  description:
    'Get a player recent per-season regular season lines (team, games, points, rebounds and assists per game, shooting). Call this when the story needs season-by-season shape, like a career arc or a decline or breakout claim.',
  inputSchema: {
    type: 'object',
    properties: {
      person_id: { type: 'number' },
      last_n_seasons: { type: 'number', description: 'Default 6' },
    },
    required: ['person_id'],
    additionalProperties: false,
  } as const,
  run: async ({ person_id, last_n_seasons }) => {
    const limit = Math.min(last_n_seasons ?? 6, 25);
    const { data, error } = await supabase
      .from('regularseasonstats')
      .select('SeasonYear, playerteamName, G, PTS_per_g, TRB_per_g, AST_per_g, FG_PCT, FG3_PCT, MP_per_g')
      .eq('personId', person_id)
      .order('SeasonYear', { ascending: false })
      .limit(limit);
    const input = { person_id, last_n_seasons };
    if (error) return logTool('get_player_season_stats', input, { error: error.message });
    const rows = (data ?? []).map((r) => {
      const season: Record<string, unknown> = { ...r, person_id };
      if (r.SeasonYear < FG_FROM) {
        delete season.FG_PCT;
        delete season.MP_per_g;
      }
      if (r.SeasonYear < THREE_FROM) delete season.FG3_PCT;
      return season;
    });
    return logTool('get_player_season_stats', input, rows);
  },
});

const LEADER_COLUMNS = {
  pts_per_g: 'PTS_per_g',
  ast_per_g: 'AST_per_g',
  trb_per_g: 'TRB_per_g',
  stl_per_g: 'STL_per_g',
  blk_per_g: 'BLK_per_g',
  pts_total: 'PTS_total',
} as const;

const getSeasonLeaders = betaTool({
  name: 'get_season_leaders',
  description:
    'Get the top players in one stat for one season (season_year is the end year, e.g. 2026 for 2025-26). Call this for league context, like where a player ranked last season.',
  inputSchema: {
    type: 'object',
    properties: {
      season_year: { type: 'number' },
      stat: {
        type: 'string',
        enum: ['pts_per_g', 'ast_per_g', 'trb_per_g', 'stl_per_g', 'blk_per_g', 'pts_total'],
      },
      limit: { type: 'number', description: 'Default 10' },
      min_games: { type: 'number', description: 'Default 50' },
    },
    required: ['season_year', 'stat'],
    additionalProperties: false,
  } as const,
  run: async ({ season_year, stat, limit, min_games }) => {
    const column = LEADER_COLUMNS[stat];
    const input = { season_year, stat, limit, min_games };
    const { data, error } = await supabase
      .from('regularseasonstats')
      .select(`personId, firstName, lastName, playerteamName, G, ${column}`)
      .eq('SeasonYear', season_year)
      .gte('G', min_games ?? 50)
      .order(column, { ascending: false })
      .limit(Math.min(limit ?? 10, 25));
    if (error) return logTool('get_season_leaders', input, { error: error.message });
    const rows = (data ?? []).map((r, i) => ({
      rank: i + 1,
      ...(r as Record<string, unknown>),
    }));
    return logTool('get_season_leaders', input, rows);
  },
});

const getTeammatePairs = betaTool({
  name: 'get_teammate_pairs',
  description:
    'Get the teammates a player shared the most games with (shared games, win-loss record together, combined per-game production, seasons together). Call this for duo or teammate storylines. Includes the exact /duos link to embed.',
  inputSchema: {
    type: 'object',
    properties: {
      person_id: { type: 'number' },
      limit: { type: 'number', description: 'Default 8' },
    },
    required: ['person_id'],
    additionalProperties: false,
  } as const,
  run: async ({ person_id, limit }) => {
    const { data, error } = await supabase
      .from('teammates')
      .select(
        'PlayerName, TeammateID, TeammateName, SharedGamesTotal, SharedGamesRecord, SharedTeams, StartYearTogether, EndYearTogether, CombinedPtsPerGame, CombinedAstPerGame, CombinedRebPerGame',
      )
      .eq('PlayerID', person_id)
      .order('SharedGamesTotal', { ascending: false })
      .limit(Math.min(limit ?? 8, 20));
    const input = { person_id, limit };
    if (error) return logTool('get_teammate_pairs', input, { error: error.message });
    const rows = (data ?? []).map((r) => ({
      ...r,
      duo_link:
        r.PlayerName && r.TeammateName ? `/duos/${duoHref(r.PlayerName, r.TeammateName)}` : null,
    }));
    return logTool('get_teammate_pairs', input, rows);
  },
});

const comparePlayers = betaTool({
  name: 'compare_players',
  description:
    'Compare 2 to 4 players career regular season lines side by side. Call this when the article contrasts players directly. Returns the aligned stats plus the exact /compare link to embed; only embed compare links returned by this tool.',
  inputSchema: {
    type: 'object',
    properties: {
      person_ids: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 4 },
    },
    required: ['person_ids'],
    additionalProperties: false,
  } as const,
  run: async ({ person_ids }) => {
    const input = { person_ids };
    const players: Record<string, unknown>[] = [];
    for (const id of person_ids) {
      const { data, error } = await supabase.rpc('calculate_player_career_stats', {
        p_person_id: id,
      });
      if (error) return logTool('compare_players', input, { error: error.message });
      if (data?.[0]) players.push(gateCareerRow(data[0]));
    }
    const names = players.map((p) => String(p.name));
    const output = {
      players,
      compare_link: `/compare?players=${names.map((n) => encodeURIComponent(n)).join(',')}`,
    };
    return logTool('compare_players', input, output);
  },
});

interface StageResult {
  text: string;
  usage: UsageTotals;
}

function addUsage(total: UsageTotals, usage: Anthropic.Beta.BetaUsage | Anthropic.Usage) {
  total.input_tokens += usage.input_tokens ?? 0;
  total.output_tokens += usage.output_tokens ?? 0;
  total.cache_creation_input_tokens =
    (total.cache_creation_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  total.cache_read_input_tokens =
    (total.cache_read_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
}

const webSources: SourceLink[] = [];
let webSearchCount = 0;

function harvestMessage(message: Anthropic.Beta.BetaMessage) {
  for (const block of message.content) {
    if (block.type === 'server_tool_use' && block.name === 'web_search') webSearchCount += 1;
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (result.type === 'web_search_result') {
          webSources.push({ label: result.title ?? result.url, url: result.url });
        }
      }
    }
  }
}

async function runDraftStage(): Promise<StageResult> {
  const usage: UsageTotals = { input_tokens: 0, output_tokens: 0 };
  const runner = anthropic.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: buildDraftSystemPrompt(new Date().toISOString().slice(0, 10)),
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: 6 },
      searchPlayers,
      getPlayerCareerStats,
      getPlayerSeasonStats,
      getSeasonLeaders,
      getTeammatePairs,
      comparePlayers,
    ],
    messages: [{ role: 'user', content: buildDraftKickoff(TOPIC) }],
    max_iterations: 24,
  });

  let lastMessage: Anthropic.Beta.BetaMessage | null = null;
  for await (const message of runner) {
    lastMessage = message;
    harvestMessage(message);
    addUsage(usage, message.usage);
    const toolNames = message.content
      .filter((b) => b.type === 'tool_use' || b.type === 'server_tool_use')
      .map((b) => ('name' in b ? b.name : ''))
      .filter(Boolean);
    if (toolNames.length) console.log(`  tools: ${toolNames.join(', ')}`);
    if (message.stop_reason === 'pause_turn') {
      runner.pushMessages({ role: 'assistant', content: message.content });
    }
  }
  if (!lastMessage) throw new Error('draft stage produced no messages');
  if (lastMessage.stop_reason === 'refusal') throw new Error('draft stage was refused');
  const text = lastMessage.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return { text, usage };
}

async function reformatToJson(badText: string, usage: UsageTotals): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `The following reply was supposed to be exactly one fenced json block with keys title, dek, summary, slug, body_markdown, web_sources. Resend it as exactly one fenced json block with those keys and the same content, nothing else.\n\n${badText}`,
      },
    ],
  });
  addUsage(usage, response.usage);
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

async function runCritiqueStage(draft: ArticleDraft): Promise<StageResult> {
  const usage: UsageTotals = { input_tokens: 0, output_tokens: 0 };
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: CRITIQUE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildCritiquePrompt(draft, toolLog) }],
  });
  addUsage(usage, response.usage);
  if (response.stop_reason === 'refusal') throw new Error('critique stage was refused');
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return { text, usage };
}

async function parseStage(text: string, usage: UsageTotals, stage: string): Promise<ArticleDraft> {
  let draft = extractArticleJson(text);
  if (!draft) {
    console.log(`  ${stage} output was not valid JSON, asking for a reformat`);
    draft = extractArticleJson(await reformatToJson(text, usage));
  }
  if (!draft) throw new Error(`${stage} stage never produced valid article JSON`);
  return draft;
}

async function main() {
  console.log(`Generating article (model ${MODEL}${DRY_RUN ? ', dry run' : ''})`);
  if (TOPIC) console.log(`Topic override: ${TOPIC}`);

  console.log('Stage 1: research and draft');
  const draftStage = await runDraftStage();
  const draft = await parseStage(draftStage.text, draftStage.usage, 'draft');
  console.log(`  draft: "${draft.title}" (${draft.body_markdown.split(/\s+/).length} words)`);

  console.log('Stage 2: critique and fact check');
  const critiqueStage = await runCritiqueStage(draft);
  const finalDraft = await parseStage(critiqueStage.text, critiqueStage.usage, 'critique');
  console.log(`  final: "${finalDraft.title}" (${finalDraft.body_markdown.split(/\s+/).length} words)`);

  const { data: slugRows, error: slugError } = await supabase.from('articles').select('slug');
  if (slugError) throw new Error(`could not fetch existing slugs: ${slugError.message}`);
  const existingSlugs = (slugRows ?? []).map((r) => r.slug);

  const validation = validateArticleDraft(finalDraft, toolLog, existingSlugs);
  if (!validation.ok) {
    console.error('Validation failed:');
    for (const err of validation.errors) console.error(`  - ${err}`);
    if (!DRY_RUN) {
      console.error('Aborting without insert. Fix with --topic or rerun.');
      process.exit(1);
    }
  }

  const sources = assembleSources([...finalDraft.web_sources, ...webSources]);
  const meta = buildGenerationMeta({
    model: MODEL,
    storyline: draft.title,
    webSearchCount,
    toolCalls: toolLog.map((t) => t.name),
    draftUsage: draftStage.usage,
    critiqueUsage: critiqueStage.usage,
    generatedAt: new Date().toISOString(),
  });

  if (DRY_RUN) {
    console.log('\n----- ARTICLE (dry run, not inserted) -----\n');
    console.log(`# ${finalDraft.title}`);
    console.log(`dek: ${finalDraft.dek}`);
    console.log(`summary: ${finalDraft.summary}`);
    console.log(`slug: ${finalDraft.slug}\n`);
    console.log(finalDraft.body_markdown);
    console.log('\nSources:');
    for (const s of sources) console.log(`  - ${s.label} (${s.url})`);
    console.log(`\nmeta: ${JSON.stringify(meta, null, 2)}`);
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('articles')
    .insert({
      slug: finalDraft.slug,
      title: finalDraft.title,
      dek: finalDraft.dek,
      summary: finalDraft.summary,
      body_markdown: finalDraft.body_markdown,
      author: 'Hoops Data Staff',
      kind: 'markdown',
      status: 'draft',
      sources: sources as unknown as Json,
      generation_meta: meta as unknown as Json,
    })
    .select('id, slug')
    .single();
  if (insertError) throw new Error(`insert failed: ${insertError.message}`);

  console.log(`\nInserted draft ${inserted.id} (/articles/${inserted.slug})`);
  console.log(`Estimated cost: $${meta.estimated_cost_usd.toFixed(2)}`);
  console.log('Review and publish at /articles/review');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
