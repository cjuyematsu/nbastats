// app/data/strategicPlayers.ts
//
// Marquee players whose head-to-head "X vs Y" pages carry real long-tail search
// demand. Their pairwise compare pages are advertised in the sitemap so Google
// crawls them; every other open pair still renders on-demand (ISR) but is only
// discoverable via real inbound links/shares. Keeping the sitemap to this
// strategic subset (rather than the full player cross-product) is the
// thin-content guard. Names are copied verbatim from COMPARE_MATCHUPS so they
// resolve to the right player as the top get_player_suggestions hit.

import { COMPARE_MATCHUPS, buildCompareSlug } from './compareMatchups';

export const STRATEGIC_PLAYERS: string[] = [
  'LeBron James',
  'Michael Jordan',
  'Kobe Bryant',
  'Stephen Curry',
  'Kevin Durant',
  "Shaquille O'Neal",
  'Tim Duncan',
  'Larry Bird',
  'Magic Johnson',
  'Hakeem Olajuwon',
  'Dirk Nowitzki',
  'Kevin Garnett',
  'Charles Barkley',
  'Karl Malone',
  'Allen Iverson',
  'Dwyane Wade',
  'Giannis Antetokounmpo',
  'Nikola Jokic',
  'Luka Doncic',
  'Joel Embiid',
  'James Harden',
  'Russell Westbrook',
  'Chris Paul',
  'Kawhi Leonard',
  'Anthony Davis',
  'Damian Lillard',
  'Kyrie Irving',
  'Jayson Tatum',
  'Carmelo Anthony',
  'Vince Carter',
  'Tracy McGrady',
  'Paul Pierce',
  'Ray Allen',
  'Reggie Miller',
  'John Stockton',
  'Steve Nash',
  'David Robinson',
  'Patrick Ewing',
  'Scottie Pippen',
  'Victor Wembanyama',
];

// Canonical compare slugs for every strategic pair, excluding any pair already
// covered by a curated matchup (compared by canonical pair identity so ordering
// differences never slip a duplicate/redirect into the sitemap).
export function strategicCompareSlugs(): string[] {
  const curated = new Set(COMPARE_MATCHUPS.map((m) => buildCompareSlug(m.a, m.b)));
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < STRATEGIC_PLAYERS.length; i++) {
    for (let j = i + 1; j < STRATEGIC_PLAYERS.length; j++) {
      const slug = buildCompareSlug(STRATEGIC_PLAYERS[i], STRATEGIC_PLAYERS[j]);
      if (seen.has(slug) || curated.has(slug)) continue;
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}
