//app/games/six-degrees/SixDegreesLobbyClient.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';

type ScoreHistoryRecord = {
    game_date: string;
    is_successful: boolean;
    guess_count: number;
};

const MIN_LOADING_TIME_MS = 400;

function StatsDisplay({ scores, isDarkMode }: { scores: ScoreHistoryRecord[]; isDarkMode: boolean }) {
    const stats = useMemo(() => {
        if (!scores || scores.length === 0) {
            return { played: 0, winPercentage: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] };
        }
        const played = scores.length;
        const wins = scores.filter(s => s.is_successful).length;
        const winPercentage = played > 0 ? Math.round((wins / played) * 100) : 0;
        let maxStreak = 0;
        let tempStreak = 0;
        for (const score of scores) {
            if (score.is_successful) {
                tempStreak++;
            } else {
                maxStreak = Math.max(maxStreak, tempStreak);
                tempStreak = 0;
            }
        }
        maxStreak = Math.max(maxStreak, tempStreak);
        let currentStreak = 0;
        for (let i = scores.length - 1; i >= 0; i--) {
            if (scores[i].is_successful) {
                currentStreak++;
            } else {
                break;
            }
        }
        const guessDistribution = [0, 0, 0, 0, 0, 0];
        scores.forEach(score => {
            if (score.is_successful && score.guess_count >= 1 && score.guess_count <= 6) {
                guessDistribution[score.guess_count - 1]++;
            }
        });
        return { played, winPercentage, currentStreak, maxStreak, guessDistribution };
    }, [scores]);

    const maxDistributionCount = Math.max(...stats.guessDistribution, 1);

    const containerClasses = isDarkMode 
      ? "mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700 w-full"
      : "mt-8 p-6 bg-white/60 rounded-lg border border-sky-200 w-full backdrop-blur-sm";
    const headerTextClasses = isDarkMode ? "text-slate-100" : "text-gray-800";
    const subHeaderTextClasses = isDarkMode ? "text-slate-200" : "text-gray-700";
    const mutedTextClasses = isDarkMode ? "text-slate-400" : "text-gray-500";
    const barBgClasses = isDarkMode ? "bg-slate-700" : "bg-sky-100";

    return (
        <div className={`border border-gray-200 dark:border-gray-700 ${containerClasses}`}>
            <h3 className={`font-bold text-xl mb-4 text-center ${headerTextClasses}`}>Your Statistics</h3>
            <div className="flex justify-around text-center mb-6">
                <div>
                    <p className="text-3xl font-bold">{stats.played}</p>
                    <p className={`text-xs ${mutedTextClasses}`}>Played</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.winPercentage}</p>
                    <p className={`text-xs ${mutedTextClasses}`}>Win %</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.currentStreak}</p>
                    <p className={`text-xs ${mutedTextClasses}`}>Current Streak</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.maxStreak}</p>
                    <p className={`text-xs ${mutedTextClasses}`}>Max Streak</p>
                </div>
            </div>
            <h4 className={`font-semibold text-center mb-3 ${subHeaderTextClasses}`}>Guess Distribution</h4>
            <div className="space-y-2">
                {stats.guessDistribution.map((count, index) => (
                    <div key={index} className="flex items-center text-sm">
                        <div className="w-4 font-bold">{index + 1}</div>
                        <div className={`flex-grow rounded-sm mx-2 ${barBgClasses}`}>
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


export default function SixDegreesLobby() {
    const router = useRouter();
    const { user, isLoading: authIsLoading, supabase } = useAuth();
    const [scoreHistory, setScoreHistory] = useState<ScoreHistoryRecord[]>([]);
    const [isLoadingPage, setIsLoadingPage] = useState(true);
    
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadLobbyData = async () => {
            if (authIsLoading) return; 

            const startTime = Date.now();

            try {
                if (user) {
                    const { data, error } = await supabase.rpc('get_six_degrees_history', {
                        p_user_id: user.id
                    });

                    if (!isMounted) return; 

                    if (error) {
                        console.error("Error fetching score history:", error);
                    } else if (data) {
                        setScoreHistory(data as ScoreHistoryRecord[]);
                    }
                }
            } catch (err) {
                console.error("Caught an exception while fetching score history", err);
            } finally {
                if (isMounted) {
                    const elapsedTime = Date.now() - startTime;
                    const remainingTime = MIN_LOADING_TIME_MS - elapsedTime;

                    if (remainingTime > 0) {
                        await new Promise(resolve => setTimeout(resolve, remainingTime));
                    }
                    setIsLoadingPage(false);
                }
            }
        };

        loadLobbyData();

        return () => {
            isMounted = false; 
        };
    }, [user, authIsLoading, supabase]);

    const handlePlayRandom = () => {
        const randomGameId = uuidv4();
        router.push(`/games/six-degrees/${randomGameId}`);
    };

    const mainContainerClasses = isDarkMode ? "bg-gray-800 text-slate-100" : "bg-white text-gray-800";
    const loadingTextClasses = isDarkMode ? "text-slate-300" : "text-gray-600";
    const highlightColor = isDarkMode ? "text-sky-400" : "text-sky-600";
    const mutedTextClasses = isDarkMode ? "text-slate-300" : "text-slate-600";
    const linkClasses = isDarkMode ? "underline hover:text-sky-400" : "underline hover:text-sky-600";
    const randomButtonClasses = isDarkMode 
      ? "bg-[rgb(60,192,103)] hover:bg-green-400" 
      : "bg-green-500 hover:bg-green-600";


    if (isLoadingPage) {
        return (
            <div className={`w-full flex flex-col items-center justify-center min-h-screen rounded-lg ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}>
                <p className={`text-xl ${loadingTextClasses}`}>Loading Game...</p>
            </div>
        );
    }

    return (
        <div className={`w-full flex flex-col items-center justify-center min-h-screen rounded-lg py-12 px-4 ${mainContainerClasses} border border-gray-200 dark:border-gray-700`}>
            <div className="text-center w-full max-w-md">
                <h1 className={`text-4xl font-bold mb-4 ${highlightColor}`}>Six Degrees of NBA</h1>
                <p className={`text-lg mb-10 ${mutedTextClasses}`}>Connect two NBA players through a chain of former teammates.</p>
                <div className="space-y-4">
                    <button
                        onClick={() => router.push('/games/six-degrees/daily')}
                        className="w-full px-8 py-4 bg-sky-500 dark:bg-sky-600 text-white text-lg font-semibold rounded-lg shadow-md dark:hover:bg-sky-700 hover:bg-sky-600 transition-transform hover:scale-105"
                    >
                        Play Daily Challenge
                    </button>
                    <button
                        onClick={handlePlayRandom}
                        className={`w-full px-8 py-4 text-white text-lg font-semibold rounded-lg shadow-md transition-transform hover:scale-105 ${randomButtonClasses}`}
                    >
                        Play Random Game
                    </button>
                </div>
                
                <div className="mt-8">
                    {user ? (
                        <StatsDisplay scores={scoreHistory} isDarkMode={isDarkMode} />
                    ) : (
                        <p className={`mt-8 text-sm ${mutedTextClasses}`}>
                            <Link href="/signin" className={linkClasses}>Sign in</Link> to save your daily stats and track your progress!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}