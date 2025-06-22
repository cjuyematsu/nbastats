// src/app/analysis/salary-vs-performance/page.tsx

import type { Metadata } from 'next';
import SalaryAnalysisClient from './SalaryAnalysisClient'; 

export const metadata: Metadata = {
  title: 'NBA Salary vs. Performance: Best & Worst Value Players',
  description: 'An analysis of NBA player value using a \'dollars per point\' metric. Discover the most overpaid players, the worst NBA contracts, and the best value contracts in the league.',
};

export default function SalaryVsPerformancePage() {
  return <SalaryAnalysisClient />;
}