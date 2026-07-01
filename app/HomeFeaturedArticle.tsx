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

export default function HomeFeaturedArticle({ article }: { article: FeaturedArticle | null }) {
  if (!article) return null;

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="block mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 sm:p-6 transition-all hover:shadow-md"
      style={{ borderLeft: `4px solid ${LOGO_GREEN}` }}
    >
      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2"
        style={{ color: LOGO_GREEN, backgroundColor: `${LOGO_GREEN}1a` }}
      >
        New article
      </span>
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
