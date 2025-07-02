//app/games/draft-quiz/[year]/page.tsx

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

export const dynamic = 'force-dynamic';

type DraftPick = {
  Year: number;
  Round: number;
  Pick: number;
  FirstName: string | null;
  LastName: string | null;
  'NBA Team': string | null;
  'School/Club Team': string | null;
  compositeKey: string;
};

const createCompositeKey = (pick: { Year: number; Round: number; Pick: number }): string => {
  return `${pick.Year}-${pick.Round}-${pick.Pick}`;
};

export default function DraftQuizPage() {
  const params = useParams<{ year: string }>();
  const router = useRouter();
  const year = parseInt(params.year);
  const { user, session, supabase, isLoading: isAuthLoading } = useAuth();
  
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [guessedIds, setGuessedIds] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const guessedIdsRef = useRef(guessedIds);
  useEffect(() => {
    guessedIdsRef.current = guessedIds;
  }, [guessedIds]);

  const saveProgress = useCallback(async () => {
    const idsToSave = Array.from(guessedIdsRef.current);
    
    if (user && session && idsToSave.length > 0) {
      
      await fetch('/api/quiz/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          draft_year: year,
          guessed_ids: idsToSave,
        }),
        keepalive: true,
      });
    }
  }, [user, session, year]);

  useEffect(() => {
    const handleSaveOnExit = () => {
      saveProgress();
    };

    window.addEventListener('beforeunload', handleSaveOnExit);

    return () => {
      window.removeEventListener('beforeunload', handleSaveOnExit);
      handleSaveOnExit();
    };
  }, [saveProgress]);


  useEffect(() => {
    if (isAuthLoading) return;
    async function fetchData() {
      setIsLoading(true);
      const selectQuery = 'Year, Round, Pick, FirstName, LastName, "NBA Team", "School/Club Team"';
      const { data: picksData, error: picksError } = await supabase.from('draft').select(selectQuery).eq('Year', year).order('Pick', { ascending: true });
      if (picksError) console.error("CRITICAL: Error fetching picks.", picksError.message);
      else if (picksData) {
        const picksWithKeys = picksData.map((p) => ({ ...p, compositeKey: createCompositeKey(p) }));
        setDraftPicks(picksWithKeys);
      }
      if (user) {
        const { data: attemptData } = await supabase.from('quiz_attempts').select('guessed_ids').eq('user_id', user.id).eq('draft_year', year).single();
        if (attemptData) {
            const initialGuessedIds = new Set(attemptData.guessed_ids as string[]);
            setGuessedIds(initialGuessedIds);
        }
      }
      setIsLoading(false);
    }
    fetchData();
  }, [year, user, supabase, isAuthLoading]);

  const handleGuessSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const guess = inputValue.trim();
    if (guess.length === 0) return;

    const guessTokens = guess.toLowerCase().split(' ').filter(Boolean);
    const playersToReveal = new Set<string>();

    draftPicks.forEach(pick => {
      if (guessedIds.has(pick.compositeKey)) return;

      const playerTokens = [ (pick.FirstName || '').toLowerCase(), (pick.LastName || '').toLowerCase() ].filter(Boolean);
      const allGuessTokensMatch = guessTokens.every(guessToken => playerTokens.some(playerToken => playerToken.startsWith(guessToken)));
      
      if (allGuessTokensMatch) {
        playersToReveal.add(pick.compositeKey);
      }
    });

    if (playersToReveal.size > 0) {
      setGuessedIds(prev => new Set([...prev, ...playersToReveal]));
    }
    setInputValue('');
  };

  const mainContainerClasses = isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800";
  const headerClasses = isDarkMode ? "bg-gray-800" : "bg-white border-b border-gray-200";
  const pickYearButtonClasses = isDarkMode 
    ? "text-white bg-gray-700 hover:bg-gray-600" 
    : "text-gray-700 bg-gray-200 hover:bg-gray-300";
  const inputClasses = isDarkMode
    ? "bg-gray-700 border-gray-600 text-white"
    : "bg-white border-gray-300 text-gray-900";
  const gridContainerClasses = isDarkMode ? "bg-gray-800" : "bg-white";

  const pickCardDefaultClasses = isDarkMode ? "bg-gray-700" : "bg-gray-100";
  const pickCardGuessedClasses = isDarkMode ? "bg-sky-600 text-white" : "bg-sky-500 text-white";
  const pickNumberClasses = isDarkMode ? "text-gray-400" : "text-gray-500";
  const teamNameClasses = isDarkMode ? "text-gray-300" : "text-gray-600";
  const loadingText = isDarkMode ? "text-white" : "text-gray-800";

  if (isLoading) {
    return <div className={`text-center p-10 ${loadingText}`}>Loading Quiz...</div>;
  }
  
  return (
    <div className={`flex flex-col h-screen ${mainContainerClasses}`}>
      
      <div className={`rounded-lg p-4 w-full ${headerClasses} border border-gray-200 dark:border-gray-700`}>
        <div className="relative flex justify-center items-center mb-2">
          <button
            onClick={() => router.push('/games/draft-quiz')}
            className={`absolute left-0 font-medium rounded-lg text-sm px-4 py-2 transition-colors ${pickYearButtonClasses}`}
          >
            Pick Year
          </button>
          <h1 className="text-3xl font-bold text-center">{year}</h1>
        </div>

        <div className="text-center mb-4 text-xl">Score: {guessedIds.size} / {draftPicks.length}</div>
        <form onSubmit={handleGuessSubmit} className="mb-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter player name..."
            className={`w-full p-3 text-lg border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClasses}`}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </form>
      </div>

      <div className={`mt-3 rounded-lg shadow-2xl flex-grow overflow-y-auto p-4 w-full ${gridContainerClasses} border border-gray-200 dark:border-gray-700`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {draftPicks.map(pick => {
            const isGuessed = guessedIds.has(pick.compositeKey);
            return (
              <div 
                key={pick.compositeKey} 
                className={`flex items-center p-3 rounded-md transition-colors duration-300 ${isGuessed ? pickCardGuessedClasses : pickCardDefaultClasses}`}
              >
                <div className={`w-1/5 font-semibold ${isGuessed ? '' : pickNumberClasses}`}>R{pick.Round} P{pick.Pick}</div>
                <div className="w-4/5">
                  <div className={`font-bold text-lg ${isGuessed ? '' : 'text-transparent'}`}>
                    {isGuessed ? `${pick.FirstName || ''} ${pick.LastName || ''}`.trim() : '???'}
                  </div>
                  <div className={`text-sm flex justify-between ${isGuessed ? '' : teamNameClasses}`}>
                    <span>{pick['NBA Team'] || ''}</span>
                    <span className="truncate text-right">{pick['School/Club Team'] || ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}