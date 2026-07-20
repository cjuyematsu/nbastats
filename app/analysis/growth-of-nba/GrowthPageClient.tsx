//app/analysis/growth-of-nba/GrowthPageClient.tsx

'use client';

import { salaryCapData } from '@/app/data/salaryCapData';
import { viewershipData } from '@/app/data/viewershipData';
import { Line } from 'react-chartjs-2';
import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
  type ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartColorTheme {
    textColor?: string;
    tooltip?: {
      backgroundColor: string;
      titleColor: string;
      bodyColor: string;
      borderColor: string;
    };
  }

const useChartTheme = () => {
    const [chartColors, setChartColors] = useState<ChartColorTheme>({});

    useEffect(() => {
        const updateColors = () => {
            if (typeof window === 'undefined') return;
            const isDarkMode = document.documentElement.classList.contains('dark');

            if (isDarkMode) {
                setChartColors({});
                return;
            }

            setChartColors({
                textColor: '#4B5563', 
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1F2937',
                    bodyColor: '#4B5563',
                    borderColor: '#E5E7EB'
                }
            });
        };

        updateColors();
        
        const observer = new MutationObserver(updateColors);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    }, []);

    return chartColors;
};

export default function GrowthPage() {
    const chartTheme = useChartTheme();

    const capChartData = {
        labels: salaryCapData.map(d => d.season),
        datasets: [
            {
                label: 'Salary Cap',
                data: salaryCapData.map(d => d.cap),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                yAxisID: 'y_salary',
                tension: 0.3,
            },
        ]
    };

    const viewershipChartData = {
        labels: viewershipData.map(d => d.year).reverse(),
        datasets: [
            {
                label: 'Average Finals Viewers (in Millions)',
                data: viewershipData.map(d => d.viewers).reverse(),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                fill: false,
                tension: 0.3,
            }
        ]
    };

    const baseChartOptions: Partial<ChartOptions<'line'>> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                labels: { color: chartTheme.textColor }
            },
            tooltip: {
                ...chartTheme.tooltip,
                borderWidth: 1,
                padding: 10,
                boxPadding: 5,
            }
        },
        scales: {
            x: {
                ticks: { color: chartTheme.textColor },
            }
        }
    };

    const capChartOptions: ChartOptions<'line'> = {
        ...baseChartOptions,
        plugins: {
            ...baseChartOptions.plugins,
            title: { display: true, text: 'NBA Salary Cap Growth', color: chartTheme.textColor, font: {size: 16} },
            tooltip: {
                ...baseChartOptions.plugins?.tooltip,
                callbacks: {
                    label: function(context: TooltipItem<'line'>) {
                        let label = context.dataset.label || '';
                        if (label) { label += ': '; }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            ...baseChartOptions.scales,
            y_salary: {
                type: 'linear' as const, display: true, position: 'left' as const,
                title: { display: true, text: 'Salary Cap (USD)', color: chartTheme.textColor },
                ticks: {
                    color: chartTheme.textColor,
                    callback: function(value) {
                        if (typeof value === 'number') { return '$' + (value / 1000000).toFixed(1) + 'M'; }
                        return value;
                    }
                },
            }
        }
    };

    const viewershipChartOptions: ChartOptions<'line'> = {
        ...baseChartOptions,
        plugins: {
            ...baseChartOptions.plugins,
            title: { display: true, text: 'NBA Finals Average Viewership', color: chartTheme.textColor, font: {size: 16} }
        },
        scales: {
            ...baseChartOptions.scales,
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Viewers (in Millions)', color: chartTheme.textColor },
                ticks: { color: chartTheme.textColor },
            }
        }
    };


    return (
        <div className="space-y-16">

                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">The Salary Cap Over Time</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-slate-400">
                        <p>
                            A primary indicator of a sports league&apos;s financial health is what its teams are allowed to spend on players. The modern salary cap arrived in the 1984-85 season at $3.6 million per team. It has climbed in nearly every season since, reaching $154.6 million in 2025-26, a roughly 43-fold increase driven by ever larger national media deals. The cap tracks league revenue by design, which makes it the cleanest single line to chart the NBA&apos;s economic expansion.
                        </p>
                    </div>
                    <div className="mt-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700/50">
                        <div className="relative h-96">
                            <Line options={capChartOptions} data={capChartData} />
                        </div>
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            Cap figures from{' '}
                            <a
                                href="https://en.wikipedia.org/wiki/NBA_salary_cap"
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="text-sky-600 dark:text-sky-400 hover:underline"
                            >
                                Wikipedia&apos;s NBA salary cap article
                            </a>
                            .
                        </p>
                    </div>
                </section>

                <section>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">NBA Finals Viewership</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-slate-400">
                        <p>
                            While salaries have consistently grown, the <strong className="text-slate-700 dark:text-slate-300">NBA Finals viewership statistics</strong> tell a more nuanced story. Viewership peaked during the Chicago Bulls&apos; second three-peat in the late 90s.
                        </p>
                    </div>
                    <div className="mt-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700/50">
                        <div className="relative h-96">
                            <Line options={viewershipChartOptions} data={viewershipChartData} />
                        </div>
                    </div>
                </section>
                <section>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">Conclusion: A Story of Sustained Growth</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-slate-400">
                        <p>
                            The historical data on the salary cap and Finals viewership paints a clear picture: the NBA has experienced remarkable and sustained growth over the past 40 years. The explosion in the cap reflects the league&apos;s success in securing lucrative media rights deals and expanding its global brand. While viewership numbers fluctuate based on superstar players and compelling matchups, the league remains a dominant presence in the cultural landscape. This analysis provides a valuable snapshot of the evolution of the NBA into the global powerhouse it is today.
                        </p>
                    </div>
                </section>
        </div>
    );
}