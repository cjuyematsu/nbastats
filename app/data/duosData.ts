// app/data/duosData.ts
//
// Verified duo stats for the "Greatest Duos in NBA History" article.
// Source: teammates table / data/PlayerStatistics.csv via scripts/refresh-teammates.ts.
// Regular season + playoffs only (preseason, All-Star, Play-In, and NBA Cup finals
// excluded). Combined PPG counts games where both players logged minutes.

export interface RankedDuo {
  rank: number;
  a: string;
  b: string;
  short: string;
  games: number;
  wins: number;
  losses: number;
  winPct: number;
  titles: number;
  combinedPpg: number;
  combinedApg: number;
  combinedRpg: number;
  years: string;
  team: string;
}

export const rankedDuos: RankedDuo[] = [
  { rank: 1, a: 'Michael Jordan', b: 'Scottie Pippen', short: 'Jordan & Pippen', games: 862, wins: 633, losses: 229, winPct: 73.4, titles: 6, combinedPpg: 49.1, combinedApg: 10.9, combinedRpg: 13.1, years: '1988-1998', team: 'Bulls' },
  { rank: 2, a: 'Magic Johnson', b: 'Kareem Abdul-Jabbar', short: 'Magic & Kareem', games: 842, wins: 616, losses: 226, winPct: 73.2, titles: 5, combinedPpg: 39.7, combinedApg: 14.2, combinedRpg: 14.9, years: '1980-1989', team: 'Lakers' },
  { rank: 3, a: "Shaquille O'Neal", b: 'Kobe Bryant', short: 'Shaq & Kobe', games: 668, wins: 471, losses: 197, winPct: 70.5, titles: 3, combinedPpg: 49.1, combinedApg: 7.5, combinedRpg: 17.2, years: '1997-2004', team: 'Lakers' },
  { rank: 4, a: 'Stephen Curry', b: 'Klay Thompson', short: 'Curry & Klay', games: 847, wins: 586, losses: 261, winPct: 69.2, titles: 4, combinedPpg: 45.0, combinedApg: 8.9, combinedRpg: 8.5, years: '2012-2024', team: 'Warriors' },
  { rank: 5, a: 'Sam Jones', b: 'Bill Russell', short: 'Russell & S. Jones', games: 999, wins: 717, losses: 282, winPct: 71.8, titles: 10, combinedPpg: 33.0, combinedApg: 6.6, combinedRpg: 28.0, years: '1958-1969', team: 'Celtics' },
  { rank: 6, a: 'John Stockton', b: 'Karl Malone', short: 'Stockton & Malone', games: 1590, wins: 995, losses: 595, winPct: 62.6, titles: 0, combinedPpg: 39.0, combinedApg: 14.3, combinedRpg: 13.1, years: '1986-2003', team: 'Jazz' },
  { rank: 7, a: 'Tim Duncan', b: 'Tony Parker', short: 'Duncan & Parker', games: 1274, wins: 893, losses: 381, winPct: 70.1, titles: 4, combinedPpg: 35.4, combinedApg: 8.8, combinedRpg: 13.6, years: '2002-2016', team: 'Spurs' },
  { rank: 8, a: 'Larry Bird', b: 'Kevin McHale', short: 'Bird & McHale', games: 908, wins: 647, losses: 261, winPct: 71.3, titles: 3, combinedPpg: 42.6, combinedApg: 8.3, combinedRpg: 17.3, years: '1981-1992', team: 'Celtics' },
  { rank: 9, a: 'LeBron James', b: 'Dwyane Wade', short: 'LeBron & Wade', games: 397, wins: 276, losses: 121, winPct: 69.5, titles: 2, combinedPpg: 46.9, combinedApg: 11.2, combinedRpg: 13.0, years: '2011-2018', team: 'Heat, Cavaliers' },
  { rank: 10, a: 'Kareem Abdul-Jabbar', b: 'Oscar Robertson', short: 'Kareem & Oscar', games: 328, wins: 242, losses: 86, winPct: 73.8, titles: 1, combinedPpg: 45.9, combinedApg: 11.8, combinedRpg: 20.7, years: '1971-1974', team: 'Bucks' },
  { rank: 11, a: 'Jerry West', b: 'Elgin Baylor', short: 'West & Baylor', games: 703, wins: 426, losses: 277, winPct: 60.6, titles: 0, combinedPpg: 53.1, combinedApg: 9.5, combinedRpg: 17.8, years: '1961-1972', team: 'Lakers' },
  { rank: 12, a: 'Kobe Bryant', b: 'Pau Gasol', short: 'Kobe & Gasol', games: 492, wins: 327, losses: 165, winPct: 66.5, titles: 2, combinedPpg: 44.5, combinedApg: 8.6, combinedRpg: 15.2, years: '2008-2014', team: 'Lakers' },
  { rank: 13, a: 'Kevin Durant', b: 'Russell Westbrook', short: 'Durant & Westbrook', games: 615, wins: 380, losses: 235, winPct: 61.8, titles: 0, combinedPpg: 49.4, combinedApg: 11.2, combinedRpg: 13.0, years: '2009-2016', team: 'Thunder' },
  { rank: 14, a: 'Kevin Durant', b: 'Stephen Curry', short: 'Durant & Curry', games: 213, wins: 167, losses: 46, winPct: 78.4, titles: 2, combinedPpg: 52.0, combinedApg: 11.1, combinedRpg: 12.0, years: '2017-2019', team: 'Warriors' },
  { rank: 15, a: 'Nikola Jokic', b: 'Jamal Murray', short: 'Jokic & Murray', games: 656, wins: 410, losses: 246, winPct: 62.5, titles: 1, combinedPpg: 42.5, combinedApg: 13.0, combinedRpg: 15.4, years: '2017-2026', team: 'Nuggets' },
];

export interface LeaderboardEntry {
  short: string;
  value: number;
  detail: string;
}

export const mostGamesTogether: LeaderboardEntry[] = [
  { short: 'Stockton & Malone', value: 1590, detail: '995-595, Jazz' },
  { short: 'Duncan & Parker', value: 1274, detail: '893-381, Spurs' },
  { short: 'Ginobili & Parker', value: 1219, detail: '854-365, Spurs' },
  { short: 'Parish & McHale', value: 1106, detail: '754-352, Celtics' },
  { short: 'Duncan & Ginobili', value: 1102, detail: '783-319, Spurs' },
  { short: 'Fisher & Kobe', value: 1087, detail: '754-333, Lakers' },
  { short: 'Wade & Haslem', value: 1072, detail: '624-448, Heat' },
  { short: 'Curry & Draymond', value: 1009, detail: '687-322, Warriors' },
];

export const highestCombinedPpg: LeaderboardEntry[] = [
  { short: 'West & Baylor', value: 53.1, detail: 'Lakers, 1961-1972' },
  { short: 'Wilt & Rodgers', value: 52.6, detail: 'Warriors, 1960-1965' },
  { short: 'Attles & Wilt', value: 50.6, detail: 'Warriors, 1961-1965' },
  { short: 'Dantley & Griffith', value: 50.0, detail: 'Jazz, 1981-1985' },
  { short: 'LeBron & Davis', value: 50.0, detail: 'Lakers, 2020-2025' },
  { short: 'Durant & Westbrook', value: 49.4, detail: 'Thunder, 2009-2016' },
  { short: 'Jordan & Pippen', value: 49.1, detail: 'Bulls, 1988-1998' },
  { short: 'Shaq & Kobe', value: 49.1, detail: 'Lakers, 1997-2004' },
];

export interface CurrentDuo {
  a: string;
  b: string;
  short: string;
  games: number;
  wins: number;
  losses: number;
  winPct: number;
  note: string;
}

export const currentDuos: CurrentDuo[] = [
  { a: 'Jalen Brunson', b: 'Karl-Anthony Towns', short: 'Brunson & Towns', games: 172, wins: 115, losses: 57, winPct: 66.9, note: '2026 champions' },
  { a: 'Victor Wembanyama', b: 'Dylan Harper', short: 'Wembanyama & Harper', games: 77, wins: 56, losses: 21, winPct: 72.7, note: '2026 Finals' },
  { a: 'Shai Gilgeous-Alexander', b: 'Jalen Williams', short: 'SGA & J. Williams', games: 273, wins: 185, losses: 88, winPct: 67.8, note: '2025 champions' },
  { a: 'Nikola Jokic', b: 'Jamal Murray', short: 'Jokic & Murray', games: 656, wins: 410, losses: 246, winPct: 62.5, note: '2023 champions' },
];
