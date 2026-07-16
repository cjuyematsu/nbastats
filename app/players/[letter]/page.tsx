// app/players/[letter]/page.tsx
//
// One page per surname initial, listing every notable player under it with a
// crawlable link to their /player/[id] profile. Statically generated for each
// letter that has players.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PLAYER_DIRECTORY } from '@/app/data/playerDirectory';
import PlayerDirectoryBrowser from '../PlayerDirectoryBrowser';
import ExploreNext from '@/components/ExploreNext';
import { breadcrumbLd } from '@/lib/jsonLd';

const presentLetters = [...new Set(PLAYER_DIRECTORY.map((p) => p.letter))].sort((a, b) =>
  a.localeCompare(b),
);

export function generateStaticParams() {
  return presentLetters.map((letter) => ({ letter: letter.toLowerCase() }));
}

function playersFor(letter: string) {
  return PLAYER_DIRECTORY.filter((p) => p.letter === letter);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ letter: string }>;
}): Promise<Metadata> {
  const { letter: raw } = await params;
  const letter = raw.toUpperCase();
  if (letter.length !== 1 || !presentLetters.includes(letter)) {
    return { title: 'Players Not Found', robots: { index: false } };
  }
  const count = playersFor(letter).length;
  const title = `NBA Players: ${letter} (${count})`;
  const description = `NBA players with last names starting with ${letter}. Career stats and per-game averages for ${count} players, A-Z.`;
  return {
    title,
    description,
    alternates: { canonical: `/players/${letter.toLowerCase()}` },
    openGraph: { title, description, url: `/players/${letter.toLowerCase()}` },
  };
}

export default async function PlayersByLetterPage({
  params,
}: {
  params: Promise<{ letter: string }>;
}) {
  const { letter: raw } = await params;
  const letter = raw.toUpperCase();
  if (letter.length !== 1 || !presentLetters.includes(letter)) notFound();

  const players = playersFor(letter);
  const idx = presentLetters.indexOf(letter);
  const prev = idx > 0 ? presentLetters[idx - 1] : null;
  const next = idx < presentLetters.length - 1 ? presentLetters[idx + 1] : null;

  const breadcrumb = breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Player Directory', path: '/players' },
    { name: letter, path: `/players/${letter.toLowerCase()}` },
  ]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          <Link href="/players" className="hover:underline text-sky-600 dark:text-sky-400">
            Player Directory
          </Link>{' '}
          / {letter}
        </nav>

        <header className="mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            NBA Players: {letter}
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            {players.length} players with last names starting with {letter}.
          </p>
        </header>

        <PlayerDirectoryBrowser players={players} mode="all" />

        <ExploreNext
          heading="Keep exploring"
          surface="players_letter"
          variant="cards"
          className="mt-10 pt-8 border-t border-gray-200 dark:border-slate-600"
          items={[
            { href: '/compare', title: 'Compare any two players', subtitle: 'Side-by-side career stats' },
            { href: '/top-100-players', title: 'Vote the Top 100', subtitle: 'Fan-ranked, updated live' },
            { href: '/#daily', title: "Today's challenges", subtitle: 'Daily NBA trivia games' },
          ]}
        />

        <nav className="flex justify-between mt-10 pt-6 border-t border-gray-200 dark:border-slate-600 text-sky-600 dark:text-sky-400">
          {prev ? (
            <Link href={`/players/${prev.toLowerCase()}`} className="hover:underline">
              &larr; {prev}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/players/${next.toLowerCase()}`} className="hover:underline">
              {next} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </div>
  );
}
