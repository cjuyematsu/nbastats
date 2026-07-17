//components/HeaderSearchBar.tsx

'use client';

import { PlayerSuggestion } from '@/types/stats';
import { usePlayerSuggestions } from '@/lib/usePlayerSuggestions';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';

interface HeaderSearchBarProps {
  onPlayerSelected: (player: PlayerSuggestion) => void;
  prefetchPlayerPages?: boolean;
}

export default function HeaderSearchBar({ onPlayerSelected, prefetchPlayerPages }: HeaderSearchBarProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const prefetchedIdsRef = useRef<Set<number>>(new Set());

  const { suggestions, isLoading: isLoadingSuggestions, error } = usePlayerSuggestions(searchTerm);

  const prefetchPlayer = (personId: number) => {
    if (!prefetchPlayerPages || prefetchedIdsRef.current.has(personId)) return;
    prefetchedIdsRef.current.add(personId);
    router.prefetch(`/player/${personId}`);
  };

  useEffect(() => {
    if (suggestions.length > 0) prefetchPlayer(suggestions[0].personId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectPlayer = (player: PlayerSuggestion) => {
    setSearchTerm(`${player.firstName || ''} ${player.lastName || ''}`.trim());
    setIsSuggestionsVisible(false);
    onPlayerSelected(player);
  };

  return (
    <div ref={searchContainerRef} className="relative w-full">
      <input
        type="text"
        placeholder="Search player..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsSuggestionsVisible(e.target.value.trim().length >= 2);
        }}
        onFocus={() => searchTerm.length >= 2 && suggestions.length > 0 && setIsSuggestionsVisible(true)}
        className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm"
      />
      {isLoadingSuggestions && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-t-2 border-b-2 border-sky-600 dark:border-sky-500 rounded-full animate-spin"></div>
        </div>
      )}
      {isSuggestionsVisible && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((player) => (
            <li
              key={player.personId}
              onClick={() => handleSelectPlayer(player)}
              onMouseEnter={() => prefetchPlayer(player.personId)}
              className="p-2 group hover:bg-sky-500 dark:hover:bg-sky-600 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-sm"
            >
              <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-white dark:group-hover:text-white">
                {player.firstName} {player.lastName}
              </span>
              {(player.startYear && player.endYear) && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 group-hover:text-sky-100 dark:group-hover:text-gray-300">
                  ({player.startYear}–{player.endYear})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {isSuggestionsVisible && !isLoadingSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && !error && (
        <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mt-1 shadow-lg p-2 text-gray-600 dark:text-gray-300 text-sm">
          No players found for &quot;{searchTerm}&quot;.
        </div>
      )}
      {error && isSuggestionsVisible && searchTerm.length >=2 && (
         <div className="absolute z-50 w-full bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md mt-1 shadow-lg p-2 text-red-700 dark:text-red-200 text-sm">
            {error}
        </div>
      )}
    </div>
  );
}
