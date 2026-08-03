import { MetadataRoute } from 'next'

// Politeness signal for known offenders; middleware.ts enforces the real
// rule (deny-list: keep this roster in sync with BLOCKED_BOT_RE there).
const BLOCKED_BOTS = [
  'Bytespider',
  'TikTokSpider',
  'PetalBot',
  'CCBot',
  'Amazonbot',
  'DataForSeoBot',
  'BLEXBot',
  'serpstatbot',
  'ZoominfoBot',
  'Barkrowler',
  'meta-externalagent',
  'meta-webindexer',
  'Amzn-SearchBot',
  'GPTBot',
  'ShapBot',
]

// SEO link-index crawlers: middleware-allowed, but kept off the huge ISR
// long tail (AhrefsBot deep-crawled /duos at ~140k req/day, 2026-08-01..03).
const THROTTLED_BOTS = ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/signin', '/signup', '/auth/'],
      },
      {
        userAgent: THROTTLED_BOTS,
        disallow: ['/duos/', '/compare/', '/player/', '/draft/', '/colleges/'],
        crawlDelay: 10,
      },
      ...BLOCKED_BOTS.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: 'https://hoopsdata.net/sitemap.xml',
  }
}
