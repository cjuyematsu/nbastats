// app/articles/_components/ArticleMethodology.tsx
//
// Public disclosure of how Hoops Data articles are produced. Rendered on every
// article (detail page and review preview) beside ArticleSources. The text is
// uniform across articles, so it lives here rather than in an articles column.

'use client';

import Link from 'next/link';
import { isWorkflowDrafted } from '@/lib/articleMethodology';

export default function ArticleMethodology({
  componentKey,
  className = '',
}: {
  componentKey: string | null;
  className?: string;
}) {
  if (!isWorkflowDrafted(componentKey)) return null;
  return (
    <section
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 sm:p-5 ${className}`}
    >
      <h2 className="text-base font-bold mb-2">How this article was made</h2>
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        This article was drafted by an agentic workflow that pairs the Hoops Data box score
        database with current NBA storylines. Its statistics are computed directly from that
        database by generated data scripts rather than written from memory, and the draft was
        reviewed and edited by a person before publication.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        Where our records cannot support a statistic, we leave it out. Data provenance and
        known coverage gaps are described in our{' '}
        <Link href="/terms" className="text-sky-600 dark:text-sky-400 hover:underline">
          data notes
        </Link>
        .
      </p>
    </section>
  );
}
