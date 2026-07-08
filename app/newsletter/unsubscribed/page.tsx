// app/newsletter/unsubscribed/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Unsubscribed',
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribedPage() {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">You&apos;ve unsubscribed</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          You won&apos;t get any more newsletter emails from HoopsData. Changed your mind? You can
          resubscribe anytime from the footer of the site.
        </p>
        <Link
          href="/articles"
          className="mt-6 inline-block py-2.5 px-5 rounded-md text-sm font-medium text-white bg-sky-600 hover:bg-sky-700"
        >
          Browse articles
        </Link>
      </div>
    </div>
  );
}
