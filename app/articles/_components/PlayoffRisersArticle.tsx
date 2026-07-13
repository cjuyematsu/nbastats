// app/articles/_components/PlayoffRisersArticle.tsx
//
// Interactive body of the "Playoff Risers" article
// (articles.component_key = 'playoff-risers'). Data: app/data/playoffRisersData.ts.

'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
  type TooltipItem,
} from 'chart.js';
import {
  leagueContext,
  topRisers,
  starFallers,
  per36Risers,
  legendSplits,
  activeRisers,
  scatterPlayers,
  type PlayoffSplit,
} from '@/app/data/playoffRisersData';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, Tooltip);

interface ChartTheme {
  series: string;
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

const LIGHT: ChartTheme = {
  series: '#2a78d6',
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

function compareHref(a: string, b: string): string {
  return `/compare?players=${encodeURIComponent(a)},${encodeURIComponent(b)}`;
}

const signed = (v: number, digits = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
const signedOrDash = (v: number | null, digits = 1) => (v === null ? '-' : signed(v, digits));

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

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

// Named outliers get a permanent label; everyone else lives in the tooltip.
type LabelPos = 'above' | 'below' | 'right' | 'left';
const SCATTER_LABELS: Record<string, LabelPos> = {
  'Jalen Brunson': 'left',
  'Michael Jordan': 'above',
  'Wilt Chamberlain': 'below',
  'Nikola Jokic': 'above',
  'Karl-Anthony Towns': 'below',
  'LeBron James': 'right',
};
const SCATTER_LABEL_TEXT: Record<string, string> = {
  'LeBron James': 'LeBron',
};

function diagonalLine(theme: ChartTheme): Plugin<'scatter'> {
  return {
    id: 'diagonalLine',
    beforeDatasetsDraw(chart) {
      const { ctx, scales } = chart;
      const x = scales.x;
      const y = scales.y;
      const lo = Math.max(x.min, y.min);
      const hi = Math.min(x.max, y.max);
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x.getPixelForValue(lo), y.getPixelForValue(lo));
      ctx.lineTo(x.getPixelForValue(hi), y.getPixelForValue(hi));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = theme.text;
      ctx.textAlign = 'left';
      ctx.fillText('scores more in the playoffs', x.getPixelForValue(2), y.getPixelForValue(31));
      ctx.fillText('scores less in the playoffs', x.getPixelForValue(20), y.getPixelForValue(3.5));
      ctx.restore();
    },
  };
}

function scatterLabels(highlighted: PlayoffSplit[], theme: ChartTheme): Plugin<'scatter'> {
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
        const p = highlighted[i];
        const pos = SCATTER_LABELS[p.name];
        if (!pos) return;
        let x = point.x;
        let y = point.y;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (pos === 'above') y -= 12;
        if (pos === 'below') y += 12;
        if (pos === 'right') {
          x += 8;
          ctx.textAlign = 'left';
        }
        if (pos === 'left') {
          x -= 8;
          ctx.textAlign = 'right';
        }
        ctx.fillText(SCATTER_LABEL_TEXT[p.name] ?? p.name.split(' ').slice(-1)[0], x, y);
      });
      ctx.restore();
    },
  };
}

function RiserScatter({ theme }: { theme: ChartTheme }) {
  const highlightNames = new Set(Object.keys(SCATTER_LABELS));
  const highlighted = legendSplits.filter((p) => highlightNames.has(p.name));
  const highlightedIds = new Set(highlighted.map((p) => p.personId));
  const rest = scatterPlayers.filter((p) => !highlightedIds.has(p.personId));

  const data = {
    datasets: [
      {
        label: 'Players',
        data: rest.map((p) => ({ x: p.rsPpg, y: p.poPpg })),
        backgroundColor: theme.muted,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Highlighted',
        data: highlighted.map((p) => ({ x: p.rsPpg, y: p.poPpg })),
        backgroundColor: theme.series,
        borderColor: theme.ring,
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 7,
      },
    ],
  };
  const names = [rest.map((p) => p.name), highlighted.map((p) => p.name)];
  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 10, right: 14 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        // Overlapping dots would otherwise stack extra rows under the first dot's name.
        filter: (_item: TooltipItem<'scatter'>, index: number) => index === 0,
        callbacks: {
          title: (items: TooltipItem<'scatter'>[]) =>
            names[items[0].datasetIndex][items[0].dataIndex],
          label: (item: TooltipItem<'scatter'>) =>
            `${item.parsed.x.toFixed(1)} baseline, ${item.parsed.y.toFixed(1)} playoffs`,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 35,
        title: { display: true, text: 'Same-season regular season baseline PPG', color: theme.text },
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
      y: {
        min: 0,
        max: 35,
        title: { display: true, text: 'Playoff PPG', color: theme.text },
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  return (
    <div className="relative h-80 sm:h-[28rem]">
      <Scatter
        data={data}
        options={options}
        plugins={[diagonalLine(theme), scatterLabels(highlighted, theme)]}
      />
    </div>
  );
}

function Per36Chart({ theme }: { theme: ChartTheme }) {
  const labels = per36Risers.map((p) => p.name);
  const values = per36Risers.map((p) => p.d36 ?? 0);
  const data = {
    labels,
    datasets: [
      {
        label: 'Per-36 change',
        data: values,
        backgroundColor: theme.series,
        borderRadius: 4,
        borderSkipped: 'start' as const,
        maxBarThickness: 18,
      },
    ],
  };
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { right: 44 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const p = per36Risers[item.dataIndex];
            return [
              `${p.rsP36?.toFixed(1)} -> ${p.poP36?.toFixed(1)} points per 36`,
              `${p.rsMpg?.toFixed(1)} -> ${p.poMpg?.toFixed(1)} minutes per game`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        suggestedMax: 2.2,
        title: { display: true, text: 'Playoff change in points per 36 minutes', color: theme.text },
        ticks: { color: theme.text, callback: (v) => `+${v}` },
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
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      meta.data.forEach((bar, i) => {
        ctx.fillText(signed(values[i]), bar.x + 6, bar.y);
      });
      ctx.restore();
    },
  };
  return (
    <div className="relative h-80">
      <Bar data={data} options={options} plugins={[valueLabels]} />
    </div>
  );
}

function PpgBars({ p }: { p: PlayoffSplit }) {
  const max = 35;
  return (
    <div className="mt-3 space-y-1.5">
      {[
        { label: 'Season baseline', value: p.rsPpg, cls: 'bg-[#cde2fb] dark:bg-[#1c3f6e]' },
        { label: 'Playoffs', value: p.poPpg, cls: 'bg-[#2a78d6] dark:bg-[#3987e5]' },
      ].map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-[11px] text-gray-500 dark:text-slate-400">
            {row.label}
          </span>
          <div className="h-2 flex-1 rounded-full bg-gray-200/60 dark:bg-slate-800">
            <div
              className={`h-2 rounded-full ${row.cls}`}
              style={{ width: `${Math.min((row.value / max) * 100, 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-[11px] font-semibold text-slate-700 dark:text-slate-300 [font-variant-numeric:tabular-nums]">
            {row.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function RiserCard({ rank, p, children }: { rank: number; p: PlayoffSplit; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/60 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {rank}. {p.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {p.firstYear}-{p.lastYear}, {p.poG} playoff games
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <StatChip label="Playoff jump" value={`${signed(p.diff)} PPG`} />
        {p.d36 !== null && <StatChip label="Per 36" value={signed(p.d36)} />}
        {p.poMpg !== null && p.rsMpg !== null && (
          <StatChip label="Minutes" value={`${signed(p.poMpg - p.rsMpg)} MPG`} />
        )}
        {p.rsTs !== null && p.poTs !== null && (
          <StatChip label="TS%" value={`${p.rsTs.toFixed(1)} to ${p.poTs.toFixed(1)}`} />
        )}
      </div>

      <PpgBars p={p} />

      <div className="mt-3 text-gray-600 dark:text-slate-400 leading-relaxed">{children}</div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
        <A href={playerHref(p.personId)}>Player page</A>
      </div>
    </div>
  );
}

const BLURBS: Record<number, ReactNode> = {
  1627750: (
    <p>
      Playoff Murray is not a meme, it is the single biggest playoff rise ever measured:
      3.6 points a game above his own regular season level in the same years. The two
      50-point games in the 2020 bubble and the 2023 title run beside{' '}
      <A href={compareHref('Nikola Jokic', 'Jamal Murray')}>Jokic</A> are covered at length
      in our <A href="/articles/greatest-duos">greatest duos ranking</A>.
    </p>
  ),
  201565: (
    <p>
      The MVP season gets the attention, but Rose&apos;s playoff record holds up across every
      version of his career: in each season he reached the postseason, he beat his own
      regular season scoring by an average of 3.2 points a game, sustained through the
      injuries that rewrote his prime.
    </p>
  ),
  76385: (
    <p>
      Philadelphia&apos;s point guard spent the regular season feeding Dr. J and Moses Malone
      and the playoffs picking his spots: a 3.1-point rise on a rate jump of 1.5 per 36
      across 133 postseason games, including the 1983 championship sweep. One of only a few
      names on this list whose rise is bigger than his minutes.
    </p>
  ),
  397: (
    <p>
      The archetype, finally measured. Reggie Miller beat his regular season self by 3.0 a
      game across 144 playoff games, with his scoring rate up too. Eight points in nine
      seconds at the Garden in 1995, the 25-point fourth quarter in 1994, and a 61 TS%
      baseline he nearly carried intact through fifteen postseasons.
    </p>
  ),
  1628973: (
    <p>
      The reigning champion, measured the honest way: in every season Brunson reached the
      playoffs, including his Dallas bench years, he outscored that same season&apos;s
      regular season average, by 3.0 a game overall with his per-36 rate up 1.3. In 2026 he
      finished the job: Finals MVP, and the Knicks&apos; first title since 1973.
    </p>
  ),
  203999: (
    <p>
      The best passer among big men ever is also a genuine playoff riser: 2.9 points a game
      above his own season baselines, on a 60.8 playoff TS% that is the best of anyone this
      high on the list. The 2023 title run, with{' '}
      <A href={compareHref('Nikola Jokic', 'Jamal Murray')}>Murray</A> rising beside him, is
      the modern template for two-man playoff scoring.
    </p>
  ),
  77141: (
    <p>
      A Finals MVP in Seattle and the defensive spine of two Celtics championships. Dennis
      Johnson played 180 playoff games and beat his own regular season scoring by 2.7 per
      game in them. Larry Bird called him the best teammate he ever had.
    </p>
  ),
  893: (
    <p>
      The 33.4 playoff average is the highest in NBA history, and the season-matched math
      makes it better: Jordan took a 30.9-point baseline and added 2.6 more, while holding
      his per-minute rate essentially flat against playoff defenses, across 179 games and
      six Finals without a single Game 7.
    </p>
  ),
  76912: (
    <p>
      The deepest cut on the list. Cliff Hagan&apos;s Hawks met Russell&apos;s Celtics in the
      Finals four times in five years, and in 1958 they won, the only Finals Boston lost in
      Russell&apos;s first ten seasons. Hagan averaged 27.7 that postseason. Box scores from
      his era rarely recorded minutes or shot attempts, so his rate and efficiency stats
      stay blank below.
    </p>
  ),
  1884: (
    <p>
      The forgotten name in the top ten. Baron Davis beat his own regular seasons by 2.5 a
      game while raising his TS% by more than four points, the largest efficiency jump on
      the list, peaking with the We Believe Warriors&apos; 2007 upset of the 67-win
      Mavericks, still the loudest first-round shock of the seeded era.
    </p>
  ),
  1628378: (
    <p>
      The heaviest scoring load on the list after Jordan, and he still climbs. Mitchell
      turns a 25.4-point baseline into 27.8 in the playoffs, and his 2020 bubble duel with
      Murray, trading 50-point games in a seven-game first round, remains the purest playoff
      shootout of the decade.
    </p>
  ),
  202695: (
    <p>
      The quiet validation of load management. Kawhi&apos;s regular seasons read like
      maintenance, then the playoffs arrive and he adds 2.3 a game while his efficiency goes
      up, a 62.1 playoff TS%. Two Finals MVPs with two franchises, and the 2019 run through
      Giannis, Embiid, and Curry is the modern standard for two-way playoff basketball.
    </p>
  ),
  1460: (
    <p>
      The nickname came first, but the data signs off: Big Game James beat his regular
      season self in volume, rate, and efficiency across 143 playoff games. The 1988 Finals
      Game 7 triple-double that clinched back-to-back titles for the Lakers earned him
      Finals MVP over Magic and Kareem.
    </p>
  ),
  203114: (
    <p>
      Milwaukee&apos;s quiet second star saved his best shot-making for the postseason,
      beating his own regular seasons by 2.3 a game on six extra minutes a night. Middleton
      closed games throughout the 2021 title run whenever defenses finally walled off
      Giannis.
    </p>
  ),
  84: (
    <p>
      The wild card. Sprewell dragged the eighth-seeded 1999 Knicks to the Finals, hung 35
      in the closeout game of the 2004 semifinals for Minnesota, and across 62 playoff games
      beat his own regular seasons by 2.3 a game on 40 minutes a night. No ring, no apology.
    </p>
  ),
};

function FallersTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Baseline</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Playoffs</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Change</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">Playoff G</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {starFallers.map((p) => (
            <tr key={p.personId} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(p.personId)}>{p.name}</A>
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{p.rsPpg.toFixed(1)}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{p.poPpg.toFixed(1)}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right font-semibold text-red-600 dark:text-red-400">
                {p.diff.toFixed(1)}
              </td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{p.poG}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegendsTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            <th className="px-2 lg:px-2.5 py-2">Player</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Baseline</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Playoffs</th>
            <th className="px-2 lg:px-2.5 py-2 text-right">Change</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">Per 36</th>
            <th className="hidden lg:table-cell px-2.5 py-2 text-right">TS% change</th>
            <th className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">Playoff G</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
          {legendSplits.map((p) => (
            <tr key={p.personId} className="text-gray-700 dark:text-slate-300">
              <td className="px-2 lg:px-2.5 py-2 whitespace-nowrap">
                <A href={playerHref(p.personId)}>{p.name}</A>
              </td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{p.rsPpg.toFixed(1)}</td>
              <td className="px-2 lg:px-2.5 py-2 text-right">{p.poPpg.toFixed(1)}</td>
              <td
                className={`px-2 lg:px-2.5 py-2 text-right font-semibold ${
                  p.diff >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {signed(p.diff)}
              </td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{signedOrDash(p.d36)}</td>
              <td className="hidden lg:table-cell px-2.5 py-2 text-right">
                {p.poTs !== null && p.rsTs !== null ? signed(p.poTs - p.rsTs) : '-'}
              </td>
              <td className="hidden sm:table-cell px-2 lg:px-2.5 py-2 text-right">{p.poG}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlayoffRisersArticle() {
  const theme = useChartTheme();
  const topRiser = topRisers[0];
  const jordan = legendSplits.find((p) => p.name === 'Michael Jordan');
  const wilt = legendSplits.find((p) => p.name === 'Wilt Chamberlain');
  const kat = legendSplits.find((p) => p.name === 'Karl-Anthony Towns');
  const embiid = starFallers.find((p) => p.name === 'Joel Embiid');

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading>Every playoff career on one chart</SectionHeading>
        <Prose>
          <p>
            For every playoff game a player appeared in, we ask one question: did he score
            more or less than his own regular season average from that same year? Each dot
            is one of the {leagueContext.qualified} players in NBA history with at least 50
            playoff games. The horizontal axis is his expected scoring, each season&apos;s
            regular season average weighted by how many playoff games he actually played in
            it; the vertical axis is what he really averaged in the playoffs. A missed
            postseason never counts against anyone, and a bench year counts only as much as
            the playoff games he played in that role. The dashed line is break-even: land
            above it and you beat your own regular seasons when the games mattered most,
            land below it and you shrank. Hover any dot for the player and the split.
          </p>
        </Prose>
        <ChartCard>
          <RiserScatter theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Playoff PPG vs each player&apos;s own same-season regular season baseline, all
            qualified players since 1947.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>The extremes</SectionHeading>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Biggest playoff rise"
            value={signed(topRiser.diff)}
            sub={`${topRiser.name}, ${topRiser.rsPpg.toFixed(1)} to ${topRiser.poPpg.toFixed(1)} PPG`}
          />
          <StatTile
            label="Biggest superstar fall"
            value={wilt ? wilt.diff.toFixed(1) : ''}
            sub={`Wilt Chamberlain, ${wilt?.rsPpg.toFixed(1)} to ${wilt?.poPpg.toFixed(1)} PPG, same seasons`}
          />
          <StatTile
            label="Highest playoff PPG ever"
            value={jordan ? jordan.poPpg.toFixed(1) : ''}
            sub="Michael Jordan, 179 playoff games"
          />
          <StatTile
            label="Scoring rates that drop"
            value={`${leagueContext.pctP36Drops}%`}
            sub="of qualified players score less per 36 in the playoffs"
          />
        </div>
      </section>

      <section>
        <SectionHeading>The biggest playoff risers in NBA history</SectionHeading>
        <Prose>
          <p>
            Ranked by how far each player&apos;s playoff scoring beat his own same-season
            regular season level. Measured honestly, the list reads like a roll call of every
            playoff reputation the league ever argued about: Playoff Murray at the top,
            Reggie Miller, Big Game James, Kawhi, Jordan. Six of the fifteen have won a
            Finals MVP, and ten own a ring.
          </p>
        </Prose>
        <div className="mt-6 space-y-6">
          {topRisers.map((p, i) => (
            <RiserCard key={p.personId} rank={i + 1} p={p}>
              {BLURBS[p.personId]}
            </RiserCard>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>The minutes illusion</SectionHeading>
        <Prose>
          <p>
            Here is the part most playoff-riser lists skip. Playoff basketball is harder to
            score in: possessions slow down, weak defenders leave the floor, and every night
            is a scheme built against you. Across the qualified field, scoring efficiency
            falls by {Math.abs(leagueContext.avgTsDiff).toFixed(1)} points of TS% in the
            postseason, per-36 scoring drops by{' '}
            {Math.abs(leagueContext.avgP36Diff).toFixed(1)} points, and{' '}
            {leagueContext.pctP36Drops}% of players see their scoring rate decline.
          </p>
          <p>
            So where do the big playoff jumps come from? Minutes. The stars on the list above
            play three to six more minutes a night in the postseason, and that expansion
            hides the fact that almost everyone, LeBron and Kobe included, scores slightly
            less per minute against playoff defenses. Even Playoff Murray, the biggest raw
            riser ever, holds his rate exactly flat: his entire rise is six extra minutes a
            night. The list below is the rarer club that actually raised its rate: more
            points per 36 in the playoffs, minimum 15 playoff minutes a game.
          </p>
        </Prose>
        <ChartCard>
          <Per36Chart theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Change in points per 36 minutes, regular season to playoffs. Tooltips show the
            underlying rates and minutes.
          </p>
        </ChartCard>
        <Prose>
          <p className="mt-3 text-sm">
            Four names sit on both lists, raising volume and rate together: Reggie Miller,
            Baron Davis, Maurice Cheeks, and Brunson. Baron is the standout profile, since
            his efficiency jumps more than four points of TS% on top of the rate gain, and
            Goran Dragic at the top is the classic bench-fire case, a career playoff
            overperformer whose 2020 bubble run to the Finals with Miami was the loudest
            version.
          </p>
        </Prose>
      </section>

      <section>
        <SectionHeading>The fallers</SectionHeading>
        <Prose>
          <p>
            The other side of the diagonal. This table takes the ten biggest playoff scoring
            drops among players with a regular season average of at least 15.
          </p>
        </Prose>
        <div className="mt-6">
          <FallersTable />
        </div>
        <Prose>
          <p className="mt-4">
            Measured this carefully, the fair reading of Wilt Chamberlain is milder than his
            reputation but still the biggest superstar drop ever: game for game, season for
            season, he scored 4.2 below his own regular season level once Bill
            Russell&apos;s Celtics could single-cover him with the best defender alive and
            pack the paint with the rest. His 44.8-point 1963 season, when his Warriors
            missed the playoffs entirely, does not count against him at all.
          </p>
          <p>
            The modern headline is{' '}
            {embiid ? <A href={playerHref(embiid.personId)}>Joel Embiid</A> : 'Joel Embiid'}:
            an MVP who gives back 3.8 a game against his own season baselines, the exact
            discourse the Philadelphia springs keep relitigating, with Tyler Herro telling a
            smaller version of the same story. And{' '}
            {kat ? <A href={playerHref(kat.personId)}>Karl-Anthony Towns</A> : 'Karl-Anthony Towns'}{' '}
            remains the most interesting case on the table: he drops 3.4 in the playoffs and
            won the 2026 title anyway, because the man he shares the locker room with beats
            his own baseline by three. Falling is not failing. You can{' '}
            <A href={compareHref('Jalen Brunson', 'Karl-Anthony Towns')}>
              compare the champions&apos; two halves side by side
            </A>
            .
          </p>
        </Prose>
      </section>

      <section>
        <SectionHeading>The big names, regular season vs playoffs</SectionHeading>
        <Prose>
          <p>
            The names people actually search for, all-time greats and today&apos;s stars
            together, sorted by how much their playoff scoring beat their own same-season
            baselines. Read the per-36 column before crowning anyone: nearly every raw
            average here climbs while the scoring rate slips, because star minutes surge in
            the playoffs. Only Brunson and Hakeem actually raise their rate, and Jordan
            holds his essentially flat, which at a 33.4 playoff average is its own kind of
            flex. At the other end, Shai Gilgeous-Alexander is the table&apos;s surprise:
            the 2025 champion scores 1.9 below his own regular season level in the playoffs
            so far.
          </p>
        </Prose>
        <div className="mt-6">
          <LegendsTable />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          True playoff averages vs same-season baselines. Click any player for full
          season-by-season splits, or{' '}
          <Link href="/compare" className="text-sky-600 dark:text-sky-400 hover:underline">
            compare any two careers
          </Link>
          .
        </p>
      </section>

      <section>
        <SectionHeading>The active risers (through 2026)</SectionHeading>
        <Prose>
          <p>
            The all-time leader is active: Playoff Murray is still adding to the biggest
            rise ever measured, with the champion Brunson and Jokic right behind him, the
            only trio of active players in the all-time top six. Kawhi&apos;s two-way playoff
            legend survives the honest math, Draymond, Caruso, and Marcus Smart carry the
            champion-role-player profile, and LeBron James is still beating his own
            baselines by 1.3 a game across a record 302 playoff appearances.
          </p>
        </Prose>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeRisers.map((p) => (
            <div
              key={p.personId}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  <A href={playerHref(p.personId)}>{p.name}</A>
                </p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {signed(p.diff)} PPG
                </p>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 [font-variant-numeric:tabular-nums]">
                {p.rsPpg.toFixed(1)} baseline, {p.poPpg.toFixed(1)} playoffs, {p.poG}{' '}
                playoff games
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>How we counted</SectionHeading>
        <Prose>
          <p>
            Every number in this article comes from our own stats database, covering every
            regular season and playoff box score since the league&apos;s first season in
            1946-47, current through the 2026 Finals. The ground rules:
          </p>
          <ul>
            <li>
              <strong>Every playoff run is compared to its own season, weighted by playoff
              games.</strong> For each season a player reached the postseason, we take the
              gap between his playoff scoring and his regular season scoring in that same
              year, then average those gaps weighted by how many playoff games he played in
              each. Equivalently: his playoff PPG here is his true career playoff average
              (it matches his player page exactly), and his baseline is what he would have
              averaged had he scored at each season&apos;s regular season level in every
              playoff game he actually played. A star who missed the playoffs through his
              prime is never punished for it, a bench season counts only as much as its
              playoff games, and era and pace cancel out because both halves of every
              comparison come from the same year.
            </li>
            <li>
              <strong>Qualification</strong> is 50 or more career playoff games, 150 or more
              regular season games in playoff seasons, and at least 5 regular season games
              for a season to set a baseline, which yields {leagueContext.qualified} players.
              Fifty playoff games is roughly three deep runs, enough to separate a real
              pattern from one hot series.
            </li>
            <li>
              <strong>Per-36 and efficiency numbers</strong> use the same per-season scheme,
              weighted by playoff minutes and playoff shot attempts instead of games. Game
              logs before 1971 recorded minutes and shot attempts for only a fraction of
              games, so per-36, minutes, and TS% figures use 1971 and later seasons only, and
              show as a dash for careers played mostly before then, like Wilt and Cliff
              Hagan. Points and games are complete for every era, so the scoring splits
              themselves have no such cutoff. The per-36 leaderboard adds a 15 playoff
              minutes per game floor so garbage-time small samples do not sneak in.
            </li>
            <li>
              <strong>True shooting</strong> is points divided by 2 times (field goal attempts
              plus 0.44 times free throw attempts), the standard formula.
            </li>
            <li>
              ABA statistics are not included, so players who split eras, like Rick Barry,
              appear with their NBA numbers only.
            </li>
          </ul>
          <p>
            If you want to interrogate any of it, the tools are here: every player&apos;s
            season-by-season regular season and playoff tables live on their{' '}
            <A href="/players">player pages</A>, any two careers can go{' '}
            <A href="/compare">head to head</A>, and if this article started an argument about
            teammates, our <A href="/articles/greatest-duos">greatest duos ranking</A> and{' '}
            <A href="/duos">duo tracker</A> are the natural next stop. Disagree with the
            order? The <A href="/top-100-players">community Top 100</A> is where votes settle
            things.
          </p>
        </Prose>
      </section>
    </div>
  );
}
