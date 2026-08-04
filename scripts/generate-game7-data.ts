// scripts/generate-game7-data.ts
//
// Regenerates app/data/game7Data.ts: Game 7 and elimination-game performance
// from the game logs in data/PlayerStatistics.csv (no Supabase involved).
//
// Method:
// - Playoff games only: gameId prefix '4' (the gameType column is unreliable).
//   Play-In (prefix 5) and NBA Cup (6) are excluded on purpose.
// - A Game 7 is the SEVENTH GAME BY DATE of a reconstructed series, never the
//   seriesGameNumber column: that column is a float string ("7.0") with the
//   2026 first-round Game 1s carrying a literal "Game 1", and for at least one
//   series (1986 Bucks-76ers) the numbers are shuffled across games so the
//   labeled 7.0 is really Game 3. Games are renumbered by date within each
//   (season, team pair) series; the parsed column is kept as a cross-check
//   counter. The one blank-date game (40200237) is positioned by its label.
// - Postponed games repeat a gameId under two dates; only rows on the latest
//   date are real. One Game 7 (40200237, 2003 Kings-Mavs) has a blank date, so
//   the season falls back to gameId digits 1-2.
// - Appearances use the same rule as refresh-teammates: no DNP comment AND
//   positive box-score evidence (minutes alone erase the pre-1980 era).
// - Baseline (the matched-subgroup rule from CLAUDE.md): a player's Game 7
//   scoring is compared only against his OWN non-Game-7 playoff scoring in the
//   SAME postseason, weighted by that year's Game 7 exposure. diff is null when
//   covered years span < 75% of his Game 7s. A reconciliation assert checks the
//   group aggregate equals the weighted mean of per-player diffs.
// - Team scoring context compares Game 7s against games 1-6 OF THE SAME SERIES,
//   so era and pace cancel.
// - Elimination games: series are rebuilt per (season, team pair); winsNeeded =
//   the series winner's final win count, and a team faces elimination entering
//   game k when the opponent already has winsNeeded - 1. Works for best-of-3/5/7.
//   The 1954 round-robin games group under the same (season, pair) keys as any
//   later meeting, so their elimination flags are approximate; that touches a
//   handful of 1954 games, none of them Game 7s, and no leaderboard hinges on it.
// - Era caveats: points, rebounds, assists are complete in every era. Minutes
//   and shot attempts are NOT (pre-1980), so this dataset makes no efficiency
//   or per-minute claims at all.
//
// Hard asserts: 159 Game 7s with pinned per-decade counts, pinned box scores
// (LeBron 2016 Finals 27/11/11, Russell 1962 Finals 30/40, Curry 2016 WCF 36),
// every Game 7 flagged as an elimination game for both teams, reconciliation
// identity. Bump EXPECTED_* after a new season's CSV lands.
//
// Usage: npm run generate:game7

import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const CSV_PATH = resolve(process.cwd(), 'data/PlayerStatistics.csv');
const OUTPUT_PATH = resolve(process.cwd(), 'app/data/game7Data.ts');

const MIN_G7_GAMES = 4; // career PPG leaderboard
const RISER_MIN_G7 = 3; // riser/faller lists
const MIN_BASE_GAMES_PER_YEAR = 3; // non-G7 playoff games needed to set a season baseline
const BASE_COVERAGE = 0.75;
const MIN_ELIM_GAMES = 10;
const EXPECTED_G7_COUNT = 159;
const EXPECTED_G7_BY_DECADE: Record<number, number> = {
  1950: 6, 1960: 13, 1970: 23, 1980: 15, 1990: 18, 2000: 28, 2010: 31, 2020: 25,
};

const COL = {
  firstName: 0,
  lastName: 1,
  personId: 2,
  gameId: 3,
  gameDateTimeEst: 4,
  playerteamName: 6,
  opponentteamName: 8,
  gameLabel: 10,
  seriesGameNumber: 12,
  win: 13,
  home: 14,
  numMinutes: 15,
  points: 16,
  assists: 17,
  reboundsTotal: 31,
  comment: 37,
} as const;

const APPEARANCE_STAT_COLS = [16, 17, 18, 19, 20, 21, 23, 26, 31, 32, 33] as const;

function didPlay(f: string[]): boolean {
  const comment = (f[COL.comment] ?? '').trim();
  if (comment !== '') return false;
  if (Number(f[COL.numMinutes]) > 0) return true;
  return APPEARANCE_STAT_COLS.some((i) => Number(f[i]) > 0);
}

function splitCsvLine(line: string): string[] {
  if (!line.includes('"')) return line.split(',');
  const out: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

function seasonEndYear(dateStr: string): number {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  if (y === 2020 && m === 10) return 2020;
  return m >= 10 ? y + 1 : y;
}

// gameId digits 1-2 are the season start year: '15' -> 2015-16 -> 2016.
function gameIdSeason(gameId: string): number {
  const yy = Number(gameId.slice(1, 3));
  return yy >= 46 ? 1901 + yy : 2001 + yy;
}

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

// Era spellings of gameLabel vary ("East - Conf. Finals", "West Conf. Finals");
// normalize for display only, never used as a key.
function normalizeRound(label: string): string {
  const l = label.replace(/^(East|West)\s*-?\s*/i, '').trim();
  if (/nba finals|^finals$/i.test(label)) return 'NBA Finals';
  // semi checks must run first: "Semifinals" contains "finals"
  if (/conf.*semi/i.test(l)) return 'Conf. Semifinals';
  if (/conf.*final/i.test(l)) return 'Conf. Finals';
  if (/div.*semi/i.test(l)) return 'Division Semifinals';
  if (/div.*final/i.test(l)) return 'Division Finals';
  if (/first round|1st round/i.test(l)) return 'First Round';
  if (/semi/i.test(l)) return 'Semifinals';
  if (/quarter/i.test(l)) return 'Quarterfinals';
  if (/tiebreak/i.test(l)) return 'Tiebreaker';
  return l || 'Playoffs';
}

interface PlayerRow {
  id: number;
  name: string;
  pts: number;
  reb: number;
  ast: number;
  played: boolean;
  date: string;
}

interface TeamGame {
  gameId: string;
  team: string;
  opponent: string;
  rows: PlayerRow[];
  maxDate: string;
  winFlag: boolean;
  homeFlag: boolean;
  label: string;
  sgn: number | null;
  year: number;
}

interface Game {
  gameId: string;
  year: number;
  date: string;
  round: string;
  sgn: number | null;
  a: TeamGame;
  b: TeamGame;
  winner: TeamGame;
  loser: TeamGame;
  scoreA: number;
  scoreB: number;
  homeTeam: TeamGame | null;
  corruptScore: boolean;
  gameNo: number | null; // true position in the series by date order
}

let badSgnRows = 0;

async function readPlayoffTeamGames(): Promise<Map<string, TeamGame>> {
  const teamGames = new Map<string, TeamGame>();
  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let lineNo = 0;
  let skipped = 0;
  for await (const raw of rl) {
    lineNo++;
    if (lineNo === 1) continue;
    // cheap prefilter before the full split: gameId is the 4th field
    const f = splitCsvLine(raw);
    if (f.length < 36) {
      skipped++;
      continue;
    }
    const gameId = f[COL.gameId];
    if (gameId.charAt(0) !== '4') continue;
    const personId = Number(f[COL.personId]);
    const team = f[COL.playerteamName];
    if (!personId || !team) {
      skipped++;
      continue;
    }
    const date = f[COL.gameDateTimeEst].slice(0, 10);
    const key = `${gameId}|${team}`;
    let tg = teamGames.get(key);
    if (!tg) {
      tg = {
        gameId,
        team,
        opponent: f[COL.opponentteamName],
        rows: [],
        maxDate: date,
        winFlag: false,
        homeFlag: false,
        label: '',
        sgn: null,
        year: 0,
      };
      teamGames.set(key, tg);
    }
    if (date > tg.maxDate) tg.maxDate = date;
    if (!tg.label && f[COL.gameLabel]) tg.label = f[COL.gameLabel];
    if (!tg.opponent && f[COL.opponentteamName]) tg.opponent = f[COL.opponentteamName];
    if (tg.sgn === null) {
      const rawSgn = f[COL.seriesGameNumber];
      if (rawSgn !== '') {
        const n = Number(rawSgn);
        if (!Number.isNaN(n)) {
          tg.sgn = n;
        } else {
          // the 2026 first-round Game 1s carry the label "Game 1" here
          const m = /^Game (\d+)$/.exec(rawSgn.trim());
          if (m) tg.sgn = Number(m[1]);
          else badSgnRows++;
        }
      }
    }
    // sparse rows carry win=0 / home=0 even when true; any 1 wins
    if (f[COL.win] === '1') tg.winFlag = true;
    if (f[COL.home] === '1') tg.homeFlag = true;
    tg.rows.push({
      id: personId,
      name: `${f[COL.firstName]} ${f[COL.lastName]}`.trim(),
      pts: Number(f[COL.points]) || 0,
      reb: Number(f[COL.reboundsTotal]) || 0,
      ast: Number(f[COL.assists]) || 0,
      played: didPlay(f),
      date,
    });
  }
  console.log(`CSV: ${lineNo - 1} rows read, ${teamGames.size} playoff team-games, ${skipped} malformed rows skipped, ${badSgnRows} unparseable seriesGameNumber rows.`);
  return teamGames;
}

function buildGames(teamGames: Map<string, TeamGame>): Game[] {
  const byGame = new Map<string, TeamGame[]>();
  for (const tg of teamGames.values()) {
    tg.year = tg.maxDate ? seasonEndYear(tg.maxDate) : gameIdSeason(tg.gameId);
    const list = byGame.get(tg.gameId) ?? [];
    list.push(tg);
    byGame.set(tg.gameId, list);
  }
  const games: Game[] = [];
  const corrupt: string[] = [];
  let noHome = 0;
  for (const [gameId, list] of byGame) {
    assert(list.length === 2, `playoff game ${gameId} has ${list.length} team-games (expected 2)`);
    const [a, b] = list;
    const score = (tg: TeamGame) =>
      tg.rows.reduce((s, r) => (r.date === tg.maxDate && r.played ? s + r.pts : s), 0);
    const scoreA = score(a);
    const scoreB = score(b);
    // The win flag is more trustworthy than summed player rows: a handful of
    // pre-1988 games carry player stats from the wrong game while the flag
    // matches the historical result. Winner = the flagged team when exactly one
    // is flagged; box totals only break flag ties. Flag/score disagreements are
    // kept out of team-score averages.
    let winner: TeamGame;
    let corruptScore = false;
    if (a.winFlag !== b.winFlag) {
      winner = a.winFlag ? a : b;
      const byScore = scoreA === scoreB ? null : scoreA > scoreB ? a : b;
      if (byScore !== winner) {
        corruptScore = true;
        corrupt.push(`${gameId} ${a.maxDate} ${a.team} ${scoreA} vs ${b.team} ${scoreB}, flag says ${winner.team}`);
      }
    } else {
      assert(scoreA !== scoreB, `playoff game ${gameId}: ambiguous win flags and tied box totals`);
      winner = scoreA > scoreB ? a : b;
      corruptScore = true;
      corrupt.push(`${gameId} ${a.maxDate}: no usable win flags, decided by box totals`);
    }
    const loser = winner === a ? b : a;
    let homeTeam: TeamGame | null = null;
    if (a.homeFlag !== b.homeFlag) homeTeam = a.homeFlag ? a : b;
    else noHome++;
    const sgn = a.sgn ?? b.sgn;
    if (a.sgn !== null && b.sgn !== null) {
      assert(a.sgn === b.sgn, `game ${gameId}: seriesGameNumber disagrees between teams (${a.sgn} vs ${b.sgn})`);
    }
    games.push({
      gameId,
      year: a.year,
      date: a.maxDate,
      round: normalizeRound(a.label || b.label),
      sgn,
      a,
      b,
      winner,
      loser,
      scoreA,
      scoreB,
      homeTeam,
      corruptScore,
      gameNo: null,
    });
  }
  assert(corrupt.length <= 8, `${corrupt.length} corrupt-score games exceeds the known handful:\n${corrupt.join('\n')}`);
  if (corrupt.length) console.log(`Corrupt-score games (excluded from team-score averages):\n  ${corrupt.join('\n  ')}`);
  console.log(`${games.length} playoff games paired; ${noHome} without a determinable home team.`);
  return games;
}

interface Series {
  key: string;
  games: Game[]; // in true (date) order; game k of the series = games[k-1]
  excluded: boolean;
}

// Series key = season + sorted team pair (two teams meet at most once per
// postseason; the 1954 round-robin sets fail the winsNeeded guard below and
// are excluded). Games are renumbered by date order within the series, which
// sets g.gameNo; the labeled seriesGameNumber is only a cross-check because it
// is shuffled for at least one series. Returns facing-elimination flags per
// (gameId, team name).
function reconstructSeries(games: Game[]): {
  elimFlags: Map<string, boolean>;
  seriesList: Series[];
  sgnMismatches: string[];
} {
  const byKey = new Map<string, Game[]>();
  for (const g of games) {
    const key = `${g.year}|${[g.a.team, g.b.team].sort().join('|')}`;
    const list = byKey.get(key) ?? [];
    list.push(g);
    byKey.set(key, list);
  }
  const elimFlags = new Map<string, boolean>();
  const seriesList: Series[] = [];
  const sgnMismatches: string[] = [];
  let excludedSeries = 0;
  for (const [key, list] of byKey) {
    const dated = list.filter((g) => g.date !== '');
    const undated = list.filter((g) => g.date === '');
    assert(undated.length <= 1, `series ${key} has ${undated.length} blank-date games`);
    dated.sort((x, y) => (x.date < y.date ? -1 : 1));
    const ordered = [...dated];
    if (undated.length === 1) {
      const g = undated[0];
      assert(g.sgn !== null, `blank-date game ${g.gameId} has no series number to position it`);
      ordered.splice(g.sgn! - 1, 0, g);
    }
    ordered.forEach((g, i) => {
      g.gameNo = i + 1;
      if (g.sgn !== null && g.sgn !== g.gameNo) {
        sgnMismatches.push(`${key} ${g.date || '(no date)'}: labeled game ${g.sgn}, is game ${g.gameNo}`);
      }
    });
    let excluded = false;
    const wins = new Map<string, number>();
    for (const g of ordered) wins.set(g.winner.team, (wins.get(g.winner.team) ?? 0) + 1);
    const finalWinner = ordered[ordered.length - 1].winner.team;
    const winsNeeded = wins.get(finalWinner)!;
    // in a first-to-N series only the winner reaches N wins and only in the
    // final game; anything else is not a playoff series shape we understand
    const loserTeam = ordered[0].a.team === finalWinner ? ordered[0].b.team : ordered[0].a.team;
    if ((wins.get(loserTeam) ?? 0) >= winsNeeded) excluded = true;
    else {
      const tally = new Map<string, number>([[finalWinner, 0], [loserTeam, 0]]);
      for (const g of ordered) {
        for (const tg of [g.a, g.b]) {
          const opp = tg.team === finalWinner ? loserTeam : finalWinner;
          elimFlags.set(`${g.gameId}|${tg.team}`, (tally.get(opp) ?? 0) === winsNeeded - 1);
        }
        tally.set(g.winner.team, (tally.get(g.winner.team) ?? 0) + 1);
      }
    }
    assert(ordered.length <= 7, `series ${key} has ${ordered.length} games; key collision?`);
    if (excluded) excludedSeries++;
    seriesList.push({ key, games: ordered, excluded });
  }
  console.log(`${seriesList.length} series reconstructed, ${excludedSeries} excluded from elimination analysis, ${sgnMismatches.length} label/date-order mismatches.`);
  return { elimFlags, seriesList, sgnMismatches };
}

interface YearBucket {
  g7G: number;
  g7Pts: number;
  otherG: number;
  otherPts: number;
}

interface PlayerAgg {
  id: number;
  name: string;
  g7G: number;
  wins: number;
  losses: number;
  pts: number;
  reb: number;
  ast: number;
  firstYear: number; // first/last GAME 7 seasons, not first playoff seasons
  lastYear: number;
  years: Map<number, YearBucket>;
  elimG: number;
  elimWins: number;
  elimPts: number;
  elimFirstYear: number;
  elimLastYear: number;
  basePpg: number | null;
  coveredG7Ppg: number | null;
  diff: number | null;
  coveredG7: number;
}

function main() {
  return readPlayoffTeamGames().then((teamGames) => {
    const games = buildGames(teamGames);
    const { elimFlags, seriesList, sgnMismatches } = reconstructSeries(games);
    if (sgnMismatches.length) {
      console.log(`Label/date-order mismatches (date order wins):\n  ${sgnMismatches.join('\n  ')}`);
    }

    const game7s = games.filter((g) => g.gameNo === 7);
    assert(
      !game7s.some((g) => g.corruptScore),
      'a Game 7 has corrupt scores; the team-score averages need rethinking',
    );
    assert(
      game7s.length === EXPECTED_G7_COUNT,
      `expected ${EXPECTED_G7_COUNT} Game 7s, found ${game7s.length}`,
    );
    const byDecade = new Map<number, number>();
    for (const g of game7s) {
      const d = Math.floor(g.year / 10) * 10;
      byDecade.set(d, (byDecade.get(d) ?? 0) + 1);
    }
    for (const [d, expected] of Object.entries(EXPECTED_G7_BY_DECADE)) {
      assert(
        byDecade.get(Number(d)) === expected,
        `decade ${d}: expected ${expected} Game 7s, found ${byDecade.get(Number(d)) ?? 0}`,
      );
    }
    assert(gameIdSeason('40200237') === 2003, 'gameId season fallback broke for 40200237');
    const blankDateG7 = game7s.find((g) => g.gameId === '40200237');
    if (blankDateG7) assert(blankDateG7.year === 2003, '40200237 did not resolve to 2003');

    // pinned box scores
    const findRow = (g7: Game, name: string) =>
      [...g7.a.rows, ...g7.b.rows].find((r) => r.name === name && r.date === g7.a.maxDate);
    const pin = (date: string, name: string, pts: number, reb: number | null, ast: number | null) => {
      const g = game7s.find((x) => x.date === date);
      assert(!!g, `pinned Game 7 on ${date} not found`);
      const row = findRow(g, name);
      assert(!!row, `pinned player ${name} not found on ${date}`);
      assert(row.pts === pts, `${name} ${date}: expected ${pts} pts, got ${row.pts}`);
      if (reb !== null) assert(row.reb === reb, `${name} ${date}: expected ${reb} reb, got ${row.reb}`);
      if (ast !== null) assert(row.ast === ast, `${name} ${date}: expected ${ast} ast, got ${row.ast}`);
    };
    pin('2016-06-19', 'LeBron James', 27, 11, 11);
    pin('1962-04-18', 'Bill Russell', 30, 40, null);
    pin('2016-05-30', 'Stephen Curry', 36, null, null);

    // every G7 is an elimination game for both teams, and no G7 sits in an
    // excluded series
    for (const s of seriesList) {
      if (!s.excluded) continue;
      assert(!s.games.some((g) => g.gameNo === 7), `Game 7 found in excluded series ${s.key}`);
    }
    for (const g of game7s) {
      assert(elimFlags.get(`${g.gameId}|${g.a.team}`) === true, `G7 ${g.gameId} not elimination for ${g.a.team}`);
      assert(elimFlags.get(`${g.gameId}|${g.b.team}`) === true, `G7 ${g.gameId} not elimination for ${g.b.team}`);
    }

    // per-player aggregates
    const players = new Map<number, PlayerAgg>();
    const getPlayer = (r: PlayerRow, year: number): PlayerAgg => {
      let p = players.get(r.id);
      if (!p) {
        p = {
          id: r.id, name: r.name, g7G: 0, wins: 0, losses: 0, pts: 0, reb: 0, ast: 0,
          firstYear: Infinity, lastYear: -Infinity, years: new Map(),
          elimG: 0, elimWins: 0, elimPts: 0,
          elimFirstYear: Infinity, elimLastYear: -Infinity,
          basePpg: null, coveredG7Ppg: null, diff: null, coveredG7: 0,
        };
        players.set(r.id, p);
      }
      p.name = r.name;
      return p;
    };
    for (const g of games) {
      const isG7 = g.gameNo === 7;
      for (const tg of [g.a, g.b]) {
        const won = tg === g.winner;
        const elim = elimFlags.get(`${g.gameId}|${tg.team}`) === true;
        for (const r of tg.rows) {
          if (r.date !== tg.maxDate || !r.played) continue;
          const p = getPlayer(r, g.year);
          const bucket = p.years.get(g.year) ?? { g7G: 0, g7Pts: 0, otherG: 0, otherPts: 0 };
          if (isG7) {
            p.g7G++;
            if (won) p.wins++;
            else p.losses++;
            p.pts += r.pts;
            p.reb += r.reb;
            p.ast += r.ast;
            p.firstYear = Math.min(p.firstYear, g.year);
            p.lastYear = Math.max(p.lastYear, g.year);
            bucket.g7G++;
            bucket.g7Pts += r.pts;
          } else {
            bucket.otherG++;
            bucket.otherPts += r.pts;
          }
          if (elim) {
            p.elimG++;
            if (won) p.elimWins++;
            p.elimPts += r.pts;
            p.elimFirstYear = Math.min(p.elimFirstYear, g.year);
            p.elimLastYear = Math.max(p.elimLastYear, g.year);
          }
          p.years.set(g.year, bucket);
        }
      }
    }

    // matched baselines
    for (const p of players.values()) {
      if (p.g7G === 0) continue;
      let covered = 0;
      let coveredPts = 0;
      let basePts = 0;
      for (const b of p.years.values()) {
        if (b.g7G === 0 || b.otherG < MIN_BASE_GAMES_PER_YEAR) continue;
        covered += b.g7G;
        coveredPts += b.g7Pts;
        basePts += b.g7G * (b.otherPts / b.otherG);
      }
      p.coveredG7 = covered;
      if (covered > 0 && covered / p.g7G >= BASE_COVERAGE) {
        p.basePpg = basePts / covered;
        p.coveredG7Ppg = coveredPts / covered;
        p.diff = p.coveredG7Ppg - p.basePpg;
      }
    }

    // league context + reconciliation assert
    const withDiff = [...players.values()].filter((p) => p.diff !== null && p.g7G >= 2);
    let sumCovered = 0;
    let sumCoveredPts = 0;
    let sumBasePts = 0;
    let weightedDiff = 0;
    for (const p of withDiff) {
      sumCovered += p.coveredG7;
      sumCoveredPts += p.coveredG7Ppg! * p.coveredG7;
      sumBasePts += p.basePpg! * p.coveredG7;
      weightedDiff += p.diff! * p.coveredG7;
    }
    const aggDiff = (sumCoveredPts - sumBasePts) / sumCovered;
    assert(
      Math.abs(aggDiff - weightedDiff / sumCovered) < 1e-6,
      'reconciliation failed: aggregate diff != weighted mean of player diffs',
    );
    const pctScoreLess = Math.round((withDiff.filter((p) => p.diff! < 0).length / withDiff.length) * 100);

    // team scoring: G7 vs games 1-6 of the same series
    const g7Series = seriesList.filter((s) => s.games.some((g) => g.gameNo === 7));
    let g7Score = 0;
    let g7Teams = 0;
    let earlyScore = 0;
    let earlyTeams = 0;
    for (const s of g7Series) {
      for (const g of s.games) {
        if (g.corruptScore) continue;
        if (g.gameNo === 7) {
          g7Score += g.scoreA + g.scoreB;
          g7Teams += 2;
        } else {
          earlyScore += g.scoreA + g.scoreB;
          earlyTeams += 2;
        }
      }
    }

    // home court in G7s
    const homeKnown = game7s.filter((g) => g.homeTeam !== null);
    const homeWins = homeKnown.filter((g) => g.homeTeam === g.winner).length;
    const decadesSorted = [...byDecade.keys()].sort((a, b) => a - b);
    const homeByDecade = decadesSorted.map((d) => {
      const inDecade = homeKnown.filter((g) => Math.floor(g.year / 10) * 10 === d);
      const w = inDecade.filter((g) => g.homeTeam === g.winner).length;
      return {
        decade: `${d}s`,
        games: inDecade.length,
        homeWins: w,
        homeWinPct: inDecade.length ? Math.round((w / inDecade.length) * 100) : 0,
      };
    });

    // leaderboards
    const emitPlayer = (p: PlayerAgg) => ({
      personId: p.id,
      name: p.name,
      g7G: p.g7G,
      wins: p.wins,
      losses: p.losses,
      g7Ppg: r1(p.pts / p.g7G),
      g7Rpg: r1(p.reb / p.g7G),
      g7Apg: r1(p.ast / p.g7G),
      basePpg: p.basePpg === null ? null : r1(p.basePpg),
      coveredG7Ppg: p.coveredG7Ppg === null ? null : r1(p.coveredG7Ppg),
      diff: p.diff === null ? null : r1(p.diff),
      firstYear: p.firstYear,
      lastYear: p.lastYear,
    });
    const all = [...players.values()].filter((p) => p.g7G > 0);
    const careerLeaders = all
      .filter((p) => p.g7G >= MIN_G7_GAMES)
      .sort((x, y) => y.pts / y.g7G - x.pts / x.g7G || y.g7G - x.g7G)
      .slice(0, 15)
      .map(emitPlayer);
    const mostG7s = all
      .sort((x, y) => y.g7G - x.g7G || y.pts - x.pts)
      .slice(0, 10)
      .map(emitPlayer);
    const diffable = all.filter((p) => p.diff !== null && p.g7G >= RISER_MIN_G7);
    const g7Risers = [...diffable]
      .sort((x, y) => y.diff! - x.diff! || y.g7G - x.g7G)
      .slice(0, 10)
      .map(emitPlayer);
    const g7Fallers = [...diffable]
      .filter((p) => p.basePpg! >= 15)
      .sort((x, y) => x.diff! - y.diff! || y.g7G - x.g7G)
      .slice(0, 10)
      .map(emitPlayer);
    const elimLeaders = [...players.values()]
      .filter((p) => p.elimG >= MIN_ELIM_GAMES)
      .sort((x, y) => y.elimPts / y.elimG - x.elimPts / x.elimG || y.elimG - x.elimG)
      .slice(0, 10)
      .map((p) => ({
        personId: p.id,
        name: p.name,
        elimG: p.elimG,
        elimWins: p.elimWins,
        elimLosses: p.elimG - p.elimWins,
        elimPpg: r1(p.elimPts / p.elimG),
        firstYear: p.elimFirstYear,
        lastYear: p.elimLastYear,
      }));

    // single games
    interface Single {
      personId: number;
      name: string;
      year: number;
      date: string;
      round: string;
      team: string;
      opponent: string;
      pts: number;
      reb: number;
      ast: number;
      win: boolean;
    }
    const singles: Single[] = [];
    for (const g of game7s) {
      for (const tg of [g.a, g.b]) {
        for (const r of tg.rows) {
          if (r.date !== tg.maxDate || !r.played) continue;
          singles.push({
            personId: r.id,
            name: r.name,
            year: g.year,
            date: g.date || String(g.year),
            round: g.round,
            team: tg.team,
            opponent: tg.opponent || (tg === g.a ? g.b.team : g.a.team),
            pts: r.pts,
            reb: r.reb,
            ast: r.ast,
            win: tg === g.winner,
          });
        }
      }
    }
    const topSingleGames = [...singles].sort((x, y) => y.pts - x.pts || y.reb - x.reb).slice(0, 12);
    const topRebGames = [...singles].sort((x, y) => y.reb - x.reb || y.pts - x.pts).slice(0, 3);
    const topAstGames = [...singles].sort((x, y) => y.ast - x.ast || y.pts - x.pts).slice(0, 3);

    const totalElimTeamGames = [...elimFlags.values()].filter(Boolean).length;
    const leagueContext = {
      totalGame7s: game7s.length,
      firstYear: Math.min(...game7s.map((g) => g.year)),
      lastYear: Math.max(...game7s.map((g) => g.year)),
      homeKnownGames: homeKnown.length,
      homeWins,
      homeLosses: homeKnown.length - homeWins,
      homeWinPct: Math.round((homeWins / homeKnown.length) * 100),
      avgG7TeamScore: r1(g7Score / g7Teams),
      avgEarlierGamesTeamScore: r1(earlyScore / earlyTeams),
      qualifiedPlayers: withDiff.length,
      avgDiff: r1(aggDiff),
      pctScoreLess,
      elimTeamGames: totalElimTeamGames,
      elimQualified: elimLeaders.length,
    };

    const emitList = (list: object[]) =>
      list.map((o) => `  ${JSON.stringify(o).replace(/"([a-zA-Z0-9_]+)":/g, '$1: ').replace(/,/g, ', ').replace(/\{/, '{ ').replace(/\}$/, ' }')}`).join(',\n');

    const file = `// app/data/game7Data.ts
//
// GENERATED by scripts/generate-game7-data.ts. Do not hand-edit.
// Game 7 and elimination-game performance computed from data/PlayerStatistics.csv
// game logs (Kaggle, Eoin A Moore, CC0). Playoff games only (gameId prefix 4);
// Play-In and NBA Cup excluded. basePpg is the player's own non-Game-7 playoff
// scoring in the same postseasons, weighted by Game 7 exposure; diff =
// coveredG7Ppg - basePpg and is null when covered years span < ${Math.round(BASE_COVERAGE * 100)}% of his
// Game 7s or a season lacks ${MIN_BASE_GAMES_PER_YEAR}+ other playoff games. Points, rebounds and
// assists are complete in every era; minutes and attempts are not (pre-1980),
// so no efficiency or per-minute stats appear here. Elimination games: a team
// entered the game one loss from being out (winsNeeded - 1 opponent wins);
// every Game 7 counts for both teams. Current through the ${Math.max(...game7s.map((g) => g.year))} playoffs.

export interface Game7Player {
  personId: number;
  name: string;
  g7G: number;
  wins: number;
  losses: number;
  g7Ppg: number;
  g7Rpg: number;
  g7Apg: number;
  basePpg: number | null;
  coveredG7Ppg: number | null;
  diff: number | null;
  firstYear: number;
  lastYear: number;
}

export interface Game7SingleGame {
  personId: number;
  name: string;
  year: number;
  date: string;
  round: string;
  team: string;
  opponent: string;
  pts: number;
  reb: number;
  ast: number;
  win: boolean;
}

export interface ElimPlayer {
  personId: number;
  name: string;
  elimG: number;
  elimWins: number;
  elimLosses: number;
  elimPpg: number;
  firstYear: number;
  lastYear: number;
}

export interface HomeDecade {
  decade: string;
  games: number;
  homeWins: number;
  homeWinPct: number;
}

export const leagueContext = ${JSON.stringify(leagueContext, null, 2).replace(/"([a-zA-Z0-9_]+)":/g, '$1:')};

export const careerLeaders: Game7Player[] = [
${emitList(careerLeaders)},
];

export const mostG7s: Game7Player[] = [
${emitList(mostG7s)},
];

export const g7Risers: Game7Player[] = [
${emitList(g7Risers)},
];

export const g7Fallers: Game7Player[] = [
${emitList(g7Fallers)},
];

export const topSingleGames: Game7SingleGame[] = [
${emitList(topSingleGames)},
];

export const topRebGames: Game7SingleGame[] = [
${emitList(topRebGames)},
];

export const topAstGames: Game7SingleGame[] = [
${emitList(topAstGames)},
];

export const elimLeaders: ElimPlayer[] = [
${emitList(elimLeaders)},
];

export const homeByDecade: HomeDecade[] = [
${emitList(homeByDecade)},
];
`;
    writeFileSync(OUTPUT_PATH, file);
    console.log(`Wrote ${OUTPUT_PATH}`);

    // console summary
    console.log('\nGame 7s by decade:');
    for (const d of decadesSorted) console.log(`  ${d}s: ${byDecade.get(d)}`);
    console.log('\nSeries length histogram by decade (non-excluded series):');
    const hist = new Map<string, number>();
    for (const s of seriesList) {
      if (s.excluded) continue;
      const d = Math.floor(s.games[0].year / 10) * 10;
      const key = `${d}s len ${s.games.length}`;
      hist.set(key, (hist.get(key) ?? 0) + 1);
    }
    for (const [k, v] of [...hist.entries()].sort()) console.log(`  ${k}: ${v}`);
    console.log('\nLeague context:', leagueContext);
    console.log(`\nCareer Game 7 PPG leaders (min ${MIN_G7_GAMES}):`);
    careerLeaders.forEach((p, i) =>
      console.log(`  ${i + 1}. ${p.name}: ${p.g7Ppg} ppg, ${p.g7G} G7s (${p.wins}-${p.losses}), ${p.firstYear}-${p.lastYear}`),
    );
    console.log('\nMost Game 7s:');
    mostG7s.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}: ${p.g7G} (${p.wins}-${p.losses})`));
    console.log(`\nRisers (min ${RISER_MIN_G7} G7s):`);
    g7Risers.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}: ${p.basePpg} -> ${p.coveredG7Ppg} (+${p.diff}), ${p.g7G} G7s`));
    console.log('\nFallers (base >= 15 ppg):');
    g7Fallers.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}: ${p.basePpg} -> ${p.coveredG7Ppg} (${p.diff}), ${p.g7G} G7s`));
    console.log('\nTop single Game 7s:');
    topSingleGames.forEach((s, i) =>
      console.log(`  ${i + 1}. ${s.name} ${s.year} ${s.round}: ${s.pts}/${s.reb}/${s.ast} ${s.win ? 'W' : 'L'}`),
    );
    console.log('\nTop rebound games:', topRebGames.map((s) => `${s.name} ${s.year}: ${s.reb}`).join('; '));
    console.log('Top assist games:', topAstGames.map((s) => `${s.name} ${s.year}: ${s.ast}`).join('; '));
    console.log(`\nElimination-game leaders (min ${MIN_ELIM_GAMES}):`);
    elimLeaders.forEach((p, i) =>
      console.log(`  ${i + 1}. ${p.name}: ${p.elimPpg} ppg over ${p.elimG} games (${p.elimWins}-${p.elimLosses})`),
    );
    console.log('\nHome by decade:', homeByDecade.map((h) => `${h.decade} ${h.homeWins}/${h.games}`).join('  '));
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
