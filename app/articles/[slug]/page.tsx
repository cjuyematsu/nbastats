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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Article not found' };
  return {
    title: article.title,
    description: article.summary ?? article.dek ?? undefined,
    alternates: { canonical: `/articles/${slug}` },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return <ArticleDetailClient article={article} />;
}
