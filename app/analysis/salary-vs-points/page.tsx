// src/app/analysis/salary-vs-performance/page.tsx

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

interface PlayerData { name: string; salary: number; games: number; pts: number; dpp: number; }
const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const bestValueAll: PlayerData[] = [
  { name: 'Drew Timme', dpp: 1037.20, salary: 113055, pts: 109, games: 9 }, { name: 'Tosan Evbuomwan', dpp: 1241.07, salary: 331365, pts: 267, games: 28 },
  { name: 'Jaylen Wells', dpp: 1406.02, salary: 1157153, pts: 823, games: 79 }, { name: 'Jaylen Sims', dpp: 1741.74, salary: 73153, pts: 42, games: 6 },
  { name: 'Tristan Vukcevic', dpp: 1753.26, salary: 578577, pts: 330, games: 35 }, { name: 'Justin Edwards', dpp: 1758.92, salary: 782721, pts: 445, games: 44 },
  { name: 'Damion Baugh', dpp: 1800.41, salary: 196245, pts: 109, games: 15 }, { name: 'Tyrese Martin', dpp: 1835.05, salary: 959732, pts: 523, games: 60 },
  { name: 'Marcus Bagley', dpp: 1885.91, salary: 126356, pts: 67, games: 10 }, { name: 'Jeff Dowtin Jr.', dpp: 2030.09, salary: 578577, pts: 285, games: 41 }
];
const worstValueAll: PlayerData[] = [
  { name: 'P.J. Tucker', dpp: 1351730.78, salary: 12165577, pts: 9, games: 3 }, { name: 'Taylor Hendricks', dpp: 417740.43, salary: 5848366, pts: 14, games: 3 },
  { name: 'James Johnson', dpp: 412971.38, salary: 3303771, pts: 8, games: 12 }, { name: 'James Wiseman', dpp: 372948.50, salary: 2237691, pts: 6, games: 1 },
  { name: 'Daishen Nix', dpp: 362356.00, salary: 362356, pts: 1, games: 3 }, { name: 'Joe Ingles', dpp: 220251.40, salary: 3303771, pts: 15, games: 19 },
  { name: 'De\'Anthony Melton', dpp: 206806.45, salary: 12822000, pts: 62, games: 6 }, { name: 'Tristen Newton', dpp: 192859.00, salary: 578577, pts: 3, games: 8 },
  { name: 'Quincy Olivari', dpp: 192859.00, salary: 578577, pts: 3, games: 2 }, { name: 'Mitchell Robinson', dpp: 164576.80, salary: 14318182, pts: 87, games: 17 }
];
const bestValue50Games: PlayerData[] = [
  { name: 'Jaylen Wells', dpp: 1406.02, salary: 1157153, pts: 823, games: 79 }, { name: 'Tyrese Martin', dpp: 1835.05, salary: 959732, pts: 523, games: 60 },
  { name: 'Jared Butler', dpp: 2062.29, salary: 1115697, pts: 541, games: 60 }, { name: 'Toumani Camara', dpp: 2144.96, salary: 1891857, pts: 882, games: 78 },
  { name: 'Jalen Wilson', dpp: 2525.84, salary: 1891857, pts: 749, games: 79 }, { name: 'Christian Braun', dpp: 2536.65, salary: 3089640, pts: 1218, games: 79 },
  { name: 'Keon Johnson', dpp: 2577.60, salary: 2162606, pts: 839, games: 79 }, { name: 'Scotty Pippen Jr.', dpp: 2679.74, salary: 2087519, pts: 779, games: 79 },
  { name: 'Guerschon Yabusele', dpp: 2718.12, salary: 2087519, pts: 768, games: 70 }, { name: 'Ty Jerome', dpp: 2916.83, salary: 2560975, pts: 878, games: 70 }
];
const worstValue50Games: PlayerData[] = [
  { name: 'Ben Simmons', dpp: 157570.88, salary: 40338144, pts: 256, games: 51 }, { name: 'Jonathan Isaac', dpp: 72631.58, salary: 27600000, pts: 380, games: 71 },
  { name: 'Steven Adams', dpp: 56000.00, salary: 12600000, pts: 225, games: 57 }, { name: 'Bradley Beal', dpp: 55658.46, salary: 50203930, pts: 902, games: 53 },
  { name: 'Fred VanVleet', dpp: 50766.13, salary: 42846615, pts: 844, games: 60 }, { name: 'Jimmy Butler', dpp: 50621.03, salary: 48798677, pts: 964, games: 55 },
  { name: 'Rudy Gobert', dpp: 50609.22, salary: 43827586, pts: 866, games: 72 }, { name: 'Zeke Nnaji', dpp: 48309.18, salary: 8888889, pts: 184, games: 57 },
  { name: 'Isaiah Hartenstein', dpp: 47095.76, salary: 30000000, pts: 637, games: 57 }, { name: 'Clint Capela', dpp: 45625.57, salary: 22265280, pts: 488, games: 55 }
];
const starPlayers: PlayerData[] = [
  { name: 'Shai Gilgeous-Alexander', dpp: 14436.37, salary: 35859950, pts: 2484, games: 76 }, { name: 'Jalen Brunson', dpp: 14769.23, salary: 24960001, pts: 1690, games: 65 },
  { name: 'Jayson Tatum', dpp: 18037.44, salary: 34848340, pts: 1932, games: 72 }, { name: 'Anthony Edwards', dpp: 19373.63, salary: 42176400, pts: 2177, games: 79 },
  { name: 'Giannis Antetokounmpo', dpp: 23962.51, salary: 48787676, pts: 2036, games: 67 }, { name: 'Nikola Jokic', dpp: 24826.62, salary: 51415938, pts: 2071, games: 70 },
  { name: 'LeBron James', dpp: 28496.40, salary: 48728845, pts: 1710, games: 70 }, { name: 'Luka Doncic', dpp: 30562.46, salary: 43031940, pts: 1408, games: 50 },
  { name: 'Kevin Durant', dpp: 31074.09, salary: 51179020, pts: 1647, games: 62 }, { name: 'Stephen Curry', dpp: 32457.05, salary: 55761217, pts: 1718, games: 70 }
];

const PlayerTable = ({ data, title }: { data: PlayerData[], title: string }) => (
    <div className="overflow-x-auto">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-200 mb-2">{title}</h3>
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <thead>
                <tr className="w-full bg-gray-100 dark:bg-gray-700 text-left text-gray-600 dark:text-gray-300 uppercase text-sm leading-normal">
                    <th className="py-3 px-6">Player</th>
                    <th className="py-3 px-6 text-right">Salary</th>
                    <th className="py-3 px-6 text-right">Games</th>
                    <th className="py-3 px-6 text-right">Total Points</th>
                    <th className="py-3 px-6 text-right">Dollars per Point</th>
                </tr>
            </thead>
            <tbody className="text-slate-800 dark:text-gray-300 text-sm font-light">
                {data.map((player, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="py-3 px-6 whitespace-nowrap">{player.name}</td>
                        <td className="py-3 px-6 text-right">{formatCurrency(player.salary)}</td>
                        <td className="py-3 px-6 text-right">{player.games}</td>
                        <td className="py-3 px-6 text-right">{player.pts}</td>
                        <td className="py-3 px-6 text-right font-semibold">{formatCurrency(player.dpp)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const useChartTheme = () => {
    const [theme, setTheme] = useState({
        gridColor: 'rgba(55, 65, 81, 0.2)',
        tickColor: '#9ca3af',
        tooltipBg: 'rgba(55, 65, 81, 0.9)',
        tooltipColor: '#ffffff',
    });

    useEffect(() => {
        const updateTheme = () => {
            if (typeof window === 'undefined') return;
            const isDarkMode = document.documentElement.classList.contains('dark');
            setTheme({
                gridColor: isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 1)',
                tickColor: isDarkMode ? '#9ca3af' : '#4b5563',
                tooltipBg: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                tooltipColor: isDarkMode ? '#ffffff' : '#1f2937',
            });
        };
        updateTheme();
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return theme;
};


const ValueChart = ({ data, title, barColor }: { data: PlayerData[], title: string, barColor: string }) => {
    const chartTheme = useChartTheme();
    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-200 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid stroke={chartTheme.gridColor} strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number)} tick={{ fill: chartTheme.tickColor, fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fill: chartTheme.tickColor, fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        borderRadius: '0.5rem',                     
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        backdropFilter: 'blur(4px)',                
                      }}
                      labelStyle={{ color: chartTheme.tooltipColor, fontWeight: 'bold' }}
                      itemStyle={{ color: chartTheme.tooltipColor }}
                      cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ color: chartTheme.tickColor }} />
                    <Bar dataKey="dpp" name="Dollars per Point" fill={barColor} radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};


export default function SalaryAnalysisPage() {
    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl text-slate-900 dark:text-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Salary vs. Points (2024-2025)
                    </h1>
                    <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                        Putting the magnitude of NBA salaries into perspective.
                    </p>
                </header>

                <article className="space-y-12">
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">The &quot;Dollars per Point&quot; Metric</h2>
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                            Looking at the salaries of players and their total points scored in the 2024-2025 regular season, we can calculate the cost of each point for each player (salary / total points). From this, after eliminating players that didn’t score any points (which mostly included injured players), we can find the 10 best-value and 10 worst-value players.
                        </p>
                    </section>
                    
                    <section className="space-y-8">
                        <PlayerTable data={bestValueAll} title="Top 10 Best Value Players (Overall)" />
                        <ValueChart data={bestValueAll.slice().reverse()} title="Best Value Players (Overall)" barColor="#4ade80" />
                        
                        <PlayerTable data={worstValueAll} title="Top 10 Worst Value Players (Overall)" />
                        <ValueChart data={worstValueAll.slice().reverse()} title="Worst Value Players (Overall)" barColor="#f87171" />
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">Factoring in Playing Time</h2>
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                            However, this initial analysis is clearly influenced by small sample sizes. Many of the &quot;worst value&quot; players are those who were injured early in the season, while many &quot;best value&quot; players had very low salaries and played limited minutes. To get a clearer picture of value among regular rotation players, we can filter the pool to only include those who played in at least 50 games.
                        </p>
                    </section>

                    <section className="space-y-8">
                        <PlayerTable data={bestValue50Games} title="Top 10 Best Value (min. 50 Games)" />
                        <ValueChart data={bestValue50Games.slice().reverse()} title="Best Value Players (min. 50 Games)" barColor="#4ade80" />
                        
                        <PlayerTable data={worstValue50Games} title="Top 10 Worst Value (min. 50 Games)" />
                        <ValueChart data={worstValue50Games.slice().reverse()} title="Worst Value Players (min. 50 Games)" barColor="#f87171" />
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">How do the Best Players Compare?</h2>
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                            Finally, here are some of the most prominent players in the NBA. This serves to show that salary inflates faster than points meaning these are not the best value players by this metric. 
                        </p>
                    </section>

                    <section className="space-y-8">
                        <PlayerTable data={starPlayers} title="Star Player Value Comparison" />
                        <ValueChart data={starPlayers.slice().reverse()} title="Star Player Value" barColor="#60a5fa" />
                    </section>

                    <footer className="pt-8 border-t border-gray-200 dark:border-gray-700">
                         <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>Disclaimer:</strong> The value of a player is not solely dictated by points. Many aspects of value to a team, such as defense, assists, rebounds, and leadership, are absent from this over-simplified metric. This analysis is for entertainment and to put NBA salaries into a different perspective.
                         </p>
                    </footer>

                </article>
            </div>
        </div>
    );
}