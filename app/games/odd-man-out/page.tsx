'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext'; 

// Player interface no longer needs personId
interface Player {
  FirstName: string;
  LastName: string;
}

// Updated GameData to expect a string name for the odd man out
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

export default function OddManOutGame() {
  const { supabase } = useAuth();

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.Loading);
  const [userGuessName, setUserGuessName] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState('');

  const fetchNewRound = useCallback(async () => {
    setStatus(GameStatus.Loading);
    setUserGuessName(null);
    setMessage('');

    const { data, error } = await supabase.rpc('get_odd_man_out_game_data');
    
    if (error || !data || data.length === 0) {
      console.error('Failed to fetch game data:', error);
      return;
    }
    
    setGameData(data[0]);
    setStatus(GameStatus.Playing);
  }, [supabase]);

  useEffect(() => {
    fetchNewRound();
  }, [fetchNewRound]);

  const handleGuess = (guessedPlayer: Player) => {
    if (status !== GameStatus.Playing) return;

    const guessedPlayerName = `${guessedPlayer.FirstName} ${guessedPlayer.LastName}`;
    setUserGuessName(guessedPlayerName);
    setStatus(GameStatus.Answered);

    // Compare the guessed full name with the correct full name
    if (guessedPlayerName === gameData?.oddManOutName) {
      setStreak(prev => prev + 1);
      setMessage(`Correct! The connection was ${gameData?.connectionName}.`);
    } else {
      setStreak(0);
      setMessage(`The connection was ${gameData?.connectionName}.`);
    }
  };

  if (status === GameStatus.Loading || !gameData) {
    return <div className="text-center p-10">Loading New Round...</div>;
  }

  return (
    <div className="container mx-auto p-4 text-white max-w-3xl text-center">
      <h1 className="text-3xl font-bold mb-2">Odd Man Out</h1>
      <p className="text-lg mb-2">Three of these players played for the same program prior to being drafted. Pick the odd one out... </p>
      <p className="font-bold text-xl text-yellow-400 mb-6">Current Streak: {streak}</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {gameData.players.map((player, index) => {
          const playerName = `${player.FirstName} ${player.LastName}`;
          const isCorrect = playerName === gameData.oddManOutName;
          const isGuessed = playerName === userGuessName;
          
          let cardClass = 'bg-sky-700 hover:bg-sky-600';

          if (status === GameStatus.Answered) {
            if (isCorrect) {
              cardClass = 'bg-green-600 scale-105';
            } else if (isGuessed) {
              cardClass = 'bg-red-600';
            } else {
              cardClass = 'bg-gray-700 opacity-60';
            }
          }
          
          return (
            <button
              // Use the player's full name as the key for uniqueness
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

      {status === GameStatus.Answered && (
        <div className="mt-8 animate-fade-in">
          <p className="text-2xl font-bold mb-4">{message}</p>
          <button
            onClick={fetchNewRound}
            className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-500 transition-colors text-xl"
          >
            Next Round
          </button>
        </div>
      )}
    </div>
  );
}