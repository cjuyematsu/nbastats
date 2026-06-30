// app/articles/_components/ArticleEngagement.tsx
//
// The voting + comments block shown beneath an article body. Fetches this article's
// vote tallies and the caller's own vote once auth has resolved, then renders the vote
// widget and the comment thread.

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAnonymousId } from '@/lib/anonymousIdentifier';
import ArticleVote, { type VoteValue } from './ArticleVote';
import ArticleComments from './ArticleComments';

export default function ArticleEngagement({ articleId }: { articleId: string }) {
  const { user, isLoading } = useAuth();
  const [counts, setCounts] = useState<{ up: number; down: number } | null>(null);
  const [myVote, setMyVote] = useState<VoteValue>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    let active = true;
    (async () => {
      const [{ count: up }, { count: down }] = await Promise.all([
        supabase
          .from('article_votes')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', articleId)
          .eq('vote_type', 1),
        supabase
          .from('article_votes')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', articleId)
          .eq('vote_type', -1),
      ]);

      let mine: VoteValue = null;
      const userId = user?.id ?? null;
      let anonymousId: string | null = null;
      if (!userId) {
        try {
          anonymousId = getAnonymousId();
        } catch {
          anonymousId = null;
        }
      }
      if (userId || anonymousId) {
        let q = supabase.from('article_votes').select('vote_type').eq('article_id', articleId);
        q = userId ? q.eq('user_id', userId) : q.eq('anonymous_id', anonymousId!);
        const { data } = await q.maybeSingle();
        if (data) mine = data.vote_type === 1 ? 1 : data.vote_type === -1 ? -1 : null;
      }

      if (!active) return;
      setCounts({ up: up ?? 0, down: down ?? 0 });
      setMyVote(mine);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [articleId, user, isLoading]);

  return (
    <section className="max-w-3xl mx-auto mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 mb-10">
        {ready && counts ? (
          <ArticleVote
            articleId={articleId}
            initialUp={counts.up}
            initialDown={counts.down}
            initialMyVote={myVote}
            size="md"
          />
        ) : (
          <div className="h-[88px] w-10 rounded-md bg-gray-100 dark:bg-gray-900 animate-pulse" />
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Found this useful? Cast a vote and join the discussion below.
        </p>
      </div>
      <ArticleComments articleId={articleId} />
    </section>
  );
}
