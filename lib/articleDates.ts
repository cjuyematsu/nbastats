// lib/articleDates.ts
//
// Pure date helpers for the articles feed (kept importable + side-effect-free so
// they're easy to unit-test). relativeTime powers the "Updated X ago" labels;
// nextMonday powers the "Next article" teaser, which lines up with the Monday
// Vercel cron in vercel.json.

const DAY_MS = 86_400_000;

/** Human "X ago" label for a timestamp, relative to now. Empty string if absent. */
export function relativeTime(value: string | null | undefined): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'last month';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  if (days < 730) return 'last year';
  return `${Math.floor(days / 365)} years ago`;
}

/** Absolute date label, e.g. "June 22, 2026". Empty string if absent. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** The next Monday strictly in the future, relative to `from`. */
export function nextMonday(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun, 1 Mon, ... 6 Sat
  const delta = ((8 - day) % 7) || 7; // strictly future; if today is Monday, go to next week
  d.setDate(d.getDate() + delta);
  return d;
}

/** Teaser label for the next drop, e.g. "Monday, July 6". */
export function nextMondayLabel(from: Date = new Date()): string {
  return nextMonday(from).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
