//app/games/odd-man-out/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext'; 

interface Player {
  FirstName: string;
  LastName: string;
}

interface GameData {
  players: Player[];
  oddManOutName: string;
  connectionName: string;
}

enum GameStatus {
  Loading,
  Playing,
  Answered,
}

const GAME_SESSION_CACHE_KEY = 'oddManOutGameSession_v1';
const MIN_LOADING_TIME_MS = 400;

export default function OddManOutGame() {
  const { supabase, user, isLoading: authIsLoading } = useAuth(); 

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.Loading);
  const [userGuessName, setUserGuessName] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalIncorrect, setTotalIncorrect] = useState(0);

  const fetchUserStreak = useCallback(async () => {
    if (!user) {
        setCurrentStreak(0);
        setMaxStreak(0);
        setTotalCorrect(0);
        setTotalIncorrect(0);
        return;
    }
    const { data } = await supabase
      .from('odd_man_out_streaks')
      .select('current_streak, max_streak, total_correct, total_incorrect')
      .eq('user_id', user.id)
      .single();
      
    if (data) {
      const { data: dataWithActive } = await supabase
        .from('odd_man_out_streaks')
        .select('current_streak, max_streak, is_active, total_correct, total_incorrect')
        .eq('user_id', user.id)
        .single();

      if (dataWithActive) {
          setCurrentStreak(dataWithActive.is_active ? dataWithActive.current_streak : 0);
          setMaxStreak(dataWithActive.max_streak);
          setTotalCorrect(dataWithActive.total_correct);
          setTotalIncorrect(dataWithActive.total_incorrect);
      }
    }
  }, [user, supabase]);

  const initializeGame = useCallback(async () => {
    setStatus(GameStatus.Loading);
    const startTime = Date.now();
    
    setUserGuessName(null);
    setMessage('');

    await fetchUserStreak();

    let gameLoadedFromCache = false;
    const cachedDataString = sessionStorage.getItem(GAME_SESSION_CACHE_KEY);
    if (cachedDataString) {
        try {
            const cachedData = JSON.parse(cachedDataString) as GameData;
            if (cachedData.players && cachedData.oddManOutName) {
                setGameData(cachedData);
                gameLoadedFromCache = true;
            }
        } catch (e) {
            console.error("Clearing corrupted game cache.", e);
            sessionStorage.removeItem(GAME_SESSION_CACHE_KEY);
        }
    }

    if (!gameLoadedFromCache) {
        const { data, error } = await supabase.rpc('get_odd_man_out_game_data');
        if (error || !data || !data[0]) {
            setMessage('Could not load a new round. Please try again later.');
            setStatus(GameStatus.Answered);
            setGameData(null);
            return;
        }
        
        const newGameData = data[0] as GameData;
        setGameData(newGameData);
        sessionStorage.setItem(GAME_SESSION_CACHE_KEY, JSON.stringify(newGameData));
    }
    
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < MIN_LOADING_TIME_MS) {
        await new Promise(res => setTimeout(res, MIN_LOADING_TIME_MS - elapsedTime));
    }
    
    setStatus(GameStatus.Playing);

  }, [supabase, fetchUserStreak]);

  const handleNextRound = () => {
      sessionStorage.removeItem(GAME_SESSION_CACHE_KEY);
      initializeGame();
  };

  useEffect(() => {
    if (!authIsLoading) {
        initializeGame();
    }
  }, [authIsLoading, initializeGame]);

  const handleGuess = async (guessedPlayer: Player) => {
    if (status !== GameStatus.Playing || !gameData) return;
    const guessedPlayerName = `${guessedPlayer.FirstName} ${guessedPlayer.LastName}`;
    setUserGuessName(guessedPlayerName);
    setStatus(GameStatus.Answered);
    const isCorrect = guessedPlayerName === gameData.oddManOutName;
    
    if (isCorrect) {
      const newStreak = currentStreak + 1;
      const newMax = Math.max(maxStreak, newStreak);
      const newCorrect = totalCorrect + 1;
      setCurrentStreak(newStreak);
      setMaxStreak(newMax);
      setTotalCorrect(newCorrect);
      setMessage(`Correct! The connection was ${gameData.connectionName}.`);
      if (user) {
        await supabase.from('odd_man_out_streaks').upsert({
          user_id: user.id, current_streak: newStreak, max_streak: newMax, is_active: true,
          total_correct: newCorrect, total_incorrect: totalIncorrect, updated_at: new Date().toISOString()
        });
      }
    } else {
      const newIncorrect = totalIncorrect + 1;
      setCurrentStreak(0);
      setTotalIncorrect(newIncorrect);
      setMessage(`The connection was ${gameData.connectionName}.`);
      if (user) {
        await supabase.from('odd_man_out_streaks').upsert({
          user_id: user.id, current_streak: 0, is_active: false,
          total_correct: totalCorrect, total_incorrect: newIncorrect, updated_at: new Date().toISOString()
        });
      }
    }
  };

  const totalGames = totalCorrect + totalIncorrect;
  const winPercentage = totalGames > 0 ? (totalCorrect / totalGames) * 100 : 0;
  
  if (status === GameStatus.Loading || authIsLoading) {
    return <div className="w-full bg-gray-800 rounded-lg shadow-2xl flex flex-col items-center justify-center min-h-screen text-slate-100">
    <div className="text-center p-10">Loading New Round...</div></div>
  }

  return (
    <div className="w-full min-h-screen bg-gray-800 rounded-lg shadow-2xl p-4 text-white text-center flex flex-col">
      
      <div className="flex-grow flex flex-col items-center justify-center w-full py-4">

        <div>
            <h1 className="text-3xl font-bold mb-2">Odd Man Out</h1>
            <p className="text-lg mb-2">Three of these players played for the same program prior to being drafted. Pick the odd one out... </p>
            
            <div className="text-center p-3 mb-4">
            <div className="font-bold text-xl text-yellow-400 flex justify-center space-x-6">
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
        </div>
      
        {gameData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-5xl mt-4">
            {gameData.players.map((player, index) => {
              const playerName = `${player.FirstName} ${player.LastName}`;
              const isOddManOut = playerName === gameData.oddManOutName;
              const isGuessed = playerName === userGuessName;
              let cardClass = 'bg-sky-700 hover:bg-sky-600';
              if (status === GameStatus.Answered) {
                if (isGuessed && !isOddManOut) { cardClass = 'bg-red-600'; } 
                else if (isOddManOut) { cardClass = 'bg-green-600 scale-105'; } 
                else { cardClass = 'bg-gray-700 opacity-60'; }
              }
              return (
                <button
                  key={playerName + index}
                  onClick={() => handleGuess(player)}
                  disabled={status === GameStatus.Answered}
                  className={`p-4 rounded-lg shadow-lg text-center transform transition-all duration-300 ${cardClass}`}
                >
                  <p className="text-xl font-bold">{player.FirstName}</p>
                  <p className="text-xl font-bold">{player.LastName}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-28 flex items-center justify-center">
        {status === GameStatus.Answered && (
          <div className="animate-fade-in">
            <p className="text-2xl font-bold mb-4">{message}</p>
            <button
              onClick={handleNextRound}
              className="bg-sky-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-sky-700 transition-colors text-xl"
            >
              Next Round
            </button>
          </div>
        )}
      </div>
    </div>
  );
}