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
  { slug: 'stephen-curry-vs-kevin-durant', a: 'Stephen Curry', b: 'Kevin Durant' },
  { slug: 'shaquille-oneal-vs-hakeem-olajuwon', a: "Shaquille O'Neal", b: 'Hakeem Olajuwon' },
  { slug: 'dwight-howard-vs-shaquille-oneal', a: 'Dwight Howard', b: "Shaquille O'Neal" },
  { slug: 'shaquille-oneal-vs-tim-duncan', a: "Shaquille O'Neal", b: 'Tim Duncan' },
  { slug: 'kevin-durant-vs-dirk-nowitzki', a: 'Kevin Durant', b: 'Dirk Nowitzki' },
  { slug: 'kevin-durant-vs-lebron-james', a: 'Kevin Durant', b: 'LeBron James' },
  { slug: 'kevin-durant-vs-kawhi-leonard', a: 'Kevin Durant', b: 'Kawhi Leonard' },
  { slug: 'kevin-durant-vs-giannis-antetokounmpo', a: 'Kevin Durant', b: 'Giannis Antetokounmpo' },
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
  { slug: 'giannis-antetokounmpo-vs-nikola-jokic', a: 'Giannis Antetokounmpo', b: 'Nikola Jokic' },
  { slug: 'chris-paul-vs-john-stockton', a: 'Chris Paul', b: 'John Stockton' },
  { slug: 'nikola-jokic-vs-joel-embiid', a: 'Nikola Jokic', b: 'Joel Embiid' },
  { slug: 'nikola-jokic-vs-shaquille-oneal', a: 'Nikola Jokic', b: "Shaquille O'Neal" },
  { slug: 'luka-doncic-vs-nikola-jokic', a: 'Luka Doncic', b: 'Nikola Jokic' },
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
  { slug: 'shai-gilgeous-alexander-vs-luka-doncic', a: 'Shai Gilgeous-Alexander', b: 'Luka Doncic' },
  { slug: 'shai-gilgeous-alexander-vs-anthony-edwards', a: 'Shai Gilgeous-Alexander', b: 'Anthony Edwards' },
  { slug: 'shai-gilgeous-alexander-vs-stephen-curry', a: 'Shai Gilgeous-Alexander', b: 'Stephen Curry' },
  { slug: 'shai-gilgeous-alexander-vs-kobe-bryant', a: 'Shai Gilgeous-Alexander', b: 'Kobe Bryant' },
  { slug: 'victor-wembanyama-vs-chet-holmgren', a: 'Victor Wembanyama', b: 'Chet Holmgren' },
  { slug: 'victor-wembanyama-vs-tim-duncan', a: 'Victor Wembanyama', b: 'Tim Duncan' },
  { slug: 'victor-wembanyama-vs-hakeem-olajuwon', a: 'Victor Wembanyama', b: 'Hakeem Olajuwon' },
  { slug: 'victor-wembanyama-vs-anthony-davis', a: 'Victor Wembanyama', b: 'Anthony Davis' },
  { slug: 'victor-wembanyama-vs-kevin-durant', a: 'Victor Wembanyama', b: 'Kevin Durant' },
  { slug: 'cooper-flagg-vs-victor-wembanyama', a: 'Cooper Flagg', b: 'Victor Wembanyama' },
  { slug: 'cooper-flagg-vs-lebron-james', a: 'Cooper Flagg', b: 'LeBron James' },
  { slug: 'anthony-edwards-vs-michael-jordan', a: 'Anthony Edwards', b: 'Michael Jordan' },
  { slug: 'anthony-edwards-vs-kobe-bryant', a: 'Anthony Edwards', b: 'Kobe Bryant' },
  { slug: 'anthony-davis-vs-kevin-garnett', a: 'Anthony Davis', b: 'Kevin Garnett' },
  { slug: 'anthony-davis-vs-tim-duncan', a: 'Anthony Davis', b: 'Tim Duncan' },
  { slug: 'dwight-howard-vs-anthony-davis', a: 'Dwight Howard', b: 'Anthony Davis' },
  { slug: 'joel-embiid-vs-shaquille-oneal', a: 'Joel Embiid', b: "Shaquille O'Neal" },
  { slug: 'joel-embiid-vs-hakeem-olajuwon', a: 'Joel Embiid', b: 'Hakeem Olajuwon' },
  { slug: 'nikola-jokic-vs-larry-bird', a: 'Nikola Jokic', b: 'Larry Bird' },
  { slug: 'nikola-jokic-vs-magic-johnson', a: 'Nikola Jokic', b: 'Magic Johnson' },
  { slug: 'nikola-jokic-vs-tim-duncan', a: 'Nikola Jokic', b: 'Tim Duncan' },
  { slug: 'giannis-antetokounmpo-vs-shaquille-oneal', a: 'Giannis Antetokounmpo', b: "Shaquille O'Neal" },
  { slug: 'giannis-antetokounmpo-vs-kevin-garnett', a: 'Giannis Antetokounmpo', b: 'Kevin Garnett' },
  { slug: 'zion-williamson-vs-giannis-antetokounmpo', a: 'Zion Williamson', b: 'Giannis Antetokounmpo' },
  { slug: 'zion-williamson-vs-charles-barkley', a: 'Zion Williamson', b: 'Charles Barkley' },
  { slug: 'luka-doncic-vs-lebron-james', a: 'Luka Doncic', b: 'LeBron James' },
  { slug: 'luka-doncic-vs-stephen-curry', a: 'Luka Doncic', b: 'Stephen Curry' },
  { slug: 'luka-doncic-vs-kobe-bryant', a: 'Luka Doncic', b: 'Kobe Bryant' },
  { slug: 'jayson-tatum-vs-kevin-durant', a: 'Jayson Tatum', b: 'Kevin Durant' },
  { slug: 'jayson-tatum-vs-jaylen-brown', a: 'Jayson Tatum', b: 'Jaylen Brown' },
  { slug: 'jayson-tatum-vs-kobe-bryant', a: 'Jayson Tatum', b: 'Kobe Bryant' },
  { slug: 'jayson-tatum-vs-lebron-james', a: 'Jayson Tatum', b: 'LeBron James' },
  { slug: 'paolo-banchero-vs-carmelo-anthony', a: 'Paolo Banchero', b: 'Carmelo Anthony' },
  { slug: 'paolo-banchero-vs-jayson-tatum', a: 'Paolo Banchero', b: 'Jayson Tatum' },
  { slug: 'cade-cunningham-vs-luka-doncic', a: 'Cade Cunningham', b: 'Luka Doncic' },
  { slug: 'chet-holmgren-vs-kevin-durant', a: 'Chet Holmgren', b: 'Kevin Durant' },
  { slug: 'alperen-sengun-vs-nikola-jokic', a: 'Alperen Sengun', b: 'Nikola Jokic' },
  { slug: 'evan-mobley-vs-anthony-davis', a: 'Evan Mobley', b: 'Anthony Davis' },
  { slug: 'lamelo-ball-vs-ja-morant', a: 'LaMelo Ball', b: 'Ja Morant' },
  { slug: 'karl-anthony-towns-vs-anthony-davis', a: 'Karl-Anthony Towns', b: 'Anthony Davis' },
  { slug: 'karl-anthony-towns-vs-dirk-nowitzki', a: 'Karl-Anthony Towns', b: 'Dirk Nowitzki' },
  { slug: 'bam-adebayo-vs-draymond-green', a: 'Bam Adebayo', b: 'Draymond Green' },
  { slug: 'domantas-sabonis-vs-nikola-jokic', a: 'Domantas Sabonis', b: 'Nikola Jokic' },
  { slug: 'tyrese-haliburton-vs-chris-paul', a: 'Tyrese Haliburton', b: 'Chris Paul' },
  { slug: 'tyrese-haliburton-vs-trae-young', a: 'Tyrese Haliburton', b: 'Trae Young' },
  { slug: 'trae-young-vs-stephen-curry', a: 'Trae Young', b: 'Stephen Curry' },
  { slug: 'trae-young-vs-steve-nash', a: 'Trae Young', b: 'Steve Nash' },
  { slug: 'trae-young-vs-damian-lillard', a: 'Trae Young', b: 'Damian Lillard' },
  { slug: 'ja-morant-vs-russell-westbrook', a: 'Ja Morant', b: 'Russell Westbrook' },
  { slug: 'deaaron-fox-vs-ja-morant', a: "De'Aaron Fox", b: 'Ja Morant' },
  { slug: 'devin-booker-vs-donovan-mitchell', a: 'Devin Booker', b: 'Donovan Mitchell' },
  { slug: 'donovan-mitchell-vs-dwyane-wade', a: 'Donovan Mitchell', b: 'Dwyane Wade' },
  { slug: 'donovan-mitchell-vs-damian-lillard', a: 'Donovan Mitchell', b: 'Damian Lillard' },
  { slug: 'jalen-brunson-vs-chris-paul', a: 'Jalen Brunson', b: 'Chris Paul' },
  { slug: 'jalen-brunson-vs-stephen-curry', a: 'Jalen Brunson', b: 'Stephen Curry' },
  { slug: 'tyrese-maxey-vs-damian-lillard', a: 'Tyrese Maxey', b: 'Damian Lillard' },
  { slug: 'jamal-murray-vs-kyrie-irving', a: 'Jamal Murray', b: 'Kyrie Irving' },
  { slug: 'jaylen-brown-vs-paul-george', a: 'Jaylen Brown', b: 'Paul George' },
  { slug: 'jimmy-butler-vs-paul-george', a: 'Jimmy Butler', b: 'Paul George' },
  { slug: 'paul-george-vs-kawhi-leonard', a: 'Paul George', b: 'Kawhi Leonard' },
  { slug: 'paul-george-vs-tracy-mcgrady', a: 'Paul George', b: 'Tracy McGrady' },
  { slug: 'demar-derozan-vs-kobe-bryant', a: 'DeMar DeRozan', b: 'Kobe Bryant' },
  { slug: 'demar-derozan-vs-dwyane-wade', a: 'DeMar DeRozan', b: 'Dwyane Wade' },
  { slug: 'demar-derozan-vs-vince-carter', a: 'DeMar DeRozan', b: 'Vince Carter' },
  { slug: 'zach-lavine-vs-vince-carter', a: 'Zach LaVine', b: 'Vince Carter' },
  { slug: 'bradley-beal-vs-klay-thompson', a: 'Bradley Beal', b: 'Klay Thompson' },
  { slug: 'john-wall-vs-derrick-rose', a: 'John Wall', b: 'Derrick Rose' },
  { slug: 'kyrie-irving-vs-stephen-curry', a: 'Kyrie Irving', b: 'Stephen Curry' },
  { slug: 'kyrie-irving-vs-kobe-bryant', a: 'Kyrie Irving', b: 'Kobe Bryant' },
  { slug: 'russell-westbrook-vs-derrick-rose', a: 'Russell Westbrook', b: 'Derrick Rose' },
  { slug: 'russell-westbrook-vs-jason-kidd', a: 'Russell Westbrook', b: 'Jason Kidd' },
  { slug: 'damian-lillard-vs-russell-westbrook', a: 'Damian Lillard', b: 'Russell Westbrook' },
  { slug: 'james-harden-vs-kobe-bryant', a: 'James Harden', b: 'Kobe Bryant' },
  { slug: 'james-harden-vs-allen-iverson', a: 'James Harden', b: 'Allen Iverson' },
  { slug: 'allen-iverson-vs-stephen-curry', a: 'Allen Iverson', b: 'Stephen Curry' },
  { slug: 'allen-iverson-vs-russell-westbrook', a: 'Allen Iverson', b: 'Russell Westbrook' },
  { slug: 'allen-iverson-vs-isiah-thomas', a: 'Allen Iverson', b: 'Isiah Thomas' },
  { slug: 'dwyane-wade-vs-kobe-bryant', a: 'Dwyane Wade', b: 'Kobe Bryant' },
  { slug: 'vince-carter-vs-kobe-bryant', a: 'Vince Carter', b: 'Kobe Bryant' },
  { slug: 'tracy-mcgrady-vs-kobe-bryant', a: 'Tracy McGrady', b: 'Kobe Bryant' },
  { slug: 'tracy-mcgrady-vs-kevin-durant', a: 'Tracy McGrady', b: 'Kevin Durant' },
  { slug: 'carmelo-anthony-vs-kevin-durant', a: 'Carmelo Anthony', b: 'Kevin Durant' },
  { slug: 'carmelo-anthony-vs-lebron-james', a: 'Carmelo Anthony', b: 'LeBron James' },
  { slug: 'stephen-curry-vs-ray-allen', a: 'Stephen Curry', b: 'Ray Allen' },
  { slug: 'ray-allen-vs-reggie-miller', a: 'Ray Allen', b: 'Reggie Miller' },
  { slug: 'ray-allen-vs-klay-thompson', a: 'Ray Allen', b: 'Klay Thompson' },
  { slug: 'paul-pierce-vs-ray-allen', a: 'Paul Pierce', b: 'Ray Allen' },
  { slug: 'steve-nash-vs-john-stockton', a: 'Steve Nash', b: 'John Stockton' },
  { slug: 'jason-kidd-vs-john-stockton', a: 'Jason Kidd', b: 'John Stockton' },
  { slug: 'jason-kidd-vs-chris-paul', a: 'Jason Kidd', b: 'Chris Paul' },
  { slug: 'jason-kidd-vs-steve-nash', a: 'Jason Kidd', b: 'Steve Nash' },
  { slug: 'gary-payton-vs-john-stockton', a: 'Gary Payton', b: 'John Stockton' },
  { slug: 'gary-payton-vs-isiah-thomas', a: 'Gary Payton', b: 'Isiah Thomas' },
  { slug: 'isiah-thomas-vs-chris-paul', a: 'Isiah Thomas', b: 'Chris Paul' },
  { slug: 'rajon-rondo-vs-chris-paul', a: 'Rajon Rondo', b: 'Chris Paul' },
  { slug: 'rajon-rondo-vs-jason-kidd', a: 'Rajon Rondo', b: 'Jason Kidd' },
  { slug: 'tony-parker-vs-steve-nash', a: 'Tony Parker', b: 'Steve Nash' },
  { slug: 'manu-ginobili-vs-dwyane-wade', a: 'Manu Ginobili', b: 'Dwyane Wade' },
  { slug: 'grant-hill-vs-scottie-pippen', a: 'Grant Hill', b: 'Scottie Pippen' },
  { slug: 'penny-hardaway-vs-grant-hill', a: 'Anfernee Hardaway', b: 'Grant Hill' },
  { slug: 'dominique-wilkins-vs-clyde-drexler', a: 'Dominique Wilkins', b: 'Clyde Drexler' },
  { slug: 'clyde-drexler-vs-michael-jordan', a: 'Clyde Drexler', b: 'Michael Jordan' },
  { slug: 'hakeem-olajuwon-vs-david-robinson', a: 'Hakeem Olajuwon', b: 'David Robinson' },
  { slug: 'hakeem-olajuwon-vs-patrick-ewing', a: 'Hakeem Olajuwon', b: 'Patrick Ewing' },
  { slug: 'david-robinson-vs-shaquille-oneal', a: 'David Robinson', b: "Shaquille O'Neal" },
  { slug: 'dwight-howard-vs-patrick-ewing', a: 'Dwight Howard', b: 'Patrick Ewing' },
  { slug: 'yao-ming-vs-shaquille-oneal', a: 'Yao Ming', b: "Shaquille O'Neal" },
  { slug: 'dikembe-mutombo-vs-hakeem-olajuwon', a: 'Dikembe Mutombo', b: 'Hakeem Olajuwon' },
  { slug: 'ben-wallace-vs-dikembe-mutombo', a: 'Ben Wallace', b: 'Dikembe Mutombo' },
  { slug: 'dennis-rodman-vs-draymond-green', a: 'Dennis Rodman', b: 'Draymond Green' },
  { slug: 'dennis-rodman-vs-ben-wallace', a: 'Dennis Rodman', b: 'Ben Wallace' },
  { slug: 'draymond-green-vs-scottie-pippen', a: 'Draymond Green', b: 'Scottie Pippen' },
  { slug: 'shawn-kemp-vs-charles-barkley', a: 'Shawn Kemp', b: 'Charles Barkley' },
  { slug: 'amare-stoudemire-vs-shawn-kemp', a: "Amar'e Stoudemire", b: 'Shawn Kemp' },
  { slug: 'blake-griffin-vs-amare-stoudemire', a: 'Blake Griffin', b: "Amar'e Stoudemire" },
  { slug: 'pau-gasol-vs-dirk-nowitzki', a: 'Pau Gasol', b: 'Dirk Nowitzki' },
  { slug: 'chris-webber-vs-kevin-garnett', a: 'Chris Webber', b: 'Kevin Garnett' },
  { slug: 'chris-bosh-vs-kevin-love', a: 'Chris Bosh', b: 'Kevin Love' },
  { slug: 'kevin-garnett-vs-dirk-nowitzki', a: 'Kevin Garnett', b: 'Dirk Nowitzki' },
  { slug: 'lamarcus-aldridge-vs-tim-duncan', a: 'LaMarcus Aldridge', b: 'Tim Duncan' },
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
