//games/stat-over-under/[era]/page.tsx

'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import { Database } from '@/types/supabase';
import Image from 'next/image';

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
type GameStatus = 'initial_loading' | 'selecting_era' | 'fetching_challenges' | 'playing' | 'round_feedback' | 'saving_results' | 'completed' | 'already_played' | 'no_game_today' | 'error_loading';
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

const getTeamLogoUrl = (teamName: string | null): string => {
  if (!teamName) {
    return '/nba-logo.png';
  }
  if (teamName.toLowerCase().includes('trail blazers')) {
    return '/trailblazers.png';
  }
  const nameParts = teamName.split(' ');
  const logoName = nameParts[nameParts.length - 1].toLowerCase();
  return `/${logoName}.png`;
};

function EraStatsDisplay({ allScores, era, eraName, isDarkMode }: { allScores: StatHistoryRecord[], era: string, eraName: string, isDarkMode: boolean }) {
    const stats = useMemo(() => {
        const eraScores = allScores.filter(s => s.game_era.toLowerCase().trim() === era.toLowerCase().trim());

        if (eraScores.length === 0) {
            return {
                played: 0, totalPoints: 0, totalPotential: 0, correctPercent: 0,
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

    const containerClasses = isDarkMode
      ? "mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700 w-full"
      : "mt-8 p-6 bg-white/50 rounded-lg border border-gray-200 w-full";
    const mutedText = isDarkMode ? "text-slate-400" : "text-gray-500";
    const headerText = isDarkMode ? "text-slate-100" : "text-gray-800";
    const barBg = isDarkMode ? "bg-slate-700" : "bg-gray-200";

    if (stats.played === 0) {
        return (
            <div className={`${containerClasses} text-center`}>
                <p className={mutedText}>No stats yet for the {eraName}. Play a game to see your history!</p>
            </div>
        );
    }

    return (
        <div className={containerClasses}>
            <h3 className={`font-bold text-xl mb-4 text-center ${headerText}`}>Your {eraName} Statistics</h3>
            <div className="flex justify-around text-center mb-6">
                <div>
                    <p className="text-3xl font-bold">{stats.played}</p>
                    <p className={`text-xs ${mutedText}`}>Played</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.correctPercent}<span className="text-xl">%</span></p>
                    <p className={`text-xs ${mutedText}`}>Correct</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.totalPoints}</p>
                    <p className={`text-xs ${mutedText}`}>Total Score</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.totalPotential}</p>
                    <p className={`text-xs ${mutedText}`}>Possible</p>
                </div>
            </div>

            <h4 className={`font-bold text-center mb-3 ${headerText}`}>Score Distribution (0-10)</h4>
            <div className="space-y-2">
                {stats.scoreDistribution.map((count, index) => (
                    <div key={index} className="flex items-center text-sm">
                        <div className="w-6 font-bold text-right pr-2">{index}</div>
                        <div className={`flex-grow rounded-sm ${barBg}`}>
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
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);

  // ... (useEffect for dark mode is unchanged)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);


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
  }, [user, authIsLoading, gameEraFromParam, action, loadGameForEra, router, saveGameResult]);

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
        setGameStatus('saving_results');
        setTimeout(async () => {
            if (user) {
                try { 
                    await saveGameResult(updatedScore, gameEraFromParam, todayDateISO, challenges.length); 
                    const { data, error } = await supabase.rpc('get_stat_ou_history', { p_user_id: user.id });
                    if (error) console.error("Could not refresh stats after game.", error);
                    else if (data) setStatsHistory(data as StatHistoryRecord[]);
                }
                catch (err) { 
                    console.error("Caught error during game finalization:", err);
                    setPageFetchError("Failed to save final score and update stats.");
                } finally {
                    setGameStatus('completed');
                }
            } else {
                sessionStorage.setItem(`guestGameResult_${gameEraFromParam}`, JSON.stringify({ score: updatedScore, userAnswers: updatedUserAnswers }));
                sessionStorage.setItem(`guestGameChallenges_${gameEraFromParam}`, JSON.stringify(challenges));
                setGameStatus('completed');
            }
        }, 1500); 

    } else {
        setGameStatus('round_feedback');
        setIsFeedbackVisible(true);
    }
  }, [gameStatus, currentRoundIndex, challenges, score, userAnswers, user, saveGameResult, gameEraFromParam, todayDateISO]);
  
  const handleNextRound = useCallback(() => {
    setIsImageLoaded(false); 
    setIsFeedbackVisible(false);

    setTimeout(() => {
      setFeedbackMessage(null);
      if (currentRoundIndex < challenges.length - 1) {
        setCurrentRoundIndex(prev => prev + 1);
        setGameStatus('playing');
      } else {
        setGameStatus('completed'); 
      }
    }, 500);
  }, [currentRoundIndex, challenges.length]);
  
  const handlePlayDifferentEra = () => {
    router.push('/games/stat-over-under'); 
  };
  const eraName = AVAILABLE_ERAS.find(e=>e.id===gameEraFromParam)?.name || gameEraFromParam || 'Selected Era';

  const mainContainerClasses = isDarkMode ? "bg-gray-800 text-slate-100" : "bg-white text-gray-800";
  const mainBg = isDarkMode ? "bg-gray-800" : "bg-white";
  const mutedText = isDarkMode ? "text-slate-300" : "text-gray-600";
  const strongText = isDarkMode ? "text-white" : "text-black";
  const highlightColor = isDarkMode ? "text-sky-400" : "text-sky-600";
  const highlightHover = isDarkMode ? "hover:text-sky-300" : "hover:text-sky-500";
  const cardBg = isDarkMode ? "bg-slate-800/70" : "bg-white/70";
  const gameCardBg = isDarkMode ? "bg-slate-700/80 border-slate-600" : "bg-white/80 border-gray-200";
  const buttonSecondary = isDarkMode ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300";
  const correctBg = isDarkMode ? "bg-green-700/30 border-green-600 text-green-300" : "bg-green-100 border-green-200 text-green-800";
  const incorrectBg = isDarkMode ? "bg-red-700/30 border-red-600 text-red-300" : "bg-red-100 border-red-200 text-red-800";
  const amberText = isDarkMode ? "text-amber-400" : "text-amber-600";
  const amberButtonBg = isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-amber-50 hover:bg-amber-100";
  const amberRing = isDarkMode ? "ring-offset-slate-800" : "ring-offset-white";

  if (gameStatus === 'initial_loading' || (gameStatus === 'fetching_challenges')) {
    return <div className={`flex justify-center items-center min-h-screen rounded-lg ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}><p className={`text-center p-10 text-xl ${mutedText}`}>Loading {eraName} Game...</p></div>;
  }
  if (gameStatus === 'error_loading') {
    return (
        <div className={`flex flex-col items-center justify-center min-h-screen rounded-lg py-12 px-4 ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}>
            <div className={`text-center max-w-md p-6 rounded-xl shadow-2xl ${cardBg}`}>
                <h2 className={`text-2xl font-bold mb-4 ${highlightColor}`}>Error Loading Game</h2>
                <p className={`mb-6 ${mutedText}`}>{pageFetchError || "Could not load game data."}</p>
                <button onClick={() => {if(gameEraFromParam) loadGameForEra(gameEraFromParam);}} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105 mr-2">Try Again</button>
                <button onClick={handlePlayDifferentEra} className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105 inline-block ${buttonSecondary}`}>Select Different Era</button>
            </div>
        </div>
    );
  }
  if (gameStatus === 'no_game_today') {
    return (
        <div className={`flex flex-col items-center justify-center min-h-screen rounded-lg py-12 px-4 ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}>
            <div className={`text-center max-w-md p-6 rounded-xl shadow-2xl ${cardBg}`}>
                <h2 className={`text-2xl font-bold mb-4 ${highlightColor}`}>No Game Today</h2>
                <p className={`mb-6 ${mutedText}`}>No challenges found for {eraName} on {todayDateISO}. Please check back later.</p>
                <button onClick={handlePlayDifferentEra} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105 inline-block">Select Different Era</button>
            </div>
        </div>
    );
  }
  if (gameStatus === 'saving_results') {
    return (
        <div className={`flex flex-col items-center justify-center min-h-screen rounded-lg py-12 px-4 ${mainContainerClasses}`}>
            <div className={`text-center p-6 rounded-xl`}>
                <h2 className={`text-2xl font-bold mb-4 ${highlightColor}`}>Finalizing your results...</h2>
                <p className={`text-lg ${mutedText}`}>Updating your stats, please wait.</p>
            </div>
        </div>
    );
  }
  if (gameStatus === 'already_played' || gameStatus === 'completed') {
    const isCompleted = gameStatus === 'completed';
    const potentialPoints = isCompleted ? challenges.length : 10;
    return (
      <div className={`w-full rounded-lg min-h-screen flex items-center justify-center py-12 px-4 ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}>
        <div className={`max-w-lg w-full mx-auto p-6 sm:p-8 rounded-xl shadow-2xl text-center backdrop-blur-md ${cardBg}`}>
            <h1 className={`text-3xl font-bold mb-2 ${highlightColor}`}>{isCompleted ? 'Game Over!' : 'Game Already Played!'}</h1>
            <h2 className={`text-xl font-medium mb-2 ${mutedText}`}>{eraName} - {todayDateISO}</h2>
            <p className={`text-xl mb-6 ${mutedText}`}>Your score: <span className={`font-bold ${strongText}`}>{score} / {potentialPoints}</span></p>
            {isLoadingStats ? ( <p className={mutedText}>Loading your stats...</p> ) :
             user ? ( <EraStatsDisplay allScores={statsHistory} era={gameEraFromParam} eraName={eraName} isDarkMode={isDarkMode}/> ) :
             !isCompleted ? null :
             (<div className="my-6">
                <p className={`${amberText} mb-3`}>Want to save scores?</p>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <button onClick={() => router.push(`/signin?fromGameResults=true&era=${gameEraFromParam}`)} className={`w-full sm:w-auto underline hover:text-amber-200 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ring-amber-400 ring-offset-2 ${amberRing} ${amberButtonBg} ${amberText}`}>Sign In</button>
                  <button onClick={() => router.push(`/signup?fromGameResults=true&era=${gameEraFromParam}`)} className={`w-full sm:w-auto underline hover:text-amber-200 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ring-amber-400 ring-offset-2 ${amberRing} ${amberButtonBg} ${amberText}`}>Sign Up</button>
                </div>
              </div>)}
            <button onClick={handlePlayDifferentEra} className={`mt-8 inline-block px-6 py-3 rounded-lg font-bold shadow-md transition-transform hover:scale-105 ${buttonSecondary} ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Play Different Era</button>
        </div>
      </div>
    );
  }

  const currentChallenge = challenges[currentRoundIndex];
  if (!currentChallenge) {
      return <div className={`flex justify-center items-center min-h-screen rounded-lg ${mainBg}`}>
        <p className={`text-center p-10 text-xl ${mutedText}`}>Loading round...</p></div>;
  }

  return (
    <div className={`w-full rounded-lg ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}>
      <div className={`flex flex-col items-center justify-center min-h-screen rounded-lg shadow-2xl py-8 px-4 ${mainBg}`}>
        <div className="w-full max-w-lg">
            <div className='text-center mb-4'><button onClick={handlePlayDifferentEra} className={`text-sm underline focus:outline-none focus:ring-2 ring-sky-500 rounded-sm font-bold ${highlightColor} ${highlightHover}`}>Select Different Era</button></div>
            <h1 className={`text-2xl md:text-3xl font-bold text-center mb-1 ${highlightColor}`}>{eraName}</h1>
            <p className={`text-center mb-1 ${mutedText}`}>Round {currentChallenge.round_number} of {challenges.length}</p>
            <p className={`text-center text-xl font-bold mb-6 ${strongText}`}>Score: {score}</p>

            <div className={`relative p-6 rounded-xl shadow-2xl mb-6 text-center backdrop-blur-sm border overflow-hidden ${gameCardBg}`}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Image
                        key={currentChallenge.player_id}
                        fill
                        src={getTeamLogoUrl(currentChallenge.team_name)}
                        alt={currentChallenge.team_name || 'Team Logo'}
                        className={`object-contain transform transition-all duration-500 ease-in-out ${isImageLoaded ? 'opacity-[0.15] scale-100' : 'opacity-0 scale-95'}`}
                        onLoad={() => setIsImageLoaded(true)}
                        onError={(e) => { 
                            e.currentTarget.src = '/nba-logo.png';
                            setIsImageLoaded(true); 
                        }}
                    />
                </div>
                <div className="relative z-10">
                    <p className={`text-xl sm:text-2xl font-bold ${highlightColor}`}>{currentChallenge.player_name}</p>
                    <p className={`text-sm sm:text-base mb-3 ${mutedText}`}>{currentChallenge.team_name}, {currentChallenge.season_year}</p>
                    <p className={`text-lg ${mutedText}`}>Stat: <span className={`font-medium ${amberText}`}>{currentChallenge.stat_category.replace(/_/g, ' ')}</span></p>
                    <p className={`text-4xl sm:text-5xl font-bold my-4 ${strongText}`}>{currentChallenge.displayed_line_value.toFixed(currentChallenge.stat_category.includes('_PCT') ? 3 : 1)}</p>
                    <p className={`text-md ${mutedText}`}>Is their actual {currentChallenge.stat_category.replace(/_/g, ' ')} for that season...</p>
                </div>
            </div>

            { gameStatus === 'playing' && (
              <div className="flex justify-around mt-6 space-x-3 sm:space-x-4">
                <button onClick={() => handleGuess('under')} aria-label="Guess Under" className="flex-1 px-6 py-4 bg-sky-600 border-sky-700 hover:bg-sky-700 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 text-lg flex flex-col items-center justify-center"><ArrowDownIcon className="w-7 h-7 sm:w-8 sm:h-8 mb-1" /> UNDER</button>
                <button onClick={() => handleGuess('over')}  aria-label="Guess Over" className="flex-1 px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg flex flex-col items-center justify-center"><ArrowUpIcon className="w-7 h-7 sm:w-8 sm:h-8 mb-1" /> OVER</button>
              </div>
            )}
            
            {gameStatus === 'round_feedback' && feedbackMessage && (
              <div className={`transition-opacity duration-300 ease-in-out ${isFeedbackVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className="mt-6 text-center">
                  <div className={`text-lg p-4 rounded-md shadow-md mb-4 ${userAnswers.length > 0 && userAnswers[userAnswers.length -1]?.is_correct ? correctBg : incorrectBg}`}>
                    <p dangerouslySetInnerHTML={{ __html: feedbackMessage.replace(/Correct!/g, '<strong class="font-bold">Correct!</strong>').replace(/Incorrect./g, '<strong class="font-bold">Incorrect.</strong>') }} />
                  </div>
                  <button onClick={handleNextRound} className="mt-4 px-8 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105">{currentRoundIndex < challenges.length - 1 ? 'Next Round' : 'Show Final Results'}</button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function StatOverUnderGamePageLoader() {
    return (
        <Suspense fallback={<StatOverUnderGamePageFallback />}>
            <StatOverUnderEraGameContent />
        </Suspense>
    );
}

function StatOverUnderGamePageFallback() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const mainContainerClasses = isDarkMode ? "bg-gray-800" : "bg-white";
    const mutedText = isDarkMode ? "text-slate-300" : "text-gray-600";
    
    return (
        <div className={`flex justify-center items-center min-h-screen rounded-lg ${mainContainerClasses}`}>
            <p className={`text-center p-10 text-xl ${mutedText}`}>Loading Game Data...</p>
        </div>
    );
}
