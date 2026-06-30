// app/articles/_components/ArticleVote.tsx
//
// Reddit-style vertical up/score/down widget for an article. Writes directly to
// article_votes under RLS, keyed by user_id (signed in) or getAnonymousId() (guest)
// the same trust model as the player-vote flow in Top100PlayersClient. Optimistic,
// with revert on failure. Re-clicking the active arrow removes the vote; the opposite
// arrow switches it.

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAnonymousId } from '@/lib/anonymousIdentifier';

export type VoteValue = 1 | -1 | null;

interface ArticleVoteProps {
  articleId: string;
  initialUp: number;
  initialDown: number;
  initialMyVote: VoteValue;
  size?: 'sm' | 'md';
  /** Reports the new absolute up/down tallies after a cast (or revert) so a parent
   *  list can keep its score in sync for sorting. */
  onCountsChange?: (up: number, down: number) => void;
}

export default function ArticleVote({
  articleId,
  initialUp,
  initialDown,
  initialMyVote,
  size = 'sm',
  onCountsChange,
}: ArticleVoteProps) {
  const { user } = useAuth();
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [myVote, setMyVote] = useState<VoteValue>(initialMyVote);
  const [submitting, setSubmitting] = useState(false);

  const score = up - down;

  const cast = async (dir: 1 | -1) => {
    if (submitting) return;
    const next: VoteValue = myVote === dir ? null : dir;

    const userId = user?.id ?? null;
    let anonymousId: string | null = null;
    if (!userId) {
      try {
        anonymousId = getAnonymousId();
      } catch {
        alert('Voting requires localStorage access. Please disable private browsing for this site.');
        return;
      }
    }

    const prev = { up, down, myVote };

    // Optimistic: undo the old vote's effect, apply the new one.
    let nextUp = up;
    let nextDown = down;
    if (myVote === 1) nextUp = Math.max(0, nextUp - 1);
    else if (myVote === -1) nextDown = Math.max(0, nextDown - 1);
    if (next === 1) nextUp += 1;
    else if (next === -1) nextDown += 1;
    setUp(nextUp);
    setDown(nextDown);
    setMyVote(next);
    onCountsChange?.(nextUp, nextDown);
    setSubmitting(true);

    try {
      const match = userId
        ? { article_id: articleId, user_id: userId }
        : { article_id: articleId, anonymous_id: anonymousId };

      if (next === null) {
        const { error } = await supabase.from('article_votes').delete().match(match);
        if (error) throw error;
      } else {
        let existingQuery = supabase
          .from('article_votes')
          .select('id')
          .eq('article_id', articleId);
        existingQuery = userId
          ? existingQuery.eq('user_id', userId)
          : existingQuery.eq('anonymous_id', anonymousId!);
        const { data: existing, error: selectError } = await existingQuery.maybeSingle();
        if (selectError) throw selectError;

        if (existing) {
          const { error } = await supabase
            .from('article_votes')
            .update({ vote_type: next, updated_at: new Date().toISOString() })
            .match(match);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('article_votes').insert({
            article_id: articleId,
            user_id: userId,
            anonymous_id: anonymousId,
            vote_type: next,
          });
          if (error) throw error;
        }
      }
    } catch (e) {
      setUp(prev.up);
      setDown(prev.down);
      setMyVote(prev.myVote);
      onCountsChange?.(prev.up, prev.down);
      const message = e instanceof Error ? e.message : 'Failed to submit vote.';
      console.error('Article vote failed:', e);
      alert(`Failed to submit vote: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const iconSize = size === 'md' ? 'h-6 w-6' : 'h-5 w-5';
  const pad = size === 'md' ? 'p-1.5' : 'p-1';
  const scoreSize = size === 'md' ? 'text-base' : 'text-sm';

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cast(1);
        }}
        disabled={submitting}
        aria-label="Upvote"
        aria-pressed={myVote === 1}
        className={`${pad} rounded-md transition-colors disabled:opacity-50 ${
          myVote === 1
            ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
        }`}
      >
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4l8 9h-5v7h-6v-7H4z" />
        </svg>
      </button>
      <span
        className={`font-semibold tabular-nums ${scoreSize} ${
          myVote === 1
            ? 'text-green-600 dark:text-green-400'
            : myVote === -1
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-700 dark:text-gray-200'
        }`}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cast(-1);
        }}
        disabled={submitting}
        aria-label="Downvote"
        aria-pressed={myVote === -1}
        className={`${pad} rounded-md transition-colors disabled:opacity-50 ${
          myVote === -1
            ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
        }`}
      >
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 20l-8-9h5V4h6v7h5z" />
        </svg>
      </button>
    </div>
  );
}
