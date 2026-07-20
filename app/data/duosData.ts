// app/data/duosData.ts
//
// Verified duo stats for the "Greatest Duos in NBA History" article.
// Source: teammates table / data/PlayerStatistics.csv via scripts/refresh-teammates.ts.
// Games are filtered by gameId prefix {2,4,5,6}: regular season, playoffs, Play-In, and
// NBA Cup finals count; preseason and All-Star do not. A shared game requires BOTH players
// to have actually appeared (didPlay), not merely to have been on the roster.
//
// These numbers must match the teammates table, which is what /duos renders. Regenerate
// this file after any `npm run refresh:teammates -- --apply`, or the article silently
// diverges from the duo tracker.
// Last regenerated 2026-07-19 (CSV current through the 2026 Finals).

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
  { rank: 1, a: 'Michael Jordan', b: 'Scottie Pippen', short: 'Jordan & Pippen', games: 859, wins: 631, losses: 228, winPct: 73.5, titles: 6, combinedPpg: 49.1, combinedApg: 10.9, combinedRpg: 13.1, years: '1988-1998', team: 'Bulls' },
  { rank: 2, a: 'Magic Johnson', b: 'Kareem Abdul-Jabbar', short: 'Magic & Kareem', games: 842, wins: 616, losses: 226, winPct: 73.2, titles: 5, combinedPpg: 39.7, combinedApg: 14.2, combinedRpg: 14.9, years: '1980-1989', team: 'Lakers' },
  { rank: 3, a: "Shaquille O'Neal", b: 'Kobe Bryant', short: 'Shaq & Kobe', games: 580, wins: 412, losses: 168, winPct: 71.0, titles: 3, combinedPpg: 49.0, combinedApg: 7.5, combinedRpg: 17.2, years: '1997-2004', team: 'Lakers' },
  { rank: 4, a: 'Stephen Curry', b: 'Klay Thompson', short: 'Curry & Klay', games: 812, wins: 571, losses: 241, winPct: 70.3, titles: 4, combinedPpg: 45.0, combinedApg: 8.8, combinedRpg: 8.5, years: '2012-2024', team: 'Warriors' },
  { rank: 5, a: 'Sam Jones', b: 'Bill Russell', short: 'Russell & S. Jones', games: 993, wins: 713, losses: 280, winPct: 71.8, titles: 10, combinedPpg: 33.2, combinedApg: 5.2, combinedRpg: 26.2, years: '1958-1969', team: 'Celtics' },
  { rank: 6, a: 'John Stockton', b: 'Karl Malone', short: 'Stockton & Malone', games: 1584, wins: 991, losses: 593, winPct: 62.6, titles: 0, combinedPpg: 39.0, combinedApg: 14.3, combinedRpg: 13.1, years: '1986-2003', team: 'Jazz' },
  { rank: 7, a: 'Tim Duncan', b: 'Tony Parker', short: 'Duncan & Parker', games: 1214, wins: 864, losses: 350, winPct: 71.2, titles: 4, combinedPpg: 35.4, combinedApg: 8.8, combinedRpg: 13.6, years: '2002-2016', team: 'Spurs' },
  { rank: 8, a: 'Larry Bird', b: 'Kevin McHale', short: 'Bird & McHale', games: 908, wins: 647, losses: 261, winPct: 71.3, titles: 3, combinedPpg: 42.6, combinedApg: 8.3, combinedRpg: 17.3, years: '1981-1992', team: 'Celtics' },
  { rank: 9, a: 'LeBron James', b: 'Dwyane Wade', short: 'LeBron & Wade', games: 371, wins: 258, losses: 113, winPct: 69.5, titles: 2, combinedPpg: 46.9, combinedApg: 11.2, combinedRpg: 13.0, years: '2011-2018', team: 'Heat, Cavaliers' },
  { rank: 10, a: 'Kareem Abdul-Jabbar', b: 'Oscar Robertson', short: 'Kareem & Oscar', games: 328, wins: 242, losses: 86, winPct: 73.8, titles: 1, combinedPpg: 46.2, combinedApg: 11.5, combinedRpg: 20.6, years: '1971-1974', team: 'Bucks' },
  { rank: 11, a: 'Jerry West', b: 'Elgin Baylor', short: 'West & Baylor', games: 703, wins: 426, losses: 277, winPct: 60.6, titles: 0, combinedPpg: 54.5, combinedApg: 7.7, combinedRpg: 17.4, years: '1961-1972', team: 'Lakers' },
  { rank: 12, a: 'Kobe Bryant', b: 'Pau Gasol', short: 'Kobe & Gasol', games: 446, wins: 301, losses: 145, winPct: 67.5, titles: 2, combinedPpg: 44.5, combinedApg: 8.6, combinedRpg: 15.2, years: '2008-2014', team: 'Lakers' },
  { rank: 13, a: 'Kevin Durant', b: 'Russell Westbrook', short: 'Durant & Westbrook', games: 608, wins: 378, losses: 230, winPct: 62.2, titles: 0, combinedPpg: 49.4, combinedApg: 11.2, combinedRpg: 13.0, years: '2009-2016', team: 'Thunder' },
  { rank: 14, a: 'Kevin Durant', b: 'Stephen Curry', short: 'Durant & Curry', games: 210, wins: 164, losses: 46, winPct: 78.1, titles: 2, combinedPpg: 52.0, combinedApg: 11.1, combinedRpg: 12.0, years: '2017-2019', team: 'Warriors' },
  { rank: 15, a: 'Nikola Jokic', b: 'Jamal Murray', short: 'Jokic & Murray', games: 651, wins: 408, losses: 243, winPct: 62.7, titles: 1, combinedPpg: 42.5, combinedApg: 13.0, combinedRpg: 15.4, years: '2017-2026', team: 'Nuggets' },
];

export interface LeaderboardEntry {
  short: string;
  value: number;
  detail: string;
}

export const mostGamesTogether: LeaderboardEntry[] = [
  { short: 'Stockton & Malone', value: 1584, detail: '991-593, Jazz' },
  { short: 'Duncan & Parker', value: 1214, detail: '864-350, Spurs' },
  { short: 'Ginobili & Parker', value: 1143, detail: '811-332, Spurs' },
  { short: 'Parish & McHale', value: 1106, detail: '754-352, Celtics' },
  { short: 'Duncan & Ginobili', value: 1055, detail: '756-299, Spurs' },
  { short: 'Fisher & Kobe', value: 1037, detail: '719-318, Lakers' },
  { short: 'Russell & S. Jones', value: 993, detail: '713-280, Celtics' },
  { short: 'Thomas & Laimbeer', value: 989, detail: '602-387, Pistons' },
];

export const highestCombinedPpg: LeaderboardEntry[] = [
  { short: 'West & Baylor', value: 54.5, detail: 'Lakers, 1961-1972' },
  { short: 'Wilt & Rodgers', value: 52.7, detail: 'Warriors, 1960-1965' },
  { short: 'Attles & Wilt', value: 51.3, detail: 'Warriors, 1961-1965' },
  { short: 'Wilt & Greer', value: 50.2, detail: '76ers, 1965-1968' },
  { short: 'Dantley & Griffith', value: 50.1, detail: 'Jazz, 1981-1985' },
  { short: 'LeBron & Davis', value: 50.0, detail: 'Lakers, 2020-2025' },
  { short: 'English & Vandeweghe', value: 49.6, detail: 'Nuggets, 1981-1984' },
  { short: 'Durant & Westbrook', value: 49.4, detail: 'Thunder, 2009-2016' },
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
  { a: 'Jalen Brunson', b: 'Karl-Anthony Towns', short: 'Brunson & Towns', games: 163, wins: 110, losses: 53, winPct: 67.5, note: '2026 champions' },
  { a: 'Victor Wembanyama', b: 'Dylan Harper', short: 'Wembanyama & Harper', games: 78, wins: 56, losses: 22, winPct: 71.8, note: '2026 Finals' },
  { a: 'Shai Gilgeous-Alexander', b: 'Jalen Williams', short: 'SGA & J. Williams', games: 269, wins: 181, losses: 88, winPct: 67.3, note: '2025 champions' },
  { a: 'Nikola Jokic', b: 'Jamal Murray', short: 'Jokic & Murray', games: 651, wins: 408, losses: 243, winPct: 62.7, note: '2023 champions' },
];
