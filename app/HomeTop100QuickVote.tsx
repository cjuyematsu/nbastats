// app/HomeTop100QuickVote.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAnonymousId } from '@/lib/anonymousIdentifier';

export interface QuickVoteRow {
  personId: number;
  name: string;
  rank: number;
  change: number;
}

type VoteType = 1 | -1;

export default function HomeTop100QuickVote({ rows }: { rows: QuickVoteRow[] }) {
  const { user } = useAuth();
  const [votes, setVotes] = useState<Record<number, VoteType | undefined>>({});
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [hasVoted, setHasVoted] = useState(false);

  const castVote = async (playerId: number, voteType: VoteType) => {
    if (busy[playerId]) return;
    const prev = votes[playerId];
    const next = prev === voteType ? undefined : voteType;
    setVotes((v) => ({ ...v, [playerId]: next }));
    setBusy((b) => ({ ...b, [playerId]: true }));
    if (next) setHasVoted(true);
    track('top100_quick_vote', { player: playerId, vote: next ?? 0 });
    try {
      const userId = user ? user.id : null;
      const anonymousId = userId ? null : getAnonymousId();
      const matchFilter = userId
        ? { player_id: playerId, user_id: userId }
        : { player_id: playerId, anonymous_id: anonymousId! };
      if (!next) {
        await supabase.from('playervotes').delete().match(matchFilter);
      } else {
        let existingQuery = supabase.from('playervotes').select('player_id').eq('player_id', playerId);
        existingQuery = userId
          ? existingQuery.eq('user_id', userId)
          : existingQuery.eq('anonymous_id', anonymousId!);
        const { data: existing } = await existingQuery.maybeSingle();
        if (existing) {
          const nowIso = new Date().toISOString();
          await supabase
            .from('playervotes')
            .update({ vote_type: next, created_at: nowIso, updated_at: nowIso })
            .match(matchFilter);
        } else {
          await supabase.from('playervotes').insert({
            player_id: playerId,
            user_id: userId,
            anonymous_id: anonymousId,
            vote_type: next,
          });
        }
      }
    } catch {
      setVotes((v) => ({ ...v, [playerId]: prev }));
    } finally {
      setBusy((b) => ({ ...b, [playerId]: false }));
    }
  };

  return (
    <div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-3">
        {rows.map((row) => {
          const vote = votes[row.personId];
          return (
            <li key={row.personId} className="flex items-center justify-between gap-2 py-2">
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-7 text-sm font-bold text-slate-400 dark:text-slate-500">#{row.rank}</span>
                <Link
                  href={`/player/${row.personId}`}
                  className="truncate font-medium text-slate-800 dark:text-slate-100 hover:underline"
                >
                  {row.name}
                </Link>
                {row.change !== 0 && (
                  <span
                    className={`text-xs font-bold ${
                      row.change > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {row.change > 0 ? `▲${row.change}` : `▼${Math.abs(row.change)}`}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5 flex-none">
                <button
                  onClick={() => castVote(row.personId, 1)}
                  aria-label={`Vote ${row.name} up`}
                  className={`w-8 h-8 rounded-md text-sm font-bold border transition-colors ${
                    vote === 1
                      ? 'bg-green-500 border-green-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-slate-500 dark:text-slate-300 hover:border-green-400 hover:text-green-600'
                  }`}
                >
                  ▲
                </button>
                <button
                  onClick={() => castVote(row.personId, -1)}
                  aria-label={`Vote ${row.name} down`}
                  className={`w-8 h-8 rounded-md text-sm font-bold border transition-colors ${
                    vote === -1
                      ? 'bg-red-500 border-red-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-slate-500 dark:text-slate-300 hover:border-red-400 hover:text-red-500'
                  }`}
                >
                  ▼
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/top-100-players"
          className="inline-block px-4 py-2 bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          See all 100 + nominate
        </Link>
        {hasVoted && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            Vote counted for the next reshuffle
          </span>
        )}
      </div>
    </div>
  );
}
