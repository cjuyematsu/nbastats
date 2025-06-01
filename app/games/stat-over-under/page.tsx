// app/games/stat-over-under/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { useAuth } from '@/app/contexts/AuthContext';   
import Link from 'next/link';
import { Database } from '@/types/supabase'; // Path to your generated types

// --- Icon Components ---
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

// --- Interface Definitions ---
type GameChallenge = Database['public']['Functions']['get_stat_ou_challenges_for_date']['Returns'][number];

interface UserRoundAnswer {
  round_number: number;
  challenge_player_id: number;
  challenge_season_year: number;
  challenge_stat_category: string;
  displayed_line_value: number;
  actual_stat_value: number;
  user_guess: 'over' | 'under' | null;
  is_correct: boolean | null; 
}

interface GameDetailsForJsonb {
  challenge_date: string;
  rounds_played: number;
  final_score: number;
  details: UserRoundAnswer[];
}

type GameStatus = 'loading' | 'not_played_yet' | 'playing' | 'round_feedback' | 'completed' | 'already_played' | 'no_game_today' | 'error_loading';

// It's good practice to define the Json type based on what Supabase expects if it's not globally available
// from your generated types directly as 'Json'. Often it is part of the Database type.
// If Database['public']['Tables']['gamescores']['Insert']['game_details'] is `Json | null | undefined`,
// we can derive it or use `any` for the cast if really stuck.
// For this example, we'll assume `Json` is a type we can reference or that the cast to the specific column type handles it.
type SupabaseJsonType = Database['public']['Tables']['gamescores']['Insert']['game_details'];


export default function StatOverUnderGamePage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [challenges, setChallenges] = useState<GameChallenge[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserRoundAnswer[]>([]);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('loading');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [todayDateISO, setTodayDateISO] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true); 
  const [pageFetchError, setPageFetchError] = useState<string | null>(null);

  const fetchChallenges = useCallback(async (dateISO: string): Promise<GameChallenge[]> => {
    try {
      const { data, error } = await supabase.rpc('get_stat_ou_challenges_for_date', {
        p_challenge_date: dateISO,
      });
      if (error) throw error;
      if (data) { 
        return data as GameChallenge[];
      }
      console.warn("No game challenges found or data is null for date:", dateISO, data);
      return [];
    } catch (err) {
      console.error("Error fetching game challenges:", err);
      let message = "Could not load today's game challenges.";
      if (err instanceof Error) message = err.message;
      else if (typeof err === 'string') message = err;
      setPageFetchError(message);
      return [];
    }
  }, []);

  const checkPriorPlay = useCallback(async (userId: string, dateISO: string) => {
    try {
      const { data: existingGame, error: existingGameError } = await supabase
        .from('gamescores')
        .select('id, score, game_details') 
        .eq('user_id', userId)
        .eq('game_type', 'STAT_OVER_UNDER_DAILY_V1')
        .eq('played_on_date', dateISO)
        .maybeSingle();

      if (existingGameError) {
          if (existingGameError.message.includes("column") && existingGameError.message.includes("does not exist") && existingGameError.message.includes("game_details")) {
              console.warn("Warning: 'game_details' column might be missing or misspelled in 'gamescores' select for checkPriorPlay, or RLS is hiding it. Trying without.");
              const { data: simpleGame, error: simpleError } = await supabase
                .from('gamescores')
                .select('id, score') 
                .eq('user_id', userId)
                .eq('game_type', 'STAT_OVER_UNDER_DAILY_V1')
                .eq('played_on_date', dateISO)
                .maybeSingle();
              if (simpleError) throw simpleError;
              return simpleGame ? {...simpleGame, game_details: null} : null; 
          }
          throw existingGameError; 
      }
      return existingGame;
    } catch (err) {
      console.error("Error checking existing game:", err);
      return null;
    }
  }, []);
  
  const resetGameState = () => {
    setCurrentRoundIndex(0);
    setUserAnswers([]);
    setScore(0);
    setFeedbackMessage(null);
  };

  const initializeGame = useCallback(async () => {
    setGameStatus('loading'); 
    setPageFetchError(null);
    resetGameState();

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const currentDateISO = `${year}-${month}-${day}`;
    setTodayDateISO(currentDateISO);

    if (authIsLoading) {
      return; 
    }

    if (user) {
      const priorPlay = await checkPriorPlay(user.id, currentDateISO);
      if (priorPlay) {
        setGameStatus('already_played');
        const priorDetails = priorPlay.game_details as GameDetailsForJsonb | null; 
        if (priorDetails && priorDetails.final_score !== undefined && priorDetails.details) {
            setScore(priorDetails.final_score);
            setUserAnswers(priorDetails.details);
        }
        return; 
      }
    }

    const fetchedChallenges = await fetchChallenges(currentDateISO);
    if (pageFetchError) { 
        setGameStatus('error_loading');
    } else if (fetchedChallenges.length === 10) {
      setChallenges(fetchedChallenges);
      setGameStatus('playing'); 
    } else {
      setGameStatus('no_game_today');
    }
  }, [user, authIsLoading, checkPriorPlay, fetchChallenges, pageFetchError]); 

  useEffect(() => {
    setIsLoading(true); 
    initializeGame().finally(() => {
        setIsLoading(false); 
    });
  }, [initializeGame]); 


  const saveGameResult = useCallback(async (finalScore: number, finalUserAnswers: UserRoundAnswer[]) => {
    if (!user || !todayDateISO) return; 
    
    const gameDataToSave: GameDetailsForJsonb = { 
      challenge_date: todayDateISO,
      rounds_played: finalUserAnswers.length,
      final_score: finalScore,
      details: finalUserAnswers.map(ans => ({ 
        ...ans,
        is_correct: typeof ans.is_correct === 'boolean' ? ans.is_correct : null,
      })),
    };

    try {
      const { error } = await supabase.from('gamescores').insert({
          user_id: user.id, 
          game_type: 'STAT_OVER_UNDER_DAILY_V1', 
          played_on_date: todayDateISO, 
          score: finalScore, 
          // This cast tells TypeScript to trust that gameDataToSave is compatible
          // with the Json type expected by the game_details column.
          game_details: gameDataToSave as unknown as SupabaseJsonType, 
        });
      if (error) {
        console.error("Supabase insert error object:", error);
        throw error; 
      }
    } catch (err) { 
        console.error("Error saving game result:", err); 
        let message = "Could not save your game score.";
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
            if (err instanceof Error) {
              message = err.message;
            } else {
              message = (err as { message: string }).message;
            }
        }
        alert("Error saving score: " + message);
    }
  }, [user, todayDateISO]);


  const handleGuess = useCallback(async (guess: 'over' | 'under') => {
    if (gameStatus !== 'playing' || currentRoundIndex >= challenges.length) return;
    const currentChallenge = challenges[currentRoundIndex];
    let isCorrect = false;
    if (guess === 'over') isCorrect = currentChallenge.actual_stat_value > currentChallenge.displayed_line_value;
    else if (guess === 'under') isCorrect = currentChallenge.actual_stat_value < currentChallenge.displayed_line_value;
    let newScore = score;
    if (isCorrect) { newScore = score + 1; setScore(newScore); }
    const answer: UserRoundAnswer = {
      round_number: currentChallenge.round_number, challenge_player_id: currentChallenge.player_id,
      challenge_season_year: currentChallenge.season_year, challenge_stat_category: currentChallenge.stat_category,
      displayed_line_value: currentChallenge.displayed_line_value, actual_stat_value: currentChallenge.actual_stat_value,
      user_guess: guess, is_correct: isCorrect,
    };
    const updatedAnswers = [...userAnswers, answer]; setUserAnswers(updatedAnswers);
    setFeedbackMessage( `Your guess: ${guess.toUpperCase()}. Actual: ${currentChallenge.actual_stat_value.toFixed(currentChallenge.stat_category.includes('_PCT') ? 3 : 1)}. You were ${isCorrect ? 'Correct!' : 'Incorrect.'}` );
    if (!isCorrect) { setGameStatus('completed'); if (user) await saveGameResult(newScore, updatedAnswers); } 
    else if (currentRoundIndex === challenges.length - 1) { setGameStatus('completed'); if (user) await saveGameResult(newScore, updatedAnswers); } 
    else { setGameStatus('round_feedback'); }
  }, [gameStatus, currentRoundIndex, challenges, score, userAnswers, user, saveGameResult, todayDateISO]);

  const handleNextRound = useCallback(async () => {
    setFeedbackMessage(null);
    const lastAnswerCorrect = userAnswers[userAnswers.length - 1]?.is_correct;
    if (lastAnswerCorrect && currentRoundIndex < challenges.length - 1) { 
      setCurrentRoundIndex(prev => prev + 1);
      setGameStatus('playing');
    } else {
      setGameStatus('completed'); 
    }
  }, [currentRoundIndex, challenges.length, userAnswers]);
  

  // --- Render Logic ---
  if (authIsLoading || isLoading) {
    return <div className="text-center p-10 text-slate-300">Loading Game...</div>;
  }
  if (pageFetchError || gameStatus === 'error_loading') { 
    return <div className="text-center p-10 text-red-400">Error: {pageFetchError || "Could not load game data."}</div>;
  }
  if (gameStatus === 'no_game_today') {
    return <div className="text-center p-10 text-slate-300">No game available for today. Please check back tomorrow!</div>;
  }
  
  if (user && gameStatus === 'already_played') { 
    return (
      <div className="max-w-lg mx-auto p-4 text-center text-slate-100">
        <h1 className="text-3xl font-bold text-sky-400 mb-6">Game Already Played!</h1>
        <p className="text-xl text-slate-300 mb-2">
          You completed today&apos;s challenge with a score of: <span className="font-bold text-white">{score} / {(userAnswers.length > 0 && userAnswers[userAnswers.length -1]?.round_number) || (challenges.length || 10) }</span>
        </p>
        <p className="text-slate-400 mb-6">Come back tomorrow for a new set of challenges!</p>
        {userAnswers.length > 0 && (
            <div className="text-left space-y-2 max-h-96 overflow-y-auto p-2 bg-slate-700/50 rounded">
            {userAnswers.map((ans, index) => (
                <div key={index} className={`p-2 rounded ${ans.is_correct ? 'bg-green-700/30' : 'bg-red-700/30'}`}>
                <p className="text-sm font-semibold">Round {ans.round_number}: {(challenges.find(c=>c.round_number === ans.round_number))?.player_name} - {ans.challenge_stat_category}</p>
                <p className="text-xs text-slate-400">Line: {ans.displayed_line_value.toFixed(ans.challenge_stat_category.includes('_PCT') ? 3 : 1)}, Actual: {ans.actual_stat_value.toFixed(ans.challenge_stat_category.includes('_PCT') ? 3 : 1)}</p>
                <p className="text-xs">Your Guess: <span className="font-medium">{ans.user_guess?.toUpperCase()}</span> - Result: {ans.is_correct ? 'Correct' : 'Incorrect'}</p>
                </div>
            ))}
            </div>
        )}
      </div>
    );
  }

  if (gameStatus === 'completed') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center text-slate-100">
        <h1 className="text-3xl font-bold text-sky-400 mb-6">Game Over!</h1>
        <p className="text-xl text-slate-300 mb-2">Your final score: <span className="font-bold text-white">{score} / {userAnswers.length}</span></p>
        {!user && <p className="text-amber-400 my-4"><Link href="/signin" className='underline hover:text-amber-200'>Sign in</Link> or <Link href="/signup" className='underline hover:text-amber-200'>Sign up</Link> to save your scores!</p>}
        <p className="text-slate-400 mb-6">Come back tomorrow for a new set of challenges!</p>
        <div className="text-left space-y-2 max-h-80 overflow-y-auto p-3 bg-slate-700/50 rounded-md border border-slate-600">
          {userAnswers.map((ans) => (
            <div key={ans.round_number} className={`p-2.5 rounded text-sm ${ans.is_correct ? 'bg-green-800/40' : 'bg-red-800/40'}`}>
              <p className="font-semibold">Round {ans.round_number}: {(challenges.find(c=>c.round_number === ans.round_number))?.player_name} - {ans.challenge_stat_category}</p>
              <p className="text-xs text-slate-300">Line: {ans.displayed_line_value.toFixed(ans.challenge_stat_category.includes('_PCT') ? 3 : 1)}, Actual: <span className="font-bold">{ans.actual_stat_value.toFixed(ans.challenge_stat_category.includes('_PCT') ? 3 : 1)}</span></p>
              <p className="text-xs">You guessed: <span className="font-medium">{ans.user_guess?.toUpperCase()}</span> - Result: <span className={ans.is_correct ? "text-green-400" : "text-red-400"}>{ans.is_correct ? 'CORRECT' : 'INCORRECT'}</span></p>
            </div>
          ))}
        </div>
         <button onClick={() => { resetGameState(); initializeGame(); }} className="mt-8 px-6 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105"> Play Again Tomorrow? </button>
      </div>
    );
  }
  
  if (challenges.length > 0 && (gameStatus === 'playing' || gameStatus === 'round_feedback' || (gameStatus === 'not_played_yet' && !user) )) {
    const currentChallenge = challenges[currentRoundIndex];
    if (!currentChallenge) {
        return <div className="text-center p-10 text-slate-300">Loading round...</div>;
    }

    if (!user && gameStatus === 'not_played_yet') {
      return (
        <div className="max-w-lg mx-auto p-4 text-center text-slate-100">
          <h1 className="text-3xl font-bold text-sky-400 mb-4">Daily Stat Over/Under</h1>
          <p className="text-xl text-slate-300 mb-6">Welcome! Guess if the player&apos;s actual stat is over or under the given line.</p>
          <div className="space-y-4 sm:space-y-0 sm:flex sm:justify-center sm:space-x-4">
            <button 
                onClick={() => { if(challenges.length === 10) setGameStatus('playing'); else initializeGame(); }} 
                className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105"
            >
                Play as Guest
            </button>
            <Link href="/signin" className="block w-full sm:w-auto text-center px-8 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105">
                Sign In to Save Score
            </Link>
          </div>
           <p className="text-xs text-slate-500 mt-6">Scores are only saved for logged-in users.</p>
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto p-4 text-slate-100">
        <h1 className="text-2xl font-bold text-sky-400 text-center mb-2">
          Daily Stat Over/Under - Round {currentChallenge.round_number} of {challenges.length}
        </h1>
        <p className="text-center text-slate-400 mb-6">Score: {score}</p>

        <div className="bg-slate-700 p-6 rounded-lg shadow-xl mb-6 text-center">
          <p className="text-xl font-semibold text-sky-300">
            {currentChallenge.player_name}
          </p>
          <p className="text-sm text-slate-400 mb-3">
            ({currentChallenge.team_name}, {currentChallenge.season_year})
          </p>
          <p className="text-lg text-slate-200">
            Stat: <span className="font-medium text-amber-400">{currentChallenge.stat_category}</span>
          </p>
          <p className="text-4xl font-bold text-white my-4">
            {currentChallenge.displayed_line_value.toFixed(currentChallenge.stat_category.includes('_PCT') ? 3 : 1)}
          </p>
          <p className="text-md text-slate-300">Is their actual {currentChallenge.stat_category} for that season...</p>
        </div>

        { (gameStatus === 'playing') && (
          <div className="flex justify-around mt-6">
            <button 
              onClick={() => handleGuess('under')}
              aria-label="Guess Under"
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 w-32 text-lg"
            >
              <ArrowDownIcon className="w-8 h-8 mx-auto mb-1" />
              UNDER
            </button>
            <button 
              onClick={() => handleGuess('over')}
              aria-label="Guess Over"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 w-32 text-lg"
            >
              <ArrowUpIcon className="w-8 h-8 mx-auto mb-1" />
              OVER
            </button>
          </div>
        )}

        {gameStatus === 'round_feedback' && feedbackMessage && (
          <div className="mt-6 text-center">
            <div className={`text-lg p-4 rounded-md shadow-md ${(userAnswers[userAnswers.length -1])?.is_correct ? 'bg-green-500/20 border border-green-500 text-green-300' : 'bg-red-500/20 border border-red-500 text-red-300'}`}>
              <p>{feedbackMessage}</p>
            </div>
            <button
              onClick={handleNextRound}
              className="mt-6 px-8 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105"
            >
              {(currentRoundIndex < challenges.length - 1 && (userAnswers[userAnswers.length -1])?.is_correct) ? 'Next Round' : 'Show Final Results'}
            </button>
          </div>
        )}
      </div>
    );
  }
  
  return <div className="text-center p-10 text-slate-300">Initializing game... Please wait.</div>;
}