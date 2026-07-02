// app/data/compareMatchups.ts
//
// Curated matchup pages for SEO (/compare/<slug>). Slugs are written by hand so
// names with punctuation (O'Neal) resolve once, here. Names must resolve to the
// right player as the TOP get_player_suggestions hit; spot-check new pairs in
// dev before adding. Keep pairs 1980 or later, where the stats DB has coverage.

export interface CompareMatchup {
  slug: string;
  a: string;
  b: string;
}

export const COMPARE_MATCHUPS: CompareMatchup[] = [
  { slug: 'lebron-james-vs-michael-jordan', a: 'LeBron James', b: 'Michael Jordan' },
  { slug: 'lebron-james-vs-kobe-bryant', a: 'LeBron James', b: 'Kobe Bryant' },
  { slug: 'kobe-bryant-vs-michael-jordan', a: 'Kobe Bryant', b: 'Michael Jordan' },
  { slug: 'kobe-bryant-vs-tim-duncan', a: 'Kobe Bryant', b: 'Tim Duncan' },
  { slug: 'larry-bird-vs-magic-johnson', a: 'Larry Bird', b: 'Magic Johnson' },
  { slug: 'stephen-curry-vs-steve-nash', a: 'Stephen Curry', b: 'Steve Nash' },
  { slug: 'stephen-curry-vs-damian-lillard', a: 'Stephen Curry', b: 'Damian Lillard' },
  { slug: 'stephen-curry-vs-lebron-james', a: 'Stephen Curry', b: 'LeBron James' },
  { slug: 'shaquille-oneal-vs-hakeem-olajuwon', a: "Shaquille O'Neal", b: 'Hakeem Olajuwon' },
  { slug: 'dwight-howard-vs-shaquille-oneal', a: 'Dwight Howard', b: "Shaquille O'Neal" },
  { slug: 'kevin-durant-vs-dirk-nowitzki', a: 'Kevin Durant', b: 'Dirk Nowitzki' },
  { slug: 'kevin-durant-vs-lebron-james', a: 'Kevin Durant', b: 'LeBron James' },
  { slug: 'kevin-durant-vs-kawhi-leonard', a: 'Kevin Durant', b: 'Kawhi Leonard' },
  { slug: 'allen-iverson-vs-derrick-rose', a: 'Allen Iverson', b: 'Derrick Rose' },
  { slug: 'dwyane-wade-vs-allen-iverson', a: 'Dwyane Wade', b: 'Allen Iverson' },
  { slug: 'kyrie-irving-vs-allen-iverson', a: 'Kyrie Irving', b: 'Allen Iverson' },
  { slug: 'kevin-garnett-vs-charles-barkley', a: 'Kevin Garnett', b: 'Charles Barkley' },
  { slug: 'tim-duncan-vs-kevin-garnett', a: 'Tim Duncan', b: 'Kevin Garnett' },
  { slug: 'dirk-nowitzki-vs-tim-duncan', a: 'Dirk Nowitzki', b: 'Tim Duncan' },
  { slug: 'charles-barkley-vs-karl-malone', a: 'Charles Barkley', b: 'Karl Malone' },
  { slug: 'james-harden-vs-reggie-miller', a: 'James Harden', b: 'Reggie Miller' },
  { slug: 'james-harden-vs-russell-westbrook', a: 'James Harden', b: 'Russell Westbrook' },
  { slug: 'kawhi-leonard-vs-scottie-pippen', a: 'Kawhi Leonard', b: 'Scottie Pippen' },
  { slug: 'jimmy-butler-vs-kawhi-leonard', a: 'Jimmy Butler', b: 'Kawhi Leonard' },
  { slug: 'giannis-antetokounmpo-vs-karl-malone', a: 'Giannis Antetokounmpo', b: 'Karl Malone' },
  { slug: 'giannis-antetokounmpo-vs-lebron-james', a: 'Giannis Antetokounmpo', b: 'LeBron James' },
  { slug: 'chris-paul-vs-john-stockton', a: 'Chris Paul', b: 'John Stockton' },
  { slug: 'nikola-jokic-vs-joel-embiid', a: 'Nikola Jokic', b: 'Joel Embiid' },
  { slug: 'nikola-jokic-vs-shaquille-oneal', a: 'Nikola Jokic', b: "Shaquille O'Neal" },
  { slug: 'luka-doncic-vs-larry-bird', a: 'Luka Doncic', b: 'Larry Bird' },
  { slug: 'luka-doncic-vs-james-harden', a: 'Luka Doncic', b: 'James Harden' },
  { slug: 'vince-carter-vs-tracy-mcgrady', a: 'Vince Carter', b: 'Tracy McGrady' },
  { slug: 'paul-pierce-vs-carmelo-anthony', a: 'Paul Pierce', b: 'Carmelo Anthony' },
  { slug: 'jayson-tatum-vs-paul-pierce', a: 'Jayson Tatum', b: 'Paul Pierce' },
  { slug: 'devin-booker-vs-kobe-bryant', a: 'Devin Booker', b: 'Kobe Bryant' },
  { slug: 'anthony-edwards-vs-dwyane-wade', a: 'Anthony Edwards', b: 'Dwyane Wade' },
  { slug: 'ja-morant-vs-derrick-rose', a: 'Ja Morant', b: 'Derrick Rose' },
  { slug: 'patrick-ewing-vs-david-robinson', a: 'Patrick Ewing', b: 'David Robinson' },
  { slug: 'klay-thompson-vs-reggie-miller', a: 'Klay Thompson', b: 'Reggie Miller' },
  { slug: 'damian-lillard-vs-kyrie-irving', a: 'Damian Lillard', b: 'Kyrie Irving' },
];

export function findMatchup(slug: string): { matchup: CompareMatchup; reversed: boolean } | null {
  const exact = COMPARE_MATCHUPS.find((m) => m.slug === slug);
  if (exact) return { matchup: exact, reversed: false };
  const parts = slug.split('-vs-');
  if (parts.length === 2) {
    const flipped = `${parts[1]}-vs-${parts[0]}`;
    const rev = COMPARE_MATCHUPS.find((m) => m.slug === flipped);
    if (rev) return { matchup: rev, reversed: true };
  }
  return null;
}

export function findSlugForPair(a: string, b: string): string | null {
  const m = COMPARE_MATCHUPS.find(
    (x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)
  );
  return m ? m.slug : null;
}

export function relatedMatchups(matchup: CompareMatchup, count = 4): CompareMatchup[] {
  const sharesPlayer = (m: CompareMatchup) =>
    m.a === matchup.a || m.b === matchup.a || m.a === matchup.b || m.b === matchup.b;
  const related = COMPARE_MATCHUPS.filter((m) => m.slug !== matchup.slug && sharesPlayer(m));
  const rest = COMPARE_MATCHUPS.filter((m) => m.slug !== matchup.slug && !sharesPlayer(m));
  return [...related, ...rest].slice(0, count);
}
