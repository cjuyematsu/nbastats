// app/articles/_components/HomeCourtArticle.tsx
//
// Interactive body of "Home-Court Advantage" article
// (articles.component_key = 'home-court'). Data: app/data/homeCourtData.ts.
// The argument: the league-wide home edge is real but has been shrinking for
// seventy years, the empty-arena COVID season barely moved it, the free-throw
// edge rose and collapsed on its own arc, and an individual player's home/road
// scoring split is about half repeatable trait and half noise, which the
// permutation null, the split-half test, and the season-extreme tables show.

'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Chart, Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import {
  leagueContext,
  homeWinPctBySeason,
  teamEdgeBySeason,
  decadeSummary,
  careerHomeBoosts,
  careerRoadWarriors,
  famousSplits,
  seasonExtremeHome,
  seasonExtremeRoad,
  halfPairs,
  gapHistogram,
  homeSingleGameRecord,
  roadSingleGameRecord,
  type CareerSplit,
  type SeasonSplit,
} from '@/app/data/homeCourtData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

interface ChartTheme {
  series: string;
  negative: string;
  muted: string;
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

// Blue/red diverging pair validated for both surfaces (lightness band, CVD
// separation, contrast): light #2a78d6/#dc2626, dark #3987e5/#ef4444.
const LIGHT: ChartTheme = {
  series: '#2a78d6',
  negative: '#dc2626',
  muted: 'rgba(42, 120, 214, 0.25)',
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
  negative: '#ef4444',
  muted: 'rgba(57, 135, 229, 0.28)',
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

function playerHref(id: number): string {
  return `/player/${id}`;
}

const signedPct = (v: number, digits = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
const winPct = (v: number) => `${(v * 100).toFixed(1)}%`;

function ChartCard({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700/50">
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
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

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}

function HomeWinChart({ theme }: { theme: ChartTheme }) {
  const labels = homeWinPctBySeason.map((s) => String(s.season));
  const data = {
    labels,
    datasets: [
      {
        type: 'line' as const,
        label: 'Home win rate',
        data: homeWinPctBySeason.map((s) => s.homeWinPct * 100),
        borderColor: theme.series,
        backgroundColor: theme.series,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.25,
      },
      {
        type: 'line' as const,
        label: 'Empty arenas',
        data: homeWinPctBySeason.map((s) => (s.season === 2021 ? s.homeWinPct * 100 : null)),
        borderColor: theme.negative,
        backgroundColor: theme.negative,
        pointRadius: 5,
        pointHoverRadius: 6,
        showLine: false,
      },
    ],
  };
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        // Keep one row only: the red 2021 dot overlaps the line's point, and
        // filtering by dataset instead would empty the tooltip on the dot itself.
        filter: (item: TooltipItem<'line'>, index: number) => index === 0,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => {
            const it = items[0];
            return it ? `Season ${homeWinPctBySeason[it.dataIndex].season}` : '';
          },
          label: (item: TooltipItem<'line'>) => {
            const s = homeWinPctBySeason[item.dataIndex];
            return `Home teams won ${winPct(s.homeWinPct)} of ${s.games.toLocaleString()} games`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme.text, maxTicksLimit: 12, maxRotation: 0 },
        grid: { display: false },
        border: { color: theme.grid },
      },
      y: {
        min: 48,
        max: 80,
        title: { display: true, text: 'Home team win rate (%)', color: theme.text },
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  return (
    <div className="relative h-72 sm:h-80">
      <Line data={data} options={options} />
    </div>
  );
}

function EdgeChart({ theme }: { theme: ChartTheme }) {
  const labels = teamEdgeBySeason.map((s) => String(s.season));
  const data = {
    labels,
    datasets: [
      {
        label: 'Points edge',
        data: teamEdgeBySeason.map((s) => s.ptsEdge),
        borderColor: theme.series,
        backgroundColor: theme.series,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.25,
      },
      {
        label: 'Free-throw attempt edge',
        data: teamEdgeBySeason.map((s) => s.ftaEdge),
        borderColor: theme.negative,
        backgroundColor: theme.negative,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.25,
      },
    ],
  };
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: theme.text } },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => `Season ${items[0]?.label}`,
          label: (item: TooltipItem<'line'>) => {
            const s = teamEdgeBySeason[item.dataIndex];
            return item.datasetIndex === 0
              ? `Home teams scored ${s.homePts} to visitors' ${s.roadPts} (+${s.ptsEdge})`
              : `Home teams attempted ${s.ftaEdge >= 0 ? '+' : ''}${s.ftaEdge} more free throws`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme.text, maxTicksLimit: 12, maxRotation: 0 },
        grid: { display: false },
        border: { color: theme.grid },
      },
      y: {
        title: { display: true, text: 'Home minus road, per game', color: theme.text },
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  return (
    <div className="relative h-72 sm:h-80">
      <Line data={data} options={options} />
    </div>
  );
}

function NoiseHistogram({ theme }: { theme: ChartTheme }) {
  const labels = gapHistogram.map((b) => `${b.lo >= 0 ? '+' : ''}${b.lo}`);
  const data = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Actual careers',
        data: gapHistogram.map((b) => b.observed),
        backgroundColor: theme.muted,
        borderColor: theme.series,
        borderWidth: 1,
        borderRadius: 3,
        borderSkipped: 'start' as const,
      },
      {
        type: 'line' as const,
        label: 'If splits were pure chance',
        data: gapHistogram.map((b) => b.nullExpected),
        borderColor: theme.negative,
        backgroundColor: theme.negative,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.35,
      },
    ],
  };
  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: theme.text } },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items: TooltipItem<'bar' | 'line'>[]) => {
            const b = gapHistogram[items[0]?.dataIndex ?? 0];
            return `Adjusted split ${b.lo >= 0 ? '+' : ''}${b.lo}% to ${b.hi >= 0 ? '+' : ''}${b.hi}%`;
          },
          label: (item: TooltipItem<'bar' | 'line'>) =>
            item.datasetIndex === 0
              ? `${item.parsed.y} careers`
              : `${(item.parsed.y as number).toFixed(1)} expected from chance alone`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Era-adjusted home scoring boost (%)', color: theme.text },
        ticks: { color: theme.text, maxTicksLimit: 11, maxRotation: 0 },
        grid: { display: false },
        border: { color: theme.grid },
      },
      y: {
        title: { display: true, text: 'Careers', color: theme.text },
        ticks: { color: theme.text, precision: 0 },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  return (
    <div className="relative h-72 sm:h-80">
      <Chart<'bar' | 'line', number[], string> type="bar" data={data} options={options} />
    </div>
  );
}

function PersistenceScatter({ theme }: { theme: ChartTheme }) {
  const data = {
    datasets: [
      {
        label: 'Careers',
        data: halfPairs.map((p) => ({ x: p.h1, y: p.h2 })),
        backgroundColor: theme.muted,
        borderColor: theme.series,
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };
  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        filter: (item: TooltipItem<'scatter'>, index: number) => index === 0,
        callbacks: {
          title: (items: TooltipItem<'scatter'>[]) => {
            const it = items[0];
            return it ? halfPairs[it.dataIndex].name : '';
          },
          label: (item: TooltipItem<'scatter'>) =>
            `Half A ${signedPct(item.parsed.x)}, half B ${signedPct(item.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Home boost in half the games (%)', color: theme.text },
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
      y: {
        title: { display: true, text: 'Home boost in the other half (%)', color: theme.text },
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  return (
    <div className="relative h-72 sm:h-80">
      <Scatter data={data} options={options} />
    </div>
  );
}

function adjCell(adjPct: number) {
  return (
    <td
      className={`px-2 lg:px-2.5 py-2 text-right font-semibold ${
        adjPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      {signedPct(adjPct)}
    </td>
  );
}

function CareerTable({ rows }: { rows: CareerSplit[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">Years</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Seasons</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">G</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Home</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Road</th>
            <th className="hidden lg:table-cell px-2.5 py-2 text-right">Gap</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Adj. boost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {rows.map((c) => (
            <tr key={c.personId} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(c.personId)}>{c.name}</A>
              </td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right whitespace-nowrap">
                {c.firstSeason}-{c.lastSeason}
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{c.qualSeasons}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{c.games}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{c.homePpg.toFixed(1)}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{c.roadPpg.toFixed(1)}</td>
              <td className="hidden lg:table-cell px-2.5 py-2 text-right">
                {c.gap >= 0 ? '+' : ''}
                {c.gap.toFixed(1)}
              </td>
              {adjCell(c.adjPct)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeasonTable({ rows }: { rows: SeasonSplit[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Season</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2">Team</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Home</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Road</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Adj. boost</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">Career</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {rows.map((s) => (
            <tr key={`${s.personId}-${s.season}`} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(s.personId)}>{s.name}</A>
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{s.season}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 whitespace-nowrap">{s.team}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{s.homePpg.toFixed(1)}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{s.roadPpg.toFixed(1)}</td>
              {adjCell(s.adjPct)}
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">
                {s.careerAdjPct === null ? 'n/a' : signedPct(s.careerAdjPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HomeCourtArticle() {
  const theme = useChartTheme();
  const ctx = leagueContext;

  const d1950 = decadeSummary[0];
  const d2020 = decadeSummary[decadeSummary.length - 1];
  const peakFta = decadeSummary.reduce((a, b) => (b.ftaEdge > a.ftaEdge ? b : a));
  const realShare = Math.round(((ctx.trueSkillSd ** 2) / (ctx.observedSd ** 2)) * 100);

  const wallace = careerHomeBoosts[0];
  const dantley = careerHomeBoosts.find((c) => c.name === 'Adrian Dantley');
  const samJones = careerRoadWarriors[0];
  const cassell = careerRoadWarriors.find((c) => c.name === 'Sam Cassell');
  const booker = careerRoadWarriors.find((c) => c.name === 'Devin Booker');
  const mj02 = seasonExtremeHome.find((s) => s.name === 'Michael Jordan');
  const payton99 = seasonExtremeHome.find((s) => s.name === 'Gary Payton');
  const tmac = seasonExtremeRoad[0];
  const lebron = famousSplits.find((c) => c.name === 'LeBron James');
  const bird = famousSplits.find((c) => c.name === 'Larry Bird');
  const curry = famousSplits.find((c) => c.name === 'Stephen Curry');
  const negativeFamous = famousSplits.filter((c) => c.adjPct < 0).length;
  const extremePlayers = new Set(
    [...seasonExtremeHome, ...seasonExtremeRoad].map((s) => s.personId),
  ).size;
  const extremeRows = seasonExtremeHome.length + seasonExtremeRoad.length;

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading>The oldest edge in the sport</SectionHeading>
        <Prose>
          <p>
            Home-court advantage is the one prediction basketball has always kept: across
            every game log since 1955, the home team wins more often than it loses, in every
            single season. But the size of that edge has been quietly collapsing for seventy
            years, the loudest explanation for it failed a league-wide natural experiment,
            and the version of it fans argue about most, whether a particular player is a
            homebody or a road warrior, turns out to be about half real and half coin flips.
          </p>
        </Prose>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Home win rate, late 1950s"
            value={winPct(d1950.homeWinPct)}
            sub={`over ${d1950.games.toLocaleString()} games, 1955 through 1959`}
          />
          <StatTile
            label="Home win rate, 2020s"
            value={winPct(d2020.homeWinPct)}
            sub={`over ${d2020.games.toLocaleString()} games and still falling`}
          />
          <StatTile
            label="Empty-arena season"
            value={winPct(ctx.covidWinPct)}
            sub="2020-21, played largely without fans, indistinguishable from its neighbors"
          />
          <StatTile
            label="Player splits that are real"
            value={`~${realShare}%`}
            sub="share of the spread in career home/road splits that survives a permutation test"
          />
        </div>
      </section>

      <section>
        <SectionHeading>Seventy years of shrinking</SectionHeading>
        <Prose>
          <p>
            In the late 1950s the home team won {winPct(d1950.homeWinPct)} of NBA games. In
            the 2020s it wins {winPct(d2020.homeWinPct)}. The decline is not a recent break
            but a slow bleed visible in every decade of the chart below: roughly{' '}
            {winPct(decadeSummary[2].homeWinPct)} in the 1970s,{' '}
            {winPct(decadeSummary[4].homeWinPct)} in the 1990s,{' '}
            {winPct(decadeSummary[6].homeWinPct)} in the 2010s. Plenty of things changed in
            that span in the same direction: charter flights replaced commercial travel,
            schedules spread out, arenas standardized, and the three-point shot made every
            offense more portable. The data cannot pick the winner among those explanations,
            but it can rule one out, which is the next section.
          </p>
          <p>
            The 2020-21 season, played almost entirely in empty or sharply restricted
            arenas, is marked in red. Home teams won {winPct(ctx.covidWinPct)} of those
            games. The seasons on either side of it, with full buildings, came in at{' '}
            {winPct(ctx.covidNeighborsWinPct)} on average. If the crowd were the engine of
            home-court advantage, this was the season it should have vanished. It did not
            budge. Whatever is left of the home edge in the modern game, very little of it
            appears to be the fans.
          </p>
        </Prose>
        <ChartCard>
          <HomeWinChart theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Share of regular-season games won by the home team, 1955 through{' '}
            {ctx.lastSeason}. The red dot is 2020-21, the empty-arena season. Hover for the
            season game counts.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>The scoreboard edge and the whistle</SectionHeading>
        <Prose>
          <p>
            Two per-game gaps tell the mechanism story. The first is simple margin: home
            teams outscored visitors by {d1950.ptsEdge.toFixed(1)} points a game in the late
            1950s and by {d2020.ptsEdge.toFixed(1)} in the 2020s, the same slow bleed as the
            win rate. The second is the whistle. Free-throw attempts are the cleanest
            officiating proxy in the box score, and the home team&apos;s edge in them has
            its own arc: nearly zero in the 1950s, rising through the 1970s to a peak of{' '}
            {peakFta.ftaEdge.toFixed(1)} extra attempts per game in the{' '}
            {peakFta.decade}s, then falling for four straight decades to{' '}
            {d2020.ftaEdge.toFixed(1)} today.
          </p>
          <p>
            That shape carries two lessons. The home edge of the 1950s was enormous while
            its free-throw edge was nearly nonexistent, so the early advantage was not the
            whistle; the brutal travel of that era is the more plausible culprit. And the
            fade since the 1980s tracks the league&apos;s long push toward officiating
            accountability, from published referee reports to replay review. The whistle
            used to lean home, measurably, and now it barely does.
          </p>
        </Prose>
        <ChartCard>
          <EdgeChart theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Home minus road, per team per game: points scored (blue) and free throws
            attempted (red). Regular season, 1955 through {ctx.lastSeason}.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>Is a home/road split even real?</SectionHeading>
        <Prose>
          <p>
            The league-wide edge is settled fact. The player-level version is where fans
            live, though: the teammate who only shows up at home, the scorer who feasts on
            the road. Before naming names, the claim itself needs a test, because a
            home/road split is exactly the kind of statistic that noise manufactures for
            free. Split any player&apos;s games into two random piles and the piles will
            differ; the question is whether they differ more than chance requires, and
            whether the direction repeats.
          </p>
          <p>
            So we measured both, on every career with at least {ctx.minCareerSeasons}{' '}
            qualifying seasons of {ctx.minPpgPool}+ points a game, {ctx.careerEligible}{' '}
            players in all, with each season&apos;s split scored against the average split
            of its own decade so nobody gets credit for playing in 1965. First the chance
            test: shuffle every player&apos;s home and road labels {ctx.permutations} times,
            keeping everything else about their game logs intact, and see how wide the
            spread of career splits comes out when it is noise by construction. The real
            spread is wider, {ctx.observedSd.toFixed(1)} percentage points against{' '}
            {ctx.nullSd.toFixed(1)} from shuffling, which means real home/road tendencies
            exist, but only about {realShare}% of the variance you see in any list of
            career splits is trait and the rest is coin flips. {ctx.beyond2NullSd} players
            sit further than two chance-widths from zero where luck alone would put about{' '}
            {Math.round(ctx.beyond2Expected)}.
          </p>
          <p>
            Second, the repeat test: split each career into alternating halves and ask
            whether the players with big home boosts in one half keep them in the other.
            The correlation is {ctx.splitHalfR.toFixed(2)}, positive and unmistakable but
            modest. A home/road split is a real trait the way a hot streak is a real
            feeling: it exists, and it is much smaller than it looks.
          </p>
        </Prose>
        <ChartCard>
          <NoiseHistogram theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Era-adjusted career home scoring boosts for all {ctx.careerEligible} qualifying
            careers (bars) against the distribution chance alone would produce (red curve).
            The bars are wider than the curve, but not by much.
          </p>
        </ChartCard>
        <ChartCard>
          <PersistenceScatter theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Each dot is one career, its home boost measured separately in two alternating
            halves of the same games. Correlation {ctx.splitHalfR.toFixed(2)}: the trait
            repeats, weakly. Hover any dot for the player.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>Why you should distrust every single-season split</SectionHeading>
        <Prose>
          <p>
            The noise math turns concrete in the single-season extremes. The tables below
            are the twenty most home-tilted and road-tilted scoring seasons since 1955
            among 20+ PPG scorers, and the {extremeRows} rows belong to {extremePlayers}{' '}
            different players: nobody makes either list twice. The last column is the
            tell, showing each player&apos;s split over his whole career. {mj02 && (
              <>
                <A href={playerHref(mj02.personId)}>Michael Jordan</A>&apos;s 2001-02
                Washington season is the fifth most home-tilted ever measured,{' '}
                {mj02.homePpg.toFixed(1)} at home against {mj02.roadPpg.toFixed(1)} on the
                road; his career split is {signedPct(mj02.careerAdjPct ?? 0)}, dead
                neutral.
              </>
            )}{' '}
            {payton99 && (
              <>
                Gary Payton&apos;s 1998-99 sits one spot below it; his career number is{' '}
                {signedPct(payton99.careerAdjPct ?? 0)}.
              </>
            )}{' '}
            {tmac && (
              <>
                The most extreme road season ever recorded,{' '}
                <A href={playerHref(tmac.personId)}>Tracy McGrady</A> scoring{' '}
                {tmac.roadPpg.toFixed(1)} on the road against {tmac.homePpg.toFixed(1)} at
                home in 2007-08, regressed to a career split a fifth that size.
              </>
            )}{' '}
            One season of home/road data is roughly 35 games a side, and at that sample
            size the split column is mostly weather.
          </p>
        </Prose>
        <div className="mt-6">
          <SeasonTable rows={seasonExtremeHome} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Most home-tilted qualifying seasons, minimum 20 PPG. &quot;Adj. boost&quot; is
          the home-road gap as a share of scoring average, minus the same figure for the
          player&apos;s decade. &quot;Career&quot; is that player&apos;s career-long
          adjusted split.
        </p>
        <div className="mt-6">
          <SeasonTable rows={seasonExtremeRoad} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Most road-tilted qualifying seasons, same rules. Note how much smaller the
          career column runs in both tables.
        </p>
      </section>

      <section>
        <SectionHeading>The homebodies and the road warriors</SectionHeading>
        <Prose>
          <p>
            Careers of five-plus qualifying seasons are where the signal survives, and the
            two lists below are the strongest cases in the logs.{' '}
            {wallace && (
              <>
                <A href={playerHref(wallace.personId)}>{wallace.name}</A> is the most
                home-dependent scorer ever measured, {wallace.homePpg.toFixed(1)} a game at
                home against {wallace.roadPpg.toFixed(1)} on the road across his{' '}
                {wallace.qualSeasons} qualifying seasons
              </>
            )}
            {dantley && (
              <>
                , and <A href={playerHref(dantley.personId)}>Adrian Dantley</A> is the
                highest-volume name on the list, a {dantley.ppg.toFixed(1)}-a-game scorer
                who was {signedPct(dantley.adjPct)} more home-tilted than his era
              </>
            )}
            .
          </p>
          <p>
            The road list opens with a surprise:{' '}
            {samJones && (
              <>
                <A href={playerHref(samJones.personId)}>{samJones.name}</A>, who won ten
                championships playing his home games in Boston Garden, scored{' '}
                {samJones.roadPpg.toFixed(1)} a game on the road against{' '}
                {samJones.homePpg.toFixed(1)} at home across the 1960s, the biggest road
                tilt of any career measured
              </>
            )}
            .{' '}
            {cassell && (
              <>
                <A href={playerHref(cassell.personId)}>Sam Cassell</A> is right behind him
                at {signedPct(cassell.adjPct)}
              </>
            )}
            {booker && (
              <>
                , and <A href={playerHref(booker.personId)}>Devin Booker</A> is the
                strongest active case, {booker.roadPpg.toFixed(1)} on the road against{' '}
                {booker.homePpg.toFixed(1)} at home over {booker.qualSeasons} qualifying
                seasons
              </>
            )}
            . Even these strongest cases sit within a few chance-widths of zero, so hold
            them loosely; but they are the names the evidence actually supports, which is
            a much shorter list than talk radio keeps.
          </p>
        </Prose>
        <div className="mt-6">
          <CareerTable rows={careerHomeBoosts} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Most home-tilted careers, minimum {ctx.minCareerSeasons} qualifying seasons at{' '}
          {ctx.minPpgPool}+ PPG. &quot;Gap&quot; is raw home minus road PPG;
          &quot;Adj. boost&quot; subtracts the era norm.
        </p>
        <div className="mt-6">
          <CareerTable rows={careerRoadWarriors} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Most road-tilted careers, same qualification.
        </p>
      </section>

      <section>
        <SectionHeading>The stars lean road</SectionHeading>
        <Prose>
          <p>
            Check the famous names and a pattern falls out: {negativeFamous} of the{' '}
            {famousSplits.length} careers below tilt road, once their eras are subtracted.{' '}
            {lebron && (
              <>
                <A href={playerHref(lebron.personId)}>LeBron James</A> is the strongest
                case, {lebron.roadPpg.toFixed(1)} a game on the road against{' '}
                {lebron.homePpg.toFixed(1)} at home, {signedPct(lebron.adjPct)} against his
                era across {lebron.qualSeasons} qualifying seasons
              </>
            )}
            {curry && (
              <>
                , with Magic Johnson, Kareem Abdul-Jabbar, and{' '}
                <A href={playerHref(curry.personId)}>Stephen Curry</A> behind him
              </>
            )}
            . {bird && (
              <>
                <A href={playerHref(bird.personId)}>Larry Bird</A> is the lone strong home
                tilt in the group at {signedPct(bird.adjPct)}.
              </>
            )}
          </p>
          <p>
            One mechanical explanation fits without any psychology: home teams win more,
            winning means more blowouts in your favor, and blowouts sit stars in the fourth
            quarter. A superstar&apos;s home games simply contain more garbage time he
            never plays, while road games keep him on the floor and carrying. The game
            logs cannot separate that from grit narratives directly, since minutes are not
            reliably recorded across all eras, but it is the boring hypothesis and it
            predicts exactly this pattern. It also puts the two single-game landmarks in a
            fitting frame: the highest-scoring home game ever logged is{' '}
            {homeSingleGameRecord.name}&apos;s {homeSingleGameRecord.pts}, and the
            highest-scoring road game is {roadSingleGameRecord.name}&apos;s{' '}
            {roadSingleGameRecord.pts} in 2024.
          </p>
        </Prose>
        <div className="mt-6">
          <CareerTable rows={famousSplits} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Ten familiar careers, sorted by era-adjusted home boost. Every one of them is
          within the range the noise test calls ordinary.
        </p>
      </section>

      <section>
        <SectionHeading>How we counted</SectionHeading>
        <Prose>
          <p>
            Every number here is computed by a generated script from the{' '}
            <a
              href="https://www.kaggle.com/datasets/eoinamoore/historical-nba-data-and-player-box-scores"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-sky-600 dark:text-sky-400 hover:underline"
            >
              NBA Dataset: Box Scores and Stats (1947 - Today)
            </a>{' '}
            compiled by Eoin A Moore on Kaggle, released under CC0 1.0.
          </p>
          <ul>
            <li>
              <strong>Regular season only, 1955 onward.</strong> The per-game logs are
              partial before the 1954-55 season, so earlier seasons are excluded entirely.
              Team-level figures cover all {ctx.gamesCounted.toLocaleString()} logged
              regular-season games since then; the generator verifies every game has
              exactly one home team, one visitor, and one winner.
            </li>
            <li>
              <strong>Player splits are era-adjusted by construction.</strong> A
              season&apos;s split is the home-road gap as a percentage of the player&apos;s
              scoring average, minus the mean of that same figure across all qualifying
              seasons of the same decade. The adjustments sum to zero within every decade,
              which the generator asserts, so no era&apos;s league-wide edge leaks into any
              individual&apos;s number. Careers are games-weighted averages over seasons of{' '}
              {ctx.minPpgPool}+ PPG with at least 15 games on each side of the split.
            </li>
            <li>
              <strong>The noise test is a label shuffle.</strong> The chance baseline
              reassigns home/road labels randomly within each player-season, preserving
              every game score and each season&apos;s home/road game counts, {ctx.permutations}{' '}
              times with a fixed seed. The split-half test uses alternating games so both
              halves span the same seasons and eras.
            </li>
            <li>
              <strong>Only points and free-throw attempts appear here.</strong> Both are
              complete in every era of the logs. Minutes and field-goal attempts are not
              recorded for a large share of games before about 1980, so this article makes
              no efficiency or per-minute claims, including in the garbage-time hypothesis
              above, which is labeled as the untested hypothesis it is.
            </li>
          </ul>
          <p>
            The receipts are a click away: game-by-game scoring lives on the{' '}
            <A href="/players">player pages</A>, any two careers can go{' '}
            <A href="/compare">head to head</A>, and this article&apos;s sibling question,
            how steady a scorer is from night to night, has its own piece in{' '}
            <A href="/articles/scoring-consistency-index">The Scoring Consistency Index</A>.
            All figures are from the Hoops Data database, current through the 2025-26
            season.
          </p>
        </Prose>
      </section>
    </div>
  );
}
