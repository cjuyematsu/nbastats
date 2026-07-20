// lib/articleGeneration.ts
//
// Pure logic for the weekly article pipeline (scripts/generate-article.ts):
// tool schemas, prompt builders, draft parsing/validation, sources assembly,
// and cost math. No Supabase or Anthropic imports so node:test can cover it.

import type { SourceLink } from './articleSources';

export type { SourceLink };

export interface ArticleDraft {
  title: string;
  dek: string;
  summary: string;
  slug: string;
  body_markdown: string;
  web_sources: SourceLink[];
}

export interface ToolLogEntry {
  name: string;
  input: unknown;
  output: unknown;
}

export interface UsageTotals {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export const KAGGLE_DATASET_SOURCE: SourceLink = {
  label:
    'NBA Dataset: Box Scores and Stats (1947 - Today) by Eoin A Moore, Kaggle (CC0 1.0)',
  url: 'https://www.kaggle.com/datasets/eoinamoore/historical-nba-data-and-player-box-scores',
};

export const BBREF_SOURCE: SourceLink = {
  label: 'Basketball Reference (manual spot-checking)',
  url: 'https://www.basketball-reference.com',
};

const STYLE_RULES = `Style rules, all mandatory:
- 600 to 900 words of body text.
- Short declarative paragraphs, two to four sentences each. One markdown H2 (##) every two to three paragraphs.
- No emojis anywhere.
- No em dashes and no en dashes anywhere. Use commas, periods, or parentheses instead.
- Never call an active player a "legend", "legendary", or an "all-time great". Use earned facts (champion, MVP, scoring titles) or neutral wording.
- American sports-writing register. No hype cliches, no "in today's NBA", no rhetorical questions.
- Every statistic in the article must come from a database tool result in this conversation. If a number did not come back from a tool, do not print it.
- Web search results may only supply news context (who signed where, contract reported by whom). Attribute reported figures to the outlet in prose.
- Internal links: only use links returned by the tools, in markdown syntax. Player pages are /player/{personId}. Compare and duos links must be copied exactly from tool output.
- End the body with the single line: All stats from the Hoops Data database, current through the 2026 Finals.`;

export function buildDraftSystemPrompt(todayIso: string): string {
  return `You are a staff writer for Hoops Data (hoopsdata.net), an NBA statistics site backed by a complete historical box score database covering 1946 through the 2026 Finals.

Today is ${todayIso}. It is the NBA offseason. Your job is to research current storylines, pick ONE, and write this week's article grounded entirely in the site's own database.

Process, in order:
1. Use web_search a handful of times to find two to four current NBA storylines (free agency signings, trades, extensions, retirements, notable anniversaries).
2. Pick the single storyline best grounded in historical data. Prefer angles about veterans with careers on record: a traded star's career arc, how a new pairing compares to great duos, where a signing ranks among his position historically. Avoid summer league and incoming rookies, the database has nothing on them.
3. Ground every number with the database tools. Resolve every player with search_players first.
4. Write the article.

${STYLE_RULES}

Your FINAL message must be exactly one fenced json block, nothing before or after it, with this shape:
{
  "title": "...",
  "dek": "one sentence under 140 characters",
  "summary": "meta description under 160 characters",
  "slug": "lowercase-hyphenated",
  "body_markdown": "...",
  "web_sources": [{"label": "Outlet, article title", "url": "https://..."}]
}
web_sources lists only web pages whose reporting you actually relied on.`;
}

export function buildDraftKickoff(topic?: string): string {
  if (topic && topic.trim()) {
    return `Write this week's article about the following storyline. Still verify the news context with web_search and ground every statistic with the database tools.\n\nStoryline: ${topic.trim()}`;
  }
  return 'Research current NBA storylines and write this week\'s article.';
}

export const CRITIQUE_SYSTEM_PROMPT =
  'You are a meticulous copy editor and fact checker for Hoops Data. You verify numbers against source data and enforce house style exactly.';

export function buildCritiquePrompt(draft: ArticleDraft, toolLog: ToolLogEntry[]): string {
  const logDigest = toolLog
    .map(
      (entry, i) =>
        `[${i + 1}] ${entry.name} input=${JSON.stringify(entry.input)} output=${JSON.stringify(entry.output)}`,
    )
    .join('\n');
  return `Below is a draft article and the complete database tool log the writer saw. Every statistic in the article must match this log.

Tasks, in order:
1. Verify every number, season, record, team, and ranking in the body against the tool log. Fix any that differ. Delete any claim that cannot be sourced from the log.
2. Verify every internal link. /player/{id} links must use ids present in the log. Compare and duos links must match tool output exactly.
3. Enforce these style rules, rewriting where needed:
${STYLE_RULES}
4. Tighten the prose to 600 to 900 words. Cut throat-clearing and repetition.
5. Reply with exactly one fenced json block in the same shape as the draft, nothing else.

DRAFT:
${JSON.stringify(draft, null, 2)}

TOOL LOG:
${logDigest}`;
}

// Tolerant extractor: fenced json block first, then first bare object.
export function extractArticleJson(text: string): ArticleDraft | null {
  const candidates: string[] = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1]);
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.title === 'string' &&
        typeof parsed.body_markdown === 'string'
      ) {
        return {
          title: parsed.title,
          dek: typeof parsed.dek === 'string' ? parsed.dek : '',
          summary: typeof parsed.summary === 'string' ? parsed.summary : '',
          slug: typeof parsed.slug === 'string' ? parsed.slug : slugify(parsed.title),
          body_markdown: parsed.body_markdown,
          web_sources: Array.isArray(parsed.web_sources)
            ? parsed.web_sources.filter(
                (s: unknown): s is SourceLink =>
                  !!s &&
                  typeof s === 'object' &&
                  typeof (s as SourceLink).label === 'string' &&
                  typeof (s as SourceLink).url === 'string',
              )
            : [],
        };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export interface Grounding {
  playerIds: Set<number>;
  activePlayers: string[];
}

// Pulls the set of grounded personIds and active player names out of the tool
// log so the validator can check links and editorial labels against them.
export function deriveGrounding(toolLog: ToolLogEntry[]): Grounding {
  const playerIds = new Set<number>();
  const activePlayers: string[] = [];
  for (const entry of toolLog) {
    const input = entry.input as Record<string, unknown> | null;
    if (input && typeof input.person_id === 'number') playerIds.add(input.person_id);
    if (input && Array.isArray(input.person_ids)) {
      for (const id of input.person_ids) if (typeof id === 'number') playerIds.add(id);
    }
    const rows = Array.isArray(entry.output) ? entry.output : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (typeof r.personId === 'number') playerIds.add(r.personId);
      if (typeof r.person_id === 'number') playerIds.add(r.person_id);
      if (r.active === true && typeof r.name === 'string') activePlayers.push(r.name);
    }
  }
  return { playerIds, activePlayers };
}

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const DASH_RE = /[–—]/;
const LEGEND_RE = /\blegend(?:ary|s)?\b|\ball-time great/i;
const ALLOWED_INTERNAL_PREFIXES = [
  '/player/',
  '/compare',
  '/duos',
  '/articles',
  '/players',
  '/top-100-players',
];

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateArticleDraft(
  draft: ArticleDraft,
  toolLog: ToolLogEntry[],
  existingSlugs: string[],
): ValidationResult {
  const errors: string[] = [];
  const fullText = [draft.title, draft.dek, draft.summary, draft.body_markdown].join('\n');

  const words = draft.body_markdown.split(/\s+/).filter(Boolean).length;
  if (words < 450) errors.push(`body too short: ${words} words (minimum 450)`);
  if (words > 1000) errors.push(`body too long: ${words} words (maximum 1000)`);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug) || draft.slug.length > 60) {
    errors.push(`bad slug: "${draft.slug}"`);
  }
  if (existingSlugs.includes(draft.slug)) errors.push(`slug collision: "${draft.slug}"`);

  if (EMOJI_RE.test(fullText)) errors.push('emoji found');
  if (DASH_RE.test(fullText)) errors.push('em or en dash found');
  if (!draft.dek) errors.push('missing dek');
  if (draft.dek.length > 140) errors.push(`dek too long: ${draft.dek.length} chars`);
  if (!draft.summary) errors.push('missing summary');
  if (draft.summary.length > 160) errors.push(`summary too long: ${draft.summary.length} chars`);

  const grounding = deriveGrounding(toolLog);

  const linkRe = /\]\(([^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(draft.body_markdown)) !== null) {
    const url = match[1];
    if (url.startsWith('/')) {
      if (!ALLOWED_INTERNAL_PREFIXES.some((p) => url === p || url.startsWith(p))) {
        errors.push(`disallowed internal link: ${url}`);
      }
      const playerMatch = url.match(/^\/player\/(\d+)/);
      if (playerMatch && !grounding.playerIds.has(Number(playerMatch[1]))) {
        errors.push(`ungrounded player link: ${url}`);
      }
    } else if (!url.startsWith('https://')) {
      errors.push(`non-https link: ${url}`);
    }
  }

  for (const name of grounding.activePlayers) {
    const lastName = name.split(' ').pop() ?? name;
    for (const needle of new Set([name, lastName])) {
      let idx = fullText.indexOf(needle);
      while (idx !== -1) {
        const windowText = fullText.slice(Math.max(0, idx - 100), idx + needle.length + 100);
        if (LEGEND_RE.test(windowText)) {
          errors.push(`active player "${name}" described with legend language`);
          idx = -1;
          break;
        }
        idx = fullText.indexOf(needle, idx + 1);
      }
      if (errors.some((e) => e.includes(`"${name}"`))) break;
    }
  }

  if (!Array.isArray(draft.web_sources)) errors.push('web_sources missing');

  return { ok: errors.length === 0, errors };
}

// Fixed dataset sources first, then deduped web sources (one per hostname,
// capped) so every generated article credits the underlying data.
export function assembleSources(webSources: SourceLink[], maxWeb = 4): SourceLink[] {
  const seen = new Set<string>();
  const web: SourceLink[] = [];
  for (const source of webSources) {
    if (!source || typeof source.url !== 'string' || typeof source.label !== 'string') continue;
    let host: string;
    try {
      host = new URL(source.url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    if (seen.has(host)) continue;
    seen.add(host);
    web.push(source);
    if (web.length >= maxWeb) break;
  }
  return [KAGGLE_DATASET_SOURCE, BBREF_SOURCE, ...web];
}

// claude-opus-4-8 pricing per million tokens.
const INPUT_PER_M = 5;
const OUTPUT_PER_M = 25;
const CACHE_WRITE_PER_M = 6.25;
const CACHE_READ_PER_M = 0.5;

export function estimateCostUsd(usages: UsageTotals[]): number {
  let cost = 0;
  for (const usage of usages) {
    cost += (usage.input_tokens ?? 0) * (INPUT_PER_M / 1e6);
    cost += (usage.output_tokens ?? 0) * (OUTPUT_PER_M / 1e6);
    cost += (usage.cache_creation_input_tokens ?? 0) * (CACHE_WRITE_PER_M / 1e6);
    cost += (usage.cache_read_input_tokens ?? 0) * (CACHE_READ_PER_M / 1e6);
  }
  return Math.round(cost * 10000) / 10000;
}

export function buildGenerationMeta(args: {
  model: string;
  storyline: string;
  webSearchCount: number;
  toolCalls: string[];
  draftUsage: UsageTotals;
  critiqueUsage: UsageTotals;
  generatedAt: string;
}) {
  return {
    model: args.model,
    storyline: args.storyline,
    web_search_count: args.webSearchCount,
    tool_calls: args.toolCalls,
    usage: { draft: args.draftUsage, critique: args.critiqueUsage },
    estimated_cost_usd: estimateCostUsd([args.draftUsage, args.critiqueUsage]),
    generated_at: args.generatedAt,
    pipeline_version: 1,
  };
}
