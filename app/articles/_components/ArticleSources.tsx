// app/articles/_components/ArticleSources.tsx

'use client';

import type { SourceLink } from '@/lib/articleSources';

export default function ArticleSources({
  sources,
  className = '',
}: {
  sources: SourceLink[];
  className?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <section className={className}>
      <h2 className="text-xl font-bold mb-3">Sources</h2>
      <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-sky-600 dark:text-sky-400 hover:underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
