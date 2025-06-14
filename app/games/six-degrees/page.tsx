'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';

type ScoreHistoryRecord = {
    game_date: string;
    is_successful: boolean;
    guess_count: number;
};

const MIN_LOADING_TIME_MS = 400;

function StatsDisplay({ scores }: { scores: ScoreHistoryRecord[] }) {
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

    return (
        <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700 w-full">
            <h3 className="font-bold text-xl text-slate-100 mb-4 text-center">Your Statistics</h3>
            <div className="flex justify-around text-center mb-6">
                <div>
                    <p className="text-3xl font-bold">{stats.played}</p>
                    <p className="text-xs text-slate-400">Played</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.winPercentage}</p>
                    <p className="text-xs text-slate-400">Win %</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.currentStreak}</p>
                    <p className="text-xs text-slate-400">Current Streak</p>
                </div>
                <div>
                    <p className="text-3xl font-bold">{stats.maxStreak}</p>
                    <p className="text-xs text-slate-400">Max Streak</p>
                </div>
            </div>
            <h4 className="font-semibold text-center text-slate-200 mb-3">Guess Distribution</h4>
            <div className="space-y-2">
                {stats.guessDistribution.map((count, index) => (
                    <div key={index} className="flex items-center text-sm">
                        <div className="w-4 font-bold">{index + 1}</div>
                        <div className="flex-grow bg-slate-700 rounded-sm mx-2">
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
    const { user, isLoading: authIsLoading } = useAuth();
    const [scoreHistory, setScoreHistory] = useState<ScoreHistoryRecord[]>([]);
    const [isLoadingPage, setIsLoadingPage] = useState(true);

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

    if (isLoadingPage) {
        return (
            <div className="w-full bg-gray-800 rounded-lg shadow-2xl flex flex-col items-center justify-center min-h-screen text-slate-100">
                <p className="text-xl text-slate-300">Loading Game...</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-800 rounded-lg shadow-2xl flex flex-col items-center justify-center min-h-screen text-slate-100 py-12 px-4">
            <div className="text-center w-full max-w-md">
                <h1 className="text-4xl font-bold text-sky-400 mb-4">Six Degrees of NBA</h1>
                <p className="text-lg text-slate-300 mb-10">Connect two NBA players through a chain of former teammates.</p>
                <div className="space-y-4">
                    <button
                        onClick={() => router.push('/games/six-degrees/daily')}
                        className="w-full px-8 py-4 bg-sky-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-transform hover:scale-105"
                    >
                        Play Daily Challenge
                    </button>
                    <button
                        onClick={handlePlayRandom}
                        className="w-full px-8 py-4 bg-[rgb(60,192,103)] text-white text-lg font-semibold rounded-lg shadow-md hover:bg-green-400 transition-transform hover:scale-105"
                    >
                        Play Random Game
                    </button>
                </div>
                
                <div className="mt-8">
                    {user ? (
                        <StatsDisplay scores={scoreHistory} />
                    ) : (
                        <p className="mt-8 text-slate-400 text-sm">
                            <Link href="/signin" className="underline hover:text-sky-400">Sign in</Link> to save your daily stats and track your progress!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}