// app/articles/review/ReviewClient.tsx

'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/app/contexts/AuthContext';
import ComponentArticle from '@/app/articles/_components/ComponentArticle';

interface DraftArticle {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  summary: string | null;
  body_markdown: string;
  kind: string | null;
  component_key: string | null;
  status: string;
  created_at: string;
  generation_meta: unknown;
}

interface PublishedArticle {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  published_at: string | null;
  newsletter_sent_at: string | null;
}

function getEstCost(meta: unknown): number | null {
  if (meta && typeof meta === 'object' && 'est_cost_usd' in meta) {
    const v = (meta as Record<string, unknown>).est_cost_usd;
    return typeof v === 'number' ? v : null;
  }
  return null;
}

export default function ReviewClient() {
  const { user, session, isLoading } = useAuth();
  const [drafts, setDrafts] = useState<DraftArticle[]>([]);
  const [published, setPublished] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const token = session?.access_token;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/articles/review', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load drafts.');
        setDrafts([]);
      } else {
        setDrafts(json.articles ?? []);
        setPublished(json.published ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isLoading && token) load();
    if (!isLoading && !token) setLoading(false);
  }, [isLoading, token, load]);

  const act = async (id: string, action: 'publish' | 'reject') => {
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/articles/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Action failed.');
      } else {
        // Remove the row we just acted on (published rows leave the queue;
        // rejected rows stay rejected, also out of the draft view).
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const sendNewsletter = async (id: string, force = false) => {
    if (!token) return;
    setBusyId(id);
    setSendMsg(null);
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ articleId: id, force }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSendMsg(json.error ?? 'Send failed.');
      } else {
        const now = new Date().toISOString();
        setPublished((prev) =>
          prev.map((p) => (p.id === id ? { ...p, newsletter_sent_at: now } : p)),
        );
        setSendMsg(`Sent to ${json.recipientCount} subscriber${json.recipientCount === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      setSendMsg(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setBusyId(null);
    }
  };

  const wrapper =
    'w-full bg-white dark:bg-gray-800 rounded-lg text-slate-900 dark:text-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700';

  if (isLoading) {
    return (
      <div className={wrapper}>
        <div className="max-w-5xl mx-auto text-gray-500 dark:text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={wrapper}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Review Drafts</h1>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to review drafts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Review Drafts</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Read each draft, spot-check the stats against the sources, then publish or reject.
        </p>

        {loading && <p className="text-gray-500 dark:text-gray-400">Loading drafts…</p>}
        {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}
        {!loading && !error && drafts.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">No drafts awaiting review.</p>
        )}

        <div className="space-y-8">
          {drafts.map((d) => {
            const cost = getEstCost(d.generation_meta);
            return (
              <div
                key={d.id}
                className="p-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{d.title}</h2>
                    {d.dek && <p className="mt-1 text-gray-700 dark:text-gray-300">{d.dek}</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {d.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  /articles/{d.slug}
                  {cost !== null && <> · est. ${cost.toFixed(2)}</>}
                </p>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-sky-600 dark:text-sky-400">
                    Read draft
                  </summary>
                  <div className="prose prose-slate dark:prose-invert max-w-none mt-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.body_markdown}</ReactMarkdown>
                  </div>
                  {d.kind === 'component' && d.component_key && (
                    <div className="mt-6">
                      <ComponentArticle componentKey={d.component_key} />
                    </div>
                  )}
                </details>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => act(d.id, 'publish')}
                    disabled={busyId === d.id}
                    className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busyId === d.id ? 'Working…' : 'Publish'}
                  </button>
                  <button
                    onClick={() => act(d.id, 'reject')}
                    disabled={busyId === d.id}
                    className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-1">Newsletter</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Email a summary to confirmed subscribers. One send per article
            live, then send.
          </p>
          {sendMsg && <p className="mb-4 text-sm text-sky-600 dark:text-sky-400">{sendMsg}</p>}
          {published.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No published articles yet.</p>
          )}
          <div className="space-y-3">
            {published.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    /articles/{p.slug}
                    {p.newsletter_sent_at && (
                      <> · sent {new Date(p.newsletter_sent_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                {p.newsletter_sent_at ? (
                  <button
                    onClick={() => sendNewsletter(p.id, true)}
                    disabled={busyId === p.id}
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {busyId === p.id ? 'Sending…' : 'Resend'}
                  </button>
                ) : (
                  <button
                    onClick={() => sendNewsletter(p.id)}
                    disabled={busyId === p.id}
                    className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                  >
                    {busyId === p.id ? 'Sending…' : 'Send newsletter'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
