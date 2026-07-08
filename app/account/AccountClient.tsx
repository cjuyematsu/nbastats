// app/account/AccountClient.tsx
//
// Signed-in account hub: a plain summary of the user's game scores/streaks plus
// newsletter subscribe/unsubscribe (matched on the account email via
// /api/newsletter/account). All per-user reads mirror the ones the games use.

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

type NewsletterStatus = 'confirmed' | 'pending' | 'unsubscribed' | 'none' | 'unknown';

interface StreakRow {
  current_streak: number;
  max_streak: number;
  is_active: boolean;
  total_correct: number;
  total_incorrect: number;
}

interface GameStats {
  ranking: StreakRow | null;
  oddManOut: StreakRow | null;
  sixDegrees: { played: number; wins: number; bestGuesses: number | null } | null;
  draftQuiz: { yearsPlayed: number; correct: number } | null;
  statOu: { points: number; potential: number } | null;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="w-28">
      <div className="text-xl font-bold text-slate-800 dark:text-white tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 whitespace-nowrap">{label}</div>
    </div>
  );
}

function GameTile({
  title,
  href,
  played,
  children,
}: {
  title: string;
  href: string;
  played: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-transparent">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
        <Link href={href} className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline">
          {played ? 'Play' : 'Try it'}
        </Link>
      </div>
      {children}
    </div>
  );
}

const NotPlayed = () => <p className="text-sm text-slate-400 dark:text-slate-500">Not played yet.</p>;

export default function AccountClient() {
  const { user, session, isLoading, supabase } = useAuth();

  const [nlStatus, setNlStatus] = useState<NewsletterStatus>('unknown');
  const [nlBusy, setNlBusy] = useState(false);
  const [nlMessage, setNlMessage] = useState('');

  const [stats, setStats] = useState<GameStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const token = session?.access_token;

  const loadNewsletter = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/newsletter/account', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      setNlStatus(res.ok ? (data.status as NewsletterStatus) : 'unknown');
    } catch {
      setNlStatus('unknown');
    }
  }, [token]);

  useEffect(() => {
    if (isLoading || !user) return;
    loadNewsletter();
  }, [isLoading, user, loadNewsletter]);

  useEffect(() => {
    if (isLoading || !user) return;
    let active = true;

    const load = async () => {
      setStatsLoading(true);
      const streakCols = 'current_streak, max_streak, is_active, total_correct, total_incorrect';
      try {
        const [ranking, oddManOut, sixDegrees, draftQuiz, statOu] = await Promise.all([
          supabase.from('ranking_game_streaks').select(streakCols).eq('user_id', user.id).maybeSingle(),
          supabase.from('odd_man_out_streaks').select(streakCols).eq('user_id', user.id).maybeSingle(),
          supabase.rpc('get_six_degrees_history', { p_user_id: user.id }),
          supabase.rpc('get_user_quiz_summary', { p_user_id: user.id }),
          supabase.rpc('get_stat_ou_history', { p_user_id: user.id }),
        ]);

        if (!active) return;

        const sdRows = (sixDegrees.data ?? []) as { guess_count: number; is_successful: boolean }[];
        const wins = sdRows.filter((r) => r.is_successful);
        // total_count from the RPC is the full draft size for EVERY year, so only
        // years with at least one correct guess count as actually played.
        const dqRows = ((draftQuiz.data ?? []) as { correct_count: number; total_count: number }[]).filter(
          (r) => (r.correct_count ?? 0) > 0,
        );
        const ouRows = (statOu.data ?? []) as { points: number; potential_points: number }[];

        setStats({
          ranking: (ranking.data as StreakRow | null) ?? null,
          oddManOut: (oddManOut.data as StreakRow | null) ?? null,
          sixDegrees: sdRows.length
            ? { played: sdRows.length, wins: wins.length, bestGuesses: wins.length ? Math.min(...wins.map((r) => r.guess_count)) : null }
            : null,
          draftQuiz: dqRows.length
            ? { yearsPlayed: dqRows.length, correct: dqRows.reduce((s, r) => s + (r.correct_count ?? 0), 0) }
            : null,
          statOu: ouRows.length
            ? { points: ouRows.reduce((s, r) => s + (r.points ?? 0), 0), potential: ouRows.reduce((s, r) => s + (r.potential_points ?? 0), 0) }
            : null,
        });
      } catch (err) {
        console.error('Failed to load account stats', err);
        if (active) setStats(null);
      } finally {
        if (active) setStatsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isLoading, user, supabase]);

  const subscribe = async () => {
    if (!user?.email || nlBusy) return;
    setNlBusy(true);
    setNlMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNlMessage(data.error || 'Something went wrong. Try again.');
      } else if (data.alreadySubscribed) {
        setNlMessage("You're already subscribed.");
        setNlStatus('confirmed');
      } else {
        setNlMessage('Check your inbox to confirm your subscription.');
        setNlStatus('pending');
      }
    } catch {
      setNlMessage('Something went wrong. Try again.');
    } finally {
      setNlBusy(false);
    }
  };

  const unsubscribe = async () => {
    if (!token || nlBusy) return;
    setNlBusy(true);
    setNlMessage('');
    try {
      const res = await fetch('/api/newsletter/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'unsubscribe' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setNlMessage(data.error || 'Something went wrong. Try again.');
      else {
        setNlStatus('unsubscribed');
        setNlMessage('You have been unsubscribed.');
      }
    } catch {
      setNlMessage('Something went wrong. Try again.');
    } finally {
      setNlBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-slate-600 dark:text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full p-6 flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your account</h1>
        <p className="text-slate-600 dark:text-slate-300">Sign in to view your scores and manage your newsletter.</p>
        <Link href="/signin" className="px-4 py-2 text-sm font-medium text-white bg-sky-500 dark:bg-sky-600 hover:bg-sky-700 rounded-md transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  const s = stats;
  const buttonBase = 'px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="w-full space-y-3">
      <div className="w-full p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Your account</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{user.email}</p>
      </div>

      {/* Games */}
      <div className="w-full p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Your games</h2>
        {statsLoading ? (
          <p className="text-slate-500 dark:text-slate-400">Loading your scores...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <GameTile title="Ranking Game" href="/games/ranking-game" played={!!s?.ranking}>
              {s?.ranking ? (
                <div className="flex gap-2">
                  <Stat label="Best streak" value={s.ranking.max_streak} />
                  <Stat label="Current" value={s.ranking.is_active ? s.ranking.current_streak : 0} />
                  <Stat label="Correct" value={s.ranking.total_correct} />
                </div>
              ) : (
                <NotPlayed />
              )}
            </GameTile>

            <GameTile title="Odd Man Out" href="/games/odd-man-out" played={!!s?.oddManOut}>
              {s?.oddManOut ? (
                <div className="flex gap-2">
                  <Stat label="Best streak" value={s.oddManOut.max_streak} />
                  <Stat label="Current" value={s.oddManOut.is_active ? s.oddManOut.current_streak : 0} />
                  <Stat label="Correct" value={s.oddManOut.total_correct} />
                </div>
              ) : (
                <NotPlayed />
              )}
            </GameTile>

            <GameTile title="Six Degrees" href="/games/six-degrees" played={!!s?.sixDegrees}>
              {s?.sixDegrees ? (
                <div className="flex gap-2">
                  <Stat label="Solved" value={s.sixDegrees.wins} />
                  <Stat label="Played" value={s.sixDegrees.played} />
                  <Stat label="Best chain" value={s.sixDegrees.bestGuesses ?? '--'} />
                </div>
              ) : (
                <NotPlayed />
              )}
            </GameTile>

            <GameTile title="Draft Quiz" href="/games/draft-quiz" played={!!s?.draftQuiz}>
              {s?.draftQuiz ? (
                <div className="flex gap-2">
                  <Stat label="Years played" value={s.draftQuiz.yearsPlayed} />
                  <Stat label="Players named" value={s.draftQuiz.correct} />
                </div>
              ) : (
                <NotPlayed />
              )}
            </GameTile>

            <GameTile title="Stat Over/Under" href="/games/stat-over-under" played={!!s?.statOu}>
              {s?.statOu ? (
                <div className="flex gap-2">
                  <Stat label="Points" value={s.statOu.points} />
                  <Stat label="Possible" value={s.statOu.potential} />
                </div>
              ) : (
                <NotPlayed />
              )}
            </GameTile>
          </div>
        )}
      </div>

      {/* Newsletter */}
      <div className="w-full p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Newsletter</h2>
        {nlStatus === 'unknown' ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading subscription status...</p>
        ) : nlStatus === 'confirmed' ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Subscribed as <span className="font-medium">{user.email}</span>.
              </p>
            </div>
            <button onClick={unsubscribe} disabled={nlBusy} className={`${buttonBase} text-white bg-slate-600 hover:bg-slate-700`}>
              {nlBusy ? 'Working...' : 'Unsubscribe'}
            </button>
          </div>
        ) : nlStatus === 'pending' ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <p className="text-sm text-slate-700 dark:text-slate-300">Check your inbox to confirm your subscription.</p>
            </div>
            <button onClick={subscribe} disabled={nlBusy} className={`${buttonBase} text-white bg-sky-600 hover:bg-sky-700`}>
              {nlBusy ? 'Working...' : 'Resend email'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-slate-700 dark:text-slate-300">Get an email when a new article drops. No spam, unsubscribe anytime.</p>
            <button onClick={subscribe} disabled={nlBusy} className={`${buttonBase} text-white bg-sky-600 hover:bg-sky-700`}>
              {nlBusy ? 'Working...' : 'Subscribe'}
            </button>
          </div>
        )}
        {nlMessage && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{nlMessage}</p>}
      </div>
    </div>
  );
}
