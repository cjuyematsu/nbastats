// lib/anthropic.ts
//
// Server-only Anthropic client + a small agentic-loop helper for the article
// pipeline. Tiered models: Haiku for ideation, Sonnet for research/draft, Opus
// for the editorial polish pass. NEVER import this from a client component;
// ANTHROPIC_API_KEY must stay server-side.

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

/** Lazily constructs the Anthropic client so a missing key never breaks `next build`. */
export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for the article pipeline.');
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const MODELS = {
  ideate: 'claude-haiku-4-5',
  research: 'claude-sonnet-4-6',
  draft: 'claude-sonnet-4-6',
  polish: 'claude-opus-4-8',
} as const;

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface UsageTotals {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export interface WebSource {
  url: string;
  title: string;
}

export type ToolHandler = (name: string, input: unknown) => Promise<string>;

export interface RunOptions {
  model: string;
  system?: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Messages.ToolUnion[];
  toolHandler?: ToolHandler;
  maxTokens?: number;
  effort?: Effort;
  thinking?: boolean;
  /** Safety cap on agentic round-trips. */
  maxSteps?: number;
}

export interface RunResult {
  final: Anthropic.Message;
  messages: Anthropic.MessageParam[];
  usage: UsageTotals;
  webSources: WebSource[];
}

/** Pull the concatenated text out of a model response. */
export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

function collectWebSources(blocks: Anthropic.ContentBlock[], out: WebSource[]): void {
  for (const block of blocks) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r.type === 'web_search_result') {
          out.push({ url: r.url, title: r.title });
        }
      }
    }
  }
}

/**
 * Runs a manual agentic loop: sends the request, executes any custom tool calls
 * via `toolHandler`, resumes server-side tools (web search) on `pause_turn`, and
 * stops on a terminal stop_reason. Accumulates token usage and collected web
 * sources across all steps.
 */
export async function runWithTools(opts: RunOptions): Promise<RunResult> {
  const { model, system, tools, toolHandler, maxTokens = 8000, effort, thinking, maxSteps = 8 } = opts;
  const messages: Anthropic.MessageParam[] = [...opts.messages];
  const usage: UsageTotals = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };
  const webSources: WebSource[] = [];
  let final: Anthropic.Message | null = null;

  const client = getAnthropic();
  for (let step = 0; step < maxSteps; step++) {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages,
      ...(system ? { system } : {}),
      ...(tools && tools.length ? { tools } : {}),
      ...(thinking ? { thinking: { type: 'adaptive' as const } } : {}),
      ...(effort ? { output_config: { effort } } : {}),
    });

    usage.input_tokens += response.usage.input_tokens ?? 0;
    usage.output_tokens += response.usage.output_tokens ?? 0;
    usage.cache_read_input_tokens += response.usage.cache_read_input_tokens ?? 0;
    usage.cache_creation_input_tokens += response.usage.cache_creation_input_tokens ?? 0;
    collectWebSources(response.content, webSources);
    final = response;
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          let resultText: string;
          try {
            resultText = toolHandler
              ? await toolHandler(block.name, block.input)
              : `No handler registered for tool "${block.name}".`;
          } catch (err) {
            resultText = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: resultText });
        }
      }
      if (toolResults.length === 0) break; // nothing client-side to answer; avoid empty turn
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    if (response.stop_reason === 'pause_turn') {
      continue; // server tool (web search) hit its iteration limit, then resume
    }

    break; // end_turn / max_tokens / refusal / stop_sequence
  }

  if (!final) throw new Error('runWithTools produced no response.');
  const seen = new Set<string>();
  const dedupedSources = webSources.filter((s) => (seen.has(s.url) ? false : seen.add(s.url)));
  return { final, messages, usage, webSources: dedupedSources };
}

/** Rough USD cost from token usage, per the tiered model rates ($/1M tokens). */
export function estimateCostUsd(model: string, usage: UsageTotals): number {
  const rates: Record<string, { in: number; out: number }> = {
    'claude-haiku-4-5': { in: 1, out: 5 },
    'claude-sonnet-4-6': { in: 3, out: 15 },
    'claude-opus-4-8': { in: 5, out: 25 },
  };
  const rate = rates[model] ?? { in: 3, out: 15 };
  // cache reads bill at ~0.1x input; treat cache writes at ~1.25x input.
  const inputCost =
    (usage.input_tokens * rate.in +
      usage.cache_read_input_tokens * rate.in * 0.1 +
      usage.cache_creation_input_tokens * rate.in * 1.25) /
    1_000_000;
  const outputCost = (usage.output_tokens * rate.out) / 1_000_000;
  return Number((inputCost + outputCost).toFixed(4));
}
