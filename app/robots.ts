import { MetadataRoute } from 'next'

// Keep in sync with BLOCKED_BOT_RE in middleware.ts (which 403s the
// impolite ones that ignore robots.txt).
const BLOCKED_BOTS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'Bytespider',
  'PetalBot',
  'CCBot',
  'Amazonbot',
  'DataForSeoBot',
  'BLEXBot',
  'serpstatbot',
  'ZoominfoBot',
  'Barkrowler',
  'meta-externalagent',
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
