//app/six-degrees/[pageId]/page.tsx

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
  disabled,
  isDarkMode
}: { 
  onSelect: (player: Guess) => void;
  placeholder: string;
  disabled: boolean;
  isDarkMode: boolean;
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

    const inputClasses = isDarkMode
        ? "bg-slate-700 text-white placeholder-gray-400 disabled:bg-slate-800 disabled:text-gray-500"
        : "bg-white text-gray-800 placeholder-gray-500 border border-sky-300 disabled:bg-gray-100 disabled:text-gray-400";

    const dropdownClasses = isDarkMode 
        ? "bg-slate-600 text-white"
        : "bg-white text-gray-800 border border-sky-200";
    
    const dropdownItemClasses = isDarkMode
        ? "text-white hover:bg-sky-700"
        : "text-gray-800 hover:bg-sky-100";
    
    const mutedTextClasses = isDarkMode ? "text-gray-400" : "text-gray-500";


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
                className={`p-3 rounded w-full text-center disabled:cursor-not-allowed text-lg ${inputClasses}`}
                autoComplete="off"
            />
            {isOpen && (
                <ul className={`absolute z-10 w-full rounded-md shadow-lg max-h-48 overflow-y-auto mt-1 ${dropdownClasses}`}>
                    {isSearching ? (
                         <li className={`px-3 py-2 text-sm ${mutedTextClasses}`}>Searching...</li>
                    ) : results.length > 0 ? (
                        results.map(player => (
                            <li 
                                key={player.id} 
                                onMouseDown={() => handleSelect(player)}
                                className={`px-3 py-2 text-sm cursor-pointer ${dropdownItemClasses}`}
                            >
                                {player.name}
                            </li>
                        ))
                    ) : query.length > 2 ? (
                        <li className={`px-3 py-2 text-sm ${mutedTextClasses}`}>No players found.</li>
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
    
    const SESSION_STORAGE_KEY = `sixDegreesGameState_${gameId}`;

    const [puzzle, setPuzzle] = useState<GamePuzzle | null>(null);
    const [adjacencyList, setAdjacencyList] = useState<AdjacencyList | null>(null);
    
    const MAX_GUESSES = 6;
    const [path, setPath] = useState<Guess[]>([]);
    const [guessHistory, setGuessHistory] = useState<Guess[]>([]);
    const [gameStatus, setGameStatus] = useState<GameStatus>('loading');
    const [feedbackMessage, setFeedbackMessage] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [priorPlayResult, setPriorPlayResult] = useState<DailyScore | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);
    
    useEffect(() => {
        if (gameStatus === 'playing' && puzzle) {
            const gameStateToSave = { puzzle, path, guessHistory, feedbackMessage };
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(gameStateToSave));
        }
    }, [path, guessHistory, feedbackMessage, puzzle, gameStatus, SESSION_STORAGE_KEY]);

    const resetGameState = useCallback(() => {
        setPath([]);
        setGuessHistory([]);
        setFeedbackMessage('');
        setPuzzle(null);
        setPriorPlayResult(null);
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
            
            setGameStatus('loading');
            
            if (gameId === 'daily' && user) {
                const { data: priorPlay, error: priorPlayError } = await supabase
                    .from('six_degrees_scores')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('game_date', new Date().toLocaleDateString('en-CA', {timeZone: 'America/Los_Angeles'}))
                    .single();
                
                if (priorPlayError && priorPlayError.code !== 'PGRST116') throw priorPlayError;
                
                if (priorPlay) {
                    setPriorPlayResult(priorPlay as DailyScore);
                    setGameStatus('already_played');
                    sessionStorage.removeItem(SESSION_STORAGE_KEY); 
                    return; 
                }
            }
            
            const savedStateJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (savedStateJSON) {
                try {
                    const savedState = JSON.parse(savedStateJSON);
                    if (savedState.puzzle && savedState.path) {
                        setPuzzle(savedState.puzzle);
                        setPath(savedState.path);
                        setGuessHistory(savedState.guessHistory);
                        setFeedbackMessage(savedState.feedbackMessage || '');
                        setGameStatus('playing');
                        return;
                    }
                } catch (e) {
                    console.error("Error restoring game state:", e);
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                }
            }

            resetGameState();
            try {
                let gameData: GamePuzzle | null = null;
    
                if (gameId === 'daily') {
                    const { data, error } = await supabase
                        .from('daily_connection_games')
                        .select('*')
                        .eq('game_date', new Date().toLocaleDateString('en-CA', {timeZone: 'America/Los_Angeles'}))
                        .single();
    
                    if (error && error.code !== 'PGRST116') throw error;
                    gameData = data;
                    if (!gameData) throw new Error("No daily game found for today. Please check back tomorrow.");
                
                } else { 
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
    }, [gameId, adjacencyList, user, authIsLoading, resetGameState, SESSION_STORAGE_KEY]);

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
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
            } else {
                setFeedbackMessage(`Correct! Now find a teammate of ${guessedPlayer.name}.`);
                if (newGuessHistory.length >= MAX_GUESSES) {
                    setGameStatus('lost');
                    setFeedbackMessage('You ran out of guesses!');
                    saveDailyResult(false, newGuessHistory);
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                }
            }
        } else {
            setFeedbackMessage(`Incorrect. ${guessedPlayer.name} was not a teammate of ${lastPlayerInPath.name}.`);
            if (newGuessHistory.length >= MAX_GUESSES) {
                setGameStatus('lost');
                saveDailyResult(false, newGuessHistory);
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
            }
        }
    };
    
    const mainContainerClasses = isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800";
    const loadingTextClasses = isDarkMode ? "text-slate-300" : "text-gray-600";
    const errorTextClasses = isDarkMode ? "text-red-400" : "text-red-600";
    const highlightColor = isDarkMode ? "text-sky-400" : "text-sky-600";
    const playerCardClasses = isDarkMode ? "bg-slate-800" : "bg-white/60 backdrop-blur-sm border border-sky-200";
    const arrowColor = isDarkMode ? "text-green-400" : "text-green-500";
    const mutedArrowColor = isDarkMode ? "text-gray-400" : "text-gray-500";
    const backButtonClasses = isDarkMode ? "bg-sky-600 hover:bg-sky-700" : "bg-sky-500 hover:bg-sky-600";

    const alreadyPlayedContainer = isDarkMode
        ? "bg-gray-800 text-white"
        : "bg-white text-gray-800";
    const alreadyPlayedCard = isDarkMode 
        ? "bg-slate-700/50"
        : "bg-white/60 backdrop-blur-sm border border-sky-200";
    const alreadyPlayedHeaderText = isDarkMode ? "text-slate-200" : "text-gray-800";
    const alreadyPlayedMutedText = isDarkMode ? "text-slate-400" : "text-gray-500";


    if (gameStatus === 'loading' || authIsLoading) {
        return <div className={`flex justify-center items-center rounded-lg min-h-screen ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}><p className={`text-xl ${loadingTextClasses}`}>Loading Game...</p></div>;
    }
    if (gameStatus === 'error') {
        return <div className={`flex justify-center rounded-lg items-center min-h-screen ${errorTextClasses} border border-gray-200 dark:border-gray-700`}><p>Error: {errorMsg}</p></div>;
    }

    if (gameStatus === 'already_played') {
        return (
            <div className={`flex justify-center items-center rounded-lg min-h-screen ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}>
             <div className={`w-full p-4 text-center max-w-lg mx-auto ${alreadyPlayedContainer}`}>
                <h1 className={`text-3xl font-bold ${highlightColor} mb-6`}>Daily Challenge Complete</h1>
                    
                {priorPlayResult ? (
                     <div className={`text-left p-4 rounded-lg ${alreadyPlayedCard}`}>
                        <h3 className={`text-center text-xl font-bold ${alreadyPlayedHeaderText} mb-3`}>Today&apos;s Result</h3>
                        {priorPlayResult.is_successful ? (
                            <p className="text-green-500 text-center font-bold">
                                Solved in {priorPlayResult.guess_count} {priorPlayResult.guess_count > 1 ? 'links' : 'link'}!
                            </p>
                        ) : (
                            <p className="text-red-500 text-center font-bold">
                                You didn&apos;t solve it in {MAX_GUESSES} guesses.
                            </p>
                        )}
                         <p className={`text-xs ${alreadyPlayedMutedText} mt-2 text-center`}>
                           Solution: {priorPlayResult.solution_path_names?.join(' → ')}
                        </p>
                    </div>
                ) : (
                    <p className="my-8">Your previous result could not be loaded.</p>
                )}
    
                <button onClick={() => router.push('/games/six-degrees')} className={`mt-8 px-6 py-2 rounded-lg text-white font-semibold ${backButtonClasses}`}>
                    Back to Lobby
                </button>
            </div>
            </div>
        );
    }

    if (!puzzle) {
        return <div className={`flex justify-center items-center min-h-screen ${loadingTextClasses} border border-gray-200 dark:border-gray-700`}><p>Could not load puzzle data.</p></div>;
    }

    const nextPlayerToGuessFor = path.length > 0 ? path[path.length - 1] : null;

    return (
        <div className={`w-full min-h-screen rounded-lg ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}>
        <div className="container mx-auto p-4 text-center max-w-lg">
            <h1 className="text-3xl font-bold mb-4">Six Degrees of NBA</h1>
            <p className="mb-4">Connect <span className={`font-bold ${highlightColor}`}>{puzzle.player_a_name}</span> to <span className={`font-bold ${highlightColor}`}>{puzzle.player_b_name}</span>.</p>
            <p className="mb-8 font-bold text-xl">Guesses Remaining: <span className={MAX_GUESSES - guessHistory.length <= 2 ? (isDarkMode ? 'text-red-500' : 'text-red-600') : highlightColor}>{MAX_GUESSES - guessHistory.length}</span></p>

            <div className="space-y-4 mb-6">
                {path.map((player, index) => (
                     <div key={`${player.id}-${index}`} className="flex flex-col items-center">
                        <div className={`w-full p-4 rounded-lg shadow-lg ${playerCardClasses}`}>
                            <p className={`text-sm ${highlightColor}`}>{index === 0 ? 'Start Player' : `Link #${index}`}</p>
                            <p className="text-2xl font-bold">{player.name}</p>
                        </div>
                        {gameStatus === 'playing' && index < path.length - 1 && (
                            <span className={`text-2xl transform rotate-90 leading-none -my-1.5 ${arrowColor}`}>→</span>
                        )}
                    </div>
                ))}
                
                {gameStatus === 'playing' && nextPlayerToGuessFor && (
                    <div className="flex flex-col items-center">
                         <span className={`text-2xl transform rotate-90 leading-none -my-1.5 ${mutedArrowColor}`}>→</span>
                         <div className="w-full">
                            <PlayerInput 
                                placeholder={`Find a teammate of ${nextPlayerToGuessFor.name}...`}
                                onSelect={handleGuess}
                                disabled={false}
                                isDarkMode={isDarkMode}
                            />
                         </div>
                    </div>
                )}
                
                <div className={`p-4 rounded-lg shadow-lg mt-4 ${playerCardClasses}`}>
                    <p className={`text-sm ${highlightColor}`}>End Player</p>
                    <p className="text-2xl font-bold">{puzzle.player_b_name}</p>
                </div>
            </div>

            <div className="h-7 my-4">
                {feedbackMessage && <p className={`text-lg font-bold ${feedbackMessage.startsWith('Correct') ? (isDarkMode ? 'text-green-400' : 'text-green-600') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>{feedbackMessage}</p>}
            </div>

            {gameStatus === 'playing' && (
                <div className="mt-6">
                    <button
                        onClick={() => router.back()}
                        className={`px-6 py-2 rounded-lg text-white font-bold ${backButtonClasses}`}
                    >
                        Back
                    </button>
                </div>
            )}

             {(gameStatus === 'won' || gameStatus === 'lost') && (
                 <div className={`mt-6 p-4 rounded-lg ${gameStatus === 'won' ? (isDarkMode ? 'bg-green-900/50 border border-green-500' : 'bg-green-100 border border-green-400') : (isDarkMode ? 'bg-red-900/50 border border-red-500' : 'bg-red-100 border border-red-400')}`}>
                     <h2 className={`text-2xl font-bold ${gameStatus === 'won' ? (isDarkMode ? 'text-green-300' : 'text-green-800') : (isDarkMode ? 'text-red-300' : 'text-red-800')}`}>
                         {gameStatus === 'won' ? `You Won!` : 'Game Over!'}
                     </h2>
                     {gameStatus === 'won' && <p className="mt-2">Your Path: {[...path, { id: puzzle.player_b_id, name: puzzle.player_b_name }].map(p => p.name).join(' → ')}</p>}
                     {gameStatus === 'lost' && <p className="mt-2">A possible solution was: {puzzle.solution_path_names.join(' → ')}</p>}
                      <button onClick={() => router.push('/games/six-degrees')} className={`mt-4 px-6 py-2 rounded-lg text-white font-bold ${backButtonClasses}`}>
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
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-800 text-gray-800 dark:text-white"><p className="text-xl">Loading Game...</p></div>}>
            <SixDegreesGameContent />
        </Suspense>
    );
}