// components/ExploreNext.tsx

'use client';

import Link from 'next/link';
import { track } from '@vercel/analytics';

export interface ExploreNextItem {
  href: string;
  title: string;
  subtitle?: string;
}

export default function ExploreNext({
  heading,
  surface,
  items,
  variant = 'chips',
  className = '',
}: {
  heading?: string;
  surface: string;
  items: ExploreNextItem[];
  variant?: 'chips' | 'cards';
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className={className}>
      {heading && (
        <h2 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-100">
          {heading}
        </h2>
      )}
      {variant === 'chips' ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Link
              key={item.href + item.title}
              href={item.href}
              onClick={() => track('explore_next_click', { surface, href: item.href })}
              className="text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-600 transition-colors"
            >
              {item.title}
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <Link
              key={item.href + item.title}
              href={item.href}
              onClick={() => track('explore_next_click', { surface, href: item.href })}
              className="block p-3 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-sky-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span className="font-semibold text-sky-600 dark:text-sky-400">{item.title}</span>
              {item.subtitle && (
                <span className="block mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {item.subtitle}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
