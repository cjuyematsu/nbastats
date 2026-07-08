//app/games/ranking-game/RankingGameClient.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAuth } from '@/app/contexts/AuthContext';
import { PostgrestError } from '@supabase/supabase-js';
import { buildStreakShare } from '@/lib/shareText';
import { markDailyPlayed, readTodayProgress } from '@/lib/dailyProgress';
import { generateRankingDaily } from '@/lib/rankingDaily';
import ShareResult from '@/components/ShareResult';
import DailyChallengesStrip from '@/app/DailyChallengesStrip';

interface Player {
  personId: number;
  firstName: string;
  lastName: string;
  SeasonYear: number;
  statValue: number;
}
type GameDataRow = {
    personId: number;
    firstName: string;
    lastName: string | null;
    SeasonYear: number;
    statValue: number;
    categoryName: string;
    categoryOptions: string[];
};
enum GameStatus {
  Loading,
  Ranking,
  Guessing,
  Finished,
}

const MIN_LOADING_TIME_MS = 500;
const GAME_SESSION_CACHE_KEY = 'rankingGameSession_v1';
const GUEST_STREAK_KEY = 'rankingGameGuestStreak_v1';

type GuestStreak = {
    current_streak: number;
    max_streak: number;
    total_correct: number;
    total_incorrect: number;
};

function readGuestStreak(): GuestStreak | null {
    try {
        const raw = localStorage.getItem(GUEST_STREAK_KEY);
        if (!raw) return null;
        const d = JSON.parse(raw);
        if (typeof d.current_streak === 'number') return d as GuestStreak;
    } catch {
        // ignore malformed storage
    }
    return null;
}

function writeGuestStreak(s: GuestStreak): void {
    try {
        localStorage.setItem(GUEST_STREAK_KEY, JSON.stringify(s));
    } catch {
        // ignore storage failures
    }
}

/**
 * Custom Hook: useThemeDetector
 * Safely detects the user's preferred color scheme to prevent theme flashing.
 */
const useThemeDetector = () => {
    const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return isDarkMode;
};

export default function RankingGame() {
  const { supabase, user, isLoading: authIsLoading } = useAuth();

  const [status, setStatus] = useState<GameStatus>(GameStatus.Loading);
  const [players, setPlayers] = useState<Player[]>([]);
  const [correctOrder, setCorrectOrder] = useState<Player[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');

  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalCorrect, setTotalCorrect] = useState<number>(0);
  const [totalIncorrect, setTotalIncorrect] = useState<number>(0);
  const [endedStreak, setEndedStreak] = useState<number | null>(null);
  const [isDailyRound, setIsDailyRound] = useState(false);

  const isDarkMode = useThemeDetector();

  const fetchUserStreak = useCallback(async () => {
    if (!user) {
        const guest = readGuestStreak();
        setCurrentStreak(guest?.current_streak ?? 0);
        setMaxStreak(guest?.max_streak ?? 0);
        setTotalCorrect(guest?.total_correct ?? 0);
        setTotalIncorrect(guest?.total_incorrect ?? 0);
        return;
    }
    const { data } = await supabase
      .from('ranking_game_streaks')
      .select('current_streak, max_streak, is_active, total_correct, total_incorrect')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setCurrentStreak(data.is_active ? data.current_streak : 0);
      setMaxStreak(data.max_streak);
      setTotalCorrect(data.total_correct);
      setTotalIncorrect(data.total_incorrect);
    }
  }, [user, supabase]);

  const initializeGame = useCallback(async () => {
    setStatus(GameStatus.Loading);
    const startTime = Date.now();
    
    setMessage('');
    setPlayers([]);
    setCorrectOrder([]);

    await fetchUserStreak();

    let gameLoaded = false;

    let dailyPending = false;
    try {
      dailyPending = !readTodayProgress().ranking;
    } catch {
      // storage unavailable; fall through to a random round
    }
    if (dailyPending) {
      const daily = await generateRankingDaily();
      if (daily) {
        setCorrectOrder(daily.correctOrder);
        setPlayers(daily.players);
        setCategoryName(daily.correctOrder[0].categoryName);
        setCategoryOptions(daily.correctOrder[0].categoryOptions);
        setIsDailyRound(true);
        gameLoaded = true;
      }
    }
    if (!gameLoaded) setIsDailyRound(false);

    const cachedGameDataString = gameLoaded ? null : sessionStorage.getItem(GAME_SESSION_CACHE_KEY);
    if (cachedGameDataString) {
        try {
            const cachedGame = JSON.parse(cachedGameDataString);
            if (cachedGame.players && cachedGame.correctOrder) {
                setPlayers(cachedGame.players);
                setCorrectOrder(cachedGame.correctOrder);
                setCategoryName(cachedGame.categoryName);
                setCategoryOptions(cachedGame.categoryOptions);
                gameLoaded = true;
            }
        } catch (e) {
            console.error("Failed to parse cached game data, fetching new game.", e);
            sessionStorage.removeItem(GAME_SESSION_CACHE_KEY);
        }
    }

    if (!gameLoaded) {
        let rpcData: GameDataRow[] | null = null;
        let rpcError: PostgrestError | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            const { data, error } = await supabase.rpc('get_ranking_game_data');
            if (!error && data && data.length >= 3) {
                rpcData = data;
                rpcError = null;
                break;
            }
            rpcError = error;
            if (attempt < 3) await new Promise(res => setTimeout(res, 300 * attempt));
        }

        if (rpcError || !rpcData) {
            console.error("Failed to fetch game data after retries:", JSON.stringify(rpcError, null, 2));
            setStatus(GameStatus.Finished);
            setMessage("Could not load a new game. Please try again later.");
            return;
        }

        const gameData = rpcData.map((p: GameDataRow) => ({ ...p, lastName: p.lastName || '' }));
        const shuffledPlayers = [...gameData].sort(() => Math.random() - 0.5);
        setCorrectOrder(gameData);
        setPlayers(shuffledPlayers);
        setCategoryName(gameData[0].categoryName);
        setCategoryOptions(gameData[0].categoryOptions);

        try {
            const gameToCache = { correctOrder: gameData, players: shuffledPlayers, categoryName: gameData[0].categoryName, categoryOptions: gameData[0].categoryOptions };
            sessionStorage.setItem(GAME_SESSION_CACHE_KEY, JSON.stringify(gameToCache));
        } catch (e) { console.error("Failed to save game to session storage", e); }
    }

    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < MIN_LOADING_TIME_MS) {
        await new Promise(res => setTimeout(res, MIN_LOADING_TIME_MS - elapsedTime));
    }
    setStatus(GameStatus.Ranking);
  }, [supabase, fetchUserStreak]);
  
  const handlePlayAgain = () => {
    sessionStorage.removeItem(GAME_SESSION_CACHE_KEY);
    initializeGame();
  };

  useEffect(() => {
    if (!authIsLoading) {
      initializeGame();
    }
  }, [authIsLoading, initializeGame]);
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination || status !== GameStatus.Ranking) return;
    const items = Array.from(players);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setPlayers(items);
    setTimeout(() => {
        const isCorrect = items.every((player, index) => player.personId === correctOrder[index].personId);
        if (isCorrect) {
          setStatus(GameStatus.Guessing); 
        }
    }, 100);
  };
  
  const handleGuess = async (guess: string) => {
    const isCorrect = guess === categoryName;
    if (isCorrect) {
      const newStreak = currentStreak + 1;
      const newMax = Math.max(maxStreak, newStreak);
      const newCorrect = totalCorrect + 1;
      setEndedStreak(null);
      setCurrentStreak(newStreak);
      setMaxStreak(newMax);
      setTotalCorrect(newCorrect);
      setMessage(`Correct! The category was ${categoryName}.`);
      if (user) {
        await supabase.from('ranking_game_streaks').upsert({
          user_id: user.id, current_streak: newStreak, max_streak: newMax, is_active: true,
          total_correct: newCorrect, total_incorrect: totalIncorrect, updated_at: new Date().toISOString()
        });
      } else {
        writeGuestStreak({ current_streak: newStreak, max_streak: newMax, total_correct: newCorrect, total_incorrect: totalIncorrect });
      }
    } else {
      const newIncorrect = totalIncorrect + 1;
      setEndedStreak(currentStreak);
      setCurrentStreak(0);
      setTotalIncorrect(newIncorrect);
      setMessage(`Sorry, the correct category was ${categoryName}.`);
      if (user) {
        await supabase.from('ranking_game_streaks').upsert({
          user_id: user.id, current_streak: 0, is_active: false,
          total_correct: totalCorrect, total_incorrect: newIncorrect, updated_at: new Date().toISOString()
        });
      } else {
        writeGuestStreak({ current_streak: 0, max_streak: maxStreak, total_correct: totalCorrect, total_incorrect: newIncorrect });
      }
    }
    if (isDailyRound) markDailyPlayed('ranking');
    setStatus(GameStatus.Finished);
  };

  const totalGames = totalCorrect + totalIncorrect;
  const winPercentage = totalGames > 0 ? (totalCorrect / totalGames) * 100 : 0;
  
  const mainBgClasses = isDarkMode ? "bg-gray-800" : "bg-white";
  const mainTextClasses = isDarkMode ? "text-white" : "text-gray-800";
  const mutedTextClasses = isDarkMode ? "text-gray-400" : "text-gray-500";
  const statsContainerClasses = isDarkMode ? "bg-gray-700/50" : "bg-white/80 border border-gray-200";
  const cardIncorrectClasses = isDarkMode ? "bg-gray-900" : "bg-white border border-gray-300";
  const cardCorrectClasses = "bg-green-600 text-white";
  const cardCloseClasses = isDarkMode ? "bg-yellow-600 text-white" : "bg-yellow-400 text-white";
  const guessingButtonClasses = isDarkMode ? "bg-sky-700 hover:bg-sky-600" : "bg-sky-500 hover:bg-sky-600 text-white";
  const finishedCardClasses = isDarkMode ? "bg-gray-900" : "bg-white border border-gray-200";
  const playAgainButtonClasses = "bg-sky-500 dark:bg-sky-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-600 dark:hover:bg-sky-700 transition-colors";

  if (isDarkMode === null || authIsLoading || status === GameStatus.Loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center p-10 text-gray-700 dark:text-slate-100">Loading Game...</div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen rounded-lg ${mainBgClasses} border border-gray-200 dark:border-gray-700`}>
      <div className={`container mx-auto p-4 max-w-2xl ${mainTextClasses}`}>
        <h2 className="text-2xl font-bold text-center mb-2">Move the players into the correct ranking then guess the category</h2>
        <h2 className="text-sm font-bold text-center mb-2">Green means the player is in the correct ranking and yellow means they are one away</h2>
        <div className={`text-center mb-4 p-3 rounded-lg ${statsContainerClasses}`}>
          {isDailyRound && (
            <span className="inline-block mb-1 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/40 border border-sky-300 dark:border-sky-700 rounded-full px-3 py-0.5">
              Daily Challenge
            </span>
          )}
          {correctOrder.length > 0 && <p className="text-lg">{correctOrder[0].SeasonYear} Regular Season</p>}
          <div className="flex justify-center space-x-6">
              <p>Current Streak: {currentStreak}</p>
              <p>Max Streak: {maxStreak}</p>
          </div>
          {totalGames > 0 && (
            <div className={`text-sm mt-2 flex justify-center space-x-4 ${mutedTextClasses}`}>
              <span>W-L: {totalCorrect}-{totalIncorrect}</span>
              <span>Win %: {winPercentage.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {status === GameStatus.Ranking && (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="players">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {players.map((player, index) => (
                    <Draggable key={player.personId} draggableId={String(player.personId)} index={index}>
                      {(provided) => {
                        const correctIndex = correctOrder.findIndex(p => p.personId === player.personId);
                        const isCorrect = index === correctIndex;
                        const isClose = Math.abs(index - correctIndex) === 1;
                        
                        let itemClasses = cardIncorrectClasses;
                        if (isCorrect) itemClasses = cardCorrectClasses;
                        else if (isClose) itemClasses = cardCloseClasses;

                        return (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 rounded-lg flex items-center justify-between transition-colors duration-300 ${itemClasses}`}
                          >
                            <span className="text-2xl font-bold mr-4">{index + 1}</span>
                            <span className="text-xl">{player.firstName} {player.lastName}</span>
                          </div>
                        );
                      }}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {status === GameStatus.Guessing && (
          <div className="text-center mt-6">
            <h2 className="text-2xl font-bold mb-4">What was the hidden category?</h2>
            <div className="grid grid-cols-2 gap-4">
              {categoryOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleGuess(option)}
                  className={`p-4 rounded-lg text-lg font-semibold transition-colors ${guessingButtonClasses}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === GameStatus.Finished && (
          <div className="text-center mt-6 animate-fadeIn">
            <p className="text-xl font-semibold mb-4">{message}</p>
            {correctOrder.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {correctOrder.map((player, index) => (
                        <div key={player.personId} className={`p-3 rounded-lg ${finishedCardClasses}`}>
                            <p className="font-bold text-lg">{index + 1}. {player.firstName} {player.lastName}</p>
                            <p className="text-md">{player.statValue.toFixed(2)} {categoryName}</p>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
              {(() => {
                const shareStreak = message.startsWith('Correct') ? currentStreak : endedStreak ?? 0;
                return shareStreak > 0 ? (
                  <ShareResult
                    shareText={buildStreakShare({
                      gameLabel: 'the NBA Ranking Game',
                      streak: shareStreak,
                      url: 'hoopsdata.net/games/ranking-game',
                    })}
                    game="ranking_game"
                    surface="game_end"
                    className="bg-green-500 hover:bg-green-600 dark:bg-[rgb(60,192,103)] dark:hover:bg-green-400 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  />
                ) : null;
              })()}
              <button onClick={handlePlayAgain} className={playAgainButtonClasses}>
                Play Again
              </button>
            </div>
            {isDailyRound && (
              <div className="mt-8 w-full max-w-3xl mx-auto px-4 border-t border-gray-200 dark:border-gray-700 pt-8 text-left">
                <DailyChallengesStrip className="" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}