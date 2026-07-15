// app/privacy/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Hoops Data collects, uses, and protects your information.',
  alternates: { canonical: '/privacy' },
};

const CONTACT_EMAIL = 'uyeyu@icloud.com';
const LAST_UPDATED = 'July 15, 2026';

export default function PrivacyPage() {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <p>
              This Privacy Policy explains how Hoops Data (&quot;we&quot;, &quot;us&quot;) collects, uses, and
              protects information when you use hoopsdata.net (the &quot;Site&quot;). By using the Site, you
              agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Information we collect</h2>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>
                <strong>Account information.</strong> If you create an account with an email and password, we
                store your email address. If you sign in with Google, we receive your name, email address, and
                profile picture from Google. We do not receive your Google password.
              </li>
              <li>
                <strong>Anonymous identifier.</strong> If you play games or vote without an account, we store a
                random anonymous identifier in your browser&apos;s local storage (with a short expiry) so we can
                track streaks and votes for that browser. It is not linked to your real identity.
              </li>
              <li>
                <strong>Activity you create.</strong> Votes, game scores, streaks, quiz progress, and similar
                interactions are stored so the features work and persist across visits.
              </li>
              <li>
                <strong>Usage data.</strong> We collect aggregate, privacy-friendly analytics about page views
                and performance to understand how the Site is used.
              </li>
              <li>
                <strong>Newsletter email.</strong> If you subscribe to article updates, we store the email
                address you provide so we can send you a notification when a new article is published. We use
                double opt-in (you must confirm via a link) and every email includes a one-click unsubscribe.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">How we use information</h2>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>To provide and operate the Site&apos;s features (comparisons, rankings, games, accounts).</li>
              <li>To save your progress, votes, and streaks across sessions.</li>
              <li>To measure and improve performance and usability.</li>
              <li>To secure the Site and prevent abuse.</li>
              <li>
                To send newsletter emails about new articles, if you subscribed. You can unsubscribe at any time
                from the link in any newsletter email.
              </li>
            </ul>
            <p className="mt-3">We do not sell your personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Cookies and local storage</h2>
            <p>
              We use browser local storage to keep you signed in, remember preferences, and track game progress
              and streaks. Third-party services we use (below) may set their own cookies, including for
              analytics and advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Third-party services</h2>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>
                <strong>Supabase</strong> provides authentication and database hosting for accounts and stored
                activity.
              </li>
              <li>
                <strong>Vercel</strong> hosts the Site and provides aggregate analytics and performance metrics.
              </li>
              <li>
                <strong>Resend</strong> delivers newsletter and confirmation emails to subscribers on our behalf.
              </li>
              <li>
                <strong>Google</strong> provides optional Google sign-in. If advertising is enabled, Google
                AdSense may serve ads and use cookies to personalize and measure them. You can manage ad
                personalization in your{' '}
                <a
                  href="https://myadcenter.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Google Ad settings
                </a>
                .
              </li>
            </ul>
            <p className="mt-3">
              These providers process data under their own privacy policies. NBA statistics shown on the Site are
              factual historical data and are not personal information about you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Data retention</h2>
            <p>
              We keep account and activity data for as long as your account is active or as needed to provide the
              Site. Anonymous identifiers expire automatically after a short period. You can delete your account
              and associated data yourself at any time, as described below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Deleting your account</h2>
            <p>
              You can permanently delete your account at any time from your{' '}
              <Link href="/account" className="text-sky-600 dark:text-sky-400 hover:underline">
                account page
              </Link>
              . No request or email to us is required. Deletion happens immediately and cannot be undone.
            </p>
            <p className="mt-3">Deleting your account removes:</p>
            <ul className="mt-2 list-disc list-outside pl-5 space-y-2">
              <li>Your login and email address, so you can no longer sign in.</li>
              <li>Your game scores, streaks, and quiz progress.</li>
              <li>Your Top 100 and article votes.</li>
              <li>Your newsletter subscription, if you had one.</li>
              <li>
                The game progress stored in your browser&apos;s local storage on the device you delete from.
              </li>
            </ul>
            <p className="mt-3">
              Comments you posted on articles are kept so that replies and discussions stay readable, but they are
              detached from your account and no longer shown under your name. If you want a comment removed
              entirely, delete it before deleting your account, or{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                contact us
              </a>
              . Backups and server logs may retain some data for a limited period before being overwritten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Your choices and rights</h2>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>You can access or update your account information while signed in.</li>
              <li>
                You can delete your account and associated data yourself from your{' '}
                <Link href="/account" className="text-sky-600 dark:text-sky-400 hover:underline">
                  account page
                </Link>
                .
              </li>
              <li>You can clear your browser&apos;s local storage to remove anonymous identifiers and progress.</li>
              <li>You can opt out of personalized ads through your Google Ad settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Children&apos;s privacy</h2>
            <p>
              The Site is not directed to children under 13, and we do not knowingly collect personal information
              from them. If you believe a child has provided us information, please contact us and we will delete
              it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be reflected by updating
              the date above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Contact</h2>
            <p>
              Questions about this policy? Email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm">
              See also our{' '}
              <Link href="/terms" className="text-sky-600 dark:text-sky-400 hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
