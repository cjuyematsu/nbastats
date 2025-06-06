'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAuth } from '@/app/contexts/AuthContext'; 

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

export default function RankingGame() {
  const { supabase } = useAuth(); 

  const [status, setStatus] = useState<GameStatus>(GameStatus.Loading);
  const [players, setPlayers] = useState<Player[]>([]);
  const [correctOrder, setCorrectOrder] = useState<Player[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  const fetchNewGame = async () => {
    setStatus(GameStatus.Loading);
    
    const { data, error } = await supabase.rpc('get_ranking_game_data');

    if (error || !data || data.length < 3) {
      console.error("Failed to fetch game data:", error);
      setStatus(GameStatus.Finished);
      setMessage("Could not load a new game. Please try again later.");
      return;
    }
    
    const gameData = data.map((p: GameDataRow) => ({
      ...p,
      lastName: p.lastName || '', 
    }));

    setCorrectOrder(gameData);
    setPlayers([...gameData].sort(() => Math.random() - 0.5)); 
    setCategoryName(gameData[0].categoryName);
    setCategoryOptions(gameData[0].categoryOptions);
    setStatus(GameStatus.Ranking);
    setMessage('');
  };

  useEffect(() => {
    fetchNewGame();
  }, []);
  

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || status !== GameStatus.Ranking) return;

    const items = Array.from(players);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPlayers(items);

    const isCorrect = items.every((player, index) => player.personId === correctOrder[index].personId);
    if (isCorrect) {
      const finalScore = items.reduce((acc, player, index) => {
        return acc + (player.personId === correctOrder[index].personId ? 1 : 0);
      }, 0);
      setScore(finalScore * 10 / players.length);
      
      setTimeout(() => setStatus(GameStatus.Guessing), 1000); 
    }
  };
  
  /**
   * Handles the user's guess for the stat category.
   */
  const handleGuess = (guess: string) => {
    if (guess === categoryName) {
      setStreak(prev => prev + 1);
      setMessage(`Correct! The category was ${categoryName}.`);
    } else {
      setStreak(0);
      setMessage(`Sorry, the correct category was ${categoryName}.`);
    }
    setStatus(GameStatus.Finished);
  };
  
  // Render loading state
  if (status === GameStatus.Loading) {
    return <div className="text-center p-10">Loading New Game...</div>;
  }
  
  return (
    <div className="container mx-auto p-4 text-white max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-2">Move the players into the correct ranking then guess the category</h1>
      <h2 className="text-sm font-bold text-center mb-2">Green means the player is in the correct ranking and yellow means they are one away</h2>
      <div className="text-center mb-4">
        <p className="text-lg">{correctOrder[0]?.SeasonYear} Regular Season</p>
        <p>Current Streak: {streak}</p>
        {status === GameStatus.Finished && <p className="font-bold text-xl">Score: {score.toFixed(0)}/10</p>}
      </div>

      {/* --- RANKING STAGE --- */}
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
                      const isLocked = status !== GameStatus.Ranking && isCorrect;

                      let bgColor = 'bg-gray-800';
                      if (isCorrect) bgColor = 'bg-green-700';
                      else if (isClose) bgColor = 'bg-yellow-600';

                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-4 rounded-lg flex items-center justify-between transition-colors ${bgColor} ${isLocked ? 'opacity-70' : ''}`}
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

      {/* --- GUESSING STAGE --- */}
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

      {/* --- FINISHED STAGE --- */}
      {status === GameStatus.Finished && (
        <div className="text-center mt-6">
          <p className="text-xl font-semibold mb-4">{message}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {correctOrder.map((player, index) => (
              <div key={player.personId} className="p-3 bg-gray-700 rounded-lg">
                <p className="font-bold text-lg">{index + 1}. {player.firstName} {player.lastName}</p>
                <p className="text-md">{player.statValue.toFixed(2)} {categoryName}</p>
              </div>
            ))}
          </div>
          <button
            onClick={fetchNewGame}
            className="mt-6 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-500 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}