// app/games/stat-over-under/[era]/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { Database } from '@/types/supabase';

// --- Icons ---
const ArrowUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5l7.5-7.5 7.5 7.5" />
  </svg>
);
const ArrowDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5l-7.5 7.5-7.5-7.5" />
  </svg>
);
// --- End Icons ---

// --- Types ---
type GameChallenge = Database['public']['Functions']['get_stat_ou_challenges_for_date']['Returns'][number] & { game_era?: string };

interface UserRoundAnswer {
  round_number: number;
  challenge_player_id: number;
  challenge_season_year: number;
  challenge_stat_category: string;
  displayed_line_value: number;
  actual_stat_value: number;
  player_name?: string;
  team_name?: string;
  user_guess: 'over' | 'under' | null;
  is_correct: boolean | null;
}

type GameStatus = 'initial_loading' | 'selecting_era' | 'fetching_challenges' | 'playing' | 'round_feedback' | 'completed' | 'already_played' | 'no_game_today' | 'error_loading';
// --- End Types ---

const AVAILABLE_ERAS = [
    { id: 'modern', name: 'Modern Era (2011-2025)' },
    { id: '2000s',  name: '2000s (2001-2010)' },
    { id: '1990s',  name: '1990s (1991-2000)' },
    { id: '1980s',  name: '1980s (1980-1990)' },
];

function StatOverUnderEraGameContent() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const action = useMemo(() => searchParams.get('action'), [searchParams]);

  const gameEraFromParam = params.era as string;

  const [challenges, setChallenges] = useState<GameChallenge[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserRoundAnswer[]>([]);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('initial_loading');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [todayDateISO, setTodayDateISO] = useState<string>(''); // Still useful for display
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [pageFetchError, setPageFetchError] = useState<string | null>(null);

  const fetchChallenges = useCallback(async (dateISO: string, era: string): Promise<GameChallenge[]> => {
    console.log(`Fetching challenges for date: ${dateISO}, era: ${era}`);
    // No setPageFetchError(null) here; caller manages error state for the broader operation.
    try {
      const { data, error } = await supabase.rpc('get_stat_ou_challenges_for_date', {
        p_challenge_date: dateISO,
        p_game_era: era,
      });
      if (error) {
        console.error("Supabase RPC error (fetchChallenges):", error);
        throw error; // Let the caller handle setting pageFetchError
      }
      return (data as GameChallenge[] | null) || [];
    } catch (err) {
      console.error(`Error fetching game challenges for era ${era}:`, err);
      // Set error here if it's specific to fetchChallenges and needs to be displayed
      setPageFetchError(err instanceof Error ? err.message : `Could not load challenges for ${era}.`);
      return [];
    }
  }, [setPageFetchError]); // Dependency on setPageFetchError is fine

  const checkPriorPlay = useCallback(async (userId: string, dateISO: string, era: string) => {
    const gameIdentifier = `STAT_OVER_UNDER_DAILY_V1_${era.toUpperCase()}`;
    try {
      const { data: existingGame, error: existingGameError } = await supabase
        .from('gamescores')
        .select('points, potential_points')
        .eq('user_id', userId)
        .eq('game_id', gameIdentifier)
        .eq('played_on_date', dateISO)
        .maybeSingle();

      if (existingGameError) {
        console.error("Supabase error (checkPriorPlay):", existingGameError);
        throw existingGameError;
      }
      return existingGame;
    } catch (errCaught) {
      console.error(`Error checking existing game for era ${era}:`, errCaught);
      setPageFetchError(errCaught instanceof Error ? errCaught.message : `Could not check prior play for ${era}.`);
      return null;
    }
  }, [setPageFetchError]);

  const resetGameState = useCallback(() => {
    console.log("resetGameState called");
    setCurrentRoundIndex(0);
    setUserAnswers([]);
    setScore(0);
    setFeedbackMessage(null);
    setChallenges([]);
    setPageFetchError(null);
  }, []); // setPageFetchError could be added if used, but here it's direct null.

  // CORRECTED saveGameResult definition AND internal logic
  const saveGameResult = useCallback(async (
    finalScore: number,
    era: string,
    gameDate: string, // Use this parameter
    potentialPoints: number // Use this parameter
  ) => {
    // Use passed parameters for guard condition
    if (!user || !gameDate || !era || potentialPoints === 0) {
        console.warn("saveGameResult: Missing user, gameDate, era, or potentialPoints. Aborting save.",
          { userId: !!user, gameDate, era, potentialPoints });
        if (potentialPoints === 0 && user && gameDate && era) {
             setPageFetchError("Cannot save game: potential points is zero or required data missing.");
        }
        return;
    }

    const gameIdentifier = `STAT_OVER_UNDER_DAILY_V1_${era.toUpperCase()}`;

    try {
      const { error } = await supabase.from('gamescores').insert({
          user_id: user.id,
          played_on_date: gameDate,         // Use parameter gameDate
          game_id: gameIdentifier,
          points: finalScore,
          potential_points: potentialPoints, // Use parameter potentialPoints
        });

      if (error) {
        console.error("Supabase error (saveGameResult):", error);
        throw error; // Let the caller handle displaying the error if needed
      }
      console.log("Game result saved successfully.");
    } catch (err) {
      setPageFetchError(err instanceof Error ? err.message : "Could not save game score.");
      console.error("Error in saveGameResult:", err);
    }
  }, [user, setPageFetchError]); // Dependencies are stable

  const loadGameForEra = useCallback(async (eraToLoad: string, isPostAuthSaveAttempt = false) => {
    console.log(`loadGameForEra: ${eraToLoad}, postAuth: ${isPostAuthSaveAttempt}`);
    setIsLoadingPage(true);
    setGameStatus('fetching_challenges');
    setPageFetchError(null);

    if (!isPostAuthSaveAttempt) {
      resetGameState();
    }

    const today = new Date();
    const currentDateISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    setTodayDateISO(currentDateISO); // Set state for display purposes

    let determinedGameStatus: GameStatus = 'playing';
    let fetchedChallengesData: GameChallenge[] = [];
    let priorPlayData: { points: number | null; potential_points: number | null; } | null = null;

    try {
        if (user) {
            const result = await checkPriorPlay(user.id, currentDateISO, eraToLoad);
            if (result && typeof result.points === 'number') {
                priorPlayData = result;
            }
        }

        if (priorPlayData) {
            determinedGameStatus = 'already_played';
            setScore(priorPlayData.points ?? 0);
            setUserAnswers([]);
        }

        fetchedChallengesData = await fetchChallenges(currentDateISO, eraToLoad);
        // fetchChallenges might set pageFetchError if it fails internally

        // If pageFetchError was set by checkPriorPlay or fetchChallenges, we might want to act on it here
        // For now, error display is handled by the main render logic checking pageFetchError state.

        if (determinedGameStatus !== 'already_played') {
            if (fetchedChallengesData.length === 10) { // Assuming 10 is standard
                determinedGameStatus = 'playing';
            } else if (fetchedChallengesData.length === 0) {
                // If fetchChallenges didn't set an error but returned 0, it's 'no_game_today'
                // This relies on fetchChallenges not setting pageFetchError for "0 results found" if that's not an error.
                 if (!pageFetchError) { // Only set no_game_today if no error occurred during fetch
                    determinedGameStatus = 'no_game_today';
                 } else {
                    determinedGameStatus = 'error_loading'; // An error occurred during fetch
                 }
            } else if (fetchedChallengesData.length > 0 && fetchedChallengesData.length < 10) {
                console.warn(`Fetched ${fetchedChallengesData.length} challenges, expected 10.`);
                determinedGameStatus = 'playing'; // Or a specific status for partial game
            }
        }
    } catch (error) {
        // This catch block is for errors rethrown by checkPriorPlay or fetchChallenges
        // if they are not caught and handled (setPageFetchError) internally by those functions.
        // Our current setup has them setting pageFetchError internally.
        console.error("Error during game load sequence:", error);
        // setPageFetchError is likely already called by the failing function.
        determinedGameStatus = 'error_loading';
    }
    
    setChallenges(fetchedChallengesData);
    setGameStatus(determinedGameStatus);
    setIsLoadingPage(false);

  }, [
    user, authIsLoading, checkPriorPlay, fetchChallenges, resetGameState, setPageFetchError,
    // Explicitly list setters from useState for clarity, though they are stable
    setIsLoadingPage, setGameStatus, setTodayDateISO, setChallenges, setScore, setUserAnswers
  ]);

  useEffect(() => {
    if (authIsLoading) {
      setGameStatus('initial_loading');
      setIsLoadingPage(true);
      return;
    }

    if (!gameEraFromParam) {
      router.replace('/games/stat-over-under');
      return;
    }

    setIsLoadingPage(true);

    if (user && action === 'saveGuestResult') {
      const guestResultRaw = sessionStorage.getItem(`guestGameResult_${gameEraFromParam}`);
      if (guestResultRaw) {
        try {
          const guestResult = JSON.parse(guestResultRaw) as { score: number, userAnswers: UserRoundAnswer[] };
          const guestChallengesRaw = sessionStorage.getItem(`guestGameChallenges_${gameEraFromParam}`);
          
          let challengesForSave: GameChallenge[] = [];
          if (guestChallengesRaw) {
            challengesForSave = JSON.parse(guestChallengesRaw);
            // setChallenges(challengesForSave); // Not strictly needed before save, as saveGameResult takes length
          } else {
            console.warn(`guestGameChallenges_${gameEraFromParam} not found in session storage for saveGuestResult.`);
            // If challengesForSave.length is 0, saveGameResult's guard will prevent saving.
          }

          setScore(guestResult.score); 
          setUserAnswers(guestResult.userAnswers);
          
          const todayForSave = new Date();
          const currentDateISOForSave = `${todayForSave.getFullYear()}-${(todayForSave.getMonth() + 1).toString().padStart(2, '0')}-${todayForSave.getDate().toString().padStart(2, '0')}`;
          // setTodayDateISO(currentDateISOForSave); // loadGameForEra will set this

          // CORRECTED Call to saveGameResult with 4 arguments
          saveGameResult(
            guestResult.score,
            gameEraFromParam,
            currentDateISOForSave, // Pass the determined date
            challengesForSave.length // Pass the determined potential points
          ).then(() => {
              sessionStorage.removeItem(`guestGameResult_${gameEraFromParam}`);
              sessionStorage.removeItem(`guestGameChallenges_${gameEraFromParam}`);
              router.replace(`/games/stat-over-under/${gameEraFromParam}`, { scroll: false });
              return loadGameForEra(gameEraFromParam, true);
          }).catch(errCaught => {
              console.error("Error in saveGuestResult chain or subsequent loadGameForEra:", errCaught);
              loadGameForEra(gameEraFromParam);
          });
        } catch (errCaught) {
          console.error("Error processing guest result:", errCaught);
          setPageFetchError(errCaught instanceof Error ? errCaught.message : "Error processing saved guest data.");
          sessionStorage.removeItem(`guestGameResult_${gameEraFromParam}`);
          sessionStorage.removeItem(`guestGameChallenges_${gameEraFromParam}`);
          loadGameForEra(gameEraFromParam).finally(() => setIsLoadingPage(false));
        }
      } else {
        loadGameForEra(gameEraFromParam).finally(() => setIsLoadingPage(false));
      }
    } else {
      loadGameForEra(gameEraFromParam).finally(() => setIsLoadingPage(false));
    }
  }, [
    user, authIsLoading, gameEraFromParam, action, loadGameForEra, 
    saveGameResult, // saveGameResult reference is now stable
    router, setPageFetchError // router & setPageFetchError are stable
  ]);


  const handleGuess = useCallback(async (guess: 'over' | 'under') => {
    if (gameStatus !== 'playing' || currentRoundIndex >= challenges.length || !challenges[currentRoundIndex] || !gameEraFromParam) return;
    const currentChallenge = challenges[currentRoundIndex];
    let isCorrect = false;
    if (guess === 'over') isCorrect = currentChallenge.actual_stat_value > currentChallenge.displayed_line_value;
    else if (guess === 'under') isCorrect = currentChallenge.actual_stat_value < currentChallenge.displayed_line_value;
    
    let updatedScore = score;
    if (isCorrect) { updatedScore = score + 1; }

    const answer: UserRoundAnswer = {
      round_number: currentChallenge.round_number, challenge_player_id: currentChallenge.player_id,
      challenge_season_year: currentChallenge.season_year, challenge_stat_category: currentChallenge.stat_category,
      displayed_line_value: currentChallenge.displayed_line_value, actual_stat_value: currentChallenge.actual_stat_value,
      player_name: currentChallenge.player_name, team_name: currentChallenge.team_name,
      user_guess: guess, is_correct: isCorrect,
    };
    
    const updatedUserAnswers = [...userAnswers, answer];
    setUserAnswers(updatedUserAnswers);
    setScore(updatedScore);

    setFeedbackMessage(
        `Your guess: ${guess.toUpperCase()}. Actual: ${currentChallenge.actual_stat_value.toFixed(currentChallenge.stat_category.includes('_PCT') ? 3 : 1)}. You were ${isCorrect ? 'Correct!' : 'Incorrect.'}`
    );

    if (currentRoundIndex === challenges.length - 1) {
        setGameStatus('completed');
        if (user && gameEraFromParam) {
            // CORRECTED Call to saveGameResult with 4 arguments
            // todayDateISO state should be up-to-date from loadGameForEra
            // challenges state is also up-to-date
            await saveGameResult(updatedScore, gameEraFromParam, todayDateISO, challenges.length);
        } else if (gameEraFromParam) {
            sessionStorage.setItem(`guestGameResult_${gameEraFromParam}`, JSON.stringify({ score: updatedScore, userAnswers: updatedUserAnswers }));
            sessionStorage.setItem(`guestGameChallenges_${gameEraFromParam}`, JSON.stringify(challenges));
        }
    } else {
        setGameStatus('round_feedback');
    }
  }, [
    gameStatus, currentRoundIndex, challenges, score, userAnswers, 
    user, saveGameResult, gameEraFromParam, todayDateISO, // saveGameResult is stable. todayDateISO is needed here for the call.
    // Other setters are stable: setGameStatus, setUserAnswers, setScore, setFeedbackMessage
  ]);

  const handleNextRound = useCallback(() => {
    setFeedbackMessage(null);
    if (currentRoundIndex < challenges.length - 1) {
      setCurrentRoundIndex(prev => prev + 1);
      setGameStatus('playing');
    } else {
      setGameStatus('completed'); 
    }
  }, [currentRoundIndex, challenges.length]);
  
  const handlePlayDifferentEra = () => {
    setIsLoadingPage(true); 
    resetGameState(); 
    router.push('/games/stat-over-under'); 
  };

  const eraName = AVAILABLE_ERAS.find(e=>e.id===gameEraFromParam)?.name || gameEraFromParam || 'Selected Era';

  // --- RENDER LOGIC (Assumed to be correct from previous versions) ---
  if (gameStatus === 'initial_loading' || authIsLoading || isLoadingPage) {
    return <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900"><p className="text-center p-10 text-slate-300 text-xl">Loading {eraName} Game...</p></div>;
  }
  
  if (gameStatus === 'error_loading') { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-slate-100 py-12 px-4">
            <div className="text-center max-w-md p-6 bg-slate-800/70 rounded-xl shadow-2xl">
                <h2 className="text-2xl font-semibold text-red-400 mb-4">Error Loading Game</h2>
                <p className="text-slate-300 mb-6">{pageFetchError || "Could not load game data."}</p>
                <button onClick={() => {if(gameEraFromParam) loadGameForEra(gameEraFromParam);}} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105 mr-2">Try Again</button>
                <button onClick={handlePlayDifferentEra} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105 inline-block">Select Different Era</button>
            </div>
        </div>
    );
  }
  if (gameStatus === 'no_game_today' && challenges.length === 0) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-slate-100 py-12 px-4">
            <div className="text-center max-w-md p-6 bg-slate-800/70 rounded-xl shadow-2xl">
                <h2 className="text-2xl font-semibold text-sky-400 mb-4">No Game Today</h2>
                <p className="text-slate-300 mb-6">No challenges found for {eraName} on {todayDateISO}. Please check back later.</p>
                <button onClick={handlePlayDifferentEra} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105 inline-block">Select Different Era</button>
            </div>
        </div>
    );
  }
  
  if (user && gameStatus === 'already_played') { 
    const potentialPoints = challenges.length > 0 ? challenges.length : (userAnswers[userAnswers.length-1]?.round_number || 10); // Fallback if challenges somehow aren't loaded for display
    return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-slate-100 min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full mx-auto p-6 sm:p-8 bg-slate-800/70 rounded-xl shadow-2xl text-center backdrop-blur-md">
        <button onClick={handlePlayDifferentEra} className="text-xs text-sky-400 hover:text-sky-300 underline mb-4 inline-block">Select Different Era</button>
        <h1 className="text-3xl font-bold text-sky-400 mb-2">Game Already Played!</h1>
        <h2 className="text-xl font-medium text-slate-300 mb-2">{eraName} - {todayDateISO}</h2>
        <p className="text-xl text-slate-300 mb-2">
          You completed today&apos;s challenge with a score of: <span className="font-bold text-white">{score} / {potentialPoints}</span>
        </p>
        <p className="text-slate-400 mb-6">Come back tomorrow for new challenges for this era!</p>
        {userAnswers && userAnswers.length > 0 && ( // This will be empty for DB loaded games
            <div className="text-left space-y-2 max-h-80 overflow-y-auto p-3 bg-slate-700/50 rounded-md border border-slate-600">
            <p className="text-sm text-slate-400 italic text-center py-2">Detailed round history for previously played games is not shown.</p>
            </div>
        )}
         <button onClick={handlePlayDifferentEra} className="mt-8 inline-block px-6 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105">
            Play Different Era
         </button>
        </div>
      </div>
    );
  }

  if (gameStatus === 'completed') {
    const potentialPoints = challenges.length;
    return (
      <div className="w-full bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-slate-100 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full mx-auto p-6 sm:p-8 bg-slate-800/70 rounded-xl shadow-2xl text-center backdrop-blur-md">
            <button onClick={handlePlayDifferentEra} className="text-xs text-sky-400 hover:text-sky-300 underline mb-4 inline-block">Select Different Era</button>
            <h1 className="text-3xl font-bold text-sky-400 mb-2">Game Over!</h1>
            <h2 className="text-xl font-medium text-slate-300 mb-2">{eraName} - {todayDateISO}</h2>
            <p className="text-xl text-slate-300 mb-2">Your final score: <span className="font-bold text-white">{score} / {potentialPoints}</span></p>
            {!user && gameEraFromParam && (
              <div className="my-6">
                <p className="text-amber-400 mb-3">Want to save this score and track your progress?</p>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <button onClick={() => router.push(`/signin?fromGameResults=true&era=${gameEraFromParam}`)}
                    className='w-full sm:w-auto underline hover:text-amber-200 text-amber-400 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800 bg-slate-700 hover:bg-slate-600'>
                    Sign In
                  </button>
                  <button onClick={() => router.push(`/signup?fromGameResults=true&era=${gameEraFromParam}`)}
                    className='w-full sm:w-auto underline hover:text-amber-200 text-amber-400 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800 bg-slate-700 hover:bg-slate-600'>
                    Sign Up
                  </button>
                </div>
              </div>
            )}
            <p className="text-slate-400 my-6">Come back tomorrow for new challenges!</p>
            {userAnswers.length > 0 && (
                 <div className="text-left space-y-2 max-h-80 overflow-y-auto p-3 bg-slate-700/50 rounded-md border border-slate-600">
                 {userAnswers.map((ans) => (
                     <div key={ans.round_number} className={`p-2.5 rounded text-sm ${ans.is_correct ? 'bg-green-800/40' : 'bg-red-800/40'}`}>
                     <p className="font-semibold">R{ans.round_number}: {ans.player_name} - {ans.challenge_stat_category.replace(/_/g, ' ')}</p>
                     <p className="text-xs text-slate-300">Line: {ans.displayed_line_value.toFixed(ans.challenge_stat_category.includes('_PCT') ? 3 : 1)}, Actual: <span className="font-bold">{ans.actual_stat_value.toFixed(ans.challenge_stat_category.includes('_PCT') ? 3 : 1)}</span></p>
                     <p className="text-xs">You Guessed: <span className="font-medium">{ans.user_guess?.toUpperCase()}</span> - <span className={ans.is_correct ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>{ans.is_correct ? 'CORRECT' : 'INCORRECT'}</span></p>
                     </div>
                 ))}
                 </div>
            )}
             <div className="mt-8 space-y-3 space-x-3">
                <button onClick={() => { if(gameEraFromParam) loadGameForEra(gameEraFromParam); }} className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105">
                    Review Score
                </button>
                <button onClick={handlePlayDifferentEra} className="w-full sm:w-auto px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105">
                    Play Different Era
                </button>
            </div>
        </div>
      </div>
    );
  }

  if (challenges.length > 0 && (gameStatus === 'playing' || gameStatus === 'round_feedback')) {
    const currentChallenge = challenges[currentRoundIndex];
    if (!currentChallenge) {
        return <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900"><p className="text-center p-10 text-slate-300 text-xl">Loading round...</p></div>;
    }

    return (
    <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100">

      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-slate-100 py-8 px-4">
        <div className="w-full max-w-lg">
            <div className='text-center mb-4'>
                 <button onClick={handlePlayDifferentEra} className="text-sm text-sky-400 hover:text-sky-300 underline focus:outline-none focus:ring-2 ring-sky-500 rounded-sm">
                    Select Different Era
                 </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-sky-400 text-center mb-1">
             {eraName}
            </h1>
            <p className="text-center text-slate-400 mb-1">Round {currentChallenge.round_number} of {challenges.length}</p>
            <p className="text-center text-xl font-semibold text-white mb-6">Score: {score}</p>

            <div className="bg-slate-700/80 p-6 rounded-xl shadow-2xl mb-6 text-center backdrop-blur-sm border border-slate-600">
                <p className="text-xl sm:text-2xl font-semibold text-sky-300">{currentChallenge.player_name}</p>
                <p className="text-sm sm:text-base text-slate-400 mb-3">({currentChallenge.team_name}, {currentChallenge.season_year})</p>
                <p className="text-lg text-slate-200">Stat: <span className="font-medium text-amber-400">{currentChallenge.stat_category.replace(/_/g, ' ')}</span></p>
                <p className="text-4xl sm:text-5xl font-bold text-white my-4">{currentChallenge.displayed_line_value.toFixed(currentChallenge.stat_category.includes('_PCT') ? 3 : 1)}</p>
                <p className="text-md text-slate-300">Is their actual {currentChallenge.stat_category.replace(/_/g, ' ')} for that season...</p>
            </div>

            { gameStatus === 'playing' && (
              <div className="flex justify-around mt-6 space-x-3 sm:space-x-4">
                <button onClick={() => handleGuess('under')} aria-label="Guess Under" className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 text-lg flex flex-col items-center justify-center">
                    <ArrowDownIcon className="w-7 h-7 sm:w-8 sm:h-8 mb-1" /> UNDER
                </button>
                <button onClick={() => handleGuess('over')}  aria-label="Guess Over" className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 text-lg flex flex-col items-center justify-center">
                    <ArrowUpIcon className="w-7 h-7 sm:w-8 sm:h-8 mb-1" /> OVER
                </button>
              </div>
            )}

            {gameStatus === 'round_feedback' && feedbackMessage && (
              <div className="mt-6 text-center">
                <div className={`text-lg p-4 rounded-md shadow-md mb-4 ${userAnswers.length > 0 && userAnswers[userAnswers.length -1]?.is_correct ? 'bg-green-700/30 border border-green-600 text-green-300' : 'bg-red-700/30 border border-red-600 text-red-300'}`}>
                  <p dangerouslySetInnerHTML={{ __html: feedbackMessage.replace(/Correct!/g, '<strong class="font-semibold">Correct!</strong>').replace(/Incorrect./g, '<strong class="font-semibold">Incorrect.</strong>') }} />
                </div>
                <button onClick={handleNextRound} className="mt-4 px-8 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105">
                  {currentRoundIndex < challenges.length - 1 ? 'Next Round' : 'Show Final Results'}
                </button>
              </div>
            )}
        </div>
      </div>
      </div>

    );
  }
  
  return <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900"><p className="text-center p-10 text-slate-300 text-xl">Initializing game state for {eraName}...</p></div>;
}

export default function StatOverUnderGamePageLoader() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900"><p className="text-center p-10 text-slate-300 text-xl">Loading Game Data...</p></div>}>
            <StatOverUnderEraGameContent />
        </Suspense>
    );
}