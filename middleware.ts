import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\..*|opengraph-image|sitemap|robots).*)'],
};

const BOT_RE =
  /(bot|crawl|spider|slurp|facebookexternalhit|Slackbot|Twitterbot|Discordbot|LinkedInBot|WhatsApp|TelegramBot|GPTBot|ClaudeBot|anthropic|PerplexityBot|Bytespider|Amazonbot|Applebot|Ahrefs|Semrush|CCBot|Google-Extended|headless)/i;

// Zero-value crawlers: no Google/Bing/AI-referral upside, real SSR cost.
// Refused here so they never reach a serverless render.
// Allow-list, not deny-list: blocked crawlers (Amazon, Meta) rotated to new
// UA names within hours of being denied, so any self-identified crawler NOT
// on this list gets a 403. "google" covers Googlebot, GoogleOther,
// Google-InspectionTool, and Mediapartners/AdsBot for AdSense later.
const ALLOWED_BOT_RE =
  /(google|bingbot|bingpreview|msnbot|applebot|duckduck|facebookexternalhit|meta-externalfetcher|twitterbot|slackbot|discordbot|linkedinbot|whatsapp|telegrambot|pinterest|redditbot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|anthropic|perplexitybot)/i;

function refererHost(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).host;
  } catch {
    return null;
  }
}

async function logRequest(row: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/request_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch {
    // never let logging break a page
  }
}

export function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent');
  const referer = request.headers.get('referer');
  const botMatch = ua ? ua.match(BOT_RE) : null;
  const blocked = !!(botMatch && ua && !ALLOWED_BOT_RE.test(ua));

  waitUntil(
    logRequest({
      path: request.nextUrl.pathname,
      referer,
      referer_host: refererHost(referer),
      ua,
      is_bot: !!botMatch,
      bot_name: botMatch ? botMatch[1] : null,
      blocked,
      country: request.headers.get('x-vercel-ip-country'),
    }),
  );

  if (blocked) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}
