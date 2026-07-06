// app/articles/_components/GreatestDuosArticle.tsx
//
// Interactive body of the "Greatest Duos in NBA History" article
// (articles.component_key = 'greatest-duos'). Data: app/data/duosData.ts.

'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Bar, Bubble } from 'react-chartjs-2';
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
  rankedDuos,
  mostGamesTogether,
  highestCombinedPpg,
  currentDuos,
  type RankedDuo,
} from '@/app/data/duosData';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, Tooltip);

interface ChartTheme {
  series: string;
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

// Dark mode is Tailwind's default media strategy, so watch the media query
// (there is no 'dark' class on <html> to observe).
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

function duoHref(a: string, b: string): string {
  return `/duos?players=${encodeURIComponent(a)},${encodeURIComponent(b)}`;
}

function compareHref(a: string, b: string): string {
  return `/compare?players=${encodeURIComponent(a)},${encodeURIComponent(b)}`;
}

// Draws the value at the tip of each horizontal bar.
function barValueLabels(color: string, format: (v: number) => string): Plugin<'bar'> {
  return {
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const data = chart.data.datasets[0].data as number[];
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      meta.data.forEach((bar, i) => {
        ctx.fillText(format(data[i]), bar.x + 6, bar.y);
      });
      ctx.restore();
    },
  };
}

// Direct labels for a handful of bubbles; the tooltip carries the rest.
type LabelPos = 'above' | 'below' | 'right' | 'above-start' | 'above-end';
const BUBBLE_LABELS: Record<string, LabelPos> = {
  'Jordan & Pippen': 'above',
  'Russell & S. Jones': 'right',
  'Stockton & Malone': 'above-end',
  'Durant & Curry': 'above-start',
  'West & Baylor': 'below',
};

function bubbleLabels(color: string): Plugin<'bubble'> {
  return {
    id: 'bubbleLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      meta.data.forEach((point, i) => {
        const duo = rankedDuos[i];
        const pos = BUBBLE_LABELS[duo.short];
        if (!pos) return;
        const r = (point as unknown as { options: { radius: number } }).options.radius;
        let x = point.x;
        let y = point.y - r - 9;
        ctx.textAlign = 'center';
        if (pos === 'below') y = point.y + r + 10;
        if (pos === 'right') {
          x = point.x + r + 6;
          y = point.y;
          ctx.textAlign = 'left';
        }
        if (pos === 'above-start') {
          x = point.x - r;
          ctx.textAlign = 'left';
        }
        if (pos === 'above-end') {
          x = point.x + r;
          ctx.textAlign = 'right';
        }
        ctx.fillText(duo.short, x, y);
      });
      ctx.restore();
    },
  };
}

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

function DominanceChart({ theme }: { theme: ChartTheme }) {
  const data = {
    datasets: [
      {
        label: 'Duos',
        data: rankedDuos.map((d) => ({ x: d.games, y: d.winPct, r: 5 + d.titles * 1.1 })),
        backgroundColor: theme.series,
        borderColor: theme.ring,
        borderWidth: 2,
      },
    ],
  };
  const options: ChartOptions<'bubble'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 14, right: 20 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...theme.tooltip,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items: TooltipItem<'bubble'>[]) => rankedDuos[items[0].dataIndex].short,
          label: (item: TooltipItem<'bubble'>) => {
            const d = rankedDuos[item.dataIndex];
            return [
              `${d.games.toLocaleString()} games, ${d.wins}-${d.losses} (${d.winPct}%)`,
              `${d.titles} ${d.titles === 1 ? 'title' : 'titles'} together, ${d.combinedPpg} combined PPG`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        suggestedMax: 1700,
        title: { display: true, text: 'Games played together', color: theme.text },
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
      y: {
        min: 55,
        max: 80,
        title: { display: true, text: 'Win % together', color: theme.text },
        ticks: { color: theme.text, callback: (v) => `${v}%` },
        grid: { color: theme.grid },
        border: { color: theme.grid },
      },
    },
  };
  return (
    <div className="relative h-80 sm:h-96">
      <Bubble data={data} options={options} plugins={[bubbleLabels(theme.text)]} />
    </div>
  );
}

function LeaderboardChart({
  theme,
  labels,
  values,
  details,
  format,
  suggestedMax,
  xLabel,
}: {
  theme: ChartTheme;
  labels: string[];
  values: number[];
  details: string[];
  format: (v: number) => string;
  suggestedMax: number;
  xLabel: string;
}) {
  const data = {
    labels,
    datasets: [
      {
        label: xLabel,
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
          label: (item: TooltipItem<'bar'>) =>
            `${format(item.parsed.x)} (${details[item.dataIndex]})`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        suggestedMax,
        title: { display: true, text: xLabel, color: theme.text },
        ticks: { color: theme.text },
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
  return (
    <div className="relative h-72">
      <Bar data={data} options={options} plugins={[barValueLabels(theme.text, format)]} />
    </div>
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

function DuoCard({ duo, children }: { duo: RankedDuo; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/60 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {duo.rank}. {duo.a} &amp; {duo.b}
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {duo.team}, {duo.years}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <StatChip label="Games" value={duo.games.toLocaleString()} />
        <StatChip label="Record" value={`${duo.wins}-${duo.losses}`} />
        <StatChip label="Win %" value={`${duo.winPct}%`} />
        <StatChip label="Titles" value={String(duo.titles)} />
        <StatChip label="Combined PPG" value={duo.combinedPpg.toFixed(1)} />
        <StatChip label="Combined APG" value={duo.combinedApg.toFixed(1)} />
        <StatChip label="Combined RPG" value={duo.combinedRpg.toFixed(1)} />
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-[#cde2fb] dark:bg-[#1c3f6e]">
        <div
          className="h-1.5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
          style={{ width: `${duo.winPct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
        Win percentage together
      </p>

      <div className="mt-3 text-gray-600 dark:text-slate-400 leading-relaxed">{children}</div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
        <A href={duoHref(duo.a, duo.b)}>Duo page</A>
        <A href={compareHref(duo.a, duo.b)}>Compare careers</A>
      </div>
    </div>
  );
}

const BLURBS: Record<number, ReactNode> = {
  1: (
    <p>
      The standard. Jordan and Pippen went six for six in the Finals, never needed a Game 7 to
      close one out, and won 73.4% of every game they played together in Chicago. Pippen was the
      perfect complement: an all-time defender and secondary creator who let Jordan be the most
      ruthless scorer the league has seen. No duo combines peak, longevity, and hardware quite 
      like Jordan and Pippen.
    </p>
  ),
  2: (
    <p>
      Showtime, distilled to two names. Magic arrived in 1979 to pair maybe the greatest point guard
      ever with likely the greatest center in NBA history. The Lakers dominated the 80s, reaching the 
      finals eight times and winning five titles. Their 73.2% win rate is the best of any duo who
      played together for over a decade.
    </p>
  ),
  3: (
    <p>
      At its peak, debatably the most dominant duo ever. From 2000 to 2002 the Lakers three-peated 
      behind a prime Shaq and a rising Kobe, and their 49.1 combined points per game ties Jordan and
      Pippen. Had a feud not ended their partnership early, they may be even higher on this list.
    </p>
  ),
  4: (
    <p>
      The Splash Brothers changed the sport&apos;s geometry. No teammates have ever combined for
      more three-pointers, and no backcourt has ever carried this much gravity: four titles and
      six Finals from 2015 through 2022. Curry and{' '}
      <A href={duoHref('Stephen Curry', 'Draymond Green')}>Draymond Green</A> actually logged
      more games, but Curry and Klay were the identity of the dynasty.
    </p>
  ),
  5: (
    <p>
      The most decorated duo in the history of American team sports, and it is not close.
      Russell and Jones won ten titles together in twelve seasons, more than any other NBA
      pair, while winning 71.8% of nearly a thousand shared games. Modern rankings tend to
      discount the era; the record book does not.
    </p>
  ),
  6: (
    <p>
      No two players have shared a floor more often. Stockton and Malone played 1,590 games
      together over 18 seasons in Utah, more than 300 more than any other duo, and ran the
      league&apos;s most reliable pick-and-roll for the better part of two decades. The
      all-time assists leader feeding a top-three all-time scorer, blocked from a ring only by
      the duo at number one.
    </p>
  ),
  7: (
    <p>
      The engine of the longest sustained excellence in league history. Duncan and Parker won
      four titles across 15 seasons and more playoff games together than any pair ever. Add{' '}
      <A href={duoHref('Tim Duncan', 'Manu Ginobili')}>Manu Ginobili</A>, who won 71.1% of his
      1,102 games with Duncan, and three of the six most-played duos ever wore the same uniform.
    </p>
  ),
  8: (
    <p>
      The best forward pairing ever. Bird&apos;s shooting and passing next to McHale&apos;s
      unguardable post game won three titles and made the 1986 Celtics a permanent entry in the
      greatest-team argument. With{' '}
      <A href={duoHref('Larry Bird', 'Robert Parish')}>Robert Parish</A> they formed the standard
      against which every big three is measured.
    </p>
  ),
  9: (
    <p>
      The duo that changed how superteams are built. Four straight Finals in Miami, two titles,
      and the most seamless star-to-star chemistry of the modern era: nobody threw the lob
      better than Wade, and nobody finished it better than LeBron. Shorter run than most on this
      list, but the impact was seismic.
    </p>
  ),
  10: (
    <p>
      Four seasons, one title, and the best win percentage of any duo in our top 15. A young
      Kareem and a veteran Oscar won 66 games and the 1971 championship in their first year
      together in Milwaukee. Brief, but staggeringly effective.
    </p>
  ),
  11: (
    <p>
      The highest-scoring duo ever. When both took the floor, West and Baylor combined for
      53.1 points per game, the best mark of any teammates. They reached seven Finals together,
      unfortunately losing them all (most to Russell&apos;s Celtics). Baylor then
      retired nine games into the 1971-72 season where the Lakers went on to win the title 
      without him.
    </p>
  ),
  12: (
    <p>
      The trade that saved the post-Shaq Lakers. Gasol arrived in 2008 and Los Angeles went to
      three straight Finals, winning two. Kobe called him the most skilled big man he ever
      played with, and the two-man game they ran in the 2010 Finals against Boston remains a
      masterclass.
    </p>
  ),
  13: (
    <p>
      The most talented duo to never win it. Durant and Westbrook combined for 49.4 points per
      game across eight seasons in Oklahoma City, reached the 2012 Finals before either turned
      24, and blew a 3-1 conference finals lead in 2016 that split the duo forever. An MVP each,
      zero rings together.
    </p>
  ),
  14: (
    <p>
      The shortest run on this list and the most dominant. For three seasons the Warriors put
      two MVPs in the same lineup, won 78.4% of their games together, went back-to-back, and
      combined for 52.0 points a night. The brevity, and the ready-made roster around them,
      is why the pairing ranks below other duos.
    </p>
  ),
  15: (
    <p>
      The best two-man game of the current era. <A href="/player/203999">Jokic</A> and Murray
      have run the same two-man actions for a decade in Denver, winning the 2023 title, and
      their 656 games together already rank among the most of any active pairing. The partnership
      is still adding to its trophy case.
    </p>
  ),
};

export default function GreatestDuosArticle() {
  const theme = useChartTheme();
  const gamesMax = Math.max(...currentDuos.map((d) => d.games));

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading>The Greatest NBA Duos on One Chart</SectionHeading>
        <Prose>
          <p>
            Games together run along the horizontal axis, win percentage climbs the vertical,
            and bubble size tracks championships won as a pair. The strongest duos cluster
            toward the upper right. The outlier at the far right is Stockton and Malone,
            more than 300 games clear of the field without a title. Hover any bubble for the
            full line.
          </p>
        </Prose>
        <ChartCard>
          <DominanceChart theme={theme} />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            All 15 ranked duos. Bubble size = championships won together.
          </p>
        </ChartCard>
      </section>

      <section>
        <SectionHeading>The 15 greatest NBA duos, by the numbers</SectionHeading>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-[11px] min-[400px]:text-xs lg:text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                <th className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2">#</th>
                <th className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2">Duo</th>
                <th className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2 text-right">Games</th>
                <th className="hidden lg:table-cell px-2.5 py-2 text-right">Record</th>
                <th className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2 text-right">Win %</th>
                <th className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2 text-right">Titles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 [font-variant-numeric:tabular-nums]">
              {rankedDuos.map((d) => (
                <tr key={d.rank} className="text-gray-700 dark:text-slate-300">
                  <td className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2">{d.rank}</td>
                  <td className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2 whitespace-nowrap">
                    <A href={duoHref(d.a, d.b)}>
                      <span className="lg:hidden">{d.short}</span>
                      <span className="hidden lg:inline">
                        {d.a} &amp; {d.b}
                      </span>
                    </A>
                  </td>
                  <td className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2 text-right">{d.games.toLocaleString()}</td>
                  <td className="hidden lg:table-cell px-2.5 py-2 text-right">{`${d.wins}-${d.losses}`}</td>
                  <td className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2 text-right">{d.winPct}%</td>
                  <td className="px-1 min-[400px]:px-1.5 lg:px-2.5 py-2 text-right">{d.titles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          <span className="hidden lg:inline">
            Combined per-game scoring, assists, and rebounds are in the full ranking below.
          </span>
          <span className="lg:hidden">
            Records and combined stats are in the full ranking below.
          </span>
        </p>
      </section>

      <section>
        <SectionHeading>The ranking</SectionHeading>
        <div className="space-y-6">
          {rankedDuos.map((duo) => (
            <DuoCard key={duo.rank} duo={duo}>
              {BLURBS[duo.rank]}
            </DuoCard>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>Duo records: the numbers behind the debate</SectionHeading>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Most games together" value="1,590" sub="Stockton & Malone, Jazz" />
          <StatTile label="Most titles together" value="10" sub="Russell & Sam Jones, Celtics" />
          <StatTile label="Highest combined PPG" value="53.1" sub="West & Baylor, Lakers" />
          <StatTile label="Best win % (300+ games)" value="81.0%" sub="Ron Harper & Jordan, Bulls" />
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Most games played together, all time
          </h3>
          <ChartCard>
            <LeaderboardChart
              theme={theme}
              labels={mostGamesTogether.map((d) => d.short)}
              values={mostGamesTogether.map((d) => d.value)}
              details={mostGamesTogether.map((d) => d.detail)}
              format={(v) => v.toLocaleString()}
              suggestedMax={1700}
              xLabel="Games together"
            />
          </ChartCard>
          <Prose>
            <p className="mt-3 text-sm">
              San Antonio owns three of the top five spots. The best win rate among 300-game
              duos belongs to Michael Jordan and role player Ron Harper, who went 255-60
              (81%) on the back half of the Bulls dynasty, with four of Shaun Livingston&apos;s
              Warriors pairings stacked right behind them, a measure of how much a dynasty&apos;s
              depth wins.
            </p>
          </Prose>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Highest combined points per game (min. 300 games)
          </h3>
          <ChartCard>
            <LeaderboardChart
              theme={theme}
              labels={highestCombinedPpg.map((d) => d.short)}
              values={highestCombinedPpg.map((d) => d.value)}
              details={highestCombinedPpg.map((d) => d.detail)}
              format={(v) => v.toFixed(1)}
              suggestedMax={56}
              xLabel="Combined points per game"
            />
          </ChartCard>
          <Prose>
            <p className="mt-3 text-sm">
              Sixty years on, nobody has out-scored West and Baylor. Durant and Curry averaged
              52.0 together but fall short of the 300-game minimum at 213. Half this list is
              pairings the modern debate overlooks, like Wilt Chamberlain and Guy Rodgers.
            </p>
          </Prose>
        </div>
      </section>

      <section>
        <SectionHeading>The best NBA duos right now (2026)</SectionHeading>
        <Prose>
          <p>
            The 2026 Finals featured two of them.{' '}
            <A href="/player/1628973">Jalen Brunson</A> and{' '}
            <A href="/player/1626157">Karl-Anthony Towns</A> have a championship and an NBA Cup
            in two seasons together in New York. The duo they beat may have the higher
            ceiling: <A href="/player/1641705">Victor Wembanyama</A> and rookie Dylan Harper
            went 56-21 and reached the Finals in their first season as teammates, at 22 and 20
            years old. The 2025 champions, Shai Gilgeous-Alexander and Jalen Williams, have
            won two thirds of their games in Oklahoma City. At least one of these pairs should
            eventually force its way onto this list.
          </p>
        </Prose>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentDuos.map((d) => (
            <div
              key={d.short}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  <A href={duoHref(d.a, d.b)}>{d.short}</A>
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">{d.note}</p>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 [font-variant-numeric:tabular-nums]">
                {d.games} games, {d.wins}-{d.losses} ({d.winPct}%)
              </p>
              <div
                className="mt-2 h-1.5 rounded-full bg-[#cde2fb] dark:bg-[#1c3f6e]"
                title={`${d.games} of ${gamesMax} games`}
              >
                <div
                  className="h-1.5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
                  style={{ width: `${Math.max((d.games / gamesMax) * 100, 4)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                Games together, relative to Jokic &amp; Murray&apos;s {gamesMax.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>Honorable mentions</SectionHeading>
        <Prose>
          <p>
            <A href={duoHref('Tim Duncan', 'Manu Ginobili')}>Tim Duncan &amp; Manu Ginobili</A>{' '}
            (1,102 games, four titles),{' '}
            <A href={duoHref('Stephen Curry', 'Draymond Green')}>Stephen Curry &amp; Draymond Green</A>{' '}
            (1,009 games and counting),{' '}
            <A href={duoHref('Isiah Thomas', 'Joe Dumars')}>Isiah Thomas &amp; Joe Dumars</A>{' '}
            (back-to-back titles for the Bad Boys),{' '}
            <A href={duoHref('Bill Russell', 'Bob Cousy')}>Bill Russell &amp; Bob Cousy</A>{' '}
            (six titles in seven seasons),{' '}
            <A href={duoHref('Giannis Antetokounmpo', 'Khris Middleton')}>
              Giannis Antetokounmpo &amp; Khris Middleton
            </A>{' '}
            (765 games and the 2021 title),{' '}
            <A href={duoHref('LeBron James', 'Kyrie Irving')}>LeBron James &amp; Kyrie Irving</A>{' '}
            (the 2016 comeback),{' '}
            <A href={duoHref('LeBron James', 'Anthony Davis')}>LeBron James &amp; Anthony Davis</A>{' '}
            (50.0 combined PPG and the 2020 bubble ring), and{' '}
            <A href={duoHref('Jaylen Brown', 'Jayson Tatum')}>Jaylen Brown &amp; Jayson Tatum</A>{' '}
            (646 games together and the 2024 title).
          </p>
          <p>
            If your order differs, the tools are here. Every pairing in NBA history is
            searchable in our <A href="/duos">duo tracker</A>, and you can{' '}
            <A href="/compare">compare any two careers side by side</A>. If two players never
            shared a locker room, our{' '}
            <A href="/degrees-of-separation">degrees of separation tool</A> will find what
            connects them.
          </p>
        </Prose>
      </section>

      <section>
        <SectionHeading>How we counted</SectionHeading>
        <Prose>
          <p>
            Every stat in this article comes from our teammates database, which is built from
            the box score of every regular season and playoff game since 1946, covering about
            150,000 teammate pairings, current through the 2026 Finals. The ground rules:
          </p>
          <ul>
            <li>
              <strong>Games together</strong> means both players appeared in the same
              team&apos;s box score for the same regular season or playoff game. Preseason,
              All-Star, and Play-In games are excluded, matching how the NBA keeps official
              statistics, so a duo&apos;s number here matches its{' '}
              <A href="/duos">duo tracker</A> page exactly.
            </li>
            <li>
              <strong>Record and win %</strong> are the team&apos;s results in those shared
              games, nothing more.
            </li>
            <li>
              <strong>Combined points, assists, and rebounds</strong> add both players&apos;
              per-game output, counted only in games where both actually logged minutes, so an
              injured star listed on the bench does not water the averages down.
            </li>
            <li>
              <strong>Titles together</strong> are championships won in seasons the two
              finished as teammates.
            </li>
            <li>
              The record charts use a <strong>300-game minimum</strong> to keep one-season
              rentals out of all-time conversations.
            </li>
          </ul>
          <p>
            The ranking blends those numbers with historical consensus: the data sets the
            tiers, and context breaks the ties. That is why Russell and Sam Jones, with ten
            titles, sit fifth rather than first. Reasonable people will order these fifteen
            differently.
          </p>
        </Prose>
      </section>
    </div>
  );
}
