// app/articles/ArticlesClient.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAnonymousId } from '@/lib/anonymousIdentifier';
import ArticleVote, { type VoteValue } from './_components/ArticleVote';
import { relativeTime, nextMondayLabel } from '@/lib/articleDates';

interface ForumRow {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  summary: string | null;
  author: string | null;
  kind: string;
  component_key: string | null;
  published_at: string | null;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  score: number;
  comment_count: number;
}

type SortKey = 'new' | 'top';

function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

export default function ArticlesClient() {
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<ForumRow[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, VoteValue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('new');
  const [nextDrop, setNextDrop] = useState('');

  // Client-only so the teaser date can't cause an SSR/hydration mismatch.
  useEffect(() => {
    setNextDrop(nextMondayLabel());
  }, []);

  useEffect(() => {
    if (isLoading) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_published_articles_with_engagement');
      if (!active) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setError(null);
      setRows((data ?? []) as ForumRow[]);

      // The caller's own votes (to seed each widget's active state).
      const userId = user?.id ?? null;
      let anonymousId: string | null = null;
      if (!userId) {
        try {
          anonymousId = getAnonymousId();
        } catch {
          anonymousId = null;
        }
      }
      const map: Record<string, VoteValue> = {};
      if (userId || anonymousId) {
        let q = supabase.from('article_votes').select('article_id, vote_type');
        q = userId ? q.eq('user_id', userId) : q.eq('anonymous_id', anonymousId!);
        const { data: votes } = await q;
        if (votes) {
          for (const v of votes) {
            map[v.article_id] = v.vote_type === 1 ? 1 : v.vote_type === -1 ? -1 : null;
          }
        }
      }
      if (!active) return;
      setMyVotes(map);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, isLoading]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) =>
      sort === 'top'
        ? b.score - a.score || timeOf(b.published_at) - timeOf(a.published_at)
        : timeOf(b.published_at) - timeOf(a.published_at),
    );
    return copy;
  }, [rows, sort]);

  // Keep the list's tallies in sync when a vote is cast, so "Top" re-sorts
  // (and the score updates) with the vote the user just made included.
  const updateRowCounts = (id: string, up: number, down: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, upvotes: up, downvotes: down, score: up - down } : r)),
    );
  };

  const sortBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => setSort(key)}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        sort === key
          ? 'bg-sky-500 text-white dark:bg-sky-600'
          : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-900 dark:text-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">Articles</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          NBA storylines and data deep-dives, anchored to historical stats from our database.
          Vote and join the discussion.
        </p>

        <div className="flex items-center gap-2 mb-4">
          {sortBtn('new', 'New')}
          {sortBtn('top', 'Top')}
        </div>

        {nextDrop && (
          <div className="mb-6 rounded-lg border border-dashed border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 px-4 py-3">
            <p className="text-sm text-sky-800 dark:text-sky-200">
              <span className="font-semibold">Next article</span> drops {nextDrop}.
            </p>
          </div>
        )}

        {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
        {error && (
          <p className="text-red-600 dark:text-red-400">Failed to load articles: {error}</p>
        )}
        {!loading && !error && sorted.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">No articles published yet.</p>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {sorted.map((a) => (
              <div
                key={a.id}
                className="flex gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-sky-400 dark:hover:border-sky-500 transition-colors"
              >
                <div className="pt-1 flex-shrink-0">
                  <ArticleVote
                    key={`${a.id}-${myVotes[a.id] ?? 'none'}`}
                    articleId={a.id}
                    initialUp={a.upvotes}
                    initialDown={a.downvotes}
                    initialMyVote={myVotes[a.id] ?? null}
                    onCountsChange={(up, down) => updateRowCounts(a.id, up, down)}
                  />
                </div>
                <Link href={`/articles/${a.slug}`} className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">
                    {a.title}
                  </h2>
                  {(a.dek || a.summary) && (
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{a.dek || a.summary}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      by {a.author || 'Hoops Data Staff'}
                    </span>
                    {a.updated_at && <span>Updated {relativeTime(a.updated_at)}</span>}
                    <span>
                      {a.comment_count} {a.comment_count === 1 ? 'comment' : 'comments'}
                    </span>
                    {a.kind === 'component' && (
                      <span className="inline-block rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-xs font-medium">
                        Interactive
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
