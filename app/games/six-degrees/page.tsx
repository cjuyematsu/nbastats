// app/games/six-degrees/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';

// Type for the score data
type DailyScore = {
    game_date: string;
    is_successful: boolean;
    guess_count: number;
};

// Component to render the Wordle-like grid summary
function ScoreHistory({ scores }: { scores: DailyScore[] }) {
    if (!scores || scores.length === 0) {
        return <p className="mt-4 text-slate-400 text-sm">Play the daily challenge to start building your stats!</p>;
    }
    
    // Create a 7x5 grid representing the last 35 days (5 weeks)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const gridDays = Array.from({ length: 35 }).map((_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        return date.toISOString().split('T')[0];
    }).reverse();

    const scoresByDate = new Map(scores.map(s => [s.game_date, s]));

    return (
        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="font-semibold text-lg text-slate-200 mb-3">Your Recent Daily Record</h3>
            <div className="grid grid-cols-7 gap-1.5 justify-center">
                {gridDays.map(dateStr => {
                    const score = scoresByDate.get(dateStr);
                    let bgColor = 'bg-slate-700'; // Default for no play
                    if (score) {
                        bgColor = score.is_successful ? 'bg-green-500' : 'bg-red-500';
                    }
                    return <div key={dateStr} className={`w-5 h-5 rounded-sm ${bgColor}`} title={`Date: ${dateStr}, Guesses: ${score ? score.guess_count : 'N/A'}`} />;
                })}
            </div>
        </div>
    );
}

export default function SixDegreesLobby() {
    const router = useRouter();
    const { user, isLoading: authIsLoading } = useAuth();
    const [dailyScores, setDailyScores] = useState<DailyScore[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchDailyResults = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('six_degrees_scores')
                .select('game_date, is_successful, guess_count')
                .eq('user_id', user.id)
                .order('game_date', { ascending: false })
                .limit(35); // Fetch last 35 days of results

            if (error) {
                console.error("Error fetching score history:", error);
            } else if (data) {
                setDailyScores(data as DailyScore[]);
            }
            setIsLoading(false);
        };

        if (user) {
            fetchDailyResults();
        }
    }, [user]);

    const handlePlayRandom = () => {
        const randomGameId = uuidv4();
        router.push(`/games/six-degrees/${randomGameId}`);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-slate-100 py-12 px-4">
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
                        className="w-full px-8 py-4 bg-teal-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-teal-700 transition-transform hover:scale-105"
                    >
                        Play Random Game
                    </button>
                </div>
                {authIsLoading || isLoading ? (
                    <div className="mt-4 text-slate-400">Loading your stats...</div>
                ) : user ? (
                    <ScoreHistory scores={dailyScores} />
                ) : (
                    <p className="mt-4 text-slate-400 text-sm">Sign in to save your daily stats and track your progress!</p>
                )}
            </div>
        </div>
    );
}