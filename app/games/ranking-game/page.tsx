//app/games/ranking-game/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAuth } from '@/app/contexts/AuthContext'; 
import { PostgrestError } from '@supabase/supabase-js';

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

  const fetchUserStreak = useCallback(async () => {
    if (!user) {
        setCurrentStreak(0);
        setMaxStreak(0);
        setTotalCorrect(0);
        setTotalIncorrect(0);
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

    const cachedGameDataString = sessionStorage.getItem(GAME_SESSION_CACHE_KEY);
    if (cachedGameDataString) {
        try {
            const cachedGame = JSON.parse(cachedGameDataString);
            if (cachedGame.players && cachedGame.correctOrder) {
                console.log("Loading game board from session cache.");
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
        } catch (e) {
            console.error("Failed to save game to session storage", e);
        }
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
      setCurrentStreak(newStreak);
      setMaxStreak(newMax);
      setTotalCorrect(newCorrect);
      setMessage(`Correct! The category was ${categoryName}.`);
      if (user) {
        await supabase.from('ranking_game_streaks').upsert({
          user_id: user.id, current_streak: newStreak, max_streak: newMax, is_active: true,
          total_correct: newCorrect, total_incorrect: totalIncorrect, updated_at: new Date().toISOString()
        });
      }
    } else {
      const newIncorrect = totalIncorrect + 1;
      setCurrentStreak(0);
      setTotalIncorrect(newIncorrect);
      setMessage(`Sorry, the correct category was ${categoryName}.`);
      if (user) {
        await supabase.from('ranking_game_streaks').upsert({
          user_id: user.id, current_streak: 0, is_active: false,
          total_correct: totalCorrect, total_incorrect: newIncorrect, updated_at: new Date().toISOString()
        });
      }
    }
    setStatus(GameStatus.Finished);
  };
  
  const totalGames = totalCorrect + totalIncorrect;
  const winPercentage = totalGames > 0 ? (totalCorrect / totalGames) * 100 : 0;

  if (status === GameStatus.Loading || authIsLoading) {
    return <div className="w-full bg-gray-800 rounded-lg shadow-2xl flex flex-col items-center justify-center min-h-screen text-slate-100">
      <div className="text-center p-10">Loading Game...</div>
    </div>
  }
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-2xl">
    <div className="container mx-auto p-4 text-white max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-2">Move the players into the correct ranking then guess the category</h1>
      <h2 className="text-sm font-bold text-center mb-2">Green means the player is in the correct ranking and yellow means they are one away</h2>
      <div className="text-center mb-4 p-3 bg-gray-700/50 rounded-lg">
        {correctOrder.length > 0 && <p className="text-lg">{correctOrder[0].SeasonYear} Regular Season</p>}
        <div className="flex justify-center space-x-6">
            <p>Current Streak: {currentStreak}</p>
            {user && <p>Max Streak: {maxStreak}</p>}
        </div>
        {user && totalGames > 0 && (
          <div className="text-sm mt-2 text-gray-400 flex justify-center space-x-4">
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
                      let bgColor = 'bg-gray-900';
                      if (isCorrect) bgColor = 'bg-green-700';
                      else if (isClose) bgColor = 'bg-yellow-600';
                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-4 rounded-lg flex items-center justify-between transition-colors ${bgColor}`}
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
                className="p-4 bg-sky-700 rounded-lg text-lg font-semibold hover:bg-sky-600 transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === GameStatus.Finished && (
        <div className="text-center mt-6">
          <p className="text-xl font-semibold mb-4">{message}</p>
          {correctOrder.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {correctOrder.map((player, index) => (
                      <div key={player.personId} className="p-3 bg-gray-900 rounded-lg">
                          <p className="font-bold text-lg">{index + 1}. {player.firstName} {player.lastName}</p>
                          <p className="text-md">{player.statValue.toFixed(2)} {categoryName}</p>
                      </div>
                  ))}
              </div>
          )}
          <button
            onClick={handlePlayAgain}
            className="mt-6 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-500 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
    </div>
  );
}