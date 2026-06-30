// app/articles/page.tsx

import type { Metadata } from 'next';
import ArticlesClient from './ArticlesClient';

export const metadata: Metadata = {
  title: 'NBA Articles & Analysis',
  description:
    'Data-driven NBA articles from Hoops Data: current storylines anchored to historical stats from our database.',
  alternates: { canonical: '/articles' },
};

export default function ArticlesPage() {
  return <ArticlesClient />;
}
