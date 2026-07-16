// components/DirectoryFilter.tsx
//
// Client-side filter over a directory list. The server passes plain data (not
// rendered nodes), so the initial SSR HTML contains every link — crawlers see
// the full list; the search box only hides non-matches on the client. Used by
// the flat-list hubs: /compare/all, /duos/all, /colleges.

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface FilterEntry {
  key: string;
  label: string;
  href: string;
  // Lowercase haystack to match against; defaults to the label.
  keywords?: string;
  badge?: string | number;
}

export interface FilterGroup {
  title?: string;
  blurb?: string;
  entries: FilterEntry[];
}

export default function DirectoryFilter({
  groups,
  placeholder = 'Filter by name…',
  variant = 'grid',
}: {
  groups: FilterGroup[];
  placeholder?: string;
  variant?: 'grid' | 'pills';
}) {
  const [q, setQ] = useState('');
  const norm = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!norm) return groups;
    return groups.map((g) => ({
      ...g,
      entries: g.entries.filter((e) => (e.keywords ?? e.label).toLowerCase().includes(norm)),
    }));
  }, [groups, norm]);

  const total = useMemo(() => groups.reduce((n, g) => n + g.entries.length, 0), [groups]);
  const shown = filtered.reduce((n, g) => n + g.entries.length, 0);

  const listClass =
    variant === 'pills'
      ? 'flex flex-wrap gap-2'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1';

  return (
    <div>
      <div className="mb-6">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        {norm && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Showing {shown.toLocaleString()} of {total.toLocaleString()}
          </p>
        )}
      </div>

      {shown === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No matches for &ldquo;{q}&rdquo;.</p>
      ) : (
        filtered.map((g, i) =>
          g.entries.length === 0 ? null : (
            <section key={g.title ?? `g${i}`} className="mb-10">
              {g.title && (
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {g.title}
                </h2>
              )}
              {g.blurb && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{g.blurb}</p>
              )}
              {variant === 'pills' ? (
                <div className={listClass}>
                  {g.entries.map((e) => (
                    <Link
                      key={e.key}
                      href={e.href}
                      className="text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      {e.label}
                      {e.badge != null && (
                        <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {e.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <ul className={listClass}>
                  {g.entries.map((e) => (
                    <li key={e.key}>
                      <Link
                        href={e.href}
                        className="text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        {e.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ),
        )
      )}
    </div>
  );
}
