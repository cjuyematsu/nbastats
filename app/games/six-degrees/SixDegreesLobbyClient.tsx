//app/games/six-degrees/SixDegreesLobbyClient.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import { computeSixDegreesStats, ScoreHistoryRecord } from '@/lib/sixDegreesStats';
import { readDailyResult, readAllLocalDailyResults } from '@/lib/sixDegreesDaily';
import { getLaDateString, getNextLaMidnightIso } from '@/lib/dailyTime';
import CountdownTimer from '@/components/CountdownTimer';

const MIN_LOADING_TIME_MS = 400;

function StatsDisplay({ scores }: { scores: ScoreHistoryRecord[] }) {
    const stats = useMemo(() => computeSixDegreesStats(scores, getLaDateString()), [scores]);

    const maxDistributionCount = Math.max(...stats.guessDistribution, 1);

    const containerClasses = "mt-8 p-6 bg-white/60 dark:bg-slate-800/50 rounded-lg border border-sky-200 dark:border-slate-700 w-full backdrop-blur-sm";
    const headerTextClasses = "text-gray-800 dark:text-slate-100";
    const subHeaderTextClasses = "text-gray-700 dark:text-slate-200";
    const mutedTextClasses = "text-gray-500 dark:text-slate-400";
    const barBgClasses = "bg-sky-100 dark:bg-slate-700";

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
    const [dailyDoneToday, setDailyDoneToday] = useState(false);

    useEffect(() => {
        setDailyDoneToday(!!readDailyResult(getLaDateString()));
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
                } else {
                    setScoreHistory(readAllLocalDailyResults());
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

    const mainContainerClasses = "bg-white dark:bg-gray-800 text-gray-800 dark:text-slate-100";
    const loadingTextClasses = "text-gray-600 dark:text-slate-300";
    const mutedTextClasses = "text-slate-600 dark:text-slate-300";
    const linkClasses = "underline hover:text-sky-600 dark:hover:text-sky-400";
    const randomButtonClasses = "bg-green-500 dark:bg-[rgb(60,192,103)] hover:bg-green-600 dark:hover:bg-green-400";


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
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-sky-600 dark:text-sky-400 mb-3">Six Degrees of NBA</h2>
                <p className={`text-lg mb-10 ${mutedTextClasses}`}>Connect two NBA players through a chain of former teammates.</p>
                <div className="space-y-4">
                    <button
                        onClick={() => router.push('/games/six-degrees/daily')}
                        className="w-full px-8 py-4 bg-sky-500 dark:bg-sky-600 text-white text-lg font-semibold rounded-lg shadow-md dark:hover:bg-sky-700 hover:bg-sky-600 transition-transform hover:scale-105"
                    >
                        {dailyDoneToday ? "See Today's Result" : 'Play Daily Challenge'}
                    </button>
                    {dailyDoneToday && (
                        <CountdownTimer
                            compact
                            targetTimeIso={getNextLaMidnightIso()}
                            label="Next daily in"
                            completedText="New daily available. Refresh to play!"
                        />
                    )}
                    <button
                        onClick={handlePlayRandom}
                        className={`w-full px-8 py-4 text-white text-lg font-semibold rounded-lg shadow-md transition-transform hover:scale-105 ${randomButtonClasses}`}
                    >
                        Play Random Game
                    </button>
                </div>
                
                <div className="mt-8">
                    {user ? (
                        <StatsDisplay scores={scoreHistory} />
                    ) : (
                        <>
                            {scoreHistory.length > 0 && <StatsDisplay scores={scoreHistory} />}
                            <p className={`mt-8 text-sm ${mutedTextClasses}`}>
                                <Link href="/signin" className={linkClasses}>Sign in</Link> to keep your daily stats across devices!
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}