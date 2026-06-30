// app/articles/_components/ArticleComments.tsx
//
// Sign-in-gated comments for an article. Flat with a single reply level
// (parent_comment_id). Reads visible comments from the public client; posts/soft-deletes
// go directly to article_comments under RLS (auth.uid() = user_id). Guests can read but
// must sign in to post.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';

interface CommentRow {
  id: string;
  parent_comment_id: string | null;
  user_id: string;
  author_name: string;
  body: string;
  status: string;
  created_at: string;
}

const SELECT = 'id, parent_comment_id, user_id, author_name, body, status, created_at';

function displayName(user: User): string {
  const meta = user.user_metadata as
    | { full_name?: string; name?: string; user_name?: string }
    | undefined;
  return (
    meta?.full_name ||
    meta?.name ||
    meta?.user_name ||
    (user.email ? user.email.split('@')[0] : 'User')
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ArticleComments({ articleId }: { articleId: string }) {
  const { user, isLoading } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('article_comments')
      .select(SELECT)
      .eq('article_id', articleId)
      .eq('status', 'visible')
      .order('created_at', { ascending: true });
    if (!error) setComments(data ?? []);
    setLoading(false);
  }, [articleId]);

  useEffect(() => {
    load();
  }, [load]);

  // Group into top-level comments + one reply level. A reply whose parent is no longer
  // visible (e.g. the parent was deleted) is promoted to top level so it doesn't vanish.
  const { topLevel, repliesByParent } = useMemo(() => {
    const ids = new Set(comments.map((c) => c.id));
    const tops: CommentRow[] = [];
    const replies = new Map<string, CommentRow[]>();
    for (const c of comments) {
      const parent = c.parent_comment_id;
      if (parent && ids.has(parent)) {
        const list = replies.get(parent) ?? [];
        list.push(c);
        replies.set(parent, list);
      } else {
        tops.push(c);
      }
    }
    return { topLevel: tops, repliesByParent: replies };
  }, [comments]);

  const post = async (parentId: string | null, text: string) => {
    if (!user || submitting) return;
    const body = text.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('article_comments')
        .insert({
          article_id: articleId,
          parent_comment_id: parentId,
          user_id: user.id,
          author_name: displayName(user),
          body,
        })
        .select(SELECT)
        .single();
      if (error) throw error;
      if (data) setComments((prev) => [...prev, data]);
      if (parentId) {
        setReplyBody('');
        setReplyTo(null);
      } else {
        setNewBody('');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to post comment.';
      console.error('Comment post failed:', e);
      alert(`Failed to post comment: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const softDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('article_comments')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete comment.';
      console.error('Comment delete failed:', e);
      alert(`Failed to delete comment: ${message}`);
    }
  };

  const renderComment = (c: CommentRow, isReply: boolean) => (
    <div
      key={c.id}
      className={`${isReply ? 'mt-3 ml-4 sm:ml-8' : 'mt-4'} rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm text-slate-900 dark:text-gray-100">
          {c.author_name}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDateTime(c.created_at)}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
        {c.body}
      </p>
      <div className="mt-2 flex items-center gap-4 text-xs">
        {user && !isReply && (
          <button
            type="button"
            onClick={() => {
              setReplyTo(replyTo === c.id ? null : c.id);
              setReplyBody('');
            }}
            className="text-sky-600 dark:text-sky-400 hover:underline"
          >
            {replyTo === c.id ? 'Cancel' : 'Reply'}
          </button>
        )}
        {user?.id === c.user_id && (
          <button
            type="button"
            onClick={() => softDelete(c.id)}
            className="text-red-600 dark:text-red-400 hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      {replyTo === c.id && user && (
        <div className="mt-3">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Write a reply…"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => post(c.id, replyBody)}
              disabled={submitting || !replyBody.trim()}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        </div>
      )}

      {repliesByParent.get(c.id)?.map((r) => renderComment(r, true))}
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">
        Comments {comments.length > 0 && <span className="text-gray-500">({comments.length})</span>}
      </h2>

      {!isLoading && !user && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/signin" className="text-sky-600 dark:text-sky-400 hover:underline">
            Sign in
          </Link>{' '}
          to join the conversation.
        </p>
      )}

      {user && (
        <div className="mt-4">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={3}
            placeholder="Add a comment…"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => post(null, newBody)}
              disabled={submitting || !newBody.trim()}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              Post comment
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No comments yet. Be the first to weigh in.
        </p>
      ) : (
        <div className="mt-2">{topLevel.map((c) => renderComment(c, false))}</div>
      )}
    </div>
  );
}
