// app/articles/_components/ChrisPaulArticle.tsx
//
// Interactive body of the Chris Paul retirement article
// (articles.component_key = 'chris-paul'). Data: app/data/chrisPaulData.ts.
//
// The argument: the late-career collapse was scoring only. Per-36 rates show the
// assist rate held inside one band for 21 seasons while the scoring rate fell off,
// and the totals land second all time in both assists and steals.

'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { seasons, leaders, context } from '@/app/data/chrisPaulData';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Legend, Tooltip);

interface ChartTheme {
  series: string;
  secondary: string;
  track: string;
  ring: string;
  text: string;
  grid: string;
  tooltip: {
    backgroundColor: string;
    titleColor: string;
    bodyColor: string;
    borderColor: string;
  };
}

// The site's chart blue (#2a78d6 / #3987e5, as in GreatestDuosArticle and
// PlayoffRisersArticle) plus the emerald that matches the logo green, and the same
// #cde2fb / #1c3f6e track tint those articles use for the un-highlighted bar.
// Validated as an adjacent pair on both surfaces: light dE 21.2 normal / 20.1 protan,
// dark 21.0 / 19.5. Floor is 15 normal, 8 CVD. Blue against green is weak under
// tritanopia (4.2 / 5.0), so both the legend and the tooltip name each series in text
// rather than leaving identity to color alone.
const LIGHT: ChartTheme = {
  series: '#2a78d6',
  secondary: '#059669',
  track: '#cde2fb',
  ring: '#F9FAFB',
  text: '#4B5563',
  grid: '#E5E7EB',
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    titleColor: '#1F2937',
    bodyColor: '#4B5563',
    borderColor: '#E5E7EB',
  },
};

const DARK: ChartTheme = {
  series: '#3987e5',
  secondary: '#059669',
  track: '#1c3f6e',
  ring: '#0F172A',
  text: '#94A3B8',
  grid: '#1E293B',
  tooltip: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    titleColor: '#F1F5F9',
    bodyColor: '#94A3B8',
    borderColor: '#334155',
  },
};

// Dark mode is Tailwind's default media strategy, so watch the media query.
function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(LIGHT);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setTheme(mq.matches ? DARK : LIGHT);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return theme;
}

function ChartCard({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="mt-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700/50">
      {children}
      <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">{caption}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4 mt-10">
      {children}
    </h2>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-slate-400">
      {children}
    </div>
  );
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sky-600 dark:text-sky-400 hover:underline">
      {children}
    </Link>
  );
}

// Matches ArticleSources' link rel for external citations.
function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-sky-600 dark:text-sky-400 hover:underline"
    >
      {children}
    </a>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString('en-US');
// Per-game rates keep their decimal even when they land on a whole number, so a 2.0
// steal average does not read as "2".
const rate = (n: number) => n.toFixed(1);

const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth'];
const ordinal = (n: number) => ORDINALS[n] ?? `${n}th`;

// Derived in one place so the prose and the charts read the same values.
const stockton = leaders[0];
const lastThree = seasons.slice(-3);
const preSlide = seasons.slice(0, seasons.length - lastThree.length);
const scoringFloorPer36 = Math.min(...preSlide.map((s) => s.pointsPer36));
const assistBandLow = Math.min(...seasons.map((s) => s.assistsPer36));
const assistBandHigh = Math.max(...seasons.map((s) => s.assistsPer36));

/* 1. The arc. Points and assists share one axis: both are per-game counting stats in
   the same unit, so a second scale would be a lie about their relative size. */
function CareerArcChart({ theme }: { theme: ChartTheme }) {
  const labels = seasons.map((s) => s.label);
  // Direct-label only the two turning points the prose names, never every point.
  const annotated = new Set([context.peakScoringLabel, context.finalSeasonLabel]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Points per game',
        data: seasons.map((s) => s.pointsPerGame),
        borderColor: theme.series,
        backgroundColor: theme.series,
        pointStyle: 'circle' as const,
        borderWidth: 2,
        pointRadius: seasons.map((s) => (annotated.has(s.label) ? 5 : 3)),
        pointHoverRadius: 7,
        pointBorderColor: theme.ring,
        pointBorderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Assists per game',
        data: seasons.map((s) => s.assistsPerGame),
        borderColor: theme.secondary,
        backgroundColor: theme.secondary,
        pointStyle: 'circle' as const,
        borderWidth: 2,
        pointRadius: seasons.map((s) => (annotated.has(s.label) ? 5 : 3)),
        pointHoverRadius: 7,
        pointBorderColor: theme.ring,
        pointBorderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { color: theme.text, boxWidth: 12, boxHeight: 12, usePointStyle: true },
      },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => {
            const season = seasons[items[0].dataIndex];
            return `${season.label}, ${season.team}`;
          },
          afterBody: (items: TooltipItem<'line'>[]) => {
            const season = seasons[items[0].dataIndex];
            return `${season.games} games, ${season.minutesPerGame} min per game`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme.text,
          maxRotation: 90,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 11,
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        title: { display: true, text: 'Per game', color: theme.text },
      },
    },
  };

  return (
    <div className="h-80 sm:h-96">
      <Line data={data} options={options} />
    </div>
  );
}

/* 2. The centerpiece: per-36 rates strip the shrinking minutes out. Same palette and
   axis discipline as the arc chart so the two read as one argument. */
function Per36Chart({ theme }: { theme: ChartTheme }) {
  const labels = seasons.map((s) => s.label);
  // Enlarge only the seasons the prose names: the scoring-rate peak, the passing-rate
  // peak, and the final season where the lines cross.
  const scoringAnnotated = new Set([context.peakScoringRateLabel, context.finalSeasonLabel]);
  const assistAnnotated = new Set([context.peakAssistRateLabel, context.finalSeasonLabel]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Points per 36',
        data: seasons.map((s) => s.pointsPer36),
        borderColor: theme.series,
        backgroundColor: theme.series,
        pointStyle: 'circle' as const,
        borderWidth: 2,
        pointRadius: seasons.map((s) => (scoringAnnotated.has(s.label) ? 5 : 3)),
        pointHoverRadius: 7,
        pointBorderColor: theme.ring,
        pointBorderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Assists per 36',
        data: seasons.map((s) => s.assistsPer36),
        borderColor: theme.secondary,
        backgroundColor: theme.secondary,
        pointStyle: 'circle' as const,
        borderWidth: 2,
        pointRadius: seasons.map((s) => (assistAnnotated.has(s.label) ? 5 : 3)),
        pointHoverRadius: 7,
        pointBorderColor: theme.ring,
        pointBorderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { color: theme.text, boxWidth: 12, boxHeight: 12, usePointStyle: true },
      },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => {
            const season = seasons[items[0].dataIndex];
            return `${season.label}, ${season.team}`;
          },
          afterBody: (items: TooltipItem<'line'>[]) => {
            const season = seasons[items[0].dataIndex];
            return `${season.games} games, ${season.minutesPerGame} min per game`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme.text,
          maxRotation: 90,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 11,
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        title: { display: true, text: 'Per 36 minutes', color: theme.text },
      },
    },
  };

  return (
    <div className="h-80 sm:h-96">
      <Line data={data} options={options} />
    </div>
  );
}

/* 3. The all-time assist leaderboard, Paul highlighted. One measure, one axis; steals
   and points live in the table below rather than on a second scale. */
function LeadersChart({ theme }: { theme: ChartTheme }) {
  const labels = leaders.map((p) => p.name);
  const data = {
    labels,
    datasets: [
      {
        label: 'Career assists',
        data: leaders.map((p) => p.assists),
        backgroundColor: leaders.map((p) =>
          p.name === 'Chris Paul' ? theme.series : theme.track,
        ),
        borderColor: leaders.map((p) => (p.name === 'Chris Paul' ? theme.series : theme.track)),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      // One series: the heading names it, so a legend box would be noise.
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const p = leaders[item.dataIndex];
            return `${fmt(p.assists)} assists in ${fmt(p.games)} games (${p.assistsPerGame} per game)`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: theme.text, callback: (v) => fmt(Number(v)) },
        grid: { color: theme.grid },
      },
      y: { ticks: { color: theme.text }, grid: { display: false } },
    },
  };

  return (
    <div className="h-72 sm:h-80">
      <Bar data={data} options={options} />
    </div>
  );
}

export default function ChrisPaulArticle() {
  const theme = useChartTheme();

  return (
    <div>
      <Prose>
        <p>
          Chris Paul&apos;s last season was {context.finalGames} games long. He played{' '}
          {rate(context.finalMinutesPerGame)} minutes a night and scored{' '}
          {rate(context.finalPointsPerGame)} points, back with the {context.finalTeam}, the
          franchise where he spent six seasons of his prime. From a distance it reads like the
          usual ending for a great player, the part everyone agrees to forget. Up close the
          numbers say something stranger: the scoring left, and almost nothing else did.
        </p>
        <p>
          He retires with {fmt(context.points)} points, {fmt(context.assists)} assists and{' '}
          {fmt(context.steals)} steals across {context.seasonCount} seasons and{' '}
          {context.teamCount} franchises. Exactly one player in league history finished with more
          assists, and exactly one finished with more steals. Both are John Stockton, and Paul
          outscored him by {fmt(context.points - stockton.points)} points.
        </p>
      </Prose>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <StatTile
          label="Points"
          value={fmt(context.points)}
          sub={`${rate(context.pointsPerGame)} per game`}
        />
        <StatTile
          label="Assists"
          value={fmt(context.assists)}
          sub={`${ordinal(context.assistsAllTimeRank)} all time`}
        />
        <StatTile
          label="Steals"
          value={fmt(context.steals)}
          sub={`${ordinal(context.stealsAllTimeRank)} all time`}
        />
        <StatTile
          label="Games"
          value={fmt(context.games)}
          sub={`${context.seasonCount} seasons, ${context.teamCount} franchises`}
        />
      </div>

      <SectionHeading>Twenty-one seasons, one line</SectionHeading>
      <Prose>
        <p>
          He arrived in {context.firstSeasonLabel} scoring {rate(context.rookiePointsPerGame)}{' '}
          points a game and taking the ball away {context.rookieStealsPerGame.toFixed(2)} times a
          night, and by his fourth season he was the most complete guard in the sport:{' '}
          {rate(context.peakScoringPoints)} points and {rate(context.peakScoringAssists)} assists
          a game in {context.peakScoringLabel}, one year after his passing peak of{' '}
          {rate(context.peakAssistsPerGame)} assists a game in {context.peakAssistsLabel}.
        </p>
        <p>
          The middle of the chart is the long Clippers plateau, a decade of seasons that vary by
          a possession or two. The right edge is what this article is about. The line does not
          taper. It drops.
        </p>
      </Prose>
      <ChartCard caption={`Regular season per-game scoring and assists, ${context.firstSeasonLabel} through ${context.finalSeasonLabel}. Both series are per-game counting stats, so they share one axis. Hover any season for team, games and minutes.`}>
        <CareerArcChart theme={theme} />
      </ChartCard>

      <SectionHeading>He stopped shooting. He never stopped passing.</SectionHeading>
      <Prose>
        <p>
          The easy read of that chart is ordinary decline: fewer minutes, so fewer of everything.
          Per-36 rates strip the minutes out, and they split the career in two.
        </p>
        <p>
          The scoring really did collapse. Across his first {preSlide.length} seasons Paul never
          scored fewer than {rate(scoringFloorPer36)} points per 36 minutes. Over the last three
          the rate fell to {rate(lastThree[0].pointsPer36)}, then {rate(lastThree[1].pointsPer36)},
          then {rate(lastThree[2].pointsPer36)}. That is not a shooter losing his legs by inches.
          That is a player taking himself out of the offense on purpose.
        </p>
        <p>
          The passing never followed. His assist rate spent all {context.seasonCount} seasons
          inside a band from {rate(assistBandLow)} to {rate(assistBandHigh)} per 36, and the top
          of the band is not where you would guess: his best passing-rate season was his{' '}
          {ordinal(context.peakAssistRateSeasonNumber)}, {rate(context.peakAssistRatePer36)}{' '}
          assists per 36 for the {context.peakAssistRateTeam} in {context.peakAssistRateLabel}.
          Even the final season, at {rate(context.finalMinutesPerGame)} minutes a night, produced{' '}
          {rate(context.finalAssistsPer36)} assists per 36, a better rate than his rookie year&apos;s{' '}
          {rate(context.rookieAssistsPer36)}. His closing line is the rarest kind of box score:
          more assists than points.
        </p>
      </Prose>
      <ChartCard caption="Points and assists per 36 minutes, computed from summed season totals rather than rounded per-game figures. The scoring rate falls below the passing band in the final season; the passing rate never leaves it.">
        <Per36Chart theme={theme} />
      </ChartCard>

      <SectionHeading>Where the totals land</SectionHeading>
      <Prose>
        <p>
          Rank him against everyone, not a curated peer group. Across every player career in the
          database, Paul finishes {ordinal(context.assistsAllTimeRank)} all time in assists,{' '}
          {fmt(context.assistsBehindLeader)} behind {context.assistLeaderName}, and{' '}
          {ordinal(context.stealsAllTimeRank)} all time in steals, behind Stockton again by{' '}
          {fmt(stockton.steals - context.steals)}.
        </p>
        <p>
          The company at the top of the assist list is the sharper point. Of the{' '}
          {context.leaderCount} names on it, only LeBron James and Russell Westbrook scored more
          than Paul&apos;s {fmt(context.points)} points, and neither of them held a nine-assist
          average across two decades. Nobody else in the top {context.leaderCount} comes within
          three thousand points of him.
        </p>
      </Prose>
      <ChartCard caption="Career regular season assists, all time top eight, computed from every player career in the database. Steals and points are in the table below rather than on a second axis.">
        <LeadersChart theme={theme} />
      </ChartCard>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-4 font-medium text-right">#</th>
              <th className="py-2 pr-4 font-medium">Player</th>
              <th className="py-2 pr-4 font-medium text-right">Games</th>
              <th className="py-2 pr-4 font-medium text-right">Points</th>
              <th className="py-2 pr-4 font-medium text-right">Assists</th>
              <th className="py-2 font-medium text-right">Steals</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((p, i) => (
              <tr
                key={p.personId}
                className={`border-b border-gray-100 dark:border-gray-800 ${
                  p.name === 'Chris Paul'
                    ? 'font-semibold text-slate-900 dark:text-white'
                    : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                <td className="py-2 pr-4 text-right tabular-nums">{i + 1}</td>
                <td className="py-2 pr-4">
                  <A href={`/player/${p.personId}`}>{p.name}</A>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{fmt(p.games)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{fmt(p.points)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{fmt(p.assists)}</td>
                <td className="py-2 text-right tabular-nums">{fmt(p.steals)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeading>Two 82-game seasons, a decade apart</SectionHeading>
      <Prose>
        <p>
          The games total hides the strangest durability arc in the sport. Paul played{' '}
          {fmt(context.games)} games but a full 82 only {context.full82Count} times: once in{' '}
          {context.full82FirstLabel}, in the middle of the Clippers years, and once in{' '}
          {context.full82LastLabel}, his {ordinal(context.full82LastSeasonNumber)} season, for the{' '}
          {context.full82LastTeam}. The player whose health was the league&apos;s annual playoff
          caveat did not miss a game in season twenty. The following fall he signed back with the{' '}
          {context.finalTeam}, where it had peaked, played {context.finalGames} more, and stopped.
        </p>
        <p>
          The postseason sharpened him rather than shrinking him: {context.playoffGames} playoff
          games at {rate(context.playoffPointsPerGame)} points and{' '}
          {rate(context.playoffAssistsPerGame)} assists, against{' '}
          {rate(context.pointsPerGame)} points a game in the regular season. He scored more when
          it counted, for two decades, without the title he spent both of them chasing. Set him
          against the other names on these lists on the{' '}
          <A href="/compare?players=Chris%20Paul,John%20Stockton,Jason%20Kidd,Steve%20Nash">
            comparison page
          </A>
          .
        </p>
      </Prose>

      <SectionHeading>How we counted</SectionHeading>
      <Prose>
        <ul>
          <li>
            <strong>Seasons.</strong> Rows are grouped by season and summed, so a midseason trade
            counts as one season. Per-game and per-36 figures are computed from summed totals,
            never averaged across team rows.
          </li>
          <li>
            <strong>The leaderboard.</strong> All-time ranks come from scanning every player
            career in the database, not from a hand-picked list of point guards. Player-seasons
            summing past 88 games (the single-season record) are dropped as data errors from
            merged player identities.
          </li>
          <li>
            <strong>Steals.</strong> The league only began recording steals in 1973-74, so the
            all-time steals rank covers the seasons the stat exists. Assist and point totals are
            complete in every era.
          </li>
          <li>
            <strong>What this cannot tell you.</strong> Assists count finished plays only. Nothing
            here measures the passes that led to free throws, the defense beyond steals, or the
            organizing work that never reaches a box score.
          </li>
          <li>
            <strong>Source.</strong> Box scores from{' '}
            <Ext href="https://www.kaggle.com/datasets/eoinamoore/historical-nba-data-and-player-box-scores">
              Eoin A Moore&apos;s historical NBA dataset
            </Ext>{' '}
            (CC0 1.0).
          </li>
        </ul>
      </Prose>

      <p className="mt-8 text-sm text-gray-500 dark:text-slate-400">
        All figures are regular season unless noted, from the Hoops Data database, current through
        the 2026 season.
      </p>
    </div>
  );
}
