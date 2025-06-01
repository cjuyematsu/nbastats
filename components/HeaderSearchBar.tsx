// src/components/HeaderSearchBar.tsx (or your preferred path)
'use client';

import { supabase } from '@/lib/supabaseClient'; 
import { PlayerSuggestion } from '@/types/stats'; 
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';

interface HeaderSearchBarProps {
  onPlayerSelected: (player: PlayerSuggestion) => void;
}

export default function HeaderSearchBar({ onPlayerSelected }: HeaderSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const debouncedFetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsSuggestionsVisible(false);
        setError(null); 
        return;
      }
      setIsLoadingSuggestions(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_player_suggestions', {
          search_term: query,
        });

        if (rpcError) {
          console.error('RPC Error fetching suggestions:', rpcError);
          throw new Error(rpcError.message || 'Failed to fetch suggestions due to RPC error.');
        }
        
        setSuggestions(data || []);
        setIsSuggestionsVisible(true);

      } catch (e: unknown) {
        console.error('Error fetching suggestions:', e);
        let message = 'Unknown error';
        if (e instanceof Error) {
          message = e.message || 'Unknown error';
        }
        setError(`Failed to fetch suggestions. Details: ${message}`);
        setSuggestions([]);
        setIsSuggestionsVisible(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 350),
    [supabase]
  );

  useEffect(() => {
    debouncedFetchSuggestions(searchTerm);
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [searchTerm, debouncedFetchSuggestions]);

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
    setError(null); 
    onPlayerSelected(player); 
  };

  return (
    <div ref={searchContainerRef} className="relative w-full"> 
      <input
        type="text"
        placeholder="Search player..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => searchTerm.length >= 2 && suggestions.length > 0 && setIsSuggestionsVisible(true)}
        className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm" 
      />
      {isLoadingSuggestions && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div> 
        </div>
      )}
      {isSuggestionsVisible && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((player) => (
            <li
              key={`${player.personId}-${player.firstName}-${player.lastName}-${player.startYear}-${player.endYear}`}
              onClick={() => handleSelectPlayer(player)}
              className="p-2 hover:bg-blue-100 dark:hover:bg-blue-700 dark:hover:text-white cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-sm" 
            >
              <span className="font-medium text-gray-800 dark:text-gray-200">{player.firstName} {player.lastName}</span>
              {(player.startYear && player.endYear) && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({player.startYear}–{player.endYear})</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {isSuggestionsVisible && !isLoadingSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && !error && (
        <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md mt-1 shadow-lg p-2 text-gray-700 dark:text-gray-300 text-sm">
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