// scripts/generate-scoring-consistency-data.ts
//
// Regenerates app/data/scoringConsistencyData.ts: night-to-night scoring
// volatility across NBA history, from the game logs in data/PlayerStatistics.csv
// (no Supabase involved).
//
// Method:
// - Regular season only: gameId prefix '2' (the gameType column is unreliable).
//   Playoffs (4), Play-In (5), and NBA Cup finals (6) are excluded; Cup group
//   games carry prefix 2 and count, matching official NBA stats.
// - Appearances use the same rule as refresh-teammates: no DNP comment AND
//   positive box-score evidence (minutes alone erase the pre-1980 era, where
//   ~94k rows have real production with numMinutes == 0).
// - Postponed games repeat a gameId under two dates; only the latest date is
//   real, so rows are deduped per (personId, gameId) keeping the later date.
// - Per player-season (season = end year, October 2020 bubble counts as 2020):
//   mean, sample SD (n-1), CV = SD / mean over that player's played games.
// - Qualifying season: games >= min(58, ceil(0.70 * max games by any player
//   that season)) so shortened schedules (48/50/66/72 games) qualify fairly.
//   Pool = qualifiers with PPG >= 15; leaderboards display PPG >= 20.
// - The honest metric (the matched-baseline rule from CLAUDE.md): game-score
//   SD grows with the scoring mean and CV mechanically FALLS as the mean
//   rises, so ranking raw CV just ranks scoring average. Instead each pool
//   season is bucketed by PPG (edges 15/17.5/20/22.5/25/27.5/30+) and compared
//   with the unweighted mean CV of its bucket pooled across history (mean, not
//   median, so residuals sum to zero within each bucket by construction).
//   Consistency Index ci = (expCv - cv) * 100; positive = steadier than
//   expected at that scoring level. Reconciliation asserts below.
// - Careers: games-weighted mean of season values over QUALIFYING seasons only
//   (>= 5 of them). Pooling career game scores into one SD would conflate
//   aging and role changes with night-to-night volatility.
// - Era robustness: a decade x bucket variant of expCv (cells with < 25
//   seasons fall back to the pooled bucket) reranks both leaderboards; the
//   top-10 overlaps are exported so the article can cite them.
// - Era caveats: points are complete and reconcile in every era. Minutes and
//   shot attempts are NOT (pre-1980), so nothing here is per-minute or
//   per-attempt.
//
// Hard asserts: residuals sum to ~0 over the pool; bucket-weighted mean expCv
// equals the pool mean CV; every bucket holds >= 30 seasons; pinned famous
// seasons (Wilt 1962 80 G / 50.4, Jordan 1987 82 G / 37.1, Curry 2016
// 79 G / 30.1); max single game = 100 (Wilt, 1962-03-02) and Kobe's 81
// (2006-01-22); pinned pool/qualifier counts. Bump EXPECTED_* after a new
// season's CSV lands.
//
// Usage: npm run generate:scoring-consistency

import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const CSV_PATH = resolve(process.cwd(), 'data/PlayerStatistics.csv');
const OUTPUT_PATH = resolve(process.cwd(), 'app/data/scoringConsistencyData.ts');

// The per-game logs are PARTIAL before 1954-55: distinct regular-season games
// logged are 18 (1947), 24 (1948), 81 (1949), 122 (1950), 198 (1951), 204
// (1952), 216 (1953), 252 (1954), then 288 (1955) = the full 8-team, 72-game
// schedule, complete thereafter (checked by hand against known schedule
// lengths). Season-level SD from a partial log is noise, so everything here
// starts at 1955. The runtime coverage ratio below is a weaker backstop: its
// expected-games denominator uses max player games, which shrinks along with
// a truncated log, so the absolute counts above are the real justification.
const MIN_SEASON = 1955;
const MIN_SEASON_COVERAGE = 0.9;
const MIN_PPG_POOL = 15;
const MIN_PPG_LEADERBOARD = 20;
const GAMES_FRACTION = 0.7;
const GAMES_CAP = 58;
const MIN_CAREER_SEASONS = 5;
const MIN_BUCKET_SEASONS = 30;
const DECADE_CELL_MIN = 25;
const MIN_TREND_QUALIFIERS = 5;
const STREAK_THRESHOLD = 20;
const MAX_FILE_BYTES = 150_000;
// Bucket lower edges; the last bucket is 30+.
const BUCKET_EDGES = [15, 17.5, 20, 22.5, 25, 27.5, 30] as const;

// Pinned after the first run; null skips the assert and prints the value.
const EXPECTED_POOL_SEASONS: number | null = 3571;
const EXPECTED_LEADERBOARD_SEASONS: number | null = 1461;
const EXPECTED_CAREER_ELIGIBLE: number | null = 333;
const EXPECTED_TOP_STREAK: { name: string; games: number } | null = {
  name: 'Shai Gilgeous-Alexander',
  games: 140,
};
// [personId, season] pairs for the matched-PPG distribution comparison,
// chosen from the first run's candidate printout. PPGs must sit within 1.5.
// Durant 2016 (28.2 ppg, ci +10.36) vs King 1991 (28.4 ppg, ci -11.99).
const HIGHLIGHT_SEASONS: [number, number][] = [
  [201142, 2016],
  [77264, 1991],
];

const COL = {
  firstName: 0,
  lastName: 1,
  personId: 2,
  gameId: 3,
  gameDateTimeEst: 4,
  playerteamName: 6,
  numMinutes: 15,
  points: 16,
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

interface GameRow {
  gameId: string;
  date: string;
  season: number;
  pts: number;
  team: string;
}

interface PlayerLog {
  id: number;
  name: string;
  byGameId: Map<string, GameRow>;
}

interface SeasonAgg {
  personId: number;
  name: string;
  season: number;
  team: string;
  games: number;
  ppg: number;
  sd: number;
  cv: number;
  // filled after bucketing
  expCv: number;
  ci: number;
  expCvDecade: number;
  ciDecade: number;
  boomShare: number;
  bustShare: number;
  pts: number[];
}

function bucketIndex(ppg: number): number {
  for (let i = BUCKET_EDGES.length - 1; i >= 0; i--) {
    if (ppg >= BUCKET_EDGES[i]) return i;
  }
  return -1;
}

function bucketLabel(i: number): string {
  if (i === BUCKET_EDGES.length - 1) return `${BUCKET_EDGES[i]}+`;
  return `${BUCKET_EDGES[i]}-${BUCKET_EDGES[i + 1]}`;
}

function median(sorted: number[]): number {
  const n = sorted.length;
  return n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
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
      // cheap prefix check before parsing: third comma-field starts the id
      const f = splitCsvLine(line);
      const gameId = f[COL.gameId];
      if (!gameId || gameId[0] !== '2') return;
      if (!didPlay(f)) return;
      const id = Number(f[COL.personId]);
      const date = (f[COL.gameDateTimeEst] ?? '').slice(0, 10);
      assert(date.length === 10, `blank/malformed date on regular-season game ${gameId}`);
      const row: GameRow = {
        gameId,
        date,
        season: seasonEndYear(date),
        pts: Number(f[COL.points]),
        team: f[COL.playerteamName],
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

    // ---- per player-season raw aggregates + global single-game checks ----
    interface RawSeason {
      personId: number;
      name: string;
      season: number;
      games: GameRow[];
    }
    const rawSeasons: RawSeason[] = [];
    const maxGamesBySeason = new Map<number, number>();
    // Merged-identity trap (CLAUDE.md): a few personIds blend two players and
    // sum past 82 games in one season (Cooper 1983 = 97). 88 is the legitimate
    // single-season record (Bellamy 1969, traded), so seasons above 88 are
    // corrupt: drop them, and drop the whole player from streaks since their
    // game sequence interleaves two people.
    const mergedIdentityPlayers = new Set<number>();
    let corruptSeasons = 0;
    let maxPts = -1;
    let maxPtsRow: { name: string; date: string } | null = null;
    let kobe81 = false;

    for (const p of players.values()) {
      const bySeason = new Map<number, GameRow[]>();
      for (const g of p.byGameId.values()) {
        let arr = bySeason.get(g.season);
        if (!arr) {
          arr = [];
          bySeason.set(g.season, arr);
        }
        arr.push(g);
        if (g.pts > maxPts) {
          maxPts = g.pts;
          maxPtsRow = { name: p.name, date: g.date };
        }
        if (g.pts === 81 && p.name === 'Kobe Bryant' && g.date === '2006-01-22') kobe81 = true;
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
        rawSeasons.push({ personId: p.id, name: p.name, season, games });
      }
    }
    console.log(`Merged-identity seasons dropped: ${corruptSeasons} (${mergedIdentityPlayers.size} players)`);

    // Season coverage: distinct games logged vs (teams * max player games) / 2.
    // Enforces the MIN_SEASON gate: every included season must be near-complete,
    // and the excluded ones are printed so the cutoff stays justified.
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
          `season ${season} coverage ${r2(ratio)} < ${MIN_SEASON_COVERAGE} (${cov.games.size} games, ${cov.teams.size} teams, max player games ${maxG})`,
        );
      }
    }

    assert(maxPts === 100, `max single game should be 100, found ${maxPts}`);
    assert(
      maxPtsRow !== null && maxPtsRow.name === 'Wilt Chamberlain' && maxPtsRow.date === '1962-03-02',
      `100-point game should be Wilt Chamberlain on 1962-03-02, found ${maxPtsRow?.name} on ${maxPtsRow?.date}`,
    );
    assert(kobe81, "Kobe Bryant's 81-point game on 2006-01-22 not found");

    const minGamesBySeason = new Map<number, number>();
    for (const [season, maxG] of maxGamesBySeason) {
      minGamesBySeason.set(season, Math.min(GAMES_CAP, Math.ceil(GAMES_FRACTION * maxG)));
    }

    // ---- qualifying seasons, pool, and the CV-vs-PPG curve ----
    const qualSeasons: SeasonAgg[] = [];
    for (const rs of rawSeasons) {
      const minG = minGamesBySeason.get(rs.season) ?? GAMES_CAP;
      if (rs.games.length < minG) continue;
      const pts = rs.games.map((g) => g.pts);
      const n = pts.length;
      const mean = pts.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(pts.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
      const teamCounts = new Map<string, number>();
      for (const g of rs.games) teamCounts.set(g.team, (teamCounts.get(g.team) ?? 0) + 1);
      const team = [...teamCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      qualSeasons.push({
        personId: rs.personId,
        name: rs.name,
        season: rs.season,
        team: teamCounts.size > 1 ? `${team} (+${teamCounts.size - 1})` : team,
        games: n,
        ppg: mean,
        sd,
        cv: sd / mean,
        expCv: 0,
        ci: 0,
        expCvDecade: 0,
        ciDecade: 0,
        boomShare: pts.filter((x) => x >= 1.5 * mean).length / n,
        bustShare: pts.filter((x) => x <= 0.5 * mean).length / n,
        pts,
      });
    }

    const pool = qualSeasons.filter((s) => s.ppg >= MIN_PPG_POOL);
    const leaderboardPool = pool.filter((s) => s.ppg >= MIN_PPG_LEADERBOARD);

    // pinned famous seasons
    const famous = (name: string, season: number) => {
      const s = pool.find((x) => x.name === name && x.season === season);
      assert(!!s, `pinned season ${name} ${season} not in pool`);
      return s;
    };
    const wilt62 = famous('Wilt Chamberlain', 1962);
    assert(wilt62.games === 80, `Wilt 1962: expected 80 games, got ${wilt62.games}`);
    assert(Math.abs(wilt62.ppg - 50.4) < 0.05, `Wilt 1962: expected 50.4 ppg, got ${r2(wilt62.ppg)}`);
    const mj87 = famous('Michael Jordan', 1987);
    assert(mj87.games === 82, `Jordan 1987: expected 82 games, got ${mj87.games}`);
    assert(Math.abs(mj87.ppg - 37.1) < 0.05, `Jordan 1987: expected 37.1 ppg, got ${r2(mj87.ppg)}`);
    const curry16 = famous('Stephen Curry', 2016);
    assert(curry16.games === 79, `Curry 2016: expected 79 games, got ${curry16.games}`);
    assert(Math.abs(curry16.ppg - 30.1) < 0.05, `Curry 2016: expected 30.1 ppg, got ${r2(curry16.ppg)}`);
    const sga25 = famous('Shai Gilgeous-Alexander', 2025);
    assert(Math.abs(sga25.ppg - 32.7) < 0.05, `SGA 2025: expected 32.7 ppg, got ${r2(sga25.ppg)}`);

    // primary expectation: pooled bucket means
    const buckets: SeasonAgg[][] = BUCKET_EDGES.map(() => []);
    for (const s of pool) buckets[bucketIndex(s.ppg)].push(s);
    const bucketMeanCv = buckets.map((b) => b.reduce((a, s) => a + s.cv, 0) / b.length);
    buckets.forEach((b, i) => {
      assert(
        b.length >= MIN_BUCKET_SEASONS,
        `bucket ${bucketLabel(i)} has only ${b.length} seasons (< ${MIN_BUCKET_SEASONS})`,
      );
    });
    for (const s of pool) {
      s.expCv = bucketMeanCv[bucketIndex(s.ppg)];
      s.ci = (s.expCv - s.cv) * 100;
    }

    // reconciliation asserts (matched-baseline rule)
    const residualSum = pool.reduce((a, s) => a + (s.expCv - s.cv), 0);
    assert(
      Math.abs(residualSum) < 1e-6 * pool.length,
      `residuals do not sum to zero: ${residualSum}`,
    );
    const weightedExp = buckets.reduce((a, b, i) => a + b.length * bucketMeanCv[i], 0) / pool.length;
    const poolMeanCv = pool.reduce((a, s) => a + s.cv, 0) / pool.length;
    assert(
      Math.abs(weightedExp - poolMeanCv) < 1e-9,
      `bucket-weighted mean expCv (${weightedExp}) != pool mean cv (${poolMeanCv})`,
    );

    // decade-adjusted expectation for robustness reporting
    const decadeCells = new Map<string, { sum: number; n: number }>();
    const decadeOf = (season: number) => Math.floor(season / 10) * 10;
    for (const s of pool) {
      const key = `${decadeOf(s.season)}|${bucketIndex(s.ppg)}`;
      const cell = decadeCells.get(key) ?? { sum: 0, n: 0 };
      cell.sum += s.cv;
      cell.n++;
      decadeCells.set(key, cell);
    }
    for (const s of pool) {
      const cell = decadeCells.get(`${decadeOf(s.season)}|${bucketIndex(s.ppg)}`)!;
      s.expCvDecade = cell.n >= DECADE_CELL_MIN ? cell.sum / cell.n : s.expCv;
      s.ciDecade = (s.expCvDecade - s.cv) * 100;
    }

    // ---- careers: games-weighted mean over qualifying seasons ----
    interface CareerAgg {
      personId: number;
      name: string;
      qualSeasons: number;
      games: number;
      ppg: number;
      cv: number;
      expCv: number;
      ci: number;
      ciDecade: number;
      boomShare: number;
      bustShare: number;
      firstSeason: number;
      lastSeason: number;
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
      const games = seasons.reduce((a, s) => a + s.games, 0);
      const w = (pick: (s: SeasonAgg) => number) =>
        seasons.reduce((a, s) => a + pick(s) * s.games, 0) / games;
      careers.push({
        personId: seasons[0].personId,
        name: seasons[0].name,
        qualSeasons: seasons.length,
        games,
        ppg: w((s) => s.ppg),
        cv: w((s) => s.cv),
        expCv: w((s) => s.expCv),
        ci: w((s) => s.ci),
        ciDecade: w((s) => s.ciDecade),
        boomShare: w((s) => s.boomShare),
        bustShare: w((s) => s.bustShare),
        firstSeason: Math.min(...seasons.map((s) => s.season)),
        lastSeason: Math.max(...seasons.map((s) => s.season)),
      });
    }

    // robustness: top-10 overlap between primary and decade-adjusted rankings
    const overlap = (xs: { personId: number; season?: number }[], ys: { personId: number; season?: number }[]) => {
      const key = (v: { personId: number; season?: number }) => `${v.personId}|${v.season ?? ''}`;
      const set = new Set(xs.map(key));
      return ys.filter((y) => set.has(key(y))).length;
    };
    const top10 = <T,>(list: T[], by: (v: T) => number, dir: 1 | -1) =>
      [...list].sort((a, b) => dir * (by(b) - by(a))).slice(0, 10);
    const robustness = {
      seasonSteady: overlap(
        top10(leaderboardPool, (s) => s.ci, 1),
        top10(leaderboardPool, (s) => s.ciDecade, 1),
      ),
      seasonVolatile: overlap(
        top10(leaderboardPool, (s) => s.ci, -1),
        top10(leaderboardPool, (s) => s.ciDecade, -1),
      ),
      careerSteady: overlap(top10(careers, (c) => c.ci, 1), top10(careers, (c) => c.ciDecade, 1)),
      careerVolatile: overlap(top10(careers, (c) => c.ci, -1), top10(careers, (c) => c.ciDecade, -1)),
    };
    for (const [k, v] of Object.entries(robustness)) {
      assert(v >= 5, `decade-robustness overlap ${k} is ${v} (< 5); the primary ranking is era-fragile`);
    }

    // ---- league trend ----
    const trendBySeason = new Map<number, SeasonAgg[]>();
    for (const s of pool) {
      const arr = trendBySeason.get(s.season) ?? [];
      arr.push(s);
      trendBySeason.set(s.season, arr);
    }
    const seasonTrend = [...trendBySeason.entries()]
      .filter(([, list]) => list.length >= MIN_TREND_QUALIFIERS)
      .sort((a, b) => a[0] - b[0])
      .map(([season, list]) => ({
        season,
        qualifiers: list.length,
        medianCv: r3(median(list.map((s) => s.cv).sort((a, b) => a - b))),
        medianPpg: r1(median(list.map((s) => s.ppg).sort((a, b) => a - b))),
        medianBoomShare: r3(median(list.map((s) => s.boomShare).sort((a, b) => a - b))),
      }));
    const excludedTrendSeasons = [...trendBySeason.entries()].filter(
      ([, list]) => list.length < MIN_TREND_QUALIFIERS,
    );
    if (excludedTrendSeasons.length) {
      console.log(
        `Trend seasons excluded (< ${MIN_TREND_QUALIFIERS} qualifiers): ${excludedTrendSeasons
          .map(([s, l]) => `${s}(${l.length})`)
          .join(', ')}`,
      );
    }

    // ---- 20-point streaks (career, date-ordered, played games only) ----
    interface Streak {
      personId: number;
      name: string;
      games: number;
      startSeason: number;
      endSeason: number;
      startDate: string;
      endDate: string;
      ppgDuring: number;
    }
    const allStreaks: Streak[] = [];
    for (const p of players.values()) {
      if (mergedIdentityPlayers.has(p.id)) continue;
      const games = [...p.byGameId.values()]
        .filter((g) => g.season >= MIN_SEASON)
        .sort((a, b) => a.date.localeCompare(b.date));
      let run: GameRow[] = [];
      const flush = () => {
        if (run.length >= 25) {
          allStreaks.push({
            personId: p.id,
            name: p.name,
            games: run.length,
            startSeason: run[0].season,
            endSeason: run[run.length - 1].season,
            startDate: run[0].date,
            endDate: run[run.length - 1].date,
            ppgDuring: r1(run.reduce((a, g) => a + g.pts, 0) / run.length),
          });
        }
        run = [];
      };
      for (const g of games) {
        if (g.pts >= STREAK_THRESHOLD) run.push(g);
        else flush();
      }
      flush();
    }
    // keep each player's best streak only, then top 10
    const bestByPlayer = new Map<number, Streak>();
    for (const s of allStreaks) {
      const prev = bestByPlayer.get(s.personId);
      if (!prev || s.games > prev.games) bestByPlayer.set(s.personId, s);
    }
    const streaks20 = [...bestByPlayer.values()].sort((a, b) => b.games - a.games).slice(0, 10);
    if (EXPECTED_TOP_STREAK) {
      assert(
        streaks20[0].name === EXPECTED_TOP_STREAK.name && streaks20[0].games === EXPECTED_TOP_STREAK.games,
        `top streak: expected ${EXPECTED_TOP_STREAK.name} ${EXPECTED_TOP_STREAK.games}, got ${streaks20[0].name} ${streaks20[0].games}`,
      );
    } else {
      console.log(`PIN EXPECTED_TOP_STREAK: { name: '${streaks20[0].name}', games: ${streaks20[0].games} }`);
    }

    // ---- pinned counts ----
    const pinCount = (label: string, expected: number | null, actual: number) => {
      if (expected === null) console.log(`PIN ${label}: ${actual}`);
      else assert(expected === actual, `${label}: expected ${expected}, got ${actual}`);
    };
    pinCount('EXPECTED_POOL_SEASONS', EXPECTED_POOL_SEASONS, pool.length);
    pinCount('EXPECTED_LEADERBOARD_SEASONS', EXPECTED_LEADERBOARD_SEASONS, leaderboardPool.length);
    pinCount('EXPECTED_CAREER_ELIGIBLE', EXPECTED_CAREER_ELIGIBLE, careers.length);

    // ---- leaderboards ----
    const seasonOut = (s: SeasonAgg) => ({
      personId: s.personId,
      name: s.name,
      season: s.season,
      team: s.team,
      games: s.games,
      ppg: r1(s.ppg),
      sd: r2(s.sd),
      cv: r3(s.cv),
      expCv: r3(s.expCv),
      ci: r2(s.ci),
      boomShare: r3(s.boomShare),
      bustShare: r3(s.bustShare),
    });
    const careerOut = (c: CareerAgg) => ({
      personId: c.personId,
      name: c.name,
      qualSeasons: c.qualSeasons,
      games: c.games,
      ppg: r1(c.ppg),
      cv: r3(c.cv),
      expCv: r3(c.expCv),
      ci: r2(c.ci),
      boomShare: r3(c.boomShare),
      bustShare: r3(c.bustShare),
      firstSeason: c.firstSeason,
      lastSeason: c.lastSeason,
    });
    const mostConsistentSeasons = [...leaderboardPool].sort((a, b) => b.ci - a.ci).slice(0, 15).map(seasonOut);
    const mostVolatileSeasons = [...leaderboardPool].sort((a, b) => a.ci - b.ci).slice(0, 15).map(seasonOut);
    const mostConsistentCareers = [...careers].sort((a, b) => b.ci - a.ci).slice(0, 15).map(careerOut);
    const mostVolatileCareers = [...careers].sort((a, b) => a.ci - b.ci).slice(0, 15).map(careerOut);

    // ---- matched-PPG highlight seasons (used by scatter + distribution) ----
    const highlight = HIGHLIGHT_SEASONS.map(([id, season]) => {
      const s = pool.find((x) => x.personId === id && x.season === season);
      assert(!!s, `HIGHLIGHT_SEASONS: ${id} ${season} not in pool`);
      return s;
    });
    if (highlight.length >= 2) {
      const ppgs = highlight.map((s) => s.ppg);
      assert(
        Math.max(...ppgs) - Math.min(...ppgs) < 1.5,
        `HIGHLIGHT_SEASONS ppg spread ${r2(Math.max(...ppgs) - Math.min(...ppgs))} >= 1.5; comparison is not matched`,
      );
    } else {
      console.log('\nHIGHLIGHT_SEASONS is empty. Candidates (pool, ppg 23-31, extreme ci):');
      const band = pool.filter((s) => s.ppg >= 23 && s.ppg <= 31);
      const cands = [...band].sort((a, b) => b.ci - a.ci);
      for (const s of cands.slice(0, 6))
        console.log(`  steady:  [${s.personId}, ${s.season}]  ${s.name} ${s.season}: ${r1(s.ppg)} ppg, ci ${r2(s.ci)}`);
      for (const s of cands.slice(-6).reverse())
        console.log(`  streaky: [${s.personId}, ${s.season}]  ${s.name} ${s.season}: ${r1(s.ppg)} ppg, ci ${r2(s.ci)}`);
    }

    // ---- scatter ----
    const cvScatterPool = pool.map(
      (s) => [r2(s.ppg), r3(s.cv), s.name, s.season] as [number, number, string, number],
    );
    const namedSet = new Map<string, SeasonAgg>();
    for (const s of [...leaderboardPool].sort((a, b) => b.ci - a.ci).slice(0, 8)) namedSet.set(`${s.personId}|${s.season}`, s);
    for (const s of [...leaderboardPool].sort((a, b) => a.ci - b.ci).slice(0, 8)) namedSet.set(`${s.personId}|${s.season}`, s);
    for (const s of [wilt62, mj87, curry16, sga25, ...highlight]) namedSet.set(`${s.personId}|${s.season}`, s);
    const cvScatterNamed = [...namedSet.values()].map((s) => ({
      personId: s.personId,
      name: s.name,
      season: s.season,
      ppg: r2(s.ppg),
      cv: r3(s.cv),
    }));

    // ---- curve ----
    const cvCurve = buckets.map((b, i) => ({
      label: bucketLabel(i),
      minPpg: BUCKET_EDGES[i],
      maxPpg: i === BUCKET_EDGES.length - 1 ? null : BUCKET_EDGES[i + 1],
      seasons: b.length,
      meanCv: r3(bucketMeanCv[i]),
    }));

    // ---- matched-PPG distribution comparison ----
    const BIN_WIDTH = 5;
    const BIN_COUNT = 11; // 0-4 ... 45-49, 50+
    const distributionBinLabels = Array.from({ length: BIN_COUNT }, (_, i) =>
      i === BIN_COUNT - 1 ? '50+' : `${i * BIN_WIDTH}-${i * BIN_WIDTH + BIN_WIDTH - 1}`,
    );
    const distributionPlayers = highlight.map((s) => {
      const bins = new Array(BIN_COUNT).fill(0);
      for (const p of s.pts) bins[Math.min(Math.floor(p / BIN_WIDTH), BIN_COUNT - 1)]++;
      return {
        personId: s.personId,
        name: s.name,
        season: s.season,
        team: s.team,
        games: s.games,
        ppg: r1(s.ppg),
        sd: r2(s.sd),
        cv: r3(s.cv),
        ci: r2(s.ci),
        boomShare: r3(s.boomShare),
        bustShare: r3(s.bustShare),
        bins,
      };
    });

    // ---- league context ----
    const bucket15 = cvCurve[0];
    const bucket30 = cvCurve[cvCurve.length - 1];
    const leagueContext = {
      poolSeasons: pool.length,
      leaderboardSeasons: leaderboardPool.length,
      players: byPlayer.size,
      careerEligible: careers.length,
      firstSeason: Math.min(...pool.map((s) => s.season)),
      lastSeason: Math.max(...pool.map((s) => s.season)),
      meanCv: r3(poolMeanCv),
      cvAt15to17: bucket15.meanCv,
      cvAt30plus: bucket30.meanCv,
      minPpgPool: MIN_PPG_POOL,
      minPpgLeaderboard: MIN_PPG_LEADERBOARD,
      minCareerSeasons: MIN_CAREER_SEASONS,
      decadeRobustness: robustness,
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

    const file = `// app/data/scoringConsistencyData.ts
//
// GENERATED by scripts/generate-scoring-consistency-data.ts. Do not hand-edit.
// Night-to-night scoring volatility computed from data/PlayerStatistics.csv
// game logs (Kaggle, Eoin A Moore, CC0). Regular season only (gameId prefix 2),
// seasons ${MIN_SEASON}+ only: the per-game logs are partial before 1954-55.
// Per qualifying player-season: mean, sample SD (n-1), CV = SD / mean over
// played games. Because CV mechanically falls as the scoring mean rises, each
// season is compared with the mean CV of its PPG bucket pooled across history;
// Consistency Index ci = (expCv - cv) * 100, positive = steadier than expected
// at that scoring level. Careers are games-weighted means over qualifying
// seasons (>= ${MIN_CAREER_SEASONS}). Points are complete in every era; minutes and shot
// attempts are not (pre-1980), so nothing here is per-minute or per-attempt.
// Current through the ${Math.max(...pool.map((s) => s.season))} season.

export interface ConsistencySeason {
  personId: number;
  name: string;
  season: number;
  team: string;
  games: number;
  ppg: number;
  sd: number;
  cv: number;
  expCv: number;
  ci: number;
  boomShare: number;
  bustShare: number;
}

export interface ConsistencyCareer {
  personId: number;
  name: string;
  qualSeasons: number;
  games: number;
  ppg: number;
  cv: number;
  expCv: number;
  ci: number;
  boomShare: number;
  bustShare: number;
  firstSeason: number;
  lastSeason: number;
}

export interface CvCurvePoint {
  label: string;
  minPpg: number;
  maxPpg: number | null;
  seasons: number;
  meanCv: number;
}

export interface SeasonTrendPoint {
  season: number;
  qualifiers: number;
  medianCv: number;
  medianPpg: number;
  medianBoomShare: number;
}

export interface NamedScatterSeason {
  personId: number;
  name: string;
  season: number;
  ppg: number;
  cv: number;
}

export interface DistributionPlayer {
  personId: number;
  name: string;
  season: number;
  team: string;
  games: number;
  ppg: number;
  sd: number;
  cv: number;
  ci: number;
  boomShare: number;
  bustShare: number;
  bins: number[];
}

export interface StreakRow {
  personId: number;
  name: string;
  games: number;
  startSeason: number;
  endSeason: number;
  startDate: string;
  endDate: string;
  ppgDuring: number;
}

export const leagueContext = ${JSON.stringify(leagueContext, null, 2).replace(/"([a-zA-Z0-9_]+)":/g, '$1:')};

export const cvCurve: CvCurvePoint[] = [
${emitList(cvCurve)},
];

// [ppg, cv, name, season] for every pool season, so any dot can be identified on hover
export const cvScatterPool: [number, number, string, number][] = ${JSON.stringify(cvScatterPool)};

export const cvScatterNamed: NamedScatterSeason[] = [
${emitList(cvScatterNamed)},
];

export const mostConsistentSeasons: ConsistencySeason[] = [
${emitList(mostConsistentSeasons)},
];

export const mostVolatileSeasons: ConsistencySeason[] = [
${emitList(mostVolatileSeasons)},
];

export const mostConsistentCareers: ConsistencyCareer[] = [
${emitList(mostConsistentCareers)},
];

export const mostVolatileCareers: ConsistencyCareer[] = [
${emitList(mostVolatileCareers)},
];

export const seasonTrend: SeasonTrendPoint[] = [
${emitList(seasonTrend)},
];

export const distributionBinLabels: string[] = ${JSON.stringify(distributionBinLabels)};

export const distributionPlayers: DistributionPlayer[] = [
${emitList(distributionPlayers)},
];

export const streaks20: StreakRow[] = [
${emitList(streaks20)},
];
`;
    assert(file.length < MAX_FILE_BYTES, `output is ${file.length} bytes (>= ${MAX_FILE_BYTES})`);
    writeFileSync(OUTPUT_PATH, file);
    console.log(`\nWrote ${OUTPUT_PATH} (${file.length} bytes)`);

    // ---- console summary ----
    console.log('\nGames thresholds by season (only where < 58):');
    const thresholdLines = [...minGamesBySeason.entries()]
      .filter(([, v]) => v < GAMES_CAP)
      .sort((a, b) => a[0] - b[0])
      .map(([s, v]) => `${s}:${v}`);
    console.log(`  ${thresholdLines.join('  ') || '(none)'}`);
    console.log('\nCV-vs-PPG curve:');
    for (const c of cvCurve) console.log(`  ${c.label}: meanCv ${c.meanCv} over ${c.seasons} seasons`);
    console.log('\nLeague context:', leagueContext);
    console.log('\nMost consistent seasons (ppg >= 20):');
    mostConsistentSeasons.forEach((s, i) =>
      console.log(`  ${i + 1}. ${s.name} ${s.season} (${s.team}): ${s.ppg} ppg, sd ${s.sd}, cv ${s.cv}, ci +${s.ci}`),
    );
    console.log('\nMost volatile seasons (ppg >= 20):');
    mostVolatileSeasons.forEach((s, i) =>
      console.log(`  ${i + 1}. ${s.name} ${s.season} (${s.team}): ${s.ppg} ppg, sd ${s.sd}, cv ${s.cv}, ci ${s.ci}`),
    );
    console.log('\nMost consistent careers:');
    mostConsistentCareers.forEach((c, i) =>
      console.log(`  ${i + 1}. ${c.name} (${c.firstSeason}-${c.lastSeason}): ${c.ppg} ppg, ${c.qualSeasons} seasons, ci +${c.ci}`),
    );
    console.log('\nMost volatile careers:');
    mostVolatileCareers.forEach((c, i) =>
      console.log(`  ${i + 1}. ${c.name} (${c.firstSeason}-${c.lastSeason}): ${c.ppg} ppg, ${c.qualSeasons} seasons, ci ${c.ci}`),
    );
    console.log('\n20-point streaks:');
    streaks20.forEach((s, i) =>
      console.log(`  ${i + 1}. ${s.name}: ${s.games} games (${s.startDate} to ${s.endDate}), ${s.ppgDuring} ppg during`),
    );
    console.log('\nDecade robustness (top-10 overlap):', robustness);
    console.log(
      `\nTrend endpoints: ${seasonTrend[0].season} medianCv ${seasonTrend[0].medianCv} (${seasonTrend[0].qualifiers} q) -> ${seasonTrend[seasonTrend.length - 1].season} medianCv ${seasonTrend[seasonTrend.length - 1].medianCv} (${seasonTrend[seasonTrend.length - 1].qualifiers} q)`,
    );
    const trendByDecade = new Map<number, number[]>();
    for (const t of seasonTrend) {
      const d = Math.floor(t.season / 10) * 10;
      const arr = trendByDecade.get(d) ?? [];
      arr.push(t.medianCv);
      trendByDecade.set(d, arr);
    }
    console.log('Median CV by decade:');
    for (const [d, vals] of [...trendByDecade.entries()].sort((a, b) => a[0] - b[0]))
      console.log(`  ${d}s: ${r3(vals.reduce((a, b) => a + b, 0) / vals.length)}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
