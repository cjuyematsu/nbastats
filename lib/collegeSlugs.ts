// lib/collegeSlugs.ts
//
// Pure school-name plumbing for the /colleges pages. The draft table's
// School/Club Team column is free text with alias duplicates (Miami (Florida)
// vs Miami (FL)), renamed schools (Memphis State), and sponsor-renamed
// international clubs (all the Mega variants). Canonicalize before slugging so
// each school gets exactly one page. Values not listed default to 'college',
// which is the common case for new draft classes.

export const ALIASES: Record<string, string> = {
  'Florida St.': 'Florida State',
  'Iowa St.': 'Iowa State',
  'Michigan St.': 'Michigan State',
  'Mississippi St.': 'Mississippi State',
  'Ohio St.': 'Ohio State',
  'Oregon St.': 'Oregon State',
  'Weber St.': 'Weber State',
  'Norfolk St.': 'Norfolk State',
  'Loyola (Illinois)': 'Loyola (IL)',
  'Miami (Florida)': 'Miami (FL)',
  'Miami (Ohio)': 'Miami (OH)',
  'Miami': 'Miami (FL)',
  'Ole Miss': 'Mississippi',
  'North Carolina State': 'NC State',
  'NC Central': 'North Carolina Central',
  'UNC-Charlotte': 'UNC Charlotte',
  'Charlotte': 'UNC Charlotte',
  'UNC-Wilmington': 'UNC Wilmington',
  'Louisiana–Lafayette': 'Louisiana-Lafayette',
  'Wisconsin–Green Bay': 'Green Bay',
  'Wisconsin–Stevens Point': 'Wisconsin-Stevens Point',
  'Gardner–Webb': 'Gardner-Webb',
  'LeMoyne–Owen': 'LeMoyne-Owen',
  'St. Vincent–St. Mary HS': 'St. Vincent-St. Mary HS',
  'UConn': 'Connecticut',
  'Brigham Young': 'BYU',
  'Louisiana State': 'LSU',
  'Virginia Commonwealth': 'VCU',
  'UMass': 'Massachusetts',
  'Memphis State': 'Memphis',
  'Texas-El Paso': 'UTEP',
  'Texas Western': 'UTEP',
  'Grambling State': 'Grambling',
  'North Texas State': 'North Texas',
  'St. Joseph’s': "Saint Joseph's",
  "Saint Mary's": "Saint Mary's (CA)",
  'Alcorn A&M': 'Alcorn State',
  'Xavier (OH)': 'Xavier',
  'Penn': 'Pennsylvania',
  'Central Florida': 'UCF',
  'Barton CC': 'Barton County CC',
  'Zalgiris': 'Žalgiris Kaunas',
  'Žalgiris': 'Žalgiris Kaunas',
  'Olympiakos': 'Olympiacos',
  'FC Barcelona Lassa': 'FC Barcelona',
  'Lietuvos rytas Vilnius': 'Lietuvos Rytas',
  'Rytas Vilnius': 'Lietuvos Rytas',
  'Efes Pilsen': 'Anadolu Efes',
  'Partizan': 'Partizan Belgrade',
  'KK Partizan': 'Partizan Belgrade',
  'KK Cibona': 'Cibona Zagreb',
  'KK Crvena zvezda': 'Red Star Belgrade',
  'Crvena zvezda': 'Red Star Belgrade',
  'KK Mega Basket': 'Mega Basket',
  'Mega Bemax': 'Mega Basket',
  'Mega Ishrana': 'Mega Basket',
  'Mega Leks': 'Mega Basket',
  'Mega Mozzart': 'Mega Basket',
  'Mega Soccerbet': 'Mega Basket',
  'Mega Vizura': 'Mega Basket',
  'Cholet': 'Cholet Basket',
  'Adecco Estudiantes': 'Estudiantes',
  'Movistar Estudiantes': 'Estudiantes',
  'CB Gran Canaria': 'Gran Canaria',
  'Herbalife Gran Canaria': 'Gran Canaria',
  'Limoges': 'Limoges CSP',
  'Le Havre': 'STB Le Havre',
  'Pau-Lacq-Orthez': 'Pau-Orthez',
  'Fenerbahçe Ülker': 'Fenerbahçe',
  'Olimpia (Stefanel) Milano': 'Olimpia Milano',
  'Split': 'KK Split',
  'Smelt Olimpija': 'Olimpija Ljubljana',
  'Union Olimpija': 'Olimpija Ljubljana',
  'Le Mans': 'Le Mans Sarthe Basket',
  'Le Mans Sarthe': 'Le Mans Sarthe Basket',
  'ASVEL Basket': 'ASVEL Villeurbanne',
  'ASVEL Lyon-Villeurbanne': 'ASVEL Villeurbanne',
  'Poitiers Basket': 'Poitiers Basket 86',
};

// Non-college, non-HS entries (international clubs, pro/G League teams,
// national programs, and territorial-pick hometowns). Keyed by CANONICAL name.
const CLUB_OR_OTHER = new Set([
  'Adelaide 36ers', 'AEK', 'Akasvayu Girona', 'Al Rayyan', 'Alba Berlin', 'Albacomp',
  'Allentown Jets', 'Anadolu Efes', 'Angelico Biella', 'APR BBC', 'ASA BH Telecom',
  'ASC Denain-Voltaire', 'ASVEL Villeurbanne', 'Atletas Kaunas', 'Australian Institute of Sport',
  'Bakersfield Jam', 'Baloncesto Sevilla', 'Banca Cívica Sevilla', 'Banvit', 'Bauru Tilibra',
  'Bayern Munich', 'Bayi Rockets', 'BC Kyiv', 'Beijing Olympians', 'Benetton Treviso',
  'Benston Zagreb', 'Beşiktaş', 'BK Ventspils', 'Braunschweig', 'Breil Milano',
  'Brill Cagliari', 'Brisbane', 'Brose Baskets', 'Brotnjo', 'Budućnost Podgorica', 'Caguas',
  'Cairns Taipans', 'Camden Bullets', 'Casademont Zaragoza', 'CB Murcia', 'CB Prat',
  'Cedevita Olimpija', 'Cedevita Zagreb', 'Chorale Roanne', 'Cholet Basket', 'Cibona Zagreb',
  'Cincinnati Stuff', 'City Reapers', 'Cleveland Pipers', 'Climamio Bologna', 'Clinicas Rincón',
  'Complutense University of Madrid', 'CSKA Moscow', 'Delaware 87ers', 'Denver Rockets', 'Dijon',
  'DJK Würzburg', 'DKV Joventut', 'Dnipro', 'Dynamo St. Petersburg', 'EC Pinheiros',
  'Élan Chalon', 'Estudiantes', 'Estudiantes de Bahía', 'FC Barcelona', 'Fenerbahçe',
  'Filathlitikos', 'FMP', 'FMP Železnik', 'Fortitudo Bologna', 'Forum Valladolid',
  'Frankfurt Skyliners', 'Fuenlabrada', 'Fujian Sturgeons', 'Galatasaray', 'Gipuzkoa Basket',
  'Gold Coast Blaze', 'Gran Canaria', 'Guangdong Southern Tigers', 'Halle', 'Hamby Rimini',
  'Hapoel Galil Elyon', 'Hapoel Holon', 'Hapoel Tel Aviv', 'Harlem Globetrotters',
  'Hemofarm Vršac', 'Hong Kong Flying Dragons', 'Hyères-Toulon', 'Idaho Stampede',
  'Illawarra Hawks', 'Indiana Pacers', 'Iraklis BC', 'JL Bourg', 'Joventut Badalona', 'Kalev',
  'Khimik Yuzhny', 'Kinder Bologna', 'KK Reflex', 'KK Split', 'KK Zagreb', "L'Hospitalet",
  'Langen', 'Le Mans Sarthe Basket', 'Lietuvos Rytas', 'Limoges CSP', 'Lottomatica Roma',
  'Maccabi Tel Aviv', 'Maroussi', 'Maurienne', 'MBC Mykolaiv', 'Mega Basket', 'Metis Varese',
  'Metropolitans 92', 'MHP Riesen Ludwigsburg', 'Minas', 'Nanterre 92', 'NBA G League Ignite',
  'Neptūnas Klaipėda', 'New York Nets', 'New Zealand Breakers', 'Newcastle Falcons',
  'Objetivo São Carlos', 'Olimpia Milano', 'Olimpija Ljubljana', 'Olympia Larissa',
  'Olympiacos', 'Opel Skyliners', 'Orlandina Basket', 'Ourense', 'Paf Bologna', 'Pamesa Valencia',
  'Panathinaikos', 'PAOK', 'Paris', 'Paris Basket Racing', 'Paris Basketball',
  'Paris-Levallois Basket', 'Partizan Belgrade', 'Pau-Orthez', 'PBC Lokomotiv Kuban', 'Peristeri',
  'Perth Wildcats', 'Phantoms Braunschweig', 'Philadelphia Tapers', 'Phillips',
  'Pınar Karşıyaka', 'Poitiers Basket 86', 'Qingdao', 'Ranger Varese',
  'Ratiopharm Ulm', 'Real Madrid', 'Red Star Belgrade', 'RheinEnergie Köln',
  'Rio Grande Valley Vipers', 'Roseto Basket', 'Rouen Métropole', 'Santa Cruz Warriors',
  'SE Melbourne Magic', 'Seattle SuperSonics', 'Sesi/Franca', 'Shanghai Sharks', 'SIG Strasbourg',
  'Simac Milano', 'Široki Brijeg', 'SK Cherkassy', 'Skha Jakutia Yakutsk (Russia)',
  'Skipper Bologna', 'Skonto', 'Snaidero Udine', 'South East Melbourne Phoenix',
  'Spirou Charleroi', 'STB Le Havre', 'Sydney Kings', 'Tapiolan Honka', 'TAU Cerámica',
  'Taugres', 'Texas Legends', 'Tokyo Apache', 'Townsville Crocodiles', 'Trento',
  'Triumph Lyubertsy', 'Tulsa 66ers', 'U.S. Armed Forces', 'Ülkerspor', 'Unicaja',
  'Unicaja Málaga', 'Union Bank Lagos', 'Utah Stars', 'Valencia', 'Valencia Basket',
  'Vanoli Cremona', 'Vasco da Gama', 'Verviers-Pepinster', 'Viola Reggio Calabria',
  'Virginia Squires', 'Virtus Bologna', 'WTC Cornellà', 'Würzburg',
  'Xinjiang Flying Tigers', 'Yonsei University', 'Žalgiris Kaunas',
  'Birmingham, Alabama', 'Columbia, South Carolina', 'Prentiss, Mississippi',
  'Simi Valley, California',
]);

export function canonicalSchool(raw: string): string {
  const trimmed = raw.trim();
  return ALIASES[trimmed] ?? trimmed;
}

export function schoolSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/['.’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type SchoolKind = 'college' | 'high-school' | 'club';

export function classifySchool(canonicalName: string): SchoolKind {
  if (CLUB_OR_OTHER.has(canonicalName)) return 'club';
  if (/(\bHS|High School|Academy|Prep|Prep\. School|School)$/.test(canonicalName)) return 'high-school';
  return 'college';
}
