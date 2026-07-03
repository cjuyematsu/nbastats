// app/articles/[slug]/page.tsx

import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ArticleDetailClient, { type Article } from './ArticleDetailClient';

// Deduped per request: generateMetadata and the page share one fetch.
const getArticle = cache(async (slug: string): Promise<Article | null> => {
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title, dek, summary, body_markdown, author, kind, component_key, published_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) console.error(`getArticle(${slug}) query failed:`, error.message);
  return data;
});

// Cap the meta description at a word boundary so it can never exceed the
// ~160-char search-engine limit, no matter how long an article's summary is.
function clampDescription(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const MAX = 155;
  if (text.length <= MAX) return text;
  const slice = text.slice(0, MAX - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 60 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Article not found' };
  const description = clampDescription(article.summary ?? article.dek);
  const url = `/articles/${slug}`;
  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: article.title,
      description,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      authors: [article.author || 'Hoops Data Staff'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: clampDescription(article.summary ?? article.dek),
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    author: { '@type': 'Person', name: article.author || 'Hoops Data Staff' },
    publisher: {
      '@type': 'Organization',
      name: 'HoopsData',
      logo: { '@type': 'ImageObject', url: 'https://hoopsdata.net/logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://hoopsdata.net/articles/${slug}` },
    image: 'https://hoopsdata.net/logo.png',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <ArticleDetailClient article={article} />
    </>
  );
}
