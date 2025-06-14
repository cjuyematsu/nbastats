// app/games/six-degrees/[pageId]/page.tsx
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';

type AdjacencyList = {
  [playerId: string]: number[];
};

type GamePuzzle = {
  player_a_id: number;
  player_a_name: string;
  player_b_id: number;
  player_b_name: string;
  solution_path_ids: number[];
  solution_path_names: string[];
  game_date?: string;
};

type Guess = {
    id: number;
    name: string;
};

type DailyScore = {
    is_successful: boolean;
    guess_count: number;
    solution_path_names: string[] | null;
};

type PlayerSuggestion = {
    personId: number;
    firstName: string | null; 
    lastName: string | null;
  };

type GameStatus = 'loading' | 'playing' | 'won' | 'lost' | 'error' | 'already_played';
function debounce<Args extends unknown[]>(func: (...args: Args) => void, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Args) => {
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced;
}

function PlayerInput({ 
  onSelect, 
  placeholder, 
  disabled 
}: { 
  onSelect: (player: Guess) => void;
  placeholder: string;
  disabled: boolean;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{id: number, name: string}[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const searchPlayers = async (searchTerm: string) => {
        if (searchTerm.length < 2) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const { data, error } = await supabase.rpc('get_player_suggestions', {
                search_term: searchTerm
            });
            if (error) throw error;
            const formattedResults = data.map((p: PlayerSuggestion) => ({
                id: p.personId,
                name: `${p.firstName} ${p.lastName}`
            }));
            setResults(formattedResults);
            setIsOpen(true);
        } catch (error) {
            console.error("Error searching players:", error);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };
    
    const debouncedSearch = useCallback(debounce(searchPlayers, 300), []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        debouncedSearch(newQuery);
    };
    
    const handleSelect = (player: Guess) => {
        if(disabled) return;
        onSelect(player);
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full">
            <input 
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => query.length > 2 && setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder={placeholder}
                disabled={disabled}
                className="bg-slate-700 p-3 rounded w-full text-center text-white placeholder-gray-400 disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-lg"
                autoComplete="off"
            />
            {isOpen && (
                <ul className="absolute z-10 w-full bg-slate-600 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {isSearching ? (
                         <li className="px-3 py-2 text-sm text-gray-400">Searching...</li>
                    ) : results.length > 0 ? (
                        results.map(player => (
                            <li 
                                key={player.id} 
                                onMouseDown={() => handleSelect(player)}
                                className="px-3 py-2 text-sm text-white hover:bg-sky-700 cursor-pointer"
                            >
                                {player.name}
                            </li>
                        ))
                    ) : query.length > 2 ? (
                        <li className="px-3 py-2 text-sm text-gray-400">No players found.</li>
                    ) : null}
                </ul>
            )}
        </div>
    );
}

function SixDegreesGameContent() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.pageId as string;
    const { user, isLoading: authIsLoading } = useAuth();

    const [puzzle, setPuzzle] = useState<GamePuzzle | null>(null);
    const [adjacencyList, setAdjacencyList] = useState<AdjacencyList | null>(null);
    
    const MAX_GUESSES = 6;
    const [path, setPath] = useState<Guess[]>([]);
    const [guessHistory, setGuessHistory] = useState<Guess[]>([]);
    const [gameStatus, setGameStatus] = useState<GameStatus>('loading');
    const [feedbackMessage, setFeedbackMessage] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [priorPlayResult, setPriorPlayResult] = useState<DailyScore | null>(null);

    const resetGameState = useCallback(() => {
        setPath([]);
        setGuessHistory([]);
        setFeedbackMessage('');
        setPuzzle(null);
        setPriorPlayResult(null);
        setGameStatus('loading');
    }, []);

    const saveDailyResult = useCallback(async (isSuccess: boolean, finalPath: Guess[]) => {
        if (!user || gameId !== 'daily' || !puzzle?.game_date) {
            return;
        }
        const completePathForSave = [...finalPath, { id: puzzle.player_b_id, name: puzzle.player_b_name }];
        const { error } = await supabase.from('six_degrees_scores').insert({
            user_id: user.id,
            game_date: puzzle.game_date,
            is_successful: isSuccess,
            guess_count: finalPath.length - 1,
            solution_path_names: puzzle.solution_path_names,
            guessed_path_names: completePathForSave.map(p => p.name)
        });
        if (error) console.error("Error saving daily game score:", error);
    }, [user, gameId, puzzle]);


    useEffect(() => {
        async function loadAdjacencyList() {
            try {
                const response = await fetch('/adjacency_list.json');
                if (!response.ok) throw new Error("Failed to fetch adjacency list");
                setAdjacencyList(await response.json());
                console.log("Adjacency list loaded.");
            } catch {
                setGameStatus('error');
                setErrorMsg("Could not load game engine data.");
            }
        }
        loadAdjacencyList();
    }, []);

    useEffect(() => {
        const initializeGame = async () => {
            if (!adjacencyList || authIsLoading) {
                return;
            }
    
            resetGameState();
            setGameStatus('loading');
            
            try {
                let gameData: GamePuzzle | null = null;
    
                if (gameId === 'daily') {
                    console.log("[DEBUG] Daily game logic started.");
    
                    if (user) {
                        const { data: priorPlay, error: priorPlayError } = await supabase
                            .from('six_degrees_scores')
                            .select('*')
                            .eq('user_id', user.id)
                            .eq('game_date', new Date().toLocaleDateString('en-CA', {timeZone: 'America/Los_Angeles'}))
                            .single();
                        
                        if (priorPlayError && priorPlayError.code !== 'PGRST116') throw priorPlayError;
                        
                        if (priorPlay) {
                            console.log("[DEBUG] User has already played today.");
                            setPriorPlayResult(priorPlay as DailyScore);
                            setGameStatus('already_played');
                            return; 
                        }
                    }
                    
                    console.log("[DEBUG] Fetching daily puzzle from DB table for today (PST)...");
                    const { data, error } = await supabase
                        .from('daily_connection_games')
                        .select('*')
                        .eq('game_date', new Date().toLocaleDateString('en-CA', {timeZone: 'America/Los_Angeles'}))
                        .single();
    
                    if (error && error.code !== 'PGRST116') throw error;
                    gameData = data;
                    if (!gameData) throw new Error("No daily game found for today. Please check back tomorrow.");
                
                } else { 
                    console.log("[DEBUG] Random game logic started.");
                    const { data, error } = await supabase.rpc('generate_connection_game', { is_daily: false }).single();
                    if (error) throw error;
                    gameData = data;
                }
                
                if (gameData && gameData.player_a_id) {
                    setPuzzle(gameData);
                    setPath([{ id: gameData.player_a_id, name: gameData.player_a_name }]);
                    setGameStatus('playing');
                } else {
                     throw new Error("Could not retrieve a valid puzzle.");
                }
            } catch (error) {
                console.error("Error loading game puzzle:", error);
                setGameStatus('error');
            }
        };
    
        initializeGame();
    }, [gameId, adjacencyList, user, authIsLoading, resetGameState, router]);

    const handleGuess = (guessedPlayer: Guess) => {
        if (gameStatus !== 'playing' || !puzzle || !adjacencyList) return;

        const newGuessHistory = [...guessHistory, guessedPlayer];
        setGuessHistory(newGuessHistory);

        const lastPlayerInPath = path[path.length - 1];
        const teammatesOfLastPlayer = adjacencyList[lastPlayerInPath.id] || [];

        if (teammatesOfLastPlayer.includes(guessedPlayer.id)) {
            const newPath = [...path, guessedPlayer];
            setPath(newPath);
            
            const finalLinkTeammates = adjacencyList[guessedPlayer.id] || [];
            if (finalLinkTeammates.includes(puzzle.player_b_id)) {
                setGameStatus('won');
                setFeedbackMessage(`Success! You found a path in ${newPath.length - 1} link(s).`);
                saveDailyResult(true, newPath);
            } else {
                setFeedbackMessage(`Correct! Now find a teammate of ${guessedPlayer.name}.`);
                if (newGuessHistory.length >= MAX_GUESSES) {
                    setGameStatus('lost');
                    setFeedbackMessage('You ran out of guesses!');
                    saveDailyResult(false, newGuessHistory);
                }
            }
        } else {
            setFeedbackMessage(`Incorrect. ${guessedPlayer.name} was not a teammate of ${lastPlayerInPath.name}.`);
            if (newGuessHistory.length >= MAX_GUESSES) {
                setGameStatus('lost');
                saveDailyResult(false, newGuessHistory);
            }
        }
    };
    
    if (gameStatus === 'loading' || authIsLoading) {
        return <div className="flex justify-center items-center min-h-screen text-slate-300"><p className="text-xl">Loading Game...</p></div>;
    }
    if (gameStatus === 'error') {
        return <div className="flex justify-center items-center min-h-screen text-red-400"><p>Error: {errorMsg}</p></div>;
    }

    if (gameStatus === 'already_played') {
        return (
             <div className="w-full bg-gray-800 rounded-lg shadow-2xl p-4 text-center text-white">
                <h1 className="text-3xl font-bold text-sky-400 mb-6">Daily Challenge Complete</h1>
                    
                {priorPlayResult ? (
                     <div className="text-left p-4 bg-slate-700/50 rounded-lg">
                        <h3 className="text-center text-xl font-bold text-slate-200 mb-3">Today&apos;s Result</h3>
                        {priorPlayResult.is_successful ? (
                            <p className="text-green-400 text-center font-bold">
                                Solved in {priorPlayResult.guess_count} {priorPlayResult.guess_count > 1 ? 'links' : 'link'}!
                            </p>
                        ) : (
                            <p className="text-red-400 text-center font-bold">
                                You didn&apos;t solve it in {MAX_GUESSES} guesses.
                            </p>
                        )}
                         <p className="text-xs text-slate-400 mt-2 text-center">
                           Solution: {priorPlayResult.solution_path_names?.join(' → ')}
                        </p>
                    </div>
                ) : (
                    <p className="my-8">Your previous result could not be loaded.</p>
                )}
    
                <button onClick={() => router.push('/games/six-degrees')} className="mt-8 px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold">
                    Back to Lobby
                </button>
            </div>
        );
    }

    if (!puzzle) {
        return <div className="flex justify-center items-center min-h-screen text-slate-300"><p>Could not load puzzle data.</p></div>;
    }

    const nextPlayerToGuessFor = path.length > 0 ? path[path.length - 1] : null;

    return (
        <div className="w-full min-h-screen bg-gray-800 rounded-lg shadow-2xl">
        <div className="container mx-auto p-4 text-center max-w-lg text-white">
            <h1 className="text-3xl font-bold mb-4">Six Degrees of NBA</h1>
            <p className="mb-4">Connect <span className="font-bold text-sky-400">{puzzle.player_a_name}</span> to <span className="font-bold text-sky-400">{puzzle.player_b_name}</span>.</p>
            <p className="mb-8 font-bold text-xl">Guesses Remaining: <span className={MAX_GUESSES - guessHistory.length <= 2 ? 'text-red-500' : 'text-sky-400'}>{MAX_GUESSES - guessHistory.length}</span></p>

            <div className="space-y-4 mb-6">
                {path.map((player, index) => (
                     <div key={`${player.id}-${index}`} className="flex flex-col items-center">
                        <div className="w-full p-4 bg-slate-800 rounded-lg shadow-lg">
                            <p className="text-sm text-sky-400">{index === 0 ? 'Start Player' : `Link #${index}`}</p>
                            <p className="text-2xl font-bold">{player.name}</p>
                        </div>
                        {gameStatus === 'playing' && index < path.length - 1 && (
                            <span className="text-2xl text-green-400 transform rotate-90 leading-none -my-1.5">→</span>
                        )}
                    </div>
                ))}
                
                {gameStatus === 'playing' && nextPlayerToGuessFor && (
                    <div className="flex flex-col items-center">
                         <span className="text-2xl text-gray-400 transform rotate-90 leading-none -my-1.5">→</span>
                         <div className="w-full">
                            <PlayerInput 
                                placeholder={`Find a teammate of ${nextPlayerToGuessFor.name}...`}
                                onSelect={handleGuess}
                                disabled={false}
                            />
                         </div>
                    </div>
                )}
                
                <div className="p-4 bg-slate-800 rounded-lg shadow-lg mt-4">
                    <p className="text-sm text-sky-400">End Player</p>
                    <p className="text-2xl font-bold">{puzzle.player_b_name}</p>
                </div>
            </div>

            <div className="h-7 my-4">
                {feedbackMessage && <p className={`text-lg font-bold ${feedbackMessage.startsWith('Correct') ? 'text-green-400' : 'text-red-400'}`}>{feedbackMessage}</p>}
            </div>

            {gameStatus === 'playing' && (
                <div className="mt-6">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-bold"
                    >
                        Back
                    </button>
                </div>
            )}

             {(gameStatus === 'won' || gameStatus === 'lost') && (
                 <div className={`mt-6 p-4 rounded-lg ${gameStatus === 'won' ? 'bg-green-900/50 border border-green-500' : 'bg-red-900/50 border border-red-500'}`}>
                     <h2 className={`text-2xl font-bold ${gameStatus === 'won' ? 'text-green-300' : 'text-red-300'}`}>
                         {gameStatus === 'won' ? `You Won!` : 'Game Over!'}
                     </h2>
                     {gameStatus === 'won' && <p className="mt-2">Your Path: {[...path, { id: puzzle.player_b_id, name: puzzle.player_b_name }].map(p => p.name).join(' → ')}</p>}
                     {gameStatus === 'lost' && <p className="mt-2">A possible solution was: {puzzle.solution_path_names.join(' → ')}</p>}
                      <button onClick={() => router.push('/games/six-degrees')} className="mt-4 px-6 py-2 bg-sky-600 rounded-lg text-white font-bold">
                          Back
                      </button>
                 </div>
             )}
        </div>
        </div>
    );
}

export default function SixDegreesGameLoader() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-white"><p className="text-xl">Loading Game...</p></div>}>
            <SixDegreesGameContent />
        </Suspense>
    );
}