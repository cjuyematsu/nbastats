// app/sitemap.ts

import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'
import { supabase } from '@/lib/supabaseClient'
import { COMPARE_MATCHUPS } from '@/app/data/compareMatchups'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://hoopsdata.net';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/degrees-of-separation`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/games/stat-over-under`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/games/six-degrees`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/games/six-degrees/daily`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/games/draft-quiz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/games/odd-man-out`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/games/ranking-game`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  const matchupRoutes: MetadataRoute.Sitemap = COMPARE_MATCHUPS.map((m) => ({
    url: `${baseUrl}/compare/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Published articles (best-effort: never break the build if the table or DB is unavailable).
  let articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from('articles')
      .select('slug, published_at')
      .eq('status', 'published');
    articleRoutes = (data ?? []).map((a) => ({
      url: `${baseUrl}/articles/${a.slug}`,
      lastModified: a.published_at ? new Date(a.published_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
  } catch {
    // ignore; fall back to static routes only
  }

  // Every player with a profile page, from the static Six Degrees player map.
  let playerRoutes: MetadataRoute.Sitemap = [];
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'player_map.json'), 'utf-8');
    const playerMap = JSON.parse(raw) as Record<string, string>;
    playerRoutes = Object.keys(playerMap).map((id) => ({
      url: `${baseUrl}/player/${id}`,
      changeFrequency: 'yearly',
      priority: 0.5,
    }));
  } catch {
    // ignore; player pages just stay out of the sitemap
  }

  return [...staticRoutes, ...matchupRoutes, ...articleRoutes, ...playerRoutes];
}
