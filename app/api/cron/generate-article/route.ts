// app/api/cron/generate-article/route.ts
//
// Agentic article pipeline (Claude API + tool use, server-side):
//   ideate (Haiku, grounded in our rankings)
//     -> research + draft (Sonnet, web_search + query_nba_stats)
//       -> polish (Opus, structured output, verify claims)
//         -> insert a `draft` row into `articles`.
//
// Gated by CRON_SECRET. Vercel Cron POSTs here on a schedule; you can also POST
// manually (see docs/articles.md). A human approves drafts at /articles/review.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import type { Json } from '@/types/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  MODELS,
  runWithTools,
  extractText,
  estimateCostUsd,
  getAnthropic,
  type UsageTotals,
  type WebSource,
} from '@/lib/anthropic';
import { QUERY_NBA_STATS_TOOL, runArticleTool } from '@/lib/articleTools';

export const runtime = 'nodejs';
export const maxDuration = 300; // pipeline runs several model calls; needs a longer function budget

const HOUSE_STYLE = `You write for Hoops Data (hoopsdata.net), an NBA stats site. Voice: sharp,
analytical, confident, no fluff or clichés. Every statistic MUST come from the query_nba_stats
tool (real database rows); never state a number from memory. Current-events claims must come
from web search. The signature move of every piece is anchoring a current storyline to
historical context from the database ("this ranks Nth since 19XX, here are the others").

You are a columnist with a point of view, not a wire service. Every piece advances ONE specific,
debatable thesis (a claim a reader could actually argue with) stated up front in the lede and
defended with the data throughout. End on a take, not a neutral shrug. Headlines make a claim
("The league's worst contract isn't who you think"), never just name a topic. The opinion is what
makes it worth reading and arguing about; the grounded stats are what make it defensible.

Never use em dashes or en dashes anywhere in the article. Use commas, periods, colons, or parentheses instead.`;

const WEB_SEARCH_TOOL: Anthropic.Messages.ToolUnion = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 6,
};

const ARTICLE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'dek', 'summary', 'slug', 'body_markdown'],
  properties: {
    title: { type: 'string', description: 'Headline (~60–70 chars).' },
    dek: { type: 'string', description: 'One-sentence subtitle / standfirst.' },
    summary: { type: 'string', description: '1–2 sentence summary for cards and the meta description.' },
    slug: { type: 'string', description: 'URL slug: lowercase words separated by hyphens.' },
    body_markdown: { type: 'string', description: 'Full article in GitHub-flavored Markdown (no H1; the title renders separately).' },
  },
};

interface PolishedArticle {
  title: string;
  dek: string;
  summary: string;
  slug: string;
  body_markdown: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function addUsage(total: UsageTotals, part: UsageTotals): void {
  total.input_tokens += part.input_tokens;
  total.output_tokens += part.output_tokens;
  total.cache_read_input_tokens += part.cache_read_input_tokens;
  total.cache_creation_input_tokens += part.cache_creation_input_tokens;
}

// Vercel Cron triggers a GET (with an injected `Authorization: Bearer ${CRON_SECRET}`
// header); manual triggers can use POST. Both run the same gated pipeline.
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const usageByStage: Record<string, UsageTotals> = {};
  const costByStage: Record<string, number> = {};

  try {
    // --- Stage A: ideate (Haiku, grounded in our current rankings) ---
    const ideation = await runWithTools({
      model: MODELS.ideate,
      system: HOUSE_STYLE,
      tools: [QUERY_NBA_STATS_TOOL],
      toolHandler: runArticleTool,
      maxTokens: 1500,
      maxSteps: 4,
      messages: [
        {
          role: 'user',
          content: `Today is ${today}. Use query_nba_stats (current_top_rankings, and season_leaders if useful) to see which players are prominent right now, then propose ONE compelling article concept. Reply with a short brief: a claim-making working headline, the central thesis/argument the piece will defend, the key player(s)/personId(s), and the historical comparison hook to explore. Keep it under 150 words.`,
        },
      ],
    });
    usageByStage.ideate = ideation.usage;
    costByStage.ideate = estimateCostUsd(MODELS.ideate, ideation.usage);
    const concept = extractText(ideation.final);
    if (!concept) {
      return NextResponse.json({ error: 'Ideation produced no concept.' }, { status: 502 });
    }

    // --- Stage B: research + draft (Sonnet, web search + grounded stats) ---
    const research = await runWithTools({
      model: MODELS.draft,
      system: `${HOUSE_STYLE}\n\nResearch the storyline with web_search for current facts, and pull EVERY statistic from query_nba_stats. Then write the full article in GitHub-flavored Markdown (800–1,400 words): a thesis-driven lede that stakes a clear, debatable claim, the current-events hook, the historical comparison grounded in real rows, and a closing take that defends the thesis. Do not include an H1 title. After the article, do not add commentary.`,
      tools: [WEB_SEARCH_TOOL, QUERY_NBA_STATS_TOOL],
      toolHandler: runArticleTool,
      thinking: true,
      effort: 'medium',
      maxTokens: 8000,
      maxSteps: 14,
      messages: [
        {
          role: 'user',
          content: `Article concept:\n\n${concept}\n\nResearch and write the article now. Today is ${today}.`,
        },
      ],
    });
    usageByStage.research = research.usage;
    costByStage.research = estimateCostUsd(MODELS.draft, research.usage);
    const draftMarkdown = extractText(research.final);
    const webSources: WebSource[] = research.webSources;
    if (!draftMarkdown) {
      return NextResponse.json({ error: 'Research/draft produced no text.' }, { status: 502 });
    }

    // --- Stage C: polish (Opus, structured output, verify claims) ---
    const polishResponse = await getAnthropic().messages.create({
      model: MODELS.polish,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: ARTICLE_SCHEMA } },
      system: `You are the editor for Hoops Data. Tighten the prose and headline, fix flow, and, critically, REMOVE or soften any claim not supported by the grounded stats already in the draft or by the listed web sources. Do not invent new statistics. Never use em dashes or en dashes (use commas, periods, colons, or parentheses). Keep a strong, debatable thesis and a headline that makes a claim (not just a topic label). Return the final article fields.`,
      messages: [
        {
          role: 'user',
          content: `Draft article (Markdown):\n\n${draftMarkdown}\n\nWeb sources used:\n${JSON.stringify(webSources, null, 2)}`,
        },
      ],
    });
    usageByStage.polish = {
      input_tokens: polishResponse.usage.input_tokens ?? 0,
      output_tokens: polishResponse.usage.output_tokens ?? 0,
      cache_read_input_tokens: polishResponse.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: polishResponse.usage.cache_creation_input_tokens ?? 0,
    };
    costByStage.polish = estimateCostUsd(MODELS.polish, usageByStage.polish);

    let article: PolishedArticle;
    try {
      article = JSON.parse(extractText(polishResponse)) as PolishedArticle;
    } catch {
      return NextResponse.json({ error: 'Polish stage returned unparseable output.' }, { status: 502 });
    }

    // --- Slug (ensure uniqueness) ---
    let slug = slugify(article.slug || article.title) || `article-${Date.now().toString(36)}`;
    const { data: existing } = await supabaseAdmin
      .from('articles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    // --- Totals ---
    const total: UsageTotals = {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    };
    Object.values(usageByStage).forEach((u) => addUsage(total, u));
    const totalCost = Number(
      Object.values(costByStage).reduce((a, b) => a + b, 0).toFixed(4),
    );

    const sources = JSON.parse(
      JSON.stringify({ web_sources: webSources, ideation_concept: concept }),
    ) as Json;
    const generation_meta = JSON.parse(
      JSON.stringify({
        generated_at: new Date().toISOString(),
        models: MODELS,
        usage_by_stage: usageByStage,
        cost_by_stage_usd: costByStage,
        total_usage: total,
        est_cost_usd: totalCost,
      }),
    ) as Json;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('articles')
      .insert({
        slug,
        title: article.title,
        dek: article.dek,
        summary: article.summary,
        body_markdown: article.body_markdown,
        author: 'Hoops Data Staff',
        status: 'draft',
        sources,
        generation_meta,
      })
      .select('id, slug')
      .single();

    if (insertError) {
      return NextResponse.json({ error: `Insert failed: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: inserted.id,
      slug: inserted.slug,
      status: 'draft',
      est_cost_usd: totalCost,
      web_source_count: webSources.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Pipeline failed: ${message}` }, { status: 500 });
  }
}
