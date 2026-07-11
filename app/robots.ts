import { MetadataRoute } from 'next'

// Politeness signal for known offenders; middleware.ts enforces the real
// rule (allow-list: any self-identified crawler not approved gets 403).
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
  'meta-webindexer',
  'Amzn-SearchBot',
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
