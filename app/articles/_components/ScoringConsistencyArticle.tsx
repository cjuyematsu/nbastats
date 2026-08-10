// app/articles/_components/ScoringConsistencyArticle.tsx
//
// Interactive body of "The Scoring Consistency Index" article
// (articles.component_key = 'scoring-consistency'). Data:
// app/data/scoringConsistencyData.ts. The argument: raw volatility rankings
// are broken because CV falls mechanically as scoring average rises, so each
// season is scored against the expected CV at its scoring level; the index
// surfaces the steadiest and streakiest seasons and careers, a matched-PPG
// distribution comparison, the 20-point streak record, and the finding that
// league-wide volatility has been flat for seven decades.

'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type Plugin,
  type TooltipItem,
} from 'chart.js';
import {
  leagueContext,
  cvScatterPool,
  cvScatterNamed,
  mostConsistentSeasons,
  mostVolatileSeasons,
  mostConsistentCareers,
  mostVolatileCareers,
  seasonTrend,
  distributionBinLabels,
  distributionPlayers,
  streaks20,
  type ConsistencySeason,
  type ConsistencyCareer,
} from '@/app/data/scoringConsistencyData';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

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

const signed = (v: number, digits = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

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

// Named outliers get a permanent label; everyone else lives in the tooltip.
// text overrides the default last-name label where a bare surname misleads
// (a bare "Russell" reads as Bill, not Cazzie).
type LabelPos = 'above' | 'below' | 'right' | 'left';
const SCATTER_LABELS: Record<string, { pos: LabelPos; text?: string }> = {
  'Kevin Garnett 2004': { pos: 'below' },
  'Gary Payton 1997': { pos: 'below' },
  'Kevin Durant 2016': { pos: 'above' },
  'Stephen Curry 2016': { pos: 'right' },
  'Michael Jordan 1987': { pos: 'above' },
  'Wilt Chamberlain 1962': { pos: 'below' },
  'Rick Barry 1974': { pos: 'above' },
  'Cazzie Russell 1974': { pos: 'left', text: 'C. Russell' },
  'Bam Adebayo 2026': { pos: 'right' },
  'Shai Gilgeous-Alexander 2025': { pos: 'below', text: 'SGA' },
  'Bernard King 1991': { pos: 'right' },
};

// Highlight ONLY the seasons that carry a label. cvScatterNamed also holds the
// full top-8 steady/streaky lists, and drawing all of them dark made tight
// clusters (Payton 1997 next to Payton 2002 next to three Garnett seasons)
// read as one player with many points. Unlabeled ones stay in the muted pool;
// labeled ones are removed from the pool so nobody renders twice.
const HIGHLIGHTED = cvScatterNamed.filter((p) => SCATTER_LABELS[`${p.name} ${p.season}`]);
const HIGHLIGHTED_KEYS = new Set(HIGHLIGHTED.map((p) => `${p.name}|${p.season}`));
const POOL_POINTS = cvScatterPool.filter(
  ([, , name, season]) => !HIGHLIGHTED_KEYS.has(`${name}|${season}`),
);

function scatterLabels(theme: ChartTheme): Plugin<'scatter'> {
  return {
    id: 'scatterLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(1);
      if (!meta) return;
      ctx.save();
      ctx.fillStyle = theme.text;
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      meta.data.forEach((point, i) => {
        const p = HIGHLIGHTED[i];
        const label = SCATTER_LABELS[`${p.name} ${p.season}`];
        if (!label) return;
        let x = point.x;
        let y = point.y;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (label.pos === 'above') y -= 12;
        if (label.pos === 'below') y += 12;
        if (label.pos === 'right') {
          x += 8;
          ctx.textAlign = 'left';
        }
        if (label.pos === 'left') {
          x -= 8;
          ctx.textAlign = 'right';
        }
        ctx.fillText(label.text ?? p.name.split(' ').slice(-1)[0], x, y);
      });
      ctx.restore();
    },
  };
}

function ConsistencyScatter({ theme }: { theme: ChartTheme }) {
  const data = {
    datasets: [
      {
        label: 'Seasons',
        data: POOL_POINTS.map(([ppg, cv]) => ({ x: ppg, y: cv })),
        backgroundColor: theme.muted,
        pointRadius: 2.5,
        pointHoverRadius: 4,
      },
      {
        label: 'Named',
        data: HIGHLIGHTED.map((p) => ({ x: p.ppg, y: p.cv })),
        backgroundColor: theme.series,
        borderColor: theme.ring,
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 7,
      },
    ],
  };
  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 10, right: 18 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        // Overlapping dots would otherwise stack extra rows under the first dot's title.
        filter: (item: TooltipItem<'scatter'>, index: number) => index === 0,
        callbacks: {
          title: (items: TooltipItem<'scatter'>[]) => {
            const it = items[0];
            if (!it) return '';
            if (it.datasetIndex === 1) {
              const p = HIGHLIGHTED[it.dataIndex];
              return `${p.name}, ${p.season}`;
            }
            const [, , name, season] = POOL_POINTS[it.dataIndex];
            return `${name}, ${season}`;
          },
          label: (item: TooltipItem<'scatter'>) =>
            `${item.parsed.x.toFixed(1)} PPG, CV ${item.parsed.y.toFixed(3)}`,
        },
      },
    },
    scales: {
      x: {
        min: 14,
        max: 52,
        title: { display: true, text: 'Season scoring average (PPG)', color: theme.text },
        // includeBounds would draw the 14/52 scale limits as extra ticks
        // crowding the real ones (a "14 15" pair at the left edge).
        ticks: { color: theme.text, includeBounds: false },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
      y: {
        min: 0.1,
        max: 0.62,
        title: { display: true, text: 'Game-to-game CV (SD / PPG)', color: theme.text },
        // Same: the 0.62 bound tick rendered as a second "0.6".
        ticks: { color: theme.text, includeBounds: false },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  return (
    <div className="relative h-80 sm:h-[28rem]">
      <Scatter data={data} options={options} plugins={[scatterLabels(theme)]} />
    </div>
  );
}

function DistributionChart({ theme }: { theme: ChartTheme }) {
  const colors = [theme.series, theme.negative];
  const data = {
    labels: distributionBinLabels,
    datasets: distributionPlayers.map((p, i) => ({
      label: `${p.name} ${p.season} (${p.ppg} PPG)`,
      data: p.bins,
      backgroundColor: colors[i % colors.length],
      borderRadius: 3,
      borderSkipped: 'start' as const,
      maxBarThickness: 22,
    })),
  };
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: theme.text } },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item: TooltipItem<'bar'>) =>
            `${item.dataset.label}: ${item.parsed.y} games of ${item.label} points`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Points in a game', color: theme.text },
        ticks: { color: theme.text },
        grid: { display: false },
        border: { color: theme.grid },
      },
      y: {
        title: { display: true, text: 'Games', color: theme.text },
        ticks: { color: theme.text, precision: 0 },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  return (
    <div className="relative h-72 sm:h-80">
      <Bar data={data} options={options} />
    </div>
  );
}

function TrendChart({ theme }: { theme: ChartTheme }) {
  const data = {
    labels: seasonTrend.map((t) => String(t.season)),
    datasets: [
      {
        label: 'Median CV',
        data: seasonTrend.map((t) => t.medianCv),
        borderColor: theme.series,
        backgroundColor: theme.series,
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
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => `Season ${items[0]?.label}`,
          label: (item: TooltipItem<'line'>) => {
            const t = seasonTrend[item.dataIndex];
            return [
              `Median CV ${t.medianCv.toFixed(3)} across ${t.qualifiers} qualifiers`,
              `Median ${t.medianPpg.toFixed(1)} PPG among them`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme.text,
          maxTicksLimit: 12,
          maxRotation: 0,
        },
        grid: { display: false },
        border: { color: theme.grid },
      },
      y: {
        min: 0.25,
        max: 0.45,
        title: { display: true, text: 'Median game-to-game CV', color: theme.text },
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

function ciCell(ci: number) {
  return (
    <td
      className={`px-2 lg:px-2.5 py-2 text-right font-semibold ${
        ci >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      {signed(ci)}
    </td>
  );
}

function SeasonTable({ rows }: { rows: ConsistencySeason[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Season</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2">Team</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">G</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">PPG</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">SD</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">CV</th>
            <th className="hidden lg:table-cell px-2.5 py-2 text-right">Exp. CV</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Index</th>
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
              <td className="px-2 lg:px-2.5 py-2 text-right">{s.games}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{s.ppg.toFixed(1)}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{s.sd.toFixed(1)}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{s.cv.toFixed(3)}</td>
              <td className="hidden lg:table-cell px-2.5 py-2 text-right">{s.expCv.toFixed(3)}</td>
              {ciCell(s.ci)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CareerTable({ rows }: { rows: ConsistencyCareer[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Seasons</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">G</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">PPG</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">CV</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Index</th>
            <th className="hidden lg:table-cell px-2.5 py-2 text-right">Boom</th>
            <th className="hidden lg:table-cell px-2.5 py-2 text-right">Bust</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">Years</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {rows.map((c) => (
            <tr key={c.personId} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(c.personId)}>{c.name}</A>
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{c.qualSeasons}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{c.games}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{c.ppg.toFixed(1)}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{c.cv.toFixed(3)}</td>
              {ciCell(c.ci)}
              <td className="hidden lg:table-cell px-2.5 py-2 text-right">{pct(c.boomShare)}</td>
              <td className="hidden lg:table-cell px-2.5 py-2 text-right">{pct(c.bustShare)}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">
                {c.firstSeason}-{c.lastSeason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StreakTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Games</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">PPG during</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2">From</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2">To</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Seasons</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {streaks20.map((s) => (
            <tr key={s.personId} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(s.personId)}>{s.name}</A>
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold">{s.games}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{s.ppgDuring.toFixed(1)}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 whitespace-nowrap">{s.startDate}</td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 whitespace-nowrap">{s.endDate}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">
                {s.startSeason === s.endSeason ? s.startSeason : `${s.startSeason}-${s.endSeason}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScoringConsistencyArticle() {
  const theme = useChartTheme();
  const ctx = leagueContext;

  const kgCareer = mostConsistentCareers.find((c) => c.name === 'Kevin Garnett');
  const vanExel = mostVolatileCareers[0];
  const kgSteadySeasons = mostConsistentSeasons.filter((s) => s.name === 'Kevin Garnett').length;
  const kd16 = distributionPlayers.find((p) => p.name === 'Kevin Durant');
  const king91 = distributionPlayers.find((p) => p.name === 'Bernard King');
  const barry74 = mostVolatileSeasons.find((s) => s.name === 'Rick Barry' && s.season === 1974);
  const cazzie74 = mostVolatileSeasons.find((s) => s.name === 'Cazzie Russell' && s.season === 1974);
  const bam26 = mostVolatileSeasons.find((s) => s.name === 'Bam Adebayo');
  const mj02 = mostVolatileSeasons.find((s) => s.name === 'Michael Jordan');
  const wilt62 = cvScatterNamed.find((s) => s.name === 'Wilt Chamberlain' && s.season === 1962);
  const sgaCareer = mostConsistentCareers.find((c) => c.name === 'Shai Gilgeous-Alexander');
  const barryCareer = mostVolatileCareers.find((c) => c.name === 'Rick Barry');
  const sgaStreak = streaks20.find((s) => s.name === 'Shai Gilgeous-Alexander');
  const wiltStreak = streaks20.find((s) => s.name === 'Wilt Chamberlain');

  const decadeMedians = (() => {
    const byDecade = new Map<number, number[]>();
    for (const t of seasonTrend) {
      const d = Math.floor(t.season / 10) * 10;
      const arr = byDecade.get(d) ?? [];
      arr.push(t.medianCv);
      byDecade.set(d, arr);
    }
    const means = [...byDecade.values()].map(
      (vals) => vals.reduce((a, b) => a + b, 0) / vals.length,
    );
    return { min: Math.min(...means), max: Math.max(...means) };
  })();

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading>Same average, different nights</SectionHeading>
        <Prose>
          <p>
            The Consistency Index puts a single number on that difference for every
            qualifying player-season since 1955. Its verdicts are worth arguing about: the
            steadiest high-volume scorer of the shot-clock era is Kevin Garnett, the
            streakiest is Nick Van Exel, and the longest run of 20-point games ever
            recorded ended a few months ago.
          </p>
        </Prose>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Seasons measured"
            value={ctx.poolSeasons.toLocaleString()}
            sub={`15+ PPG on qualifying games, ${ctx.firstSeason} through ${ctx.lastSeason}`}
          />
          <StatTile
            label="Steadiest career"
            value={kgCareer ? kgCareer.name : ''}
            sub={kgCareer ? `Index ${signed(kgCareer.ci)} across ${kgCareer.qualSeasons} qualifying seasons` : ''}
          />
          <StatTile
            label="Most volatile career"
            value={vanExel.name}
            sub={`Index ${signed(vanExel.ci)} across ${vanExel.qualSeasons} qualifying seasons`}
          />
          <StatTile
            label="The confound"
            value={`${ctx.cvAt15to17.toFixed(2)} to ${ctx.cvAt30plus.toFixed(2)}`}
            sub="typical CV falls as PPG rises from 15 to 30+, so raw rankings are broken"
          />
        </div>
      </section>

      <section>
        <SectionHeading>Why the obvious ranking is wrong</SectionHeading>
        <Prose>
          <p>
            The natural measure of volatility is the standard deviation of a player&apos;s
            game scores. But SD grows with the average: a 30-point scorer&apos;s good and
            bad nights are simply bigger numbers than a 15-point scorer&apos;s. Dividing SD by
            the average to get a coefficient of variation fixes that, but it swings too far
            the other way. Scoring is streams of makes and misses, and the arithmetic of
            that kind of process means relative spread shrinks as volume grows: the typical
            CV in our pool falls from {ctx.cvAt15to17.toFixed(3)} for players averaging 15
            to 17.5 points down to {ctx.cvAt30plus.toFixed(3)} for players averaging 30 or
            more. Rank every season by raw CV and you have mostly ranked scoring averages
            in disguise.
          </p>
          <p>
            So the index measures each season against its own scoring level. Every
            qualifying season is placed in a PPG bucket, the mean CV of that bucket across
            all of history is the expectation, and the Consistency Index is the gap:
            (expected CV minus actual CV) times 100. Positive means steadier than the
            typical scorer at that level, negative means streakier, and by construction
            the index sums to zero across the pool, so nobody gets credit merely for
            scoring a lot. The chart below is that whole pool at once, and the downward
            drift of the cloud is the confound in person. Wilt Chamberlain&apos;s 1962
            season, fifty points a game with a CV of {wilt62 ? wilt62.cv.toFixed(3) : ''},
            sits in a region of the chart no one else has ever visited.
          </p>
        </Prose>
        <ChartCard>
          <ConsistencyScatter theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Every qualifying 15+ PPG season since 1955. Labeled dots are leaderboard names
            discussed below. Hover any dot to see the player and season.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>The steadiest seasons, and the streakiest</SectionHeading>
        <Prose>
          <p>
            The steadiest table is a Kevin Garnett exhibit: {kgSteadySeasons} of the top
            fifteen seasons are his, all in Minnesota, where for years he scored between
            twenty and twenty-five points with the variance of a metronome. Gary Payton
            appears twice, and the highest-volume entry is{' '}
            <A href={playerHref(201142)}>Kevin Durant</A>&apos;s 2015-16 season:{' '}
            {kd16 ? kd16.ppg.toFixed(1) : ''} a game with a standard deviation of just{' '}
            {kd16 ? kd16.sd.toFixed(1) : ''}, the lowest CV ({kd16 ? kd16.cv.toFixed(3) : ''})
            of any season on either table.
          </p>
          <p>
            The streaky table tells better stories. The top two seasons ever recorded,{' '}
            {barry74 && <A href={playerHref(barry74.personId)}>Rick Barry</A>}
            {barry74 ? ` (index ${signed(barry74.ci)})` : ''} and{' '}
            {cazzie74 && <A href={playerHref(cazzie74.personId)}>Cazzie Russell</A>}
            {cazzie74 ? ` (${signed(cazzie74.ci)})` : ''}, happened in the same year in the
            same locker room, the 1973-74 Golden State Warriors, a team that apparently
            never played a normal game. Barry scored 64 points that season in one of them.
            Michael Jordan is here too, but not for the reason you would guess: his 2001-02
            Washington season {mj02 ? `(${signed(mj02.ci)})` : ''} at age 38 was one of the
            streakiest ever, alternating vintage 40-point nights with single digits. And
            the sixth streakiest season on record is brand new:{' '}
            {bam26 && <A href={playerHref(bam26.personId)}>Bam Adebayo</A>}&apos;s 2025-26,
            with {bam26 ? pct(bam26.bustShare) : ''} of his games at half his average or
            less.
          </p>
        </Prose>
        <div className="mt-6">
          <SeasonTable rows={mostConsistentSeasons} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Steadiest qualifying seasons, minimum 20 PPG. &quot;Exp. CV&quot; is the mean CV
          of the season&apos;s PPG bucket; the index is the gap times 100.
        </p>
        <div className="mt-6">
          <SeasonTable rows={mostVolatileSeasons} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Most volatile qualifying seasons, minimum 20 PPG. Click any player for the full
          career.
        </p>
      </section>

      <section>
        <SectionHeading>Two players, one average</SectionHeading>
        <Prose>
          <p>
            Here is what the index actually means, in games. Kevin Durant in 2015-16 and{' '}
            {king91 && <A href={playerHref(king91.personId)}>Bernard King</A>} in 1990-91
            averaged nearly the same: {kd16 ? kd16.ppg.toFixed(1) : ''} against{' '}
            {king91 ? king91.ppg.toFixed(1) : ''} points a game. Durant&apos;s standard
            deviation was {kd16 ? kd16.sd.toFixed(1) : ''}; King&apos;s was{' '}
            {king91 ? king91.sd.toFixed(1) : ''}, more than double. King boomed to 1.5
            times his average in {king91 ? pct(king91.boomShare) : ''} of his games and
            busted to half of it in {king91 ? pct(king91.bustShare) : ''}; Durant&apos;s
            corresponding numbers are {kd16 ? pct(kd16.boomShare) : ''} and{' '}
            {kd16 ? pct(kd16.bustShare) : ''}. Same scoreboard contribution over a season,
            entirely different experience of watching it arrive.
          </p>
        </Prose>
        <ChartCard>
          <DistributionChart theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Game-score distributions for two seasons matched on scoring average. Blue is
            Durant 2015-16, red is King 1990-91.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>Careers</SectionHeading>
        <Prose>
          <p>
            A career number should not reward a player for changing roles slowly, so the
            career index is the games-weighted average of a player&apos;s season indexes
            over his qualifying seasons, at least {ctx.minCareerSeasons} of them. Pooling
            a whole career&apos;s game logs into one number would conflate aging and team
            changes with night-to-night volatility, which is a different thing.
          </p>
          <p>
            {kgCareer && <A href={playerHref(kgCareer.personId)}>Kevin Garnett</A>} leads
            the steady list by a wide margin, {kgCareer ? signed(kgCareer.ci) : ''} across{' '}
            {kgCareer ? kgCareer.qualSeasons : ''} qualifying seasons, with John Stockton
            and Detlef Schrempf behind him. The most interesting modern name is{' '}
            {sgaCareer && <A href={playerHref(sgaCareer.personId)}>Shai Gilgeous-Alexander</A>}
            , the 2025 MVP: {sgaCareer ? sgaCareer.ppg.toFixed(1) : ''} points a game over
            his five qualifying seasons, the highest scoring average anywhere on the steady
            table, delivered with the reliability the index usually finds only in
            mid-volume scorers. On the other side,{' '}
            <A href={playerHref(vanExel.personId)}>{vanExel.name}</A> is the runaway
            career leader in volatility at {signed(vanExel.ci)}, and{' '}
            {barryCareer && <A href={playerHref(barryCareer.personId)}>Rick Barry</A>} is
            the only player to sustain it at star volume,{' '}
            {barryCareer ? barryCareer.ppg.toFixed(1) : ''} points a game of pure weather
            across {barryCareer ? barryCareer.qualSeasons : ''} seasons. Pete Maravich,
            fittingly, is right there with him.
          </p>
        </Prose>
        <div className="mt-6">
          <CareerTable rows={mostConsistentCareers} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Steadiest careers. &quot;Boom&quot; is the share of games at 1.5x the
          player&apos;s season average or more, &quot;Bust&quot; the share at half or less.
        </p>
        <div className="mt-6">
          <CareerTable rows={mostVolatileCareers} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Most volatile careers, same qualification.
        </p>
      </section>

      <section>
        <SectionHeading>The 20-point metronome</SectionHeading>
        <Prose>
          <p>
            Consistency has a folk statistic: consecutive games with 20 or more points. The
            record belonged to Wilt Chamberlain for over sixty years,{' '}
            {wiltStreak ? wiltStreak.games : ''} straight games spanning his 50-point 1962
            season, at {wiltStreak ? wiltStreak.ppgDuring.toFixed(1) : ''} points a game
            during the streak. It fell in {sgaStreak ? sgaStreak.endSeason : ''}.{' '}
            {sgaStreak && <A href={playerHref(sgaStreak.personId)}>Shai Gilgeous-Alexander</A>}
            &apos;s run reached {sgaStreak ? sgaStreak.games : ''} consecutive 20-point
            games across parts of three seasons before ending in April, the longest such
            streak in the game logs. The table is a who&apos;s who of high-floor scorers,
            and it doubles as a check on the index: the names here are the same ones the
            season and career tables keep surfacing.
          </p>
        </Prose>
        <div className="mt-6">
          <StreakTable />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Longest runs of consecutive played games with 20+ points, regular season, one
          entry per player. Games a player sat are skipped, not broken.
        </p>
      </section>

      <section>
        <SectionHeading>Has scoring gotten streakier?</SectionHeading>
        <Prose>
          <p>
            You would expect yes. The three-pointer is a higher-variance shot, it has eaten
            the sport, and every season brings a fresh discourse about feast-or-famine
            offense. The game logs say no. The median CV among 15+ PPG scorers has stayed
            inside a band from {decadeMedians.min.toFixed(3)} to{' '}
            {decadeMedians.max.toFixed(3)} in every decade since the 1950s, and the 2020s
            sit at the LOW end of that band. Individual star scoring is not streakier than
            it was in the hand-check era; if anything the modern game, with its pace and
            its free-throw volume, delivers a star&apos;s average more reliably than the
            eras fans remember as steady. Whatever the three-point revolution did to team
            scoring runs, it did not make the players themselves less predictable.
          </p>
        </Prose>
        <ChartCard>
          <TrendChart theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Median game-to-game CV among each season&apos;s 15+ PPG qualifiers. Hover for
            the qualifier count and their median scoring average, which rules out the trend
            being an artifact of scoring levels shifting.
          </p>
        </ChartCard>
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
              partial before the 1954-55 season (the 1947-48 BAA year has only 24 games
              logged), and a volatility number from a partial log is noise, so earlier
              seasons are excluded entirely rather than reported with an asterisk.
            </li>
            <li>
              <strong>The index is level-adjusted by construction.</strong> Each
              season&apos;s CV (standard deviation of game scores, with the n-1 sample
              correction, divided by the average) is compared with the mean CV of its PPG
              bucket pooled across history. The residuals sum to zero within every bucket,
              which the generator verifies, so the index cannot reward or punish scoring
              volume itself.
            </li>
            <li>
              <strong>Qualification scales with the schedule.</strong> A season qualifies
              at 70% of the maximum games anyone played that year, capped at 58, so the
              48-game 1999 season and the 72-game 2021 season are judged on their own
              schedules. Seasons need 15 PPG for the pool, 20 for the leaderboards, and
              careers need five qualifying seasons.
            </li>
            <li>
              <strong>Only points appear here.</strong> Points are complete in every era of
              the logs. Minutes and shot attempts are not recorded for a large share of
              games before about 1980, so this article makes no efficiency, per-minute, or
              shot-volume claims at all. A handful of corrupted player-seasons that merge
              two players&apos; game logs (they sum to more than 88 games) are dropped.
            </li>
          </ul>
          <p>
            If a name here surprised you, the receipts are a click away: game-by-game
            scoring lives on the <A href="/players">player pages</A>, any two careers can
            go <A href="/compare">head to head</A>, and the postseason versions of this
            question have their own articles in{' '}
            <A href="/articles/game-7-performers">Game 7 Performers</A> and{' '}
            <A href="/articles/playoff-risers">The Biggest Playoff Risers in NBA History</A>.
            All figures are from the Hoops Data database, current through the 2025-26
            season.
          </p>
        </Prose>
      </section>
    </div>
  );
}
