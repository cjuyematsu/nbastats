import { MetadataRoute } from 'next'

// Politeness signal for known offenders; middleware.ts enforces the real
// rule (deny-list: keep this roster in sync with BLOCKED_BOT_RE there).
const BLOCKED_BOTS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
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
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/signin', '/signup', '/auth/'],
      },
      ...BLOCKED_BOTS.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: 'https://hoopsdata.net/sitemap.xml',
  }
}
