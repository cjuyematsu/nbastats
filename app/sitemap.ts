// app/sitemap.ts

import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'
import { supabase } from '@/lib/supabaseClient'
import { COMPARE_MATCHUPS } from '@/app/data/compareMatchups'
import { DUO_PAGES } from '@/app/data/duoPages'
import { strategicCompareSlugs } from '@/app/data/strategicPlayers'
import { PLAYER_DIRECTORY } from '@/app/data/playerDirectory'
import { getSchoolGroups } from '@/lib/collegeData'

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
      url: `${baseUrl}/top-100-players`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/degrees-of-separation`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/duos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/games`,
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
      url: `${baseUrl}/games/draft-quiz/daily`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
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
    {
      url: `${baseUrl}/games/career-arc`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/games/common-teammate`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Crawlable directory hubs: shallow entry points that link to the leaf pages.
  const directoryRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/players`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/compare/all`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/duos/all`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/draft`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/colleges`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  // School leaf pages: only schools with multiple picks or at least one linked
  // player profile are advertised; singletons stay reachable via /colleges.
  let collegeRoutes: MetadataRoute.Sitemap = [];
  try {
    const groups = await getSchoolGroups();
    collegeRoutes = [...groups.values()]
      .filter((g) => g.picks.length >= 2 || g.picks.some((p) => p.playerId != null))
      .map((g) => ({
        url: `${baseUrl}/colleges/${g.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
  } catch {
    // ignore; college pages just stay out of the sitemap
  }

  const playerLetterRoutes: MetadataRoute.Sitemap = [
    ...new Set(PLAYER_DIRECTORY.map((p) => p.letter)),
  ].map((letter) => ({
    url: `${baseUrl}/players/${letter.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const matchupRoutes: MetadataRoute.Sitemap = COMPARE_MATCHUPS.map((m) => ({
    url: `${baseUrl}/compare/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Strategic open matchups (marquee cross-product minus curated) rendered on
  // demand via ISR; only this bounded subset is advertised for crawl.
  const strategicMatchupRoutes: MetadataRoute.Sitemap = strategicCompareSlugs().map((slug) => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const duoRoutes: MetadataRoute.Sitemap = DUO_PAGES.map((d) => ({
    url: `${baseUrl}/duos/${d.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const latestDraftYear = new Date().getFullYear();
  const draftRoutes: MetadataRoute.Sitemap = Array.from(
    { length: latestDraftYear - 1955 + 1 },
    (_, i) => ({
      url: `${baseUrl}/draft/${1955 + i}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  );

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

  return [...staticRoutes, ...directoryRoutes, ...collegeRoutes, ...playerLetterRoutes, ...matchupRoutes, ...strategicMatchupRoutes, ...duoRoutes, ...draftRoutes, ...articleRoutes, ...playerRoutes];
}
