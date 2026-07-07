// app/games/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NBA Trivia Games: 5 Free Daily Basketball Games',
  description:
    'Five free NBA trivia games with new daily challenges: connect players through teammates, guess stat over/unders, fill in draft classes, rank players, and spot the odd man out.',
  keywords: [
    'nba trivia games',
    'daily nba trivia',
    'basketball trivia games',
    'nba connections game',
    'nba grid game alternative',
    'nba guessing game',
    'daily basketball game',
    'free nba games',
    'nba wordle',
  ],
  alternates: {
    canonical: '/games',
  },
  openGraph: {
    title: 'NBA Trivia Games: 5 Free Daily Basketball Games',
    description:
      'Five free NBA trivia games with new daily challenges. No sign-in required, streaks tracked.',
    url: '/games',
  },
};

const GAMES = [
  {
    href: '/games/six-degrees',
    daily: '/games/six-degrees/daily',
    name: 'Six Degrees of NBA',
    blurb:
      'The NBA version of six degrees of separation: connect two players through a chain of shared teammates. If you like connections-style games, this is the deep end, with over 5,000 players linked through real rosters.',
  },
  {
    href: '/games/stat-over-under',
    daily: null,
    name: 'Stat Over/Under',
    blurb:
      'A higher-or-lower guessing game built on real NBA stats. Did a player average over or under that number? Pick an era and ride the streak as the questions get harder.',
  },
  {
    href: '/games/draft-quiz',
    daily: '/games/draft-quiz/daily',
    name: 'Fill in the Draft',
    blurb:
      'Name every pick you can from a real NBA draft class. A daily draft year plus every class back to 1955 if you want to prove you remember who went ahead of whom.',
  },
  {
    href: '/games/ranking-game',
    daily: null,
    name: 'Guess the Ranking',
    blurb:
      'Drag five players into the right order for a hidden stat category. A daily basketball ranking puzzle that plays like a sports version of a card-sorting game.',
  },
  {
    href: '/games/odd-man-out',
    daily: null,
    name: 'Odd Man Out',
    blurb:
      'Four players share something in common; one does not belong. A daily NBA connections-style game where the link might be a team, a season, or a teammate.',
  },
];

export default function GamesHubPage() {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            NBA Trivia Games
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300">
            Five free basketball trivia games with fresh daily challenges. No sign-in required,
            your streaks are tracked, and every game is built on real NBA stats and rosters.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {GAMES.map((g) => (
            <div
              key={g.href}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col"
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                <Link href={g.href} className="hover:text-sky-600 dark:hover:text-sky-400">
                  {g.name}
                </Link>
              </h2>
              <p className="text-slate-600 dark:text-slate-300 flex-grow">{g.blurb}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={g.href}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 text-white text-sm font-semibold transition-colors"
                >
                  Play
                </Link>
                {g.daily && (
                  <Link
                    href={g.daily}
                    className="px-4 py-1.5 rounded-lg border border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-sm font-semibold transition-colors"
                  >
                    Today&apos;s challenge
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <section className="text-slate-600 dark:text-slate-300 space-y-3 max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Looking for a daily NBA game?
          </h2>
          <p>
            Every game resets on the same daily clock, so you can run through all five as a daily
            basketball trivia routine. Finish a game and it counts toward your site-wide daily
            streak, whether or not you have an account.
          </p>
          <p>
            Want the source material? Browse{' '}
            <Link href="/draft" className="text-sky-600 dark:text-sky-400 hover:underline">
              full draft classes back to 1955
            </Link>
            ,{' '}
            <Link href="/top-100-players" className="text-sky-600 dark:text-sky-400 hover:underline">
              the fan-voted Top 100
            </Link>
            , or{' '}
            <Link href="/compare" className="text-sky-600 dark:text-sky-400 hover:underline">
              compare any two players
            </Link>{' '}
            before you play.
          </p>
        </section>
      </div>
    </div>
  );
}
