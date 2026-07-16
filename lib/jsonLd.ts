// lib/jsonLd.ts
//
// Small helpers for structured data. Pages inject the returned object with a
// <script type="application/ld+json"> tag (matching the existing pattern).

const SITE = 'https://hoopsdata.net';

export interface Crumb {
  name: string;
  // Site-relative path, e.g. '/players' or '/players/a'.
  path: string;
}

// BreadcrumbList for a leaf/hub page. Google recommends including the current
// page as the last item.
export function breadcrumbLd(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE}${c.path}`,
    })),
  };
}
