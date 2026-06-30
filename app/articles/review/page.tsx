// app/articles/review/page.tsx

import type { Metadata } from 'next';
import ReviewClient from './ReviewClient';

export const metadata: Metadata = {
  title: 'Review Drafts',
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  return <ReviewClient />;
}
