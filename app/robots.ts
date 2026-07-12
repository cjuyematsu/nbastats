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
      // Bing and Apple were burning serverless renders sweeping the huge
      // /duos long tail daily. They keep the bounded surfaces; the duo
      // long tail is a Google play. (A UA group overrides * entirely, so
      // repeat the baseline disallows here.)
      {
        userAgent: 'bingbot',
        disallow: ['/api/', '/signin', '/signup', '/auth/', '/duos/'],
        crawlDelay: 10,
      },
      {
        userAgent: 'Applebot',
        disallow: ['/api/', '/signin', '/signup', '/auth/', '/duos/'],
      },
      ...BLOCKED_BOTS.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: 'https://hoopsdata.net/sitemap.xml',
  }
}
