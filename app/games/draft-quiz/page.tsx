// app/draft-quiz/page.tsx

'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const getLobbyData = async () => {
      if (!user) {
        setIsLoading(false);
        return; 
      }

      setIsLoading(true);

      const { data, error } = await supabase.rpc('get_user_quiz_summary', {
        p_user_id: user.id
      });

      if (error) {
        console.error("Error fetching quiz summary:", error.message);
        setError("Sorry, we couldn't load the quiz data. Please try again later.");
        setProgressData([]);
      } else {
        setProgressData((data as QuizProgress[]) || []);
        setError(null);
      }
      setIsLoading(false);
    };

    getLobbyData();
  }, [user, supabase]); 

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-3xl font-bold mb-6">NBA Draft Quiz</h1>
        <p>Loading your progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-3xl font-bold mb-6 text-red-500">Error</h1>
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">NBA Draft Quiz</h1>
      <p className="text-center mb-8">Select a year to test your knowledge of the draft board.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {progressData.map(item => {
          const progressPercentage = item.total_count > 0 
            ? (item.correct_count / item.total_count) * 100 
            : 0;

          return (
            <Link
              key={item.year}
              href={`/games/draft-quiz/${item.year}`}
              className="block p-4 bg-gray-800 rounded-lg hover:bg-sky-700 transition-colors shadow-lg"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-2xl text-white">{item.year}</span>
                {item.total_count > 0 && (
                  <span className="text-sm font-medium bg-gray-700 text-sky-300 px-2 py-1 rounded">
                    {item.correct_count} / {item.total_count}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-sky-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}