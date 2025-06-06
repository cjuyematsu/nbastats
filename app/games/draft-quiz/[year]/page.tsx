'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
  const year = parseInt(params.year);
  const { user, session, supabase, isLoading: isAuthLoading } = useAuth();
  
  // The Supabase client should be created once using useState
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [guessedIds, setGuessedIds] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: Use a ref to hold the latest guessedIds ---
  // This ref will be updated every time the guessedIds state changes.
  // We use this to prevent a "stale closure" problem in our save function.
  const guessedIdsRef = useRef(guessedIds);
  useEffect(() => {
    guessedIdsRef.current = guessedIds;
  }, [guessedIds]);

  // --- REVISED: The final, most reliable saveProgress function ---
const saveProgress = useCallback(async () => {
    // We read from the ref to ensure we always have the LATEST set of guessed IDs.
    const idsToSave = Array.from(guessedIdsRef.current);
    
    // THE FIX: We now check for the `session` object directly from our Auth Context.
    // This avoids a network call during the fragile 'beforeunload' event.
    if (user && session && idsToSave.length > 0) {
      
      console.log(`Saving ${idsToSave.length} guessed IDs...`);
      
      // We don't need to fetch the session, we just use the token we already have.
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
        // 'keepalive' is crucial for making sure the request is sent
        // even if the page is being closed.
        keepalive: true,
      });
    }
    // No 'else' block needed. If there's no session or no progress, we simply do nothing.
}, [user, session, year]); // Add `session` to the dependency array.

  // --- REVISED: The new effect for saving on exit ---
  // This effect now only runs ONCE when the component mounts.
  useEffect(() => {
    // This function will be called when the user closes the tab or navigates away.
    const handleSaveOnExit = () => {
      saveProgress();
    };

    window.addEventListener('beforeunload', handleSaveOnExit);

    // The cleanup function of this effect will now run only when the component
    // is truly unmounting (e.g., navigating to another page in the app).
    return () => {
      window.removeEventListener('beforeunload', handleSaveOnExit);
      handleSaveOnExit();
    };
  }, [saveProgress]); // The dependency is stable and won't cause re-runs.


  // Fetching data logic remains the same
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
  }, [year, user, supabase]);

  // Guess submission logic remains the same
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

  // JSX remains the same
  if (isLoading) {
    return <div className="text-center p-10">Loading Quiz...</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2 text-center">{year} NBA Draft Quiz</h1>
      <div className="text-center mb-4 text-xl">Score: {guessedIds.size} / {draftPicks.length}</div>
      <form onSubmit={handleGuessSubmit} className="mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter player name..."
          className="w-full p-3 text-lg bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {draftPicks.map(pick => {
          const isGuessed = guessedIds.has(pick.compositeKey);
          return (
            <div key={pick.compositeKey} className={`flex items-center p-3 rounded-md ${isGuessed ? 'bg-blue-800' : 'bg-gray-800'}`}>
              <div className="w-1/5 font-semibold text-gray-400">R{pick.Round} P{pick.Pick}</div>
              <div className="w-4/5">
                <div className="font-bold text-lg">{isGuessed ? `${pick.FirstName || ''} ${pick.LastName || ''}`.trim() : '???'}</div>
                <div className="text-sm text-gray-300 flex justify-between">
                  <span>{pick['NBA Team'] || ''}</span>
                  <span className="truncate text-right">{pick['School/Club Team'] || ''}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}