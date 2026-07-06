// app/HomeFeaturedArticle.tsx

import Link from 'next/link';

export interface FeaturedArticle {
  slug: string;
  title: string;
  dek: string | null;
  author: string | null;
  published_at: string | null;
  comment_count: number;
}

const LOGO_GREEN = '#00b060';
const NEW_BADGE_MAX_AGE_DAYS = 3;

// Articles publish Mondays (draft generated 14:00 UTC, reviewed same day).
function nextArticleLabel(publishedAt: string | null, now: Date = new Date()): string {
  const day = now.getUTCDay();
  const publishedToday =
    !!publishedAt &&
    new Date(publishedAt).toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  // "coming today" only while this Monday's article hasn't dropped yet; once it
  // has, point at next Monday so the note doesn't contradict the article shown.
  if (day === 1 && now.getUTCHours() < 18 && !publishedToday) return 'coming today';
  const daysAhead = ((8 - day) % 7) || 7;
  const next = new Date(now.getTime() + daysAhead * 86_400_000);
  return `next: ${next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}

export default function HomeFeaturedArticle({ article }: { article: FeaturedArticle | null }) {
  if (!article) return null;

  const isNew =
    !!article.published_at &&
    Date.now() - new Date(article.published_at).getTime() < NEW_BADGE_MAX_AGE_DAYS * 86_400_000;

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="block mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 sm:p-6 transition-all hover:shadow-md"
      style={{ borderLeft: `4px solid ${LOGO_GREEN}` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: LOGO_GREEN, backgroundColor: `${LOGO_GREEN}1a` }}
        >
          {isNew ? 'New article' : 'Latest article'}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          New article every Monday &middot; {nextArticleLabel(article.published_at)}
        </span>
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
        {article.title}
      </h2>
      {article.dek && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{article.dek}</p>
      )}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        by {article.author || 'Hoops Data Staff'} &middot; {article.comment_count}{' '}
        {article.comment_count === 1 ? 'comment' : 'comments'} &middot;{' '}
        <span className="font-medium text-sky-600 dark:text-sky-400">Read </span>
      </p>
    </Link>
  );
}
