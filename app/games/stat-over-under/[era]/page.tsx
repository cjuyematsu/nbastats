// app/games/stat-over-under/[era]/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { Database } from '@/types/supabase';

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
type StatHistoryRecord = {
    game_era: string;
    points: number;
    potential_points: number;
};
const AVAILABLE_ERAS = [
    { id: 'modern', name: 'Modern Era (2011-2025)' },
    { id: '2000s',  name: '2000s (2001-2010)' },
    { id: '1990s',  name: '1990s (1991-2000)' },
    { id: '1980s',  name: '1980s (1980-1990)' },
];

function EraStatsDisplay({ allScores, era, eraName }: { allScores: StatHistoryRecord[], era: string, eraName: string }) {
    const stats = useMemo(() => {
        const eraScores = allScores.filter(s => s.game_era.toLowerCase().trim() === era.toLowerCase().trim());

        if (eraScores.length === 0) {
            return {
                played: 0,
                totalPoints: 0,
                totalPotential: 0,
                correctPercent: 0,
                scoreDistribution: Array(11).fill(0),
            };
        }

        const played = eraScores.length;
        const totalPoints = eraScores.reduce((acc, s) => acc + (s.points || 0), 0);
        const totalPotential = eraScores.reduce((acc, s) => acc + (s.potential_points || 10), 0);
        const correctPercent = totalPotential > 0 ? Math.round((totalPoints / totalPotential) * 100) : 0;

        const scoreDistribution = Array(11).fill(0);
        eraScores.forEach(score => {
            if (score.points >= 0 && score.points <= 10) {
                scoreDistribution[score.points]++;
            }
        });

        return { played, totalPoints, totalPotential, correctPercent, scoreDistribution };
    }, [allScores, era]);

    const maxDistributionCount = Math.max(...stats.scoreDistribution, 1);

    if (stats.played === 0) {
        return (
            <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700 w-full text-center">
                <p className="text-slate-400">No stats yet for the {eraName}. Play a game to see your history!</p>
            </div>
        );
    }
    
    return (
        <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700 w-full">
            <h3 className="font-bold text-xl text-slate-100 mb-4 text-center">Your {eraName} Statistics</h3>
            <div className="flex justify-around text-center mb-6">
                <div>
                    <p className="text-3xl font-bold">{stats.played}</p>
                    <p className="text-xs text-slate-400">Played</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.correctPercent}<span className="text-xl">%</span></p>
                    <p className="text-xs text-slate-400">Correct</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.totalPoints}</p>
                    <p className="text-xs text-slate-400">Total Score</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.totalPotential}</p>
                    <p className="text-xs text-slate-400">Possible</p>
                </div>
            </div>
            
            <h4 className="font-bold text-center text-slate-200 mb-3">Score Distribution (0-10)</h4>
            <div className="space-y-2">
                {stats.scoreDistribution.map((count, index) => (
                    <div key={index} className="flex items-center text-sm">
                        <div className="w-6 font-bold text-right pr-2">{index}</div>
                        <div className="flex-grow bg-slate-700 rounded-sm">
                            <div 
                                className="bg-sky-500 text-right px-2 py-0.5 rounded-sm text-white font-bold"
                                style={{ width: count > 0 ? `${Math.max(8, (count / maxDistributionCount) * 100)}%` : '0%' }}
                            >
                                {count > 0 && count}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


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
  const [todayDateISO, setTodayDateISO] = useState<string>('');
  const [pageFetchError, setPageFetchError] = useState<string | null>(null);
  const [statsHistory, setStatsHistory] = useState<StatHistoryRecord[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchChallenges = useCallback(async (dateISO: string, era: string): Promise<GameChallenge[]> => {
    try {
      const { data, error } = await supabase.rpc('get_stat_ou_challenges_for_date', { p_challenge_date: dateISO, p_game_era: era });
      if (error) throw error;
      return (data as GameChallenge[] | null) || [];
    } catch (err) {
      console.error(`Error fetching game challenges for era ${era}:`, err);
      throw err;
    }
  }, []);

  const checkPriorPlay = useCallback(async (userId: string, dateISO: string, era: string) => {
    const gameIdentifier = `STAT_OVER_UNDER_DAILY_V1_${era.toUpperCase()}`;
    try {
      const { data: existingGame, error: existingGameError } = await supabase.from('gamescores').select('points').eq('user_id', userId).eq('game_id', gameIdentifier).eq('played_on_date', dateISO).maybeSingle();
      if (existingGameError) throw existingGameError;
      return existingGame;
    } catch (errCaught) {
      console.error(`Error checking existing game for era ${era}:`, errCaught);
      throw errCaught;
    }
  }, []);

  const resetGameState = useCallback(() => {
    setCurrentRoundIndex(0);
    setUserAnswers([]);
    setScore(0);
    setFeedbackMessage(null);
    setChallenges([]);
    setPageFetchError(null);
  }, []);

  const saveGameResult = useCallback(async (finalScore: number, era: string, gameDate: string, potentialPoints: number) => {
    if (!user) { return; }
    if (!gameDate || !era || potentialPoints === 0) {
      setPageFetchError("Cannot save game: required data is missing.");
      return;
    }
    const gameIdentifier = `STAT_OVER_UNDER_DAILY_V1_${era.toUpperCase()}`;
    try {
      const { error } = await supabase.from('gamescores').insert({ user_id: user.id, played_on_date: gameDate, game_id: gameIdentifier, points: finalScore, potential_points: potentialPoints });
      if (error) throw error;
    } catch (err) {
      setPageFetchError(err instanceof Error ? err.message : "Could not save your score.");
      console.error("Error in saveGameResult:", err);
      throw err;
    }
  }, [user]);

  const loadGameForEra = useCallback(async (eraToLoad: string) => {
    setGameStatus('fetching_challenges');
    setPageFetchError(null);
    resetGameState();
    const today = new Date();
    const currentDateISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    setTodayDateISO(currentDateISO);
    try {
      if (user) {
        const priorPlayData = await checkPriorPlay(user.id, currentDateISO, eraToLoad);
        if (priorPlayData && typeof priorPlayData.points === 'number') {
          setScore(priorPlayData.points);
          setGameStatus('already_played');
          return;
        }
      }
      const fetchedChallenges = await fetchChallenges(currentDateISO, eraToLoad);
      if (fetchedChallenges.length >= 10) {
        setChallenges(fetchedChallenges);
        setGameStatus('playing');
      } else {
        setGameStatus('no_game_today');
      }
    } catch (error) {
      setPageFetchError(error instanceof Error ? error.message : "An error occurred while loading the game.");
      setGameStatus('error_loading');
    }
  }, [user, checkPriorPlay, fetchChallenges, resetGameState]);
  
  useEffect(() => {
    if (authIsLoading) {
        setIsLoadingStats(true);
        return;
    }
    if (!user) {
        setIsLoadingStats(false);
        setStatsHistory([]);
        return;
    }

    const fetchHistory = async () => {
      setIsLoadingStats(true);
      const { data, error } = await supabase.rpc('get_stat_ou_history', { p_user_id: user.id });
      if (error) {
        console.error("Error fetching stats history:", error);
        setPageFetchError("Could not load your game history.");
      } else if (data) {
        setStatsHistory(data as StatHistoryRecord[]);
      }
      setIsLoadingStats(false);
    };

    fetchHistory();
  }, [user, authIsLoading]);
  
  useEffect(() => {
    if (authIsLoading) return;
    if (!gameEraFromParam) {
      router.replace('/games/stat-over-under');
      return;
    }
    if (user && action === 'saveGuestResult') {
      const guestResultRaw = sessionStorage.getItem(`guestGameResult_${gameEraFromParam}`);
      if (guestResultRaw) {
        try {
          const guestResult = JSON.parse(guestResultRaw) as { score: number };
          const guestChallengesRaw = sessionStorage.getItem(`guestGameChallenges_${gameEraFromParam}`);
          const challengesForSave: GameChallenge[] = guestChallengesRaw ? JSON.parse(guestChallengesRaw) : [];
          if (challengesForSave.length > 0) {
            const todayForSave = new Date();
            const currentDateISOForSave = `${todayForSave.getFullYear()}-${(todayForSave.getMonth() + 1).toString().padStart(2, '0')}-${todayForSave.getDate().toString().padStart(2, '0')}`;
            saveGameResult(guestResult.score, gameEraFromParam, currentDateISOForSave, challengesForSave.length)
              .finally(() => {
                sessionStorage.removeItem(`guestGameResult_${gameEraFromParam}`);
                sessionStorage.removeItem(`guestGameChallenges_${gameEraFromParam}`);
                router.replace(`/games/stat-over-under/${gameEraFromParam}`, { scroll: false });
                loadGameForEra(gameEraFromParam);
            });
          } else {
             loadGameForEra(gameEraFromParam);
          }
        } catch (err) {
          console.error("Error processing guest result:", err);
          loadGameForEra(gameEraFromParam);
        }
      } else {
        loadGameForEra(gameEraFromParam);
      }
    } else {
      loadGameForEra(gameEraFromParam);
    }
  }, [user, authIsLoading, gameEraFromParam, action]);

  const handleGuess = useCallback(async (guess: 'over' | 'under') => {
    if (gameStatus !== 'playing' || currentRoundIndex >= challenges.length) return;
    const currentChallenge = challenges[currentRoundIndex];
    const isCorrect = guess === 'over' 
      ? currentChallenge.actual_stat_value > currentChallenge.displayed_line_value
      : currentChallenge.actual_stat_value < currentChallenge.displayed_line_value;
    const updatedScore = isCorrect ? score + 1 : score;
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
    setFeedbackMessage(`Your guess: ${guess.toUpperCase()}. Actual: ${currentChallenge.actual_stat_value.toFixed(currentChallenge.stat_category.includes('_PCT') ? 3 : 1)}. You were ${isCorrect ? 'Correct!' : 'Incorrect.'}`);
    const isFinalRound = currentRoundIndex === challenges.length - 1;
    if (isFinalRound) {
        setGameStatus('completed');
        if (user) {
            try { 
                await saveGameResult(updatedScore, gameEraFromParam, todayDateISO, challenges.length); 
                const { data, error } = await supabase.rpc('get_stat_ou_history', { p_user_id: user.id });
                if (error) console.error("Could not refresh stats after game.", error);
                else if (data) setStatsHistory(data as StatHistoryRecord[]);
            }
            catch { console.error("Caught error from saveGameResult in handleGuess."); }
        } else {
            sessionStorage.setItem(`guestGameResult_${gameEraFromParam}`, JSON.stringify({ score: updatedScore, userAnswers: updatedUserAnswers }));
            sessionStorage.setItem(`guestGameChallenges_${gameEraFromParam}`, JSON.stringify(challenges));
        }
    } else {
        setGameStatus('round_feedback');
    }
  }, [gameStatus, currentRoundIndex, challenges, score, userAnswers, user, saveGameResult, gameEraFromParam, todayDateISO]);
  
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
    router.push('/games/stat-over-under'); 
  };
  const eraName = AVAILABLE_ERAS.find(e=>e.id===gameEraFromParam)?.name || gameEraFromParam || 'Selected Era';

  if (gameStatus === 'initial_loading' || (gameStatus === 'fetching_challenges')) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-800 rounded-lg shadow-2xl"><p className="text-center p-10 text-slate-300 text-xl">Loading {eraName} Game...</p></div>;
  }
  if (gameStatus === 'error_loading') { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 rounded-lg shadow-2xl text-slate-100 py-12 px-4">
            <div className="text-center max-w-md p-6 bg-slate-800/70 rounded-xl shadow-2xl">
                <h2 className="text-2xl font-bold text-sky-400 mb-4">Error Loading Game</h2>
                <p className="text-slate-300 mb-6">{pageFetchError || "Could not load game data."}</p>
                <button onClick={() => {if(gameEraFromParam) loadGameForEra(gameEraFromParam);}} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105 mr-2">Try Again</button>
                <button onClick={handlePlayDifferentEra} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105 inline-block">Select Different Era</button>
            </div>
        </div>
    );
  }
  if (gameStatus === 'no_game_today') { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 rounded-lg shadow-2xl text-slate-100 py-12 px-4">
            <div className="text-center max-w-md p-6 bg-slate-800/70 rounded-xl shadow-2xl">
                <h2 className="text-2xl font-bold text-sky-400 mb-4">No Game Today</h2>
                <p className="text-slate-300 mb-6">No challenges found for {eraName} on {todayDateISO}. Please check back later.</p>
                <button onClick={handlePlayDifferentEra} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105 inline-block">Select Different Era</button>
            </div>
        </div>
    );
  }
  if (gameStatus === 'already_played' || gameStatus === 'completed') {
    const isCompleted = gameStatus === 'completed';
    const potentialPoints = isCompleted ? challenges.length : 10;
    return (
      <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full mx-auto p-6 sm:p-8 bg-slate-800/70 rounded-xl shadow-2xl text-center backdrop-blur-md">
            <h1 className="text-3xl font-bold text-sky-400 mb-2">{isCompleted ? 'Game Over!' : 'Game Already Played!'}</h1>
            <h2 className="text-xl font-medium text-slate-300 mb-2">{eraName} - {todayDateISO}</h2>
            <p className="text-xl text-slate-300 mb-6">Your score: <span className="font-bold text-white">{score} / {potentialPoints}</span></p>
            {isLoadingStats ? ( <p className="text-slate-400">Loading your stats...</p> ) : 
             user ? ( <EraStatsDisplay allScores={statsHistory} era={gameEraFromParam} eraName={eraName} /> ) : 
             !isCompleted ? null :
             (<div className="my-6">
                <p className="text-amber-400 mb-3">Want to save scores?</p>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <button onClick={() => router.push(`/signin?fromGameResults=true&era=${gameEraFromParam}`)} className='w-full sm:w-auto underline hover:text-amber-200 text-amber-400 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800 bg-slate-700 hover:bg-slate-600'>Sign In</button>
                  <button onClick={() => router.push(`/signup?fromGameResults=true&era=${gameEraFromParam}`)} className='w-full sm:w-auto underline hover:text-amber-200 text-amber-400 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800 bg-slate-700 hover:bg-slate-600'>Sign Up</button>
                </div>
              </div>)}
            <button onClick={handlePlayDifferentEra} className="mt-8 inline-block px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105">Play Different Era</button>
        </div>
      </div>
    );
  }
  const currentChallenge = challenges[currentRoundIndex];
  if (!currentChallenge) {
      return <div className="flex justify-center items-center min-h-screen bg-gray-800 rounded-lg shadow-2xl">
        <p className="text-center p-10 text-slate-300 text-xl">Loading round...</p></div>;
  }
  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100">
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 rounded-lg shadow-2xl text-slate-100 py-8 px-4">
        <div className="w-full max-w-lg">
            <div className='text-center mb-4'><button onClick={handlePlayDifferentEra} className="text-sm text-sky-400 hover:text-sky-300 underline focus:outline-none focus:ring-2 ring-sky-500 rounded-sm font-bold">Select Different Era</button></div>
            <h1 className="text-2xl md:text-3xl font-bold text-sky-400 text-center mb-1">{eraName}</h1>
            <p className="text-center text-slate-400 mb-1">Round {currentChallenge.round_number} of {challenges.length}</p>
            <p className="text-center text-xl font-bold text-white mb-6">Score: {score}</p>
            <div className="bg-slate-700/80 p-6 rounded-xl shadow-2xl mb-6 text-center backdrop-blur-sm border border-slate-600">
                <p className="text-xl sm:text-2xl font-bold text-sky-400">{currentChallenge.player_name}</p>
                <p className="text-sm sm:text-base text-white-400 mb-3">{currentChallenge.team_name}, {currentChallenge.season_year}</p>
                <p className="text-lg text-slate-200">Stat: <span className="font-medium text-amber-400">{currentChallenge.stat_category.replace(/_/g, ' ')}</span></p>
                <p className="text-4xl sm:text-5xl font-bold text-white my-4">{currentChallenge.displayed_line_value.toFixed(currentChallenge.stat_category.includes('_PCT') ? 3 : 1)}</p>
                <p className="text-md text-slate-300">Is their actual {currentChallenge.stat_category.replace(/_/g, ' ')} for that season...</p>
            </div>
            { gameStatus === 'playing' && (
              <div className="flex justify-around mt-6 space-x-3 sm:space-x-4">
                <button onClick={() => handleGuess('under')} aria-label="Guess Under" className="flex-1 px-6 py-4 bg-sky-600 border-sky-700 hover:bg-sky-700 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 text-lg flex flex-col items-center justify-center"><ArrowDownIcon className="w-7 h-7 sm:w-8 sm:h-8 mb-1" /> UNDER</button>
                <button onClick={() => handleGuess('over')}  aria-label="Guess Over" className="flex-1 px-6 py-4 bg-[rgba(0,191,98,255)] border-sky-700 hover:bg-green-400 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 text-lg flex flex-col items-center justify-center"><ArrowUpIcon className="w-7 h-7 sm:w-8 sm:h-8 mb-1" /> OVER</button>
              </div>
            )}
            {gameStatus === 'round_feedback' && feedbackMessage && (
              <div className="mt-6 text-center">
                <div className={`text-lg p-4 rounded-md shadow-md mb-4 ${userAnswers.length > 0 && userAnswers[userAnswers.length -1]?.is_correct ? 'bg-sky-700/30 border border-sky-600 text-sky-300' : 'bg-sky-700/30 border border-sky-600 text-sky-300'}`}>
                  <p dangerouslySetInnerHTML={{ __html: feedbackMessage.replace(/Correct!/g, '<strong class="font-bold">Correct!</strong>').replace(/Incorrect./g, '<strong class="font-bold">Incorrect.</strong>') }} />
                </div>
                <button onClick={handleNextRound} className="mt-4 px-8 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105">{currentRoundIndex < challenges.length - 1 ? 'Next Round' : 'Show Final Results'}</button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function StatOverUnderGamePageLoader() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen bg-gray-800 rounded-lg shadow-2xl"><p className="text-center p-10 text-slate-300 text-xl">Loading Game Data...</p></div>}>
            <StatOverUnderEraGameContent />
        </Suspense>
    );
}