// app/articles/[slug]/ArticleDetailClient.tsx

'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ComponentArticle from '@/app/articles/_components/ComponentArticle';
import ArticleEngagement from '@/app/articles/_components/ArticleEngagement';
import AdSlot from '@/components/AdSlot';
import { formatDate, relativeTime } from '@/lib/articleDates';

export interface Article {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  summary: string | null;
  body_markdown: string;
  author: string | null;
  kind: string;
  component_key: string | null;
  published_at: string | null;
  updated_at: string;
}

export default function ArticleDetailClient({ article }: { article: Article }) {
  const isComponent = article.kind === 'component';
  const showUpdated =
    !!article.updated_at &&
    (!article.published_at ||
      new Date(article.updated_at).getTime() - new Date(article.published_at).getTime() >
        86_400_000);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-900 dark:text-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
      <div className={isComponent ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>
        <Link
          href="/articles"
          className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
        >
          All articles
        </Link>

        <header className="mt-4 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{article.title}</h1>
          {article.dek && (
            <p className="mt-2 text-lg text-gray-700 dark:text-gray-300">{article.dek}</p>
          )}
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              by {article.author || 'Hoops Data Staff'}
            </span>
            {article.published_at && <span> · Published {formatDate(article.published_at)}</span>}
            {showUpdated && <span> · Updated {relativeTime(article.updated_at)}</span>}
          </p>
        </header>

        {isComponent ? (
          <>
            {article.body_markdown.trim() && (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {article.body_markdown}
                </ReactMarkdown>
              </div>
            )}
            <div className="mt-8">
              <ComponentArticle componentKey={article.component_key} />
            </div>
          </>
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body_markdown}</ReactMarkdown>
          </div>
        )}

        <AdSlot slot="article-page" className="mt-8" />

        <ArticleEngagement articleId={article.id} />
      </div>
    </div>
  );
}
