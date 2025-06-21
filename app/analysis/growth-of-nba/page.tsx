//app/analysis/growth-of-nba/page.tsx

'use client';

import { salaryData } from '@/app/data/salaryData';
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

    const salaryChartData = {
        labels: salaryData.map(d => d.season),
        datasets: [
            {
                label: 'Average Salary',
                data: salaryData.map(d => d.average_salary),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                yAxisID: 'y_salary',
                tension: 0.3,
            },
        ]
    };

    const totalSalaryChartData = {
        labels: salaryData.map(d => d.season),
        datasets: [
            {
                label: 'Total Salary',
                data: salaryData.map(d => d.total_salary),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                yAxisID: 'y_total_salary',
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

    const salaryChartOptions: ChartOptions<'line'> = {
        ...baseChartOptions,
        plugins: {
            ...baseChartOptions.plugins,
            title: { display: true, text: 'NBA Average Player Salary Growth', color: chartTheme.textColor, font: {size: 16} },
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
                title: { display: true, text: 'Average Salary (USD)', color: chartTheme.textColor },
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

     const totalSalaryChartOptions: ChartOptions<'line'> = {
        ...baseChartOptions,
        plugins: {
            ...baseChartOptions.plugins,
            title: { display: true, text: 'NBA Total Player Salaries', color: chartTheme.textColor, font: {size: 16} },
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
            y_total_salary: {
                type: 'linear' as const, display: true, position: 'left' as const,
                title: { display: true, text: 'Total Salary (USD)', color: chartTheme.textColor },
                 ticks: {
                    color: chartTheme.textColor,
                    callback: function(value) {
                        if (typeof value === 'number') { return '$' + (value / 1000000000).toFixed(1) + 'B'; }
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
                        The Growth of the NBA
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400">
                        An analysis of financial and viewership trends over the last three decades.
                    </p>
                </header>

                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">Player Salaries Over Time</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-slate-400">
                        <p>
                            A primary indicator of a sports league&apos;s financial health is its ability to pay its players. The following charts illustrate the dramatic increase in both the average NBA player salary and the total combined salaries paid out each season since 1990.
                        </p>
                    </div>
                    <div className="mt-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700/50">
                        <div className="grid grid-cols-1 gap-8">
                            <div className="relative h-96">
                                <Line options={salaryChartOptions} data={salaryChartData} />
                            </div>
                            <div className="relative h-96">
                                <Line options={totalSalaryChartOptions} data={totalSalaryChartData} />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">NBA Finals Viewership</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-slate-400">
                        <p>
                            While salaries have consistently grown, viewership tells a more nuanced story. The NBA Finals viewership peaked during the Chicago Bulls&apos; second three-peat in the late 90s, a testament to Michael Jordan&apos;s unparalleled global appeal. While viewership has not returned to those historic highs, it has remained a significant force in sports media.
                        </p>
                    </div>
                    <div className="mt-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700/50">
                        <div className="relative h-96">
                            <Line options={viewershipChartOptions} data={viewershipChartData} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}