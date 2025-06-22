// app/games/stat-over-under/SelectEraClient.tsx

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

const AVAILABLE_ERAS = [
    { id: 'modern', name: '2011-2025' },
    { id: '2000s',  name: '2001-2010' },
    { id: '1990s',  name: '1991-2000' },
    { id: '1980s',  name: '1980-1990' },
];

export default function SelectEraPage() { 
  const router = useRouter();

  const handleSelectEra = (eraId: string) => {
    router.push(`/games/stat-over-under/${eraId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-2xl text-slate-100 py-12 px-4">
      <div className="text-center w-full max-w-md sm:max-w-lg">
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-500 dark:text-sky-400 mb-4">
          Daily Stat Over/Under
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-300 mb-10">
          Test your NBA knowledge! Select an era to begin.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AVAILABLE_ERAS.map((eraOption) => (
            <button
              key={eraOption.id}
              onClick={() => handleSelectEra(eraOption.id)}
              className="w-full px-6 py-4 bg-sky-600 border-sky-700 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 transition-transform hover:scale-105"
            >
              {eraOption.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}