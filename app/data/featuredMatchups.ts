// app/data/featuredMatchups.ts

export interface FeaturedMatchup {
  a: string;
  b: string;
}

// Names only. The hero resolves each to a player via get_player_suggestions
// (taking the top match), the same way /compare?players=A,B resolves them,
// so the hero and the deep-linked compare page always agree.
export const FEATURED_MATCHUPS: FeaturedMatchup[] = [
  { a: 'LeBron James', b: 'Michael Jordan' },
  { a: 'Kobe Bryant', b: 'Tim Duncan' },
  { a: 'Larry Bird', b: 'Magic Johnson' },
  { a: 'Stephen Curry', b: 'Steve Nash' },
  { a: "Shaquille O'Neal", b: 'Hakeem Olajuwon' },
  { a: 'Kevin Durant', b: 'Dirk Nowitzki' },
  { a: 'Allen Iverson', b: 'Derrick Rose' },
  { a: 'Kevin Garnett', b: 'Charles Barkley' },
  { a: 'James Harden', b: 'Reggie Miller' },
  { a: 'Kawhi Leonard', b: 'Scottie Pippen' },
  { a: 'Giannis Antetokounmpo', b: 'Karl Malone' },
  { a: 'Chris Paul', b: 'John Stockton' },
];

export function getTodaysMatchup(date = new Date()): FeaturedMatchup {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return FEATURED_MATCHUPS[dayOfYear % FEATURED_MATCHUPS.length];
}
