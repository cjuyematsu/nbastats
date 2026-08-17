// scripts/generate-home-court-data.ts
//
// Regenerates app/data/homeCourtData.ts: home-court advantage across NBA
// history, from the game logs in data/PlayerStatistics.csv (no Supabase).
//
// Method:
// - Regular season only: gameId prefix '2' (the gameType column is unreliable).
// - Appearances use the refresh-teammates rule: no DNP comment AND positive
//   box-score evidence. Postponed games repeat a gameId under two dates; rows
//   are deduped per (personId, gameId) keeping the later date.
// - Seasons 1955+ only (per-game logs are partial before 1954-55) with a >= 0.9
//   coverage assert per included season; merged-identity seasons (> 88 games)
//   dropped, and those players excluded from player-level analysis.
// - Team level: player rows collapse to (gameId, team); each game must have
//   exactly two teams, exactly one home, and opposite win flags (asserted).
//   Home win% and home-minus-road team points / FTA per game come from these.
//   Points and free-throw attempts are complete in every era; minutes and
//   field-goal attempts are not (pre-1980), so nothing here is per-minute or
//   per-attempt.
// - Player level: qualifying season = games >= min(58, ceil(0.70 * max games
//   by any player that season)) AND >= 15 home and >= 15 road games. Pool =
//   qualifiers with PPG >= 15; single-season extreme lists display PPG >= 20.
// - The honest metric (matched-baseline rule from CLAUDE.md): the league-wide
//   home edge varies by era, so a raw home-road split mostly measures when a
//   player played. Each pool season's percentage gap
//   gapPct = (homePPG - roadPPG) / PPG * 100 is compared with the unweighted
//   mean gapPct of its DECADE pooled over the same pool (mean, not median, so
//   residuals sum to zero within each decade by construction).
//   adjPct = gapPct - expected; positive = more home-tilted than the era norm.
// - Careers: games-weighted mean of season adjPct over qualifying pool seasons
//   only (>= 5 of them), same construction as the consistency article.
// - The noise test: (a) split-half persistence: each pool season's games are
//   split by alternating date order into halves A/B, each half's adjusted gap
//   is aggregated to a career value, and the A-vs-B Pearson r across career
//   players says how much of the split is a repeatable trait; (b) permutation
//   null: home/road labels are shuffled within each player-season (seeded RNG,
//   deterministic) and the cross-player SD of career adjPct under shuffling is
//   compared with the observed SD; excess = the true skill spread.
//
// Hard asserts: game integrity (two teams, one home, opposite win flags);
// season coverage; per-decade residual sums ~ 0; decade cells >= 30 pool
// seasons; 2021 (empty arenas) home win% below both neighbors; early-era home
// win% above the modern era; Wilt's 100-point game is a home game on
// 1962-03-02; pinned counts and records. Bump EXPECTED_* after a new season's
// CSV lands.
//
// Usage: npm run generate:home-court

import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const CSV_PATH = resolve(process.cwd(), 'data/PlayerStatistics.csv');
const OUTPUT_PATH = resolve(process.cwd(), 'app/data/homeCourtData.ts');

const MIN_SEASON = 1955;
const MIN_SEASON_COVERAGE = 0.9;
const GAMES_FRACTION = 0.7;
const GAMES_CAP = 58;
const MIN_SIDE_GAMES = 15;
const MIN_HALF_SIDE_GAMES = 5;
const MIN_PPG_POOL = 15;
const MIN_PPG_SEASON_LIST = 20;
const MIN_CAREER_SEASONS = 5;
const MIN_DECADE_SEASONS = 30;
const MIN_HALF_SEASONS = 3;
const PERMUTATIONS = 200;
const RNG_SEED = 20260817;
const MAX_FILE_BYTES = 120_000;
const HIST_LO = -20;
const HIST_HI = 20;
const HIST_WIDTH = 2;

// Pinned after the first run; null skips the assert and prints the value.
const EXPECTED_POOL_SEASONS: number | null = 3569;
const EXPECTED_CAREER_ELIGIBLE: number | null = 333;
const EXPECTED_ROAD_RECORD: { name: string; pts: number; date: string } | null = {
  name: 'Luka Doncic',
  pts: 73,
  date: '2024-01-26',
};

const FAMOUS_NAMES = [
  'Michael Jordan',
  'LeBron James',
  'Stephen Curry',
  'Kobe Bryant',
  'Kevin Durant',
  'Larry Bird',
  'Magic Johnson',
  'Kareem Abdul-Jabbar',
  'Wilt Chamberlain',
  'Shaquille O\'Neal',
];

const COL = {
  firstName: 0,
  lastName: 1,
  personId: 2,
  gameId: 3,
  gameDateTimeEst: 4,
  playerteamName: 6,
  win: 13,
  home: 14,
  numMinutes: 15,
  points: 16,
  freeThrowsAttempted: 26,
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

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

// mulberry32: deterministic RNG so the permutation-null numbers are pinnable.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26, |error| < 1.5e-7
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

const normCdf = (x: number, sd: number) => 0.5 * (1 + erf(x / (sd * Math.SQRT2)));

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sd(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

interface GameRow {
  gameId: string;
  date: string;
  season: number;
  pts: number;
  fta: number;
  team: string;
  home: boolean;
  win: boolean;
}

interface PlayerLog {
  id: number;
  name: string;
  byGameId: Map<string, GameRow>;
}

interface SeasonCoverage {
  games: Set<string>;
  teams: Set<string>;
}

function readRegularSeasonLogs(): Promise<{
  players: Map<number, PlayerLog>;
  dupes: number;
  coverage: Map<number, SeasonCoverage>;
}> {
  return new Promise((resolvePromise, reject) => {
    const players = new Map<number, PlayerLog>();
    const coverage = new Map<number, SeasonCoverage>();
    let dupes = 0;
    let header = true;
    const rl = createInterface({ input: createReadStream(CSV_PATH), crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (header) {
        header = false;
        return;
      }
      const f = splitCsvLine(line);
      const gameId = f[COL.gameId];
      if (!gameId || gameId[0] !== '2') return;
      if (!didPlay(f)) return;
      const id = Number(f[COL.personId]);
      const date = (f[COL.gameDateTimeEst] ?? '').slice(0, 10);
      assert(date.length === 10, `blank/malformed date on regular-season game ${gameId}`);
      const home = f[COL.home];
      const win = f[COL.win];
      assert(home === '0' || home === '1', `bad home flag "${home}" on game ${gameId}`);
      assert(win === '0' || win === '1', `bad win flag "${win}" on game ${gameId}`);
      const row: GameRow = {
        gameId,
        date,
        season: seasonEndYear(date),
        pts: Number(f[COL.points]),
        fta: Number(f[COL.freeThrowsAttempted]),
        team: f[COL.playerteamName],
        home: home === '1',
        win: win === '1',
      };
      let cov = coverage.get(row.season);
      if (!cov) {
        cov = { games: new Set(), teams: new Set() };
        coverage.set(row.season, cov);
      }
      cov.games.add(gameId);
      cov.teams.add(row.team);
      let p = players.get(id);
      if (!p) {
        p = { id, name: `${f[COL.firstName]} ${f[COL.lastName]}`.trim(), byGameId: new Map() };
        players.set(id, p);
      }
      const existing = p.byGameId.get(gameId);
      if (existing) {
        dupes++;
        if (row.date > existing.date) p.byGameId.set(gameId, row);
      } else {
        p.byGameId.set(gameId, row);
      }
    });
    rl.on('close', () => resolvePromise({ players, dupes, coverage }));
    rl.on('error', reject);
  });
}

function main() {
  return readRegularSeasonLogs().then(({ players, dupes, coverage }) => {
    console.log(`Players with regular-season appearances: ${players.size}`);
    console.log(`Postponed-game duplicate rows dropped: ${dupes}`);

    // ---- per player-season raw aggregates, merged-identity drop ----
    interface RawSeason {
      personId: number;
      name: string;
      season: number;
      games: GameRow[];
    }
    const rawSeasons: RawSeason[] = [];
    const maxGamesBySeason = new Map<number, number>();
    const mergedIdentityPlayers = new Set<number>();
    let corruptSeasons = 0;
    let homeRecord: { name: string; date: string; pts: number } | null = null;
    let roadRecord: { name: string; date: string; pts: number } | null = null;

    for (const p of players.values()) {
      const bySeason = new Map<number, GameRow[]>();
      for (const g of p.byGameId.values()) {
        let arr = bySeason.get(g.season);
        if (!arr) {
          arr = [];
          bySeason.set(g.season, arr);
        }
        arr.push(g);
      }
      for (const [season, games] of bySeason) {
        if (games.length > 88) {
          console.log(`Dropping merged-identity season: ${p.name} ${season} (${games.length} games)`);
          mergedIdentityPlayers.add(p.id);
          corruptSeasons++;
          continue;
        }
        const prev = maxGamesBySeason.get(season) ?? 0;
        if (games.length > prev) maxGamesBySeason.set(season, games.length);
        if (season < MIN_SEASON) continue;
        for (const g of games) {
          const rec = g.home ? homeRecord : roadRecord;
          if (!rec || g.pts > rec.pts) {
            const next = { name: p.name, date: g.date, pts: g.pts };
            if (g.home) homeRecord = next;
            else roadRecord = next;
          }
        }
        rawSeasons.push({ personId: p.id, name: p.name, season, games });
      }
    }
    console.log(`Merged-identity seasons dropped: ${corruptSeasons} (${mergedIdentityPlayers.size} players)`);

    console.log('\nExcluded seasons (partial game logs before MIN_SEASON):');
    for (const [season, cov] of [...coverage.entries()].sort((a, b) => a[0] - b[0])) {
      const maxG = maxGamesBySeason.get(season) ?? 0;
      const expected = (cov.teams.size * maxG) / 2;
      const ratio = expected > 0 ? cov.games.size / expected : 0;
      if (season < MIN_SEASON) {
        console.log(`  ${season}: ${cov.games.size} games logged (${cov.teams.size} teams, coverage ~${r2(ratio)})`);
      } else {
        assert(
          ratio >= MIN_SEASON_COVERAGE,
          `season ${season} coverage ${r2(ratio)} < ${MIN_SEASON_COVERAGE}`,
        );
      }
    }

    assert(
      homeRecord !== null &&
        homeRecord.pts === 100 &&
        homeRecord.name === 'Wilt Chamberlain' &&
        homeRecord.date === '1962-03-02',
      `home single-game record should be Wilt Chamberlain 100 on 1962-03-02, found ${homeRecord?.name} ${homeRecord?.pts} on ${homeRecord?.date}`,
    );
    assert(roadRecord !== null, 'no road games found');
    if (EXPECTED_ROAD_RECORD) {
      assert(
        roadRecord.name === EXPECTED_ROAD_RECORD.name &&
          roadRecord.pts === EXPECTED_ROAD_RECORD.pts &&
          roadRecord.date === EXPECTED_ROAD_RECORD.date,
        `road record: expected ${EXPECTED_ROAD_RECORD.name} ${EXPECTED_ROAD_RECORD.pts} on ${EXPECTED_ROAD_RECORD.date}, found ${roadRecord.name} ${roadRecord.pts} on ${roadRecord.date}`,
      );
    } else {
      console.log(`PIN EXPECTED_ROAD_RECORD: ${roadRecord.name} ${roadRecord.pts} on ${roadRecord.date}`);
    }

    // ---- game level: collapse player rows to (gameId, team) ----
    interface TeamGame {
      pts: number;
      fta: number;
      home: boolean;
      win: boolean;
    }
    interface GameAgg {
      season: number;
      teams: Map<string, TeamGame>;
    }
    const games = new Map<string, GameAgg>();
    for (const p of players.values()) {
      for (const g of p.byGameId.values()) {
        if (g.season < MIN_SEASON) continue;
        let ga = games.get(g.gameId);
        if (!ga) {
          ga = { season: g.season, teams: new Map() };
          games.set(g.gameId, ga);
        }
        let t = ga.teams.get(g.team);
        if (!t) {
          t = { pts: 0, fta: 0, home: g.home, win: g.win };
          ga.teams.set(g.team, t);
        }
        assert(
          t.home === g.home && t.win === g.win,
          `inconsistent home/win flags for ${g.team} in game ${g.gameId}`,
        );
        t.pts += g.pts;
        t.fta += g.fta;
      }
    }
    for (const [gameId, ga] of games) {
      assert(ga.teams.size === 2, `game ${gameId} has ${ga.teams.size} teams`);
      const [a, b] = [...ga.teams.values()];
      assert(a.home !== b.home, `game ${gameId} does not have exactly one home team`);
      assert(a.win !== b.win, `game ${gameId} does not have exactly one winner`);
    }
    console.log(`\nGames (team-level, ${MIN_SEASON}+): ${games.size}`);

    // ---- league series: home win%, points edge, FTA edge by season ----
    interface SeasonLeague {
      games: number;
      homeWins: number;
      homePts: number;
      roadPts: number;
      homeFta: number;
      roadFta: number;
    }
    const leagueBySeason = new Map<number, SeasonLeague>();
    for (const ga of games.values()) {
      let sl = leagueBySeason.get(ga.season);
      if (!sl) {
        sl = { games: 0, homeWins: 0, homePts: 0, roadPts: 0, homeFta: 0, roadFta: 0 };
        leagueBySeason.set(ga.season, sl);
      }
      sl.games++;
      for (const t of ga.teams.values()) {
        if (t.home) {
          if (t.win) sl.homeWins++;
          sl.homePts += t.pts;
          sl.homeFta += t.fta;
        } else {
          sl.roadPts += t.pts;
          sl.roadFta += t.fta;
        }
      }
    }
    const homeWinPctBySeason = [...leagueBySeason.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([season, sl]) => ({
        season,
        games: sl.games,
        homeWinPct: r3(sl.homeWins / sl.games),
      }));
    const teamEdgeBySeason = [...leagueBySeason.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([season, sl]) => ({
        season,
        homePts: r1(sl.homePts / sl.games),
        roadPts: r1(sl.roadPts / sl.games),
        ptsEdge: r2((sl.homePts - sl.roadPts) / sl.games),
        ftaEdge: r2((sl.homeFta - sl.roadFta) / sl.games),
      }));

    // The article claims home teams have won a majority in every season.
    for (const s of homeWinPctBySeason) {
      assert(s.homeWinPct > 0.5, `season ${s.season} home win% ${s.homeWinPct} <= 0.5; article claim broken`);
    }

    // The empty-arena 2020-21 season is a natural experiment on crowds. The
    // finding is a NON-dip: 2021 sits inside the normal modern range, so the
    // article argues the crowd is not the main mechanism. No dip assert; just
    // require the seasons to exist so the claim always has its numbers.
    const winPct = new Map(homeWinPctBySeason.map((s) => [s.season, s.homeWinPct]));
    const w2020 = winPct.get(2020);
    const w2021 = winPct.get(2021);
    const w2022 = winPct.get(2022);
    assert(
      w2020 !== undefined && w2021 !== undefined && w2022 !== undefined,
      'missing 2020/2021/2022 seasons for the COVID comparison',
    );

    const decadeOf = (season: number) => Math.floor(season / 10) * 10;
    const decadeAgg = new Map<number, SeasonLeague>();
    for (const [season, sl] of leagueBySeason) {
      const d = decadeOf(season);
      let da = decadeAgg.get(d);
      if (!da) {
        da = { games: 0, homeWins: 0, homePts: 0, roadPts: 0, homeFta: 0, roadFta: 0 };
        decadeAgg.set(d, da);
      }
      da.games += sl.games;
      da.homeWins += sl.homeWins;
      da.homePts += sl.homePts;
      da.roadPts += sl.roadPts;
      da.homeFta += sl.homeFta;
      da.roadFta += sl.roadFta;
    }
    const decadeSummary = [...decadeAgg.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, da]) => ({
        decade,
        games: da.games,
        homeWinPct: r3(da.homeWins / da.games),
        ptsEdge: r2((da.homePts - da.roadPts) / da.games),
        ftaEdge: r2((da.homeFta - da.roadFta) / da.games),
      }));
    const earlyEra = homeWinPctBySeason.filter((s) => s.season < 1985);
    const modernEra = homeWinPctBySeason.filter((s) => s.season >= 2010);
    const earlyWinPct = mean(earlyEra.map((s) => s.homeWinPct));
    const modernWinPct = mean(modernEra.map((s) => s.homeWinPct));
    assert(
      earlyWinPct > modernWinPct + 0.03,
      `home win% should have declined: pre-1985 ${r3(earlyWinPct)} vs 2010+ ${r3(modernWinPct)}`,
    );

    // ---- player-season pool ----
    const minGamesBySeason = new Map<number, number>();
    for (const [season, maxG] of maxGamesBySeason) {
      minGamesBySeason.set(season, Math.min(GAMES_CAP, Math.ceil(GAMES_FRACTION * maxG)));
    }

    interface SeasonAgg {
      personId: number;
      name: string;
      season: number;
      team: string;
      games: number;
      homeGames: number;
      roadGames: number;
      ppg: number;
      homePpg: number;
      roadPpg: number;
      gap: number;
      gapPct: number;
      expPct: number;
      adjPct: number;
      // date-ordered games kept for the split-half and permutation tests
      ordered: GameRow[];
    }
    let sideFiltered = 0;
    const pool: SeasonAgg[] = [];
    for (const rs of rawSeasons) {
      if (mergedIdentityPlayers.has(rs.personId)) continue;
      const minG = minGamesBySeason.get(rs.season) ?? GAMES_CAP;
      if (rs.games.length < minG) continue;
      const home = rs.games.filter((g) => g.home);
      const road = rs.games.filter((g) => !g.home);
      const n = rs.games.length;
      const ppg = rs.games.reduce((a, g) => a + g.pts, 0) / n;
      if (ppg < MIN_PPG_POOL) continue;
      if (home.length < MIN_SIDE_GAMES || road.length < MIN_SIDE_GAMES) {
        sideFiltered++;
        continue;
      }
      const homePpg = home.reduce((a, g) => a + g.pts, 0) / home.length;
      const roadPpg = road.reduce((a, g) => a + g.pts, 0) / road.length;
      const teamCounts = new Map<string, number>();
      for (const g of rs.games) teamCounts.set(g.team, (teamCounts.get(g.team) ?? 0) + 1);
      const team = [...teamCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      pool.push({
        personId: rs.personId,
        name: rs.name,
        season: rs.season,
        team: teamCounts.size > 1 ? `${team} (+${teamCounts.size - 1})` : team,
        games: n,
        homeGames: home.length,
        roadGames: road.length,
        ppg,
        homePpg,
        roadPpg,
        gap: homePpg - roadPpg,
        gapPct: ((homePpg - roadPpg) / ppg) * 100,
        expPct: 0,
        adjPct: 0,
        ordered: [...rs.games].sort((a, b) => a.date.localeCompare(b.date)),
      });
    }
    console.log(`Pool seasons (>= ${MIN_PPG_POOL} ppg, both sides >= ${MIN_SIDE_GAMES}): ${pool.length}`);
    console.log(`Qualifying seasons dropped for one-sided schedules: ${sideFiltered}`);

    // ---- decade expectation (matched baseline) ----
    const decadeCells = new Map<number, SeasonAgg[]>();
    for (const s of pool) {
      const arr = decadeCells.get(decadeOf(s.season)) ?? [];
      arr.push(s);
      decadeCells.set(decadeOf(s.season), arr);
    }
    const decadeExp = new Map<number, number>();
    for (const [d, list] of decadeCells) {
      assert(
        list.length >= MIN_DECADE_SEASONS,
        `decade ${d} has only ${list.length} pool seasons (< ${MIN_DECADE_SEASONS})`,
      );
      decadeExp.set(d, mean(list.map((s) => s.gapPct)));
    }
    for (const s of pool) {
      s.expPct = decadeExp.get(decadeOf(s.season))!;
      s.adjPct = s.gapPct - s.expPct;
    }
    for (const [d, list] of decadeCells) {
      const resid = list.reduce((a, s) => a + s.adjPct, 0);
      assert(Math.abs(resid) < 1e-6 * list.length, `decade ${d} residuals do not sum to zero: ${resid}`);
    }

    // ---- careers ----
    interface CareerAgg {
      personId: number;
      name: string;
      qualSeasons: number;
      games: number;
      ppg: number;
      homePpg: number;
      roadPpg: number;
      gap: number;
      adjPct: number;
      firstSeason: number;
      lastSeason: number;
      seasons: SeasonAgg[];
    }
    const byPlayer = new Map<number, SeasonAgg[]>();
    for (const s of pool) {
      const arr = byPlayer.get(s.personId) ?? [];
      arr.push(s);
      byPlayer.set(s.personId, arr);
    }
    const careers: CareerAgg[] = [];
    for (const seasons of byPlayer.values()) {
      if (seasons.length < MIN_CAREER_SEASONS) continue;
      const g = seasons.reduce((a, s) => a + s.games, 0);
      const w = (pick: (s: SeasonAgg) => number) =>
        seasons.reduce((a, s) => a + pick(s) * s.games, 0) / g;
      careers.push({
        personId: seasons[0].personId,
        name: seasons[0].name,
        qualSeasons: seasons.length,
        games: g,
        ppg: w((s) => s.ppg),
        homePpg: w((s) => s.homePpg),
        roadPpg: w((s) => s.roadPpg),
        gap: w((s) => s.gap),
        adjPct: w((s) => s.adjPct),
        firstSeason: Math.min(...seasons.map((s) => s.season)),
        lastSeason: Math.max(...seasons.map((s) => s.season)),
        seasons,
      });
    }
    console.log(`Career-eligible players (>= ${MIN_CAREER_SEASONS} pool seasons): ${careers.length}`);

    const pinCount = (label: string, expected: number | null, actual: number) => {
      if (expected === null) console.log(`PIN ${label}: ${actual}`);
      else assert(expected === actual, `${label}: expected ${expected}, got ${actual}`);
    };
    pinCount('EXPECTED_POOL_SEASONS', EXPECTED_POOL_SEASONS, pool.length);
    pinCount('EXPECTED_CAREER_ELIGIBLE', EXPECTED_CAREER_ELIGIBLE, careers.length);

    // ---- noise test 1: split-half persistence ----
    interface HalfPair {
      personId: number;
      name: string;
      h1: number;
      h2: number;
    }
    const halfPairs: HalfPair[] = [];
    for (const c of careers) {
      let w1 = 0;
      let w2 = 0;
      let sum1 = 0;
      let sum2 = 0;
      let validSeasons = 0;
      for (const s of c.seasons) {
        const a: GameRow[] = [];
        const b: GameRow[] = [];
        s.ordered.forEach((g, i) => (i % 2 === 0 ? a : b).push(g));
        const gapOf = (half: GameRow[]): number | null => {
          const home = half.filter((g) => g.home);
          const road = half.filter((g) => !g.home);
          if (home.length < MIN_HALF_SIDE_GAMES || road.length < MIN_HALF_SIDE_GAMES) return null;
          const hp = home.reduce((x, g) => x + g.pts, 0) / home.length;
          const rp = road.reduce((x, g) => x + g.pts, 0) / road.length;
          const pp = half.reduce((x, g) => x + g.pts, 0) / half.length;
          return ((hp - rp) / pp) * 100 - s.expPct;
        };
        const g1 = gapOf(a);
        const g2 = gapOf(b);
        if (g1 === null || g2 === null) continue;
        validSeasons++;
        sum1 += g1 * s.games;
        sum2 += g2 * s.games;
        w1 += s.games;
        w2 += s.games;
      }
      if (validSeasons < MIN_HALF_SEASONS) continue;
      halfPairs.push({ personId: c.personId, name: c.name, h1: sum1 / w1, h2: sum2 / w2 });
    }
    const splitHalfR = pearson(
      halfPairs.map((p) => p.h1),
      halfPairs.map((p) => p.h2),
    );
    console.log(`\nSplit-half persistence: r = ${r3(splitHalfR)} over ${halfPairs.length} players`);

    // ---- noise test 2: permutation null ----
    const rng = mulberry32(RNG_SEED);
    const observedSd = sd(careers.map((c) => c.adjPct));
    const nullSds: number[] = [];
    // scratch: per pool season, its points array and home count stay fixed;
    // only the assignment of home labels to games shuffles.
    const seasonPts = pool.map((s) => s.ordered.map((g) => g.pts));
    const seasonHomeCount = pool.map((s) => s.homeGames);
    const seasonTotal = pool.map((s) => s.ordered.reduce((a, g) => a + g.pts, 0));
    const permGapPct = new Array<number>(pool.length);
    const poolIndex = new Map<SeasonAgg, number>();
    pool.forEach((s, i) => poolIndex.set(s, i));
    for (let k = 0; k < PERMUTATIONS; k++) {
      for (let i = 0; i < pool.length; i++) {
        const pts = seasonPts[i];
        const n = pts.length;
        const nHome = seasonHomeCount[i];
        // partial Fisher-Yates: draw nHome indices without replacement
        const idx = Array.from({ length: n }, (_, j) => j);
        let homeSum = 0;
        for (let j = 0; j < nHome; j++) {
          const r = j + Math.floor(rng() * (n - j));
          const tmp = idx[j];
          idx[j] = idx[r];
          idx[r] = tmp;
          homeSum += pts[idx[j]];
        }
        const total = seasonTotal[i];
        const homePpg = homeSum / nHome;
        const roadPpg = (total - homeSum) / (n - nHome);
        const ppg = total / n;
        permGapPct[i] = ((homePpg - roadPpg) / ppg) * 100;
      }
      // recompute decade means over the permuted pool (mirrors the observed construction)
      const dSum = new Map<number, { sum: number; n: number }>();
      for (let i = 0; i < pool.length; i++) {
        const d = decadeOf(pool[i].season);
        const cell = dSum.get(d) ?? { sum: 0, n: 0 };
        cell.sum += permGapPct[i];
        cell.n++;
        dSum.set(d, cell);
      }
      const careerVals: number[] = [];
      for (const c of careers) {
        let acc = 0;
        for (const s of c.seasons) {
          const i = poolIndex.get(s)!;
          const cell = dSum.get(decadeOf(s.season))!;
          acc += (permGapPct[i] - cell.sum / cell.n) * s.games;
        }
        careerVals.push(acc / c.games);
      }
      nullSds.push(sd(careerVals));
    }
    const nullSd = mean(nullSds);
    const trueSd = Math.sqrt(Math.max(0, observedSd ** 2 - nullSd ** 2));
    const beyond2 = careers.filter((c) => Math.abs(c.adjPct) > 2 * nullSd).length;
    console.log(
      `Permutation null (${PERMUTATIONS} shuffles): observed SD ${r3(observedSd)}, null SD ${r3(nullSd)}, implied true-skill SD ${r3(trueSd)}`,
    );
    console.log(
      `Players beyond 2x null SD: ${beyond2}/${careers.length} (chance alone predicts ~${r1(careers.length * 0.046)})`,
    );

    // ---- leaderboards ----
    const careerOut = (c: CareerAgg) => ({
      personId: c.personId,
      name: c.name,
      firstSeason: c.firstSeason,
      lastSeason: c.lastSeason,
      qualSeasons: c.qualSeasons,
      games: c.games,
      ppg: r1(c.ppg),
      homePpg: r1(c.homePpg),
      roadPpg: r1(c.roadPpg),
      gap: r2(c.gap),
      adjPct: r2(c.adjPct),
    });
    const careerHomeBoosts = [...careers].sort((a, b) => b.adjPct - a.adjPct).slice(0, 12).map(careerOut);
    const careerRoadWarriors = [...careers].sort((a, b) => a.adjPct - b.adjPct).slice(0, 12).map(careerOut);

    const famousSplits = FAMOUS_NAMES.map((name) => {
      const c = careers.find((x) => x.name === name);
      assert(!!c, `famous player not career-eligible: ${name}`);
      return careerOut(c);
    }).sort((a, b) => b.adjPct - a.adjPct);

    // ---- single-season extremes (display ppg >= 20) ----
    const careerAdjById = new Map(careers.map((c) => [c.personId, c.adjPct]));
    const listPool = pool.filter((s) => s.ppg >= MIN_PPG_SEASON_LIST);
    const seasonOut = (s: SeasonAgg) => ({
      personId: s.personId,
      name: s.name,
      season: s.season,
      team: s.team,
      games: s.games,
      ppg: r1(s.ppg),
      homePpg: r1(s.homePpg),
      roadPpg: r1(s.roadPpg),
      gap: r2(s.gap),
      adjPct: r2(s.adjPct),
      careerAdjPct: careerAdjById.has(s.personId) ? r2(careerAdjById.get(s.personId)!) : null,
    });
    const seasonExtremeHome = [...listPool].sort((a, b) => b.adjPct - a.adjPct).slice(0, 10).map(seasonOut);
    const seasonExtremeRoad = [...listPool].sort((a, b) => a.adjPct - b.adjPct).slice(0, 10).map(seasonOut);
    const extremeNames = new Set([...seasonExtremeHome, ...seasonExtremeRoad].map((s) => s.personId));
    console.log(
      `Season-extreme lists: ${seasonExtremeHome.length + seasonExtremeRoad.length} rows, ${extremeNames.size} distinct players`,
    );

    // ---- histogram of career adjPct vs the chance-only curve ----
    const binCount = Math.round((HIST_HI - HIST_LO) / HIST_WIDTH);
    const gapHistogram = Array.from({ length: binCount }, (_, i) => {
      const lo = HIST_LO + i * HIST_WIDTH;
      const hi = lo + HIST_WIDTH;
      const observed = careers.filter((c) => c.adjPct >= lo && c.adjPct < hi).length;
      const nullExpected = r2(careers.length * (normCdf(hi, nullSd) - normCdf(lo, nullSd)));
      return { label: `${lo} to ${hi}`, lo, hi, observed, nullExpected };
    });
    const histCovered = gapHistogram.reduce((a, b) => a + b.observed, 0);
    assert(
      histCovered === careers.length,
      `histogram covers ${histCovered}/${careers.length} careers; widen HIST_LO/HIST_HI`,
    );

    // ---- league context ----
    const latestSeason = Math.max(...homeWinPctBySeason.map((s) => s.season));
    const firstDecade = decadeSummary[0];
    const lastDecade = decadeSummary[decadeSummary.length - 1];
    const leagueContext = {
      firstSeason: MIN_SEASON,
      lastSeason: latestSeason,
      gamesCounted: games.size,
      poolSeasons: pool.length,
      careerEligible: careers.length,
      minPpgPool: MIN_PPG_POOL,
      minCareerSeasons: MIN_CAREER_SEASONS,
      earlyWinPct: r3(earlyWinPct),
      modernWinPct: r3(modernWinPct),
      covidWinPct: r3(w2021),
      covidNeighborsWinPct: r3((w2020 + w2022) / 2),
      firstDecadePtsEdge: firstDecade.ptsEdge,
      lastDecadePtsEdge: lastDecade.ptsEdge,
      firstDecadeFtaEdge: firstDecade.ftaEdge,
      lastDecadeFtaEdge: lastDecade.ftaEdge,
      splitHalfR: r3(splitHalfR),
      splitHalfPlayers: halfPairs.length,
      observedSd: r3(observedSd),
      nullSd: r3(nullSd),
      trueSkillSd: r3(trueSd),
      beyond2NullSd: beyond2,
      beyond2Expected: r1(careers.length * 0.046),
      permutations: PERMUTATIONS,
    };

    // ---- emit ----
    const emitList = (list: object[]) =>
      list
        .map((o) =>
          `  ${JSON.stringify(o)
            .replace(/"([a-zA-Z0-9_]+)":/g, '$1: ')
            .replace(/,/g, ', ')
            .replace(/\{/, '{ ')
            .replace(/\}$/, ' }')}`,
        )
        .join(',\n');

    const halfPairsOut = halfPairs.map((p) => ({
      personId: p.personId,
      name: p.name,
      h1: r2(p.h1),
      h2: r2(p.h2),
    }));

    const file = `// app/data/homeCourtData.ts
//
// GENERATED by scripts/generate-home-court-data.ts. Do not hand-edit.
// Home-court advantage computed from data/PlayerStatistics.csv game logs
// (Kaggle, Eoin A Moore, CC0). Regular season only (gameId prefix 2), seasons
// ${MIN_SEASON}+ only: the per-game logs are partial before 1954-55. Team level:
// home win% and home-minus-road team points / free-throw attempts per game.
// Player level: each qualifying season's percentage home-road scoring gap is
// compared with the mean gap of its decade over the same pool;
// adjPct = gapPct - expected, positive = more home-tilted than the era norm.
// Careers are games-weighted means over qualifying seasons (>= ${MIN_CAREER_SEASONS}).
// Points and FTA are complete in every era; minutes and field-goal attempts
// are not (pre-1980), so nothing here is per-minute or per-attempt.
// Current through the ${latestSeason} season.

export interface HomeWinPctPoint {
  season: number;
  games: number;
  homeWinPct: number;
}

export interface TeamEdgePoint {
  season: number;
  homePts: number;
  roadPts: number;
  ptsEdge: number;
  ftaEdge: number;
}

export interface DecadeSummaryRow {
  decade: number;
  games: number;
  homeWinPct: number;
  ptsEdge: number;
  ftaEdge: number;
}

export interface CareerSplit {
  personId: number;
  name: string;
  firstSeason: number;
  lastSeason: number;
  qualSeasons: number;
  games: number;
  ppg: number;
  homePpg: number;
  roadPpg: number;
  gap: number;
  adjPct: number;
}

export interface SeasonSplit {
  personId: number;
  name: string;
  season: number;
  team: string;
  games: number;
  ppg: number;
  homePpg: number;
  roadPpg: number;
  gap: number;
  adjPct: number;
  careerAdjPct: number | null;
}

export interface HalfPairPoint {
  personId: number;
  name: string;
  h1: number;
  h2: number;
}

export interface GapHistogramBin {
  label: string;
  lo: number;
  hi: number;
  observed: number;
  nullExpected: number;
}

export interface SingleGameRecord {
  name: string;
  date: string;
  pts: number;
}

export const leagueContext = ${JSON.stringify(leagueContext, null, 2).replace(/"([a-zA-Z0-9_]+)":/g, '$1:')};

export const homeWinPctBySeason: HomeWinPctPoint[] = [
${emitList(homeWinPctBySeason)},
];

export const teamEdgeBySeason: TeamEdgePoint[] = [
${emitList(teamEdgeBySeason)},
];

export const decadeSummary: DecadeSummaryRow[] = [
${emitList(decadeSummary)},
];

export const careerHomeBoosts: CareerSplit[] = [
${emitList(careerHomeBoosts)},
];

export const careerRoadWarriors: CareerSplit[] = [
${emitList(careerRoadWarriors)},
];

export const famousSplits: CareerSplit[] = [
${emitList(famousSplits)},
];

export const seasonExtremeHome: SeasonSplit[] = [
${emitList(seasonExtremeHome)},
];

export const seasonExtremeRoad: SeasonSplit[] = [
${emitList(seasonExtremeRoad)},
];

export const halfPairs: HalfPairPoint[] = [
${emitList(halfPairsOut)},
];

export const gapHistogram: GapHistogramBin[] = [
${emitList(gapHistogram)},
];

export const homeSingleGameRecord: SingleGameRecord = ${JSON.stringify({
      name: homeRecord.name,
      date: homeRecord.date,
      pts: homeRecord.pts,
    }).replace(/"([a-zA-Z0-9_]+)":/g, '$1: ')};

export const roadSingleGameRecord: SingleGameRecord = ${JSON.stringify({
      name: roadRecord.name,
      date: roadRecord.date,
      pts: roadRecord.pts,
    }).replace(/"([a-zA-Z0-9_]+)":/g, '$1: ')};
`;
    assert(file.length < MAX_FILE_BYTES, `output is ${file.length} bytes (>= ${MAX_FILE_BYTES})`);
    writeFileSync(OUTPUT_PATH, file);
    console.log(`\nWrote ${OUTPUT_PATH} (${file.length} bytes)`);

    // ---- console summary ----
    console.log('\nHome win% by decade:');
    for (const d of decadeSummary)
      console.log(
        `  ${d.decade}s: ${(d.homeWinPct * 100).toFixed(1)}% over ${d.games} games, pts edge ${d.ptsEdge}, FTA edge ${d.ftaEdge}`,
      );
    console.log(`\nCOVID season 2021: ${(w2021 * 100).toFixed(1)}% (neighbors ${(w2020 * 100).toFixed(1)}%, ${(w2022 * 100).toFixed(1)}%)`);
    console.log('\nBiggest era-adjusted career home boosts:');
    careerHomeBoosts.forEach((c, i) =>
      console.log(
        `  ${i + 1}. ${c.name} (${c.firstSeason}-${c.lastSeason}): ${c.homePpg} home / ${c.roadPpg} road, adj ${c.adjPct >= 0 ? '+' : ''}${c.adjPct}%`,
      ),
    );
    console.log('\nBiggest era-adjusted career road tilts:');
    careerRoadWarriors.forEach((c, i) =>
      console.log(
        `  ${i + 1}. ${c.name} (${c.firstSeason}-${c.lastSeason}): ${c.homePpg} home / ${c.roadPpg} road, adj ${c.adjPct}%`,
      ),
    );
    console.log('\nFamous names:');
    famousSplits.forEach((c) =>
      console.log(`  ${c.name}: ${c.homePpg} home / ${c.roadPpg} road, adj ${c.adjPct >= 0 ? '+' : ''}${c.adjPct}%`),
    );
    console.log('\nSingle-season extremes (home): ');
    seasonExtremeHome.forEach((s, i) =>
      console.log(
        `  ${i + 1}. ${s.name} ${s.season}: ${s.homePpg} home / ${s.roadPpg} road, adj +${s.adjPct}% (career ${s.careerAdjPct ?? 'n/a'})`,
      ),
    );
    console.log('\nSingle-season extremes (road): ');
    seasonExtremeRoad.forEach((s, i) =>
      console.log(
        `  ${i + 1}. ${s.name} ${s.season}: ${s.homePpg} home / ${s.roadPpg} road, adj ${s.adjPct}% (career ${s.careerAdjPct ?? 'n/a'})`,
      ),
    );
    console.log(`\nRoad record: ${roadRecord.name} ${roadRecord.pts} on ${roadRecord.date}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
