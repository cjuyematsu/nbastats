// app/api/oembed/route.ts
//
// oEmbed provider so pasting a Hoops Data URL into WordPress / Discord / an
// oEmbed consumer auto-expands into a widget (compare/duo/player) or a link card
// (articles). Discovery links live in each page's <head> (metadata alternates).

import { NextResponse } from 'next/server';
import { findMatchup, parseCompareSlug } from '@/app/data/compareMatchups';
import { findDuo, parseDuoSlug } from '@/app/data/duoPages';
import { getCareerStats } from '@/lib/serverStats';

const BASE = 'https://hoopsdata.net';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' },
  });

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const iframe = (embedPath: string, w: number, h: number, title: string) =>
  `<iframe src="${BASE}${embedPath}" width="${w}" height="${h}" style="border:0;max-width:100%" loading="lazy" title="${title}"></iframe>`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  const format = searchParams.get('format') ?? 'json';
  if (format === 'xml') return json({ error: 'xml not supported' }, 501);
  if (!target) return json({ error: 'missing url' }, 400);

  let pathname: string;
  try {
    pathname = new URL(target).pathname;
  } catch {
    return json({ error: 'invalid url' }, 400);
  }
  const seg = pathname.split('/').filter(Boolean);
  const base = {
    version: '1.0',
    provider_name: 'Hoops Data',
    provider_url: BASE,
    thumbnail_width: 1200,
    thumbnail_height: 630,
  };

  // /compare/<slug>
  if (seg[0] === 'compare' && seg[1]) {
    const slug = seg[1];
    const found = findMatchup(slug);
    const parsed = parseCompareSlug(slug);
    if (!found && !parsed) return json({ error: 'not found' }, 404);
    const a = found ? found.matchup.a : titleCase(parsed!.a);
    const b = found ? found.matchup.b : titleCase(parsed!.b);
    const title = `${a} vs ${b}: NBA Career Stats Comparison`;
    return json({
      ...base,
      type: 'rich',
      title,
      width: 480,
      height: 360,
      html: iframe(`/embed/compare/${slug}`, 480, 360, title),
      thumbnail_url: `${BASE}/compare/${slug}/opengraph-image`,
    });
  }

  // /duos/<slug>
  if (seg[0] === 'duos' && seg[1]) {
    const slug = seg[1];
    const found = findDuo(slug);
    const parsed = parseDuoSlug(slug);
    if (!found && !parsed) return json({ error: 'not found' }, 404);
    const a = found ? found.duo.a : titleCase(parsed!.a);
    const b = found ? found.duo.b : titleCase(parsed!.b);
    const title = `${a} & ${b}: Games Played Together`;
    return json({
      ...base,
      type: 'rich',
      title,
      width: 480,
      height: 260,
      html: iframe(`/embed/duos/${slug}`, 480, 260, title),
      thumbnail_url: `${BASE}/duos/${slug}/opengraph-image`,
    });
  }

  // /player/<id>
  if (seg[0] === 'player' && seg[1]) {
    const id = Number(seg[1]);
    if (!Number.isFinite(id)) return json({ error: 'not found' }, 404);
    const p = await getCareerStats(id);
    const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : 'NBA Player';
    const title = `${name} Career Stats`;
    return json({
      ...base,
      type: 'rich',
      title,
      width: 480,
      height: 260,
      html: iframe(`/embed/player/${id}`, 480, 260, title),
      thumbnail_url: `${BASE}/player/${id}/opengraph-image`,
    });
  }

  // /articles/<slug> — link card (no widget)
  if (seg[0] === 'articles' && seg[1]) {
    return json({
      ...base,
      type: 'link',
      title: 'Hoops Data',
      thumbnail_url: `${BASE}/articles/${seg[1]}/opengraph-image`,
    });
  }

  return json({ error: 'unsupported url' }, 404);
}
