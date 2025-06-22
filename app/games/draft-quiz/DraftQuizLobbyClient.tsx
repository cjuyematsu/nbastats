//app/games/draft-quiz/DraftQuizLobbyClient.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext'; 

type QuizProgress = {
  year: number;
  correct_count: number;
  total_count: number;
};

export default function DraftQuizLobby() {
  const { supabase, user } = useAuth(); 
  const [progressData, setProgressData] = useState<QuizProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getLobbyData = useCallback(async () => {
    if (progressData.length === 0) {
      setIsLoading(true);
    } else {
    }

    const MINIMUM_LOADING_MS = 400; 

    const dataPromise = supabase.rpc('get_user_quiz_summary', {
      p_user_id: user ? user.id : null
    });
    
    const timerPromise = new Promise(resolve => setTimeout(resolve, MINIMUM_LOADING_MS));

    const [dataResponse] = await Promise.all([dataPromise, timerPromise]);

    const { data, error } = dataResponse;

    if (error) {
      console.error("Error fetching quiz summary:", error.message);
      setError("Sorry, we couldn't load the quiz data. Please try again later.");
      setProgressData([]);
    } else {
      setProgressData((data as QuizProgress[]) || []);
      setError(null);
    }
    
    setIsLoading(false);
  }, [user, supabase, progressData.length]);

  useEffect(() => {
    getLobbyData();
  }, [getLobbyData]); 

  useEffect(() => {
    const handleFocus = () => {
      console.log('Lobby focused, refetching score data...');
      getLobbyData();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [getLobbyData]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 text-center transition-colors duration-200">
        <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100 transition-colors duration-200">NBA Draft Quiz</h1>
        <p className="text-slate-600 dark:text-slate-300 transition-colors duration-200">Loading Quizzes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 text-center transition-colors duration-200">
        <h1 className="text-3xl font-bold mb-6 text-red-600 dark:text-red-500 transition-colors duration-200">Error</h1>
        <p className="text-slate-600 dark:text-slate-300 transition-colors duration-200">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl transition-colors duration-200">
      <h1 className="text-3xl font-bold mb-6 text-center text-slate-900 dark:text-slate-100 transition-colors duration-200">NBA Draft Quiz</h1>
      <p className="text-center mb-8 text-slate-500 dark:text-slate-400 transition-colors duration-200">Select a year and see how many you know</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ">
        {progressData.map(item => {
          const progressPercentage = item.total_count > 0 
            ? (item.correct_count / item.total_count) * 100 
            : 0;

          return (
            <Link
              key={item.year}
              href={`/games/draft-quiz/${item.year}`}
              className={`group block p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-sky-500 dark:hover:bg-sky-600 transition-colors duration-200 shadow-md border border-gray-200 dark:border-transparent ${!user ? 'pb-6' : ''}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-2xl text-slate-800 dark:text-white group-hover:text-white transition-colors duration-200">{item.year}</span>
                
                {user && item.total_count > 0 && (
                  <span className="text-sm font-medium bg-gray-200 dark:bg-gray-800 text-sky-700 dark:text-sky-400 px-2 py-1 rounded transition-colors duration-200">
                    {item.correct_count} / {item.total_count}
                  </span>
                )}
              </div>

              {user && (
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 transition-colors duration-200">
                  <div 
                    className="bg-sky-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}