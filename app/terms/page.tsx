// app/terms/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of Hoops Data.',
  alternates: { canonical: '/terms' },
};

const CONTACT_EMAIL = 'uyeyu@icloud.com';
const LAST_UPDATED = 'July 6, 2026';

export default function TermsPage() {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of hoopsdata.net (the &quot;Site&quot;).
              By accessing or using the Site, you agree to these Terms. If you do not agree, please do not use the
              Site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Use of the Site</h2>
            <p>
              The Site is provided for personal, non-commercial use. You agree not to misuse the Site, including by
              attempting to disrupt it, scrape it at a scale that degrades service, access it through automated means
              that violate these Terms, or use it to break any law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Accounts</h2>
            <p>
              You may create an account with an email and password or by signing in with Google. You are responsible
              for activity under your account and for keeping your credentials secure. You may delete your account at
              any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Votes and contributions</h2>
            <p>
              The Site includes community features such as voting on rankings and participating in games. You agree to
              use these features in good faith and not to manipulate results through automated or abusive means. We may
              remove contributions or restrict access to keep these features fair.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Data and content</h2>
            <p>
              NBA statistics on the Site are derived from official NBA.com box scores, as compiled and published by
              Eoin A Moore in the{' '}
              <a
                href="https://www.kaggle.com/datasets/eoinamoore/historical-nba-data-and-player-box-scores"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-sky-400 hover:underline"
              >
                NBA Dataset: Box Scores and Stats (1947 - Today)
              </a>{' '}
              on Kaggle, which is released under{' '}
              <a
                href="https://creativecommons.org/publicdomain/zero/1.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-sky-400 hover:underline"
              >
                CC0 1.0 Public Domain
              </a>
              . We are grateful to both for making this data available.
            </p>
            <p className="mt-3">
              Historical box scores are not uniformly complete. Minutes played and field goal attempts were only
              recorded for a growing share of games until around 1980, and steals, blocks, turnovers, and three
              pointers were not tracked league wide until the 1970s and 1980s. Where a statistic cannot be supported by
              the underlying records, the Site hides it rather than showing a number we cannot stand behind.
            </p>
            <p className="mt-3">
              Our weekly articles are drafted by an automated workflow that pairs our own box score database with
              current NBA storylines. The statistics in them are computed directly from that database by generated
              data scripts rather than written from memory, and a person reviews and edits every article before it is
              published. Each of those articles carries a note describing this. The interactive analysis pages, which
              predate that workflow, were built by hand and carry no such note.
            </p>
            <p className="mt-3">
              The Site&apos;s design, text, and original features are owned by Hoops Data. You may share links to the
              Site and use our embeddable widgets with the provided attribution, but you may not republish the
              Site&apos;s original content as your own.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">No affiliation</h2>
            <p>
              Hoops Data is an independent project. It is not affiliated with, endorsed by, or sponsored by the National
              Basketball Association (NBA) or any team. All team names and trademarks belong to their respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Disclaimer</h2>
            <p>
              The Site and its data are provided &quot;as is&quot; without warranties of any kind. While we aim for
              accuracy, we do not guarantee that statistics or other content are complete, current, or error-free. Do
              not rely on the Site for any decision where accuracy is critical.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Hoops Data is not liable for any indirect, incidental, or
              consequential damages arising from your use of the Site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Changes</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Site after changes take effect means you
              accept the updated Terms. Material changes will be reflected by updating the date above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Contact</h2>
            <p>
              Questions about these Terms? Email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm">
              See also our{' '}
              <Link href="/privacy" className="text-sky-600 dark:text-sky-400 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
