// app/articles/_components/ComponentArticle.tsx
//
// Renders a "component" article: the former /analysis/* pages now live as article
// rows (kind='component', component_key=...). Each interactive chart component is
// lazy-loaded (client-only) so Chart.js / Recharts only ship when one is opened.

'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

function Loading() {
  return (
    <p className="text-gray-500 dark:text-gray-400 py-12 text-center">
      Loading interactive analysis…
    </p>
  );
}

// Keyed by articles.component_key. Keep in sync with the seed rows in docs/articles.md.
const COMPONENTS: Record<string, ComponentType> = {
  'salary-vs-points': dynamic(
    () => import('@/app/analysis/salary-vs-points/SalaryAnalysisClient'),
    { ssr: false, loading: Loading },
  ),
  'growth-of-nba': dynamic(() => import('@/app/analysis/growth-of-nba/GrowthPageClient'), {
    ssr: false,
    loading: Loading,
  }),
  'draft-points': dynamic(() => import('@/app/analysis/draft-points/DraftPointsClient'), {
    ssr: false,
    loading: Loading,
  }),
  // ssr stays on: the ranked list + FAQ text must be in the initial HTML for SEO
  'greatest-duos': dynamic(() => import('@/app/articles/_components/GreatestDuosArticle'), {
    loading: Loading,
  }),
};

export default function ComponentArticle({ componentKey }: { componentKey: string | null }) {
  const Component = componentKey ? COMPONENTS[componentKey] : undefined;
  if (!Component) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        This article&apos;s interactive content is unavailable.
      </p>
    );
  }
  return <Component />;
}
