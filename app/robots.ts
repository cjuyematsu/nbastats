import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/signin', '/signup'],
      },
    ],
    sitemap: 'https://hoopsdata.net/sitemap.xml',
  }
}
