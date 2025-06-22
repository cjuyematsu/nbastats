// app/games/draft-quiz/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import DraftQuizLobbyClient from './DraftQuizLobbyClient';

export const metadata: Metadata = {
  title: 'NBA Draft Quiz | Test Your Draft Knowledge',
  description: 'Challenge yourself with the NBA Draft Quiz. Select a draft year and see how many players you can name. The ultimate trivia test for NBA draft enthusiasts.',
  keywords: [
    'nba draft quiz',
    'nba draft picks quiz',
    'basketball draft trivia',
    'nba trivia',
    'nba draft knowledge',
    'nba player quiz',
    'nba history quiz',
  ],
};

function Loading() {
    return (
      <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl transition-colors duration-200">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100">NBA Draft Quiz</h1>
          <p className="text-slate-600 dark:text-slate-300">Loading Quizzes...</p>
        </div>
      </div>
    );
}

export default function DraftQuizPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DraftQuizLobbyClient />
    </Suspense>
  );
}