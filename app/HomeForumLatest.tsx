// app/HomeForumLatest.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ForumRow {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  published_at: string | null;
  comment_count: number;
}

function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

export default function HomeForumLatest({ excludeSlug }: { excludeSlug?: string }) {
  const [rows, setRows] = useState<ForumRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_published_articles_with_engagement');
        if (error || !data) return;
        const sorted = [...(data as ForumRow[])]
          .filter((a) => a.slug !== excludeSlug)
          .sort((a, b) => timeOf(b.published_at) - timeOf(a.published_at))
          .slice(0, 3);
        if (!cancelled) setRows(sorted);
      } catch {
        // render nothing on failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeSlug]);

  if (rows.length === 0) return null;

  return (
    <section className="mb-12 text-left max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-sky-600 dark:text-sky-400">Latest from the Forum</h2>
        <Link href="/articles" className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline">
          View all
        </Link>
      </div>
      <div className="grid gap-3">
        {rows.map((a) => (
          <Link
            key={a.id}
            href={`/articles/${a.slug}`}
            className="block bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-sky-400 hover:shadow-md transition-all"
          >
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{a.title}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              by {a.author || 'Hoops Data Staff'} · {a.comment_count}{' '}
              {a.comment_count === 1 ? 'comment' : 'comments'}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
