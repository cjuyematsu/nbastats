// components/Footer.tsx
//
// Site-wide footer. Its main job is SEO: it puts the four crawlable directory
// hubs (players, comparisons, duos, draft) one hop from every page, so the
// thousands of leaf pages are reachable within two hops instead of deep
// graph-walking. Server component (plain links, no interactivity).

import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Browse',
    links: [
      { href: '/players', label: 'Player Directory' },
      { href: '/compare/all', label: 'All Comparisons' },
      { href: '/duos/all', label: 'All Duos' },
      { href: '/draft', label: 'Draft History' },
    ],
  },
  {
    heading: 'Tools',
    links: [
      { href: '/compare', label: 'Compare Players' },
      { href: '/duos', label: 'Duos' },
      { href: '/top-100-players', label: 'Top 100 Players' },
      { href: '/degrees-of-separation', label: 'Teammate Connections' },
    ],
  },
  {
    heading: 'Play & Read',
    links: [
      { href: '/games', label: 'Trivia Games' },
      { href: '/games/six-degrees/daily', label: "Today's Six Degrees" },
      { href: '/articles', label: 'Articles' },
    ],
  },
  {
    heading: 'About',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-4 md:mt-[var(--navbar-header-gap)] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-slate-700 dark:text-slate-300">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                {col.heading}
              </h2>
              <ul className="space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-sky-600 dark:hover:text-sky-400 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/60">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Newsletter
          </h2>
          <p className="text-sm mb-3 text-slate-600 dark:text-slate-400">
            Get an email when a new article drops.
          </p>
          <div className="max-w-md">
            <NewsletterSignup variant="compact" />
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/60 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="font-semibold hover:text-sky-600 dark:hover:text-sky-400">
            HoopsData
          </Link>{' '}
          &middot; NBA player comparison, stats, rankings, and trivia. Not affiliated with the NBA.
        </div>
      </div>
    </footer>
  );
}
