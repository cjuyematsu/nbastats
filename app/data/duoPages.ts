// app/data/duoPages.ts
//
// Curated duo pages for SEO (/duos/<slug>). Same rules as compareMatchups.ts:
// slugs are hand-written, names must resolve to the right player as the TOP
// get_player_suggestions hit, and every pair must have a row in the teammates
// table (spot-check new pairs in dev before adding).

export interface DuoPage {
  slug: string;
  a: string;
  b: string;
}

export const DUO_PAGES: DuoPage[] = [
  { slug: 'michael-jordan-and-scottie-pippen', a: 'Michael Jordan', b: 'Scottie Pippen' },
  { slug: 'michael-jordan-and-dennis-rodman', a: 'Michael Jordan', b: 'Dennis Rodman' },
  { slug: 'michael-jordan-and-steve-kerr', a: 'Michael Jordan', b: 'Steve Kerr' },
  { slug: 'scottie-pippen-and-dennis-rodman', a: 'Scottie Pippen', b: 'Dennis Rodman' },
  { slug: 'scottie-pippen-and-hakeem-olajuwon', a: 'Scottie Pippen', b: 'Hakeem Olajuwon' },
  { slug: 'shaquille-oneal-and-kobe-bryant', a: "Shaquille O'Neal", b: 'Kobe Bryant' },
  { slug: 'shaquille-oneal-and-penny-hardaway', a: "Shaquille O'Neal", b: 'Anfernee Hardaway' },
  { slug: 'shaquille-oneal-and-dwyane-wade', a: "Shaquille O'Neal", b: 'Dwyane Wade' },
  { slug: 'shaquille-oneal-and-lebron-james', a: "Shaquille O'Neal", b: 'LeBron James' },
  { slug: 'shaquille-oneal-and-steve-nash', a: "Shaquille O'Neal", b: 'Steve Nash' },
  { slug: 'kobe-bryant-and-pau-gasol', a: 'Kobe Bryant', b: 'Pau Gasol' },
  { slug: 'kobe-bryant-and-derek-fisher', a: 'Kobe Bryant', b: 'Derek Fisher' },
  { slug: 'kobe-bryant-and-lamar-odom', a: 'Kobe Bryant', b: 'Lamar Odom' },
  { slug: 'kobe-bryant-and-dwight-howard', a: 'Kobe Bryant', b: 'Dwight Howard' },
  { slug: 'kobe-bryant-and-karl-malone', a: 'Kobe Bryant', b: 'Karl Malone' },
  { slug: 'kobe-bryant-and-gary-payton', a: 'Kobe Bryant', b: 'Gary Payton' },
  { slug: 'stephen-curry-and-klay-thompson', a: 'Stephen Curry', b: 'Klay Thompson' },
  { slug: 'stephen-curry-and-kevin-durant', a: 'Stephen Curry', b: 'Kevin Durant' },
  { slug: 'stephen-curry-and-draymond-green', a: 'Stephen Curry', b: 'Draymond Green' },
  { slug: 'stephen-curry-and-chris-paul', a: 'Stephen Curry', b: 'Chris Paul' },
  { slug: 'klay-thompson-and-draymond-green', a: 'Klay Thompson', b: 'Draymond Green' },
  { slug: 'lebron-james-and-dwyane-wade', a: 'LeBron James', b: 'Dwyane Wade' },
  { slug: 'lebron-james-and-kyrie-irving', a: 'LeBron James', b: 'Kyrie Irving' },
  { slug: 'lebron-james-and-chris-bosh', a: 'LeBron James', b: 'Chris Bosh' },
  { slug: 'lebron-james-and-anthony-davis', a: 'LeBron James', b: 'Anthony Davis' },
  { slug: 'lebron-james-and-kevin-love', a: 'LeBron James', b: 'Kevin Love' },
  { slug: 'lebron-james-and-russell-westbrook', a: 'LeBron James', b: 'Russell Westbrook' },
  { slug: 'lebron-james-and-luka-doncic', a: 'LeBron James', b: 'Luka Doncic' },
  { slug: 'dwyane-wade-and-chris-bosh', a: 'Dwyane Wade', b: 'Chris Bosh' },
  { slug: 'dwyane-wade-and-jimmy-butler', a: 'Dwyane Wade', b: 'Jimmy Butler' },
  { slug: 'kyrie-irving-and-kevin-love', a: 'Kyrie Irving', b: 'Kevin Love' },
  { slug: 'kyrie-irving-and-luka-doncic', a: 'Kyrie Irving', b: 'Luka Doncic' },
  { slug: 'kyrie-irving-and-kevin-durant', a: 'Kyrie Irving', b: 'Kevin Durant' },
  { slug: 'tim-duncan-and-manu-ginobili', a: 'Tim Duncan', b: 'Manu Ginobili' },
  { slug: 'tim-duncan-and-tony-parker', a: 'Tim Duncan', b: 'Tony Parker' },
  { slug: 'tim-duncan-and-david-robinson', a: 'Tim Duncan', b: 'David Robinson' },
  { slug: 'magic-johnson-and-kareem-abdul-jabbar', a: 'Magic Johnson', b: 'Kareem Abdul-Jabbar' },
  { slug: 'magic-johnson-and-james-worthy', a: 'Magic Johnson', b: 'James Worthy' },
  { slug: 'larry-bird-and-kevin-mchale', a: 'Larry Bird', b: 'Kevin McHale' },
  { slug: 'larry-bird-and-robert-parish', a: 'Larry Bird', b: 'Robert Parish' },
  { slug: 'john-stockton-and-karl-malone', a: 'John Stockton', b: 'Karl Malone' },
  { slug: 'isiah-thomas-and-joe-dumars', a: 'Isiah Thomas', b: 'Joe Dumars' },
  { slug: 'hakeem-olajuwon-and-clyde-drexler', a: 'Hakeem Olajuwon', b: 'Clyde Drexler' },
  { slug: 'hakeem-olajuwon-and-charles-barkley', a: 'Hakeem Olajuwon', b: 'Charles Barkley' },
  { slug: 'gary-payton-and-shawn-kemp', a: 'Gary Payton', b: 'Shawn Kemp' },
  { slug: 'patrick-ewing-and-john-starks', a: 'Patrick Ewing', b: 'John Starks' },
  { slug: 'reggie-miller-and-rik-smits', a: 'Reggie Miller', b: 'Rik Smits' },
  { slug: 'steve-nash-and-amare-stoudemire', a: 'Steve Nash', b: "Amar'e Stoudemire" },
  { slug: 'steve-nash-and-dirk-nowitzki', a: 'Steve Nash', b: 'Dirk Nowitzki' },
  { slug: 'dirk-nowitzki-and-jason-terry', a: 'Dirk Nowitzki', b: 'Jason Terry' },
  { slug: 'dirk-nowitzki-and-jason-kidd', a: 'Dirk Nowitzki', b: 'Jason Kidd' },
  { slug: 'vince-carter-and-tracy-mcgrady', a: 'Vince Carter', b: 'Tracy McGrady' },
  { slug: 'jason-kidd-and-vince-carter', a: 'Jason Kidd', b: 'Vince Carter' },
  { slug: 'tracy-mcgrady-and-yao-ming', a: 'Tracy McGrady', b: 'Yao Ming' },
  { slug: 'paul-pierce-and-kevin-garnett', a: 'Paul Pierce', b: 'Kevin Garnett' },
  { slug: 'kevin-garnett-and-ray-allen', a: 'Kevin Garnett', b: 'Ray Allen' },
  { slug: 'kevin-garnett-and-stephon-marbury', a: 'Kevin Garnett', b: 'Stephon Marbury' },
  { slug: 'rajon-rondo-and-kevin-garnett', a: 'Rajon Rondo', b: 'Kevin Garnett' },
  { slug: 'nikola-jokic-and-jamal-murray', a: 'Nikola Jokic', b: 'Jamal Murray' },
  { slug: 'nikola-jokic-and-aaron-gordon', a: 'Nikola Jokic', b: 'Aaron Gordon' },
  { slug: 'nikola-jokic-and-russell-westbrook', a: 'Nikola Jokic', b: 'Russell Westbrook' },
  { slug: 'jamal-murray-and-michael-porter-jr', a: 'Jamal Murray', b: 'Michael Porter Jr.' },
  { slug: 'kevin-durant-and-russell-westbrook', a: 'Kevin Durant', b: 'Russell Westbrook' },
  { slug: 'kevin-durant-and-james-harden', a: 'Kevin Durant', b: 'James Harden' },
  { slug: 'kevin-durant-and-devin-booker', a: 'Kevin Durant', b: 'Devin Booker' },
  { slug: 'russell-westbrook-and-james-harden', a: 'Russell Westbrook', b: 'James Harden' },
  { slug: 'russell-westbrook-and-paul-george', a: 'Russell Westbrook', b: 'Paul George' },
  { slug: 'james-harden-and-chris-paul', a: 'James Harden', b: 'Chris Paul' },
  { slug: 'james-harden-and-dwight-howard', a: 'James Harden', b: 'Dwight Howard' },
  { slug: 'james-harden-and-joel-embiid', a: 'James Harden', b: 'Joel Embiid' },
  { slug: 'chris-paul-and-blake-griffin', a: 'Chris Paul', b: 'Blake Griffin' },
  { slug: 'chris-paul-and-deandre-jordan', a: 'Chris Paul', b: 'DeAndre Jordan' },
  { slug: 'chris-paul-and-devin-booker', a: 'Chris Paul', b: 'Devin Booker' },
  { slug: 'chris-paul-and-victor-wembanyama', a: 'Chris Paul', b: 'Victor Wembanyama' },
  { slug: 'damian-lillard-and-cj-mccollum', a: 'Damian Lillard', b: 'CJ McCollum' },
  { slug: 'damian-lillard-and-giannis-antetokounmpo', a: 'Damian Lillard', b: 'Giannis Antetokounmpo' },
  { slug: 'giannis-antetokounmpo-and-khris-middleton', a: 'Giannis Antetokounmpo', b: 'Khris Middleton' },
  { slug: 'jayson-tatum-and-jaylen-brown', a: 'Jayson Tatum', b: 'Jaylen Brown' },
  { slug: 'jimmy-butler-and-bam-adebayo', a: 'Jimmy Butler', b: 'Bam Adebayo' },
  { slug: 'john-wall-and-bradley-beal', a: 'John Wall', b: 'Bradley Beal' },
  { slug: 'bradley-beal-and-devin-booker', a: 'Bradley Beal', b: 'Devin Booker' },
  { slug: 'kyle-lowry-and-demar-derozan', a: 'Kyle Lowry', b: 'DeMar DeRozan' },
  { slug: 'kawhi-leonard-and-kyle-lowry', a: 'Kawhi Leonard', b: 'Kyle Lowry' },
  { slug: 'kawhi-leonard-and-paul-george', a: 'Kawhi Leonard', b: 'Paul George' },
  { slug: 'shai-gilgeous-alexander-and-chet-holmgren', a: 'Shai Gilgeous-Alexander', b: 'Chet Holmgren' },
  { slug: 'shai-gilgeous-alexander-and-jalen-williams', a: 'Shai Gilgeous-Alexander', b: 'Jalen Williams' },
  { slug: 'victor-wembanyama-and-deaaron-fox', a: 'Victor Wembanyama', b: "De'Aaron Fox" },
  { slug: 'luka-doncic-and-kristaps-porzingis', a: 'Luka Doncic', b: 'Kristaps Porzingis' },
  { slug: 'luka-doncic-and-jalen-brunson', a: 'Luka Doncic', b: 'Jalen Brunson' },
  { slug: 'anthony-edwards-and-karl-anthony-towns', a: 'Anthony Edwards', b: 'Karl-Anthony Towns' },
  { slug: 'anthony-edwards-and-rudy-gobert', a: 'Anthony Edwards', b: 'Rudy Gobert' },
  { slug: 'joel-embiid-and-ben-simmons', a: 'Joel Embiid', b: 'Ben Simmons' },
  { slug: 'joel-embiid-and-tyrese-maxey', a: 'Joel Embiid', b: 'Tyrese Maxey' },
  { slug: 'trae-young-and-dejounte-murray', a: 'Trae Young', b: 'Dejounte Murray' },
  { slug: 'jalen-brunson-and-karl-anthony-towns', a: 'Jalen Brunson', b: 'Karl-Anthony Towns' },
  { slug: 'zion-williamson-and-brandon-ingram', a: 'Zion Williamson', b: 'Brandon Ingram' },
  { slug: 'paolo-banchero-and-franz-wagner', a: 'Paolo Banchero', b: 'Franz Wagner' },
  { slug: 'tyrese-haliburton-and-pascal-siakam', a: 'Tyrese Haliburton', b: 'Pascal Siakam' },
  { slug: 'domantas-sabonis-and-deaaron-fox', a: 'Domantas Sabonis', b: "De'Aaron Fox" },
  { slug: 'donovan-mitchell-and-rudy-gobert', a: 'Donovan Mitchell', b: 'Rudy Gobert' },
  { slug: 'donovan-mitchell-and-darius-garland', a: 'Donovan Mitchell', b: 'Darius Garland' },
  { slug: 'allen-iverson-and-carmelo-anthony', a: 'Allen Iverson', b: 'Carmelo Anthony' },
  { slug: 'carmelo-anthony-and-amare-stoudemire', a: 'Carmelo Anthony', b: "Amar'e Stoudemire" },
  { slug: 'alonzo-mourning-and-tim-hardaway', a: 'Alonzo Mourning', b: 'Tim Hardaway' },
  { slug: 'charles-barkley-and-kevin-johnson', a: 'Charles Barkley', b: 'Kevin Johnson' },
  { slug: 'chris-webber-and-vlade-divac', a: 'Chris Webber', b: 'Vlade Divac' },
  { slug: 'dennis-rodman-and-david-robinson', a: 'Dennis Rodman', b: 'David Robinson' },
  { slug: 'ben-wallace-and-chauncey-billups', a: 'Ben Wallace', b: 'Chauncey Billups' },
];

import { slugifyName } from './compareMatchups';

// Canonical open-duo slug: the two name-slugs sorted, joined with -and-.
export function buildDuoSlug(a: string, b: string): string {
  return [slugifyName(a), slugifyName(b)].sort().join('-and-');
}

export function parseDuoSlug(slug: string): { a: string; b: string } | null {
  const parts = slug.split('-and-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { a: parts[0].replace(/-/g, ' '), b: parts[1].replace(/-/g, ' ') };
}

export function findDuoSlugForPair(a: string, b: string): string | null {
  const d = DUO_PAGES.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  return d ? d.slug : null;
}

// Best URL for a duo pair: curated slug if one exists, else canonical open slug.
export function duoHref(a: string, b: string): string {
  return findDuoSlugForPair(a, b) ?? buildDuoSlug(a, b);
}

export function findDuo(slug: string): { duo: DuoPage; reversed: boolean } | null {
  const exact = DUO_PAGES.find((d) => d.slug === slug);
  if (exact) return { duo: exact, reversed: false };
  const parts = slug.split('-and-');
  if (parts.length === 2) {
    const flipped = `${parts[1]}-and-${parts[0]}`;
    const rev = DUO_PAGES.find((d) => d.slug === flipped);
    if (rev) return { duo: rev, reversed: true };
  }
  return null;
}

export function relatedDuos(duo: DuoPage, count = 4): DuoPage[] {
  const sharesPlayer = (d: DuoPage) =>
    d.a === duo.a || d.b === duo.a || d.a === duo.b || d.b === duo.b;
  const related = DUO_PAGES.filter((d) => d.slug !== duo.slug && sharesPlayer(d));
  const rest = DUO_PAGES.filter((d) => d.slug !== duo.slug && !sharesPlayer(d));
  return [...related, ...rest].slice(0, count);
}
