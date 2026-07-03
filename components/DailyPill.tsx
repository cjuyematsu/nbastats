// components/DailyPill.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  DAILY_PROGRESS_EVENT,
  countCompleted,
  readTodayProgress,
  syncDailyProgressFromDb,
} from '@/lib/dailyProgress';

export default function DailyPill() {
  const { user } = useAuth();
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => setDone(countCompleted(readTodayProgress()));
    refresh();
    window.addEventListener(DAILY_PROGRESS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(DAILY_PROGRESS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (user) syncDailyProgressFromDb(user.id);
  }, [user]);

  if (done === null) return null;

  return (
    <Link
      href="/#daily"
      className="ml-4 hidden md:inline-block flex-none whitespace-nowrap text-xs font-semibold rounded-full px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
    >
      Today: {done}/5{done >= 5 ? ' ✓' : ''}
    </Link>
  );
}
