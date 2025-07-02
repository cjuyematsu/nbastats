'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link'
import { draftData } from '@/app/data/draftData'

interface Player {
    personId: number;
    Pick: number;
    firstName: string;
    lastName:string;
    careerpoints: number;
    yearsactive: string;
    playerrank: number;
    pointspergame: string; 
}

interface PlayersByPick {
  [key: number]: Player[];
}

const DraftPickCardSkeleton = () => (
  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg shadow-md p-4 flex flex-col h-full border border-gray-200 dark:border-slate-700 transition-all duration-300 animate-pulse">
    <div className="h-7 w-24 bg-gray-300 dark:bg-slate-600 rounded-md mb-4"></div>
    <div className="flex-grow space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <div className="flex justify-between items-center">
            <div className="h-5 w-40 bg-gray-300 dark:bg-slate-600 rounded-md"></div>
            <div className="h-5 w-20 bg-gray-300 dark:bg-slate-600 rounded-md"></div>
          </div>
          <div className="h-3 w-28 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>
        </div>
      ))}
    </div>
  </div>
);


const DraftPickCard = ({ pick, players }: { pick: number; players: Player[] }) => (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 flex flex-col h-full border border-gray-200 dark:border-slate-700 hover:border-sky-500/60 hover:shadow-sky-500/10 transition-all duration-300">
    <h3 className="text-xl font-bold text-sky-600 dark:text-sky-400 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">
      Pick #{pick}
    </h3>
    <div className="flex-grow">
      <ul className="space-y-4">
        {players.map((player) => (
          <li key={player.personId} className="text-gray-600 dark:text-slate-400 group">
            <div>
                <div className="flex justify-between items-center">
                    <Link href={`/player/${player.personId}`} className="hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-500 dark:group-hover:text-sky-400">
                            {player.playerrank}. {player.firstName} {player.lastName}
                        </span>
                    </Link>
                    <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{player.careerpoints.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400"> PTS</span>
                    </div>
                </div>
                <div className="flex justify-between items-baseline text-xs text-gray-400 dark:text-slate-500 pl-4">
                    <span>{player.yearsactive}</span>
                    <span>{player.pointspergame} PPG</span>
                </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);


export default function DraftPointsClient() {
  const [playersByPick, setPlayersByPick] = useState<PlayersByPick>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDraftData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const MINIMUM_LOADING_MS = 500;

    const dataPromise = new Promise<PlayersByPick>((resolve) => {
        const processedData = draftData.reduce((acc, player) => {
            const p = player as Player;
            if (!acc[p.Pick]) {
                acc[p.Pick] = [];
            }
            acc[p.Pick].push(p);
            return acc;
        }, {} as PlayersByPick);
        resolve(processedData);
    });
    
    const timerPromise = new Promise(resolve => setTimeout(resolve, MINIMUM_LOADING_MS));

    try {
        const [processedData] = await Promise.all([dataPromise, timerPromise]);
        setPlayersByPick(processedData);
    } catch (e) {
        console.error("Error processing draft data:", e);
        setError("Sorry, we couldn't load the draft analysis. Please try again later.");
        setPlayersByPick({});
    } finally {
        setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    getDraftData();
  }, [getDraftData]); 
  
  const allPicks = Object.entries(playersByPick).sort(([a], [b]) => parseInt(a) - parseInt(b));

  const PageContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full border border-gray-200 dark:border-gray-700">
        <header className="text-center mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
                NBA Draft - Top Scorers by Pick
            </h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-500 dark:text-slate-400">
                An analysis of the top players by career points for each draft position.
            </p>
        </header>
        {children}
    </div>
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, index) => (
            <DraftPickCardSkeleton key={index} />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-2">An Error Occurred</h2>
            <p className="text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPicks.map(([pick, players]) => (
              <DraftPickCard key={pick} pick={parseInt(pick)} players={players} />
            ))}
          </div>
        </section>
    </PageContainer>
  );
}
