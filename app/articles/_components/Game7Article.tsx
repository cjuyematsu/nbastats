// app/articles/_components/Game7Article.tsx
//
// Interactive body of the "Game 7 Performers" article
// (articles.component_key = 'game7'). Data: app/data/game7Data.ts.
// The argument: Game 7s are lower-scoring than the same series' earlier games,
// most players score below their own playoff baseline in them, home court is
// worth more than usual but has collapsed in the 2020s, and a short list of
// players reliably beats the gravity.

'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
  type TooltipItem,
} from 'chart.js';
import {
  leagueContext,
  careerLeaders,
  mostG7s,
  g7Risers,
  g7Fallers,
  topSingleGames,
  topRebGames,
  topAstGames,
  elimLeaders,
  homeByDecade,
  type Game7Player,
} from '@/app/data/game7Data';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface ChartTheme {
  series: string;
  negative: string;
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

const signed = (v: number, digits = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;

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

const diffRows: Game7Player[] = [...g7Risers, ...g7Fallers].sort(
  (a, b) => (b.diff ?? 0) - (a.diff ?? 0),
);

function DiffChart({ theme }: { theme: ChartTheme }) {
  const labels = diffRows.map((p) => p.name);
  const values = diffRows.map((p) => p.diff ?? 0);
  const data = {
    labels,
    datasets: [
      {
        label: 'Game 7 change',
        data: values,
        backgroundColor: values.map((v) => (v >= 0 ? theme.series : theme.negative)),
        borderRadius: 4,
        borderSkipped: 'start' as const,
        maxBarThickness: 16,
      },
    ],
  };
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { right: 44, left: 8 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const p = diffRows[item.dataIndex];
            return [
              `${p.basePpg?.toFixed(1)} -> ${p.coveredG7Ppg?.toFixed(1)} PPG in Game 7s`,
              `${p.g7G} Game 7s, ${p.wins}-${p.losses}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Game 7 PPG vs own same-postseason baseline',
          color: theme.text,
        },
        ticks: { color: theme.text, callback: (v) => signed(Number(v), 0) },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
      y: {
        ticks: { color: theme.text, autoSkip: false, font: { size: 11 } },
        grid: { display: false },
        border: { color: theme.grid },
      },
    },
  };
  const valueLabels: Plugin<'bar'> = {
    id: 'valueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.fillStyle = theme.text;
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      meta.data.forEach((bar, i) => {
        const v = values[i];
        ctx.textAlign = v >= 0 ? 'left' : 'right';
        ctx.fillText(signed(v), v >= 0 ? bar.x + 6 : bar.x - 6, bar.y);
      });
      ctx.restore();
    },
  };
  return (
    <div className="relative h-[30rem]">
      <Bar data={data} options={options} plugins={[valueLabels]} />
    </div>
  );
}

function HomeChart({ theme }: { theme: ChartTheme }) {
  const labels = homeByDecade.map((d) => d.decade);
  const values = homeByDecade.map((d) => d.homeWinPct);
  const data = {
    labels,
    datasets: [
      {
        label: 'Home team win %',
        data: values,
        backgroundColor: theme.series,
        borderRadius: 4,
        borderSkipped: 'start' as const,
        maxBarThickness: 40,
      },
    ],
  };
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 16 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const d = homeByDecade[item.dataIndex];
            return `${d.homeWins}-${d.games - d.homeWins} at home in ${d.games} Game 7s`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme.text },
        grid: { display: false },
        border: { color: theme.grid },
      },
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: 'Home team win %', color: theme.text },
        ticks: { color: theme.text, callback: (v) => `${v}%` },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  const breakEven: Plugin<'bar'> = {
    id: 'breakEven',
    beforeDatasetsDraw(chart) {
      const { ctx, scales, chartArea } = chart;
      const y = scales.y.getPixelForValue(50);
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = theme.text;
      ctx.textAlign = 'right';
      ctx.fillText('coin flip', chartArea.right, y - 8);
      ctx.restore();
    },
  };
  const valueLabels: Plugin<'bar'> = {
    id: 'valueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.fillStyle = theme.text;
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      meta.data.forEach((bar, i) => {
        ctx.fillText(`${values[i]}%`, bar.x, bar.y - 6);
      });
      ctx.restore();
    },
  };
  return (
    <div className="relative h-72 sm:h-80">
      <Bar data={data} options={options} plugins={[breakEven, valueLabels]} />
    </div>
  );
}

function LeadersTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">G7s</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">W-L</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">PPG</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">RPG</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">APG</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">vs baseline</th>
            <th className="hidden lg:table-cell px-2.5 py-2 text-right">Years</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {careerLeaders.map((p) => (
            <tr key={p.personId} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(p.personId)}>{p.name}</A>
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{p.g7G}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">
                {p.wins}-{p.losses}
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{p.g7Ppg.toFixed(1)}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{p.g7Rpg.toFixed(1)}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{p.g7Apg.toFixed(1)}</td>
              <td
                className={`px-2 lg:px-2.5 py-2 text-right font-semibold ${
                  (p.diff ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {p.diff === null ? '-' : signed(p.diff)}
              </td>
              <td className="hidden lg:table-cell px-2.5 py-2 text-right">
                {p.firstYear}-{p.lastYear}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SingleGamesTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Year</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2">Round</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">PTS</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">REB</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">AST</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {topSingleGames.map((g) => (
            <tr key={`${g.personId}-${g.date}`} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(g.personId)}>{g.name}</A>
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{g.year}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 whitespace-nowrap">{g.round}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{g.pts}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{g.reb}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{g.ast}</td>
              <td
                className={`px-2 lg:px-2.5 py-2 text-right font-semibold ${
                  g.win
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {g.win ? 'W' : 'L'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ElimTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Games</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">W-L</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">PPG</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">Years</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {elimLeaders.map((p) => (
            <tr key={p.personId} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(p.personId)}>{p.name}</A>
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{p.elimG}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">
                {p.elimWins}-{p.elimLosses}
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{p.elimPpg.toFixed(1)}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">
                {p.firstYear}-{p.lastYear}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Game7Article() {
  const theme = useChartTheme();
  const ctx = leagueContext;
  const kd = careerLeaders[0];
  const lebron = careerLeaders.find((p) => p.name === 'LeBron James');
  const west = careerLeaders.find((p) => p.name === 'Jerry West');
  const samJones = careerLeaders.find((p) => p.name === 'Sam Jones');
  const russell = mostG7s.find((p) => p.name === 'Bill Russell');
  const rayAllen = mostG7s[0];
  const kobe = g7Fallers.find((p) => p.name === 'Kobe Bryant');
  const tatum51 = topSingleGames[0];
  const russell40 = topRebGames[0];
  const stockton20 = topAstGames[0];
  const decades2020 = homeByDecade[homeByDecade.length - 1];
  const elimTop = elimLeaders[0];

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading>Seventy-five years of winner-take-all</SectionHeading>
        <Prose>
          <p>
            Since the first one in {ctx.firstYear}, the NBA has played {ctx.totalGame7s} Game
            7s, about two a season. That is the entire sample, and this article measures all
            of it, comparing each player only to himself: his scoring in Game 7s against his
            scoring in the other games of those same playoff runs, so nobody is graded
            against a different era or a league average.
          </p>
        </Prose>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Game 7s all time"
            value={String(ctx.totalGame7s)}
            sub={`${ctx.firstYear} through ${ctx.lastYear}`}
          />
          <StatTile
            label="Home team record"
            value={`${ctx.homeWins}-${ctx.homeLosses}`}
            sub={`${ctx.homeWinPct}% of all Game 7s`}
          />
          <StatTile
            label="Scoring change"
            value={signed(ctx.avgDiff)}
            sub="PPG vs each player's own playoff baseline"
          />
          <StatTile
            label="Home record, 2020s"
            value={`${decades2020.homeWins}-${decades2020.games - decades2020.homeWins}`}
            sub="the old edge has collapsed this decade"
          />
        </div>
      </section>

      <section>
        <SectionHeading>The game gets smaller</SectionHeading>
        <Prose>
          <p>
            Game 7s are lower-scoring than the games that set them up. Teams average{' '}
            {ctx.avgG7TeamScore.toFixed(1)} points in a Game 7 against{' '}
            {ctx.avgEarlierGamesTeamScore.toFixed(1)} in games one through six of those same
            series, so the gap is not an era artifact: the comparison never leaves the series.
            Players shrink with the game. Of the {ctx.qualifiedPlayers} players with a
            measurable baseline, {ctx.pctScoreLess}% scored less in Game 7s than in the rest
            of those same postseasons.
          </p>
          <p>
            The chart shows both tails: the ten biggest risers and the ten biggest fallers
            among players with at least three Game 7s. The names are the argument.{' '}
            {samJones && <A href={playerHref(samJones.personId)}>Sam Jones</A>} beat his own
            playoff baseline by {samJones ? signed(samJones.diff ?? 0) : ''} a game across
            nine Game 7s and won all nine. Kevin Durant, the most efficient volume scorer of
            his generation, adds {kd ? signed(kd.diff ?? 0) : ''}. On the other side,{' '}
            {kobe && <A href={playerHref(kobe.personId)}>Kobe Bryant</A>} gave back{' '}
            {kobe ? (kobe.diff ?? 0).toFixed(1) : ''} per game across six Game 7s, and won
            five of the six anyway, including the 2010 Finals on 6 of 24 shooting. Scoring
            less in a Game 7 is the norm, not a scandal.
          </p>
        </Prose>
        <ChartCard>
          <DiffChart theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Game 7 scoring vs the same player&apos;s scoring in the other games of those same
            postseasons, minimum three Game 7s. Blue rises, red falls. Hover for the split.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>The career Game 7 leaderboard</SectionHeading>
        <Prose>
          <p>
            Minimum four Game 7s. Kevin Durant sits first at {kd.g7Ppg.toFixed(1)} a game,
            the highest Game 7 scoring average ever recorded, and{' '}
            {lebron && <A href={playerHref(lebron.personId)}>LeBron James</A>} is right
            behind at {lebron?.g7Ppg.toFixed(1)} across {lebron?.g7G} of them, with a{' '}
            {lebron?.wins}-{lebron?.losses} record. The heartbreak entry is{' '}
            {west && <A href={playerHref(west.personId)}>Jerry West</A>}:{' '}
            {west?.g7Ppg.toFixed(1)} per game and a {west?.wins}-{west?.losses} record,
            most of the losses to Boston. The volume records belong to the same dynasty that
            caused them: {russell && <A href={playerHref(russell.personId)}>Bill Russell</A>}{' '}
            played ten Game 7s and won all ten with {russell?.g7Rpg.toFixed(1)} rebounds a
            game, and Sam Jones went nine for nine beside him: that Boston core never lost
            one.{' '}
            {rayAllen && <A href={playerHref(rayAllen.personId)}>Ray Allen</A>} holds the
            appearance record at {rayAllen?.g7G}.
          </p>
        </Prose>
        <div className="mt-6">
          <LeadersTable />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          &quot;vs baseline&quot; compares Game 7 scoring to the same player&apos;s other
          games in those postseasons. Click any player for the full career.
        </p>
      </section>

      <section>
        <SectionHeading>The best single Game 7s ever played</SectionHeading>
        <Prose>
          <p>
            The scoring record fell twice in two weeks of the {tatum51.year} playoffs:
            Stephen Curry&apos;s 50 against Sacramento, then {tatum51.name}&apos;s{' '}
            {tatum51.pts} against Philadelphia, both passing Kevin Durant&apos;s 48-point
            loss from 2021. Half of the twelve games below came in defeats, and Luka
            Doncic&apos;s 46 points and 14 assists in a losing effort is the fullest stat
            line anyone has produced in one. The non-scoring records are older:{' '}
            {russell40.name} pulled down {russell40.reb} rebounds in the {russell40.year}{' '}
            Finals Game 7, and {stockton20.name} handed out {stockton20.ast} assists in{' '}
            {stockton20.year}.
          </p>
        </Prose>
        <div className="mt-6">
          <SingleGamesTable />
        </div>
      </section>

      <section>
        <SectionHeading>Home court, checked</SectionHeading>
        <Prose>
          <p>
            Home court matters more in Game 7s than in any other playoff game: the home team
            has won {ctx.homeWinPct}% of them all time, {ctx.homeWins} wins against{' '}
            {ctx.homeLosses} losses. That edge held between roughly 70% and 100% for seven
            decades, and then stopped. This decade home teams are{' '}
            {decades2020.homeWins}-{decades2020.games - decades2020.homeWins}, under half,
            across {decades2020.games} Game 7s. Decade samples are small, fifteen to thirty
            games each, so treat any single bar gently; the 2020s dip is the largest in the
            dataset&apos;s history all the same.
          </p>
        </Prose>
        <ChartCard>
          <HomeChart theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Home team win percentage in Game 7s by decade. Hover for each decade&apos;s
            record.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>Facing elimination, the wider lens</SectionHeading>
        <Prose>
          <p>
            A Game 7 is the symmetric case: both teams are one loss from the offseason. Widen
            the definition to every playoff game a team entered needing to win, down 3-1,
            down 2-0 in a best-of-three, any of it, and the sample grows to{' '}
            {ctx.elimTeamGames.toLocaleString()} team-games. The leaderboard reorders.{' '}
            {elimTop && <A href={playerHref(elimTop.personId)}>{elimTop.name}</A>} has played{' '}
            {elimTop?.elimG} games facing elimination, the most of anyone on the table, and
            averaged {elimTop?.elimPpg.toFixed(1)} in them; Michael Jordan&apos;s{' '}
            {elimLeaders[1].elimPpg.toFixed(1)} across {elimLeaders[1].elimG} such games is
            the counterweight, because his Bulls so rarely let a series get there. The
            Play-In is excluded throughout: it is a different animal, a scheduled single game
            rather than a series reaching its breaking point.
          </p>
        </Prose>
        <div className="mt-6">
          <ElimTable />
        </div>
      </section>

      <section>
        <SectionHeading>How we counted</SectionHeading>
        <Prose>
          <p>
            Every number here comes from our own stats database, built from the{' '}
            <a
              href="https://www.kaggle.com/datasets/eoinamoore/historical-nba-data-and-player-box-scores"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-sky-600 dark:text-sky-400 hover:underline"
            >
              NBA Dataset: Box Scores and Stats (1947 - Today)
            </a>{' '}
            compiled by Eoin A Moore on Kaggle, released under CC0 1.0, with famous Game 7
            box scores spot-checked by hand against Basketball Reference. The ground rules:
          </p>
          <ul>
            <li>
              <strong>Series are rebuilt from the box scores.</strong> Every playoff game
              since 1947 is grouped by season and matchup and ordered by date, and a Game 7
              is the seventh game of its series. We do not trust the dataset&apos;s own
              game-number labels, which are shuffled for several 1980s and 1990s series;
              the calendar is the authority.
            </li>
            <li>
              <strong>Baselines are matched.</strong> A player&apos;s Game 7 scoring is
              compared only to his own scoring in the other games of the same postseasons,
              weighted by his Game 7 appearances, with at least three other games in a
              season to set that season&apos;s baseline. Nobody is compared to a
              league average or to a different era.
            </li>
            <li>
              <strong>Facing elimination</strong> means the opponent entered the game one win
              from taking the series, in any series format the league has used. Every Game 7
              qualifies for both teams.
            </li>
            <li>
              <strong>Only points, rebounds, and assists appear here.</strong> Those are
              complete in every era of the game logs. Minutes and shot attempts are not
              recorded for a large share of games before about 1980, so this article makes
              no efficiency or per-minute claims at all.
            </li>
            <li>
              Playoff games only: the Play-In, the NBA Cup, and ABA postseasons are not
              included.
            </li>
          </ul>
          <p>
            If a name here surprised you, the tools to argue are a click away: full
            season-by-season splits live on the <A href="/players">player pages</A>, any two
            careers can go <A href="/compare">head to head</A>, and the sibling question,
            who rises across whole postseasons rather than single games, has its own
            article in <A href="/articles/playoff-risers">The Biggest Playoff Risers in NBA
            History</A>. All figures are from the Hoops Data database, current through the
            2026 playoffs.
          </p>
        </Prose>
      </section>
    </div>
  );
}
