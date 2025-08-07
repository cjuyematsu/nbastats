//app/page.tsx

import Link from 'next/link';
import type { Metadata } from 'next';
import { Users, TrendingUp, Gamepad2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'NBA Stats, Player Comparisons & Trivia | Hoops Data',
  description: 'Your ultimate hub for NBA stats. Use our free NBA player comparison tool, explore NBA player rankings, and test your knowledge with fun trivia games.',
};


export default function HomePage() {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg text-slate-800 dark:text-slate-100 flex flex-col flex-grow min-h-0 border border-gray-200 dark:border-gray-700">
      <main className="text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10 md:mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl pt-8">
            <span className="block text-sky-600 dark:text-sky-400">The Ultimate Hub for NBA Stats</span>
          </h1>
          <h2 className="text-slate-600">
            <span className="block dark:text-slate-300 mt-1 sm:mt-2">
                Explore NBA Player Stats, NBA Player Comparisons, and NBA Trivia
            </span>
          </h2>
          
        </header>

        <section className="mb-12 text-left max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-sky-600 dark:text-sky-400 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Player Statistics
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link href="/compare" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Compare Players</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Compare player stats side-by-side. Settle debates on who is the better player based on hard data.
              </p>
            </Link>
            <Link href="/top-100-players" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Top 100 Players</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Explore our rankings of the top 100 players of 2025 and vote to change rankings.
              </p>
            </Link>
            <Link href="/degrees-of-separation" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Teammate Connections</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Discover how players are connected through shared teammates across different eras.
              </p>
            </Link>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Player Profiles</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Try the search bar above to view complete career statistics for any NBA player. 
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12 text-left max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-sky-600 dark:text-sky-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Statistical Analysis
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link href="/analysis/salary-vs-points" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Salary vs. Performance</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Analyze the relationship between player salaries and their on-court production.
              </p>
            </Link>
            <Link href="/analysis/growth-of-nba" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">NBA Growth Trends</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Explore how the NBA has evolved over time through statistical trends.
              </p>
            </Link>
            <Link href="/analysis/draft-points" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Points Leaders</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                View points leaders at each draft position. 
              </p>
            </Link>
          </div>
        </section>

        <section className="mb-12 text-left max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-sky-600 dark:text-sky-400 mb-4 flex items-center gap-2">
            <Gamepad2 className="w-6 h-6" />
            Trivia Games
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/games/stat-over-under" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Stat Over/Under</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Guess whether a player&apos;s stats are over or under the given line.
              </p>
            </Link>
            <Link href="/games/draft-quiz" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Draft Quiz</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Test your knowledge of NBA draft history by filling in missing picks.
              </p>
            </Link>
            <Link href="/games/ranking-game" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Guess the Ranking</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Try to order players correctly based on their statistical rankings.
              </p>
            </Link>
            <Link href="/games/odd-man-out" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Odd Man Out</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Identify which player doesn&apos;t belong based on statistical patterns.
              </p>
            </Link>
            <Link href="/games/six-degrees" className="block bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105 hover:shadow-xl">
              <h3 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-2">Six Degrees</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Find connections between players through shared teammates.
              </p>
            </Link>
          </div>
        </section>

        <footer className="text-center pt-8 border-t border-gray-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-500 pb-6">
            Hoops Data &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}
