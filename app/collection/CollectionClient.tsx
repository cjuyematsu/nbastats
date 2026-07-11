// app/collection/CollectionClient.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import {
  COLLECTION_EVENT,
  CollectionEntry,
  collectionKey,
  readCollection,
} from '@/lib/collection';
import { GAME_META, DailyGame } from '@/lib/dailyGames';
import { buildCollectionShare } from '@/lib/shareText';
import ShareResult from '@/components/ShareResult';

const viaLabel = (via: string): string =>
  via in GAME_META ? GAME_META[via as DailyGame].label : via;

export default function CollectionClient() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [top100Keys, setTop100Keys] = useState<Set<string> | null>(null);

  useEffect(() => {
    const refresh = () => setEntries(Object.values(readCollection().players));
    refresh();
    setMounted(true);
    window.addEventListener(COLLECTION_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(COLLECTION_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc('get_current_ranking_with_details');
        if (cancelled || !data) return;
        const keys = new Set<string>();
        for (const r of data as { firstName: string | null; lastName: string | null }[]) {
          const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();
          if (name) keys.add(collectionKey(name));
        }
        setTop100Keys(keys);
      } catch {
        // set stays null; the Top 100 tile just doesn't render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const collected = useMemo(
    () =>
      entries
        .filter((e) => e.status === 'collected')
        .sort((a, b) =>
          (b.collectedDate ?? '').localeCompare(a.collectedDate ?? '') || a.name.localeCompare(b.name)
        ),
    [entries]
  );
  const seen = useMemo(
    () =>
      entries
        .filter((e) => e.status === 'seen')
        .sort((a, b) => b.firstDate.localeCompare(a.firstDate) || a.name.localeCompare(b.name)),
    [entries]
  );

  const top100Collected = useMemo(() => {
    if (!top100Keys) return null;
    return collected.filter((e) => top100Keys.has(collectionKey(e.name))).length;
  }, [collected, top100Keys]);

  if (!mounted) {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <p className="text-lg text-slate-500 dark:text-slate-400">Loading your collection...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-gray-700">
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-sky-600 dark:text-sky-400">
            My Collection
          </h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
            Win a game, collect its players. Lose, and they stay silhouettes until you earn them.
          </p>
        </header>

        {collected.length === 0 && seen.length === 0 ? (
          <div className="text-center rounded-lg border border-dashed border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 px-6 py-10">
            <p className="text-lg font-semibold text-sky-800 dark:text-sky-200 mb-2">
              No players collected yet.
            </p>
            <p className="text-sm text-sky-700 dark:text-sky-300 mb-4">
              Every daily challenge you win adds its featured players here. Seven games a day
              means up to a dozen new players daily.
            </p>
            <Link
              href="/#daily"
              className="inline-block rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2 transition-colors"
            >
              Play today&apos;s challenges
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800 px-5 py-3 text-center">
                <p className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">{collected.length}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Collected
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800 px-5 py-3 text-center">
                <p className="text-2xl font-extrabold text-slate-400 dark:text-slate-500">{seen.length}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Seen, not collected
                </p>
              </div>
              {top100Collected !== null && (
                <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-5 py-3 text-center">
                  <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">
                    {top100Collected}/100
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Current Top 100
                  </p>
                </div>
              )}
            </div>

            <div className="text-center mb-10">
              <ShareResult
                shareText={buildCollectionShare({ collected: collected.length })}
                game="collection"
                surface="collection_page"
                label="Share my collection"
              />
            </div>

            {collected.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">
                  Collected ({collected.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {collected.map((e) => {
                    const card = (
                      <div className="h-full rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 transition-all hover:shadow-md hover:border-green-400">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{e.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {viaLabel(e.via)}{e.collectedDate ? ` on ${e.collectedDate}` : ''}
                        </p>
                      </div>
                    );
                    return e.personId ? (
                      <Link key={collectionKey(e.name)} href={`/player/${e.personId}`}>
                        {card}
                      </Link>
                    ) : (
                      <div key={collectionKey(e.name)}>{card}</div>
                    );
                  })}
                </div>
              </section>
            )}

            {seen.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Seen ({seen.length})
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  These crossed your path in a game you lost. Win with them featured to collect them.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {seen.map((e) => (
                    <div
                      key={collectionKey(e.name)}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800 p-3 opacity-60"
                    >
                      <p className="font-semibold text-slate-500 dark:text-slate-400 text-sm">{e.name}</p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{viaLabel(e.via)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
