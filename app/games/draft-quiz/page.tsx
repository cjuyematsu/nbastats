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
      <div className="bg-gray-800 rounded-lg shadow-2xl p-4 text-center">
        <h1 className="text-3xl font-bold mb-6">NBA Draft Quiz</h1>
        <p>Loading Quizzes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-2xl p-4 text-center">
        <h1 className="text-3xl font-bold mb-6 text-red-500">Error</h1>
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 bg-gray-800 rounded-lg shadow-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center">NBA Draft Quiz</h1>
      <p className="text-center mb-8">Select a year and see how many you know</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ">
        {progressData.map(item => {
          const progressPercentage = item.total_count > 0 
            ? (item.correct_count / item.total_count) * 100 
            : 0;

          return (
            <Link
              key={item.year}
              href={`/games/draft-quiz/${item.year}`}
              className={`block p-4 bg-slate-700 rounded-lg hover:bg-sky-700 transition-colors shadow-lg ${!user ? 'pb-6' : ''}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-2xl text-white">{item.year}</span>
                
                {user && item.total_count > 0 && (
                  <span className="text-sm font-medium bg-gray-800 text-sky-300 px-2 py-1 rounded">
                    {item.correct_count} / {item.total_count}
                  </span>
                )}
              </div>

              {user && (
                <div className="w-full bg-gray-800 rounded-full h-2.5 dark:bg-gray-800">
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