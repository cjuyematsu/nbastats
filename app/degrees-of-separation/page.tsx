// app/degrees-of-separation/page.tsx
"use client";

import { Suspense } from 'react'; // Step 1: Import Suspense

// Step 2: Keep original imports needed for the client component logic
import { useState, useCallback, Fragment, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import HeaderSearchBar from '@/components/HeaderSearchBar';
import type { PlayerSuggestion } from '@/types/stats';

// --- Type Definitions (Copied from your original page) ---
type PathNode = {
  id: number;
  name: string;
};

interface LinkDetail {
  sourcePlayerId: number;
  sourcePlayerName: string;
  targetPlayerId: number;
  targetPlayerName: string;
  sharedTeams: string;
  sharedGamesRecord: string;
  startYearTogether?: number;
}

interface ApiSuccessResponse {
  path: PathNode[];
  degrees: number;
  links: LinkDetail[];
  message?: string;
  searchedPlayerIds?: { p1: string; p2: string };
}

interface ApiErrorOrMessageResponse {
  message: string;
  path?: PathNode[];
  degrees?: number;
  links?: LinkDetail[];
  error?: string;
  details?: string;
  searchedPlayerIds?: { p1: string; p2: string };
}

// --- PlayerCard and ConnectionDetailsCard Components (Copied from your original page) ---
const PlayerCard = ({ playerNode }: { playerNode: PathNode }) => {
  return (
    <div className="bg-slate-700 border border-slate-500 rounded-lg shadow-lg p-4 text-slate-200 flex flex-col justify-center h-full transition-all hover:shadow-sky-500/30 hover:border-sky-500/50">
      <Link 
        href={`/player/${playerNode.id}`} 
        className="text-xl text-center font-semibold leading-tight hover:text-sky-300 cursor-pointer"
      >
        {playerNode.name}
      </Link>
    </div>
  );
};

const ConnectionDetailsCard = ({ linkDetail }: { linkDetail: LinkDetail }) => {
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-md p-4 md:p-6 text-slate-300 flex flex-col justify-center items-center text-center h-full">
      {linkDetail.startYearTogether && (
        <div className="mb-3">
          <p className="text-xs text-sky-400/80 font-semibold">FIRST YEAR AS TEAMMATES</p>
          <p className="text-lg text-sky-300 font-bold">{linkDetail.startYearTogether}</p>
        </div>
      )}
      <div className="mb-2">
        <p className="text-xs text-sky-400/80 font-semibold">SHARED TEAMS</p>
        <p className="text-md">{linkDetail.sharedTeams}</p>
      </div>
      <div>
        <p className="text-xs text-sky-400/80 font-semibold">RECORD TOGETHER</p>
        <p className="text-md">{linkDetail.sharedGamesRecord}</p>
      </div>
    </div>
  );
};

// Step 3: Define the Client Component containing all original page logic
function DegreesOfSeparationClientContent() {
  'use client'; // This is crucial

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams(); // This hook requires the Suspense boundary

  const [selectedStartPlayer, setSelectedStartPlayer] = useState<PlayerSuggestion | null>(null);
  const [selectedEndPlayer, setSelectedEndPlayer] = useState<PlayerSuggestion | null>(null);
  const [path, setPath] = useState<PathNode[]>([]);
  const [links, setLinks] = useState<LinkDetail[]>([]);
  const [degrees, setDegrees] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const queryP1Id = searchParams?.get('p1');
    const queryP2Id = searchParams?.get('p2');
    let p1Initial: PlayerSuggestion | null = null;
    let p2Initial: PlayerSuggestion | null = null;

    try {
      const storedP1 = sessionStorage.getItem('dos_startPlayer');
      if (storedP1) {
        const parsedP1 = JSON.parse(storedP1) as PlayerSuggestion;
        if ((queryP1Id && String(parsedP1.personId) === queryP1Id) || !queryP1Id) {
            p1Initial = parsedP1;
        }
      }
      const storedP2 = sessionStorage.getItem('dos_endPlayer');
      if (storedP2) {
        const parsedP2 = JSON.parse(storedP2) as PlayerSuggestion;
        if ((queryP2Id && String(parsedP2.personId) === queryP2Id) || !queryP2Id) {
            p2Initial = parsedP2;
        }
      }
    } catch (e) { console.error("Error parsing player data from session storage:", e); }
    
    setSelectedStartPlayer(p1Initial);
    setSelectedEndPlayer(p2Initial);
    
    const storedResultsItem = sessionStorage.getItem('dos_results');
    if (storedResultsItem) {
      try {
        const parsedResults = JSON.parse(storedResultsItem) as ApiSuccessResponse;
        // Results should match if the currently selected players (derived from URL/session) match those in stored results
        const storedP1Id = parsedResults.searchedPlayerIds?.p1;
        const storedP2Id = parsedResults.searchedPlayerIds?.p2;

        if (queryP1Id === storedP1Id && queryP2Id === storedP2Id) {
          setPath(parsedResults.path || []);
          setDegrees(parsedResults.degrees !== undefined ? parsedResults.degrees : null);
          setLinks(parsedResults.links || []);
          setError(null); // Clear previous errors if we are loading valid stored results
          // Set info message based on loaded results
          if (parsedResults.degrees === 0 && parsedResults.path.length === 1) {
            setInfoMessage(`${parsedResults.path[0].name} is the selected player.`);
          } else if (parsedResults.path.length > 0 && typeof parsedResults.degrees === 'number' && parsedResults.degrees >= 0) {
            setInfoMessage(`Connection found in ${parsedResults.degrees} ${parsedResults.degrees === 1 ? 'degree' : 'degrees'}.`);
          } else if (parsedResults.message) {
            setInfoMessage(parsedResults.message);
          }
        } else {
          // If URL params don't match stored results, clear them.
          sessionStorage.removeItem('dos_results');
          // Optionally clear path/links/degrees too, or let new search handle it
        }
      } catch (e) { 
        console.error("Error parsing results from session storage:", e); 
        sessionStorage.removeItem('dos_results');
      }
    }
  }, [searchParams]); // searchParams is a dependency for this effect

  const handleFindConnection = useCallback(async () => {
    if (!selectedStartPlayer || !selectedEndPlayer) { setError('Please select both players.'); return; }
    const startIdStr = String(selectedStartPlayer.personId);
    const endIdStr = String(selectedEndPlayer.personId);

    // Update URL immediately
    const newParams = new URLSearchParams(searchParams?.toString());
    newParams.set('p1', startIdStr);
    newParams.set('p2', endIdStr);
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    
    // Store selected players in session storage
    sessionStorage.setItem('dos_startPlayer', JSON.stringify(selectedStartPlayer));
    sessionStorage.setItem('dos_endPlayer', JSON.stringify(selectedEndPlayer));

    if (startIdStr === endIdStr) {
        const playerName = `${selectedStartPlayer.firstName} ${selectedStartPlayer.lastName}`;
        const resultForSamePlayer: ApiSuccessResponse = {
            path: [{ id: selectedStartPlayer.personId, name: playerName }], degrees: 0, links: [],
            searchedPlayerIds: { p1: startIdStr, p2: endIdStr }
        };
        setPath(resultForSamePlayer.path); setDegrees(resultForSamePlayer.degrees); setLinks(resultForSamePlayer.links);
        setInfoMessage(`${playerName} is the selected player.`); setError(null);
        sessionStorage.setItem('dos_results', JSON.stringify(resultForSamePlayer));
        return;
    }

    setIsLoading(true); setError(null); setInfoMessage(null); // Clear previous messages/errors for new search

    try {
      const response = await fetch('/api/degrees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startPlayerId: selectedStartPlayer.personId, endPlayerId: selectedEndPlayer.personId }),
      });
      const result: ApiSuccessResponse | ApiErrorOrMessageResponse = await response.json();
      
      // Ensure the results correspond to the *current* search
      if (result.searchedPlayerIds?.p1 !== startIdStr || result.searchedPlayerIds?.p2 !== endIdStr) {
          // Stale result, ignore it or handle appropriately
          console.warn("Received stale search result, ignoring.");
          setIsLoading(false); // Still need to turn off loading
          return;
      }
      sessionStorage.setItem('dos_results', JSON.stringify(result)); // Store result

      if (!response.ok) {
        const errorResult = result as ApiErrorOrMessageResponse;
        setError(errorResult.message || errorResult.error || `Request failed`);
        setPath([]); setDegrees(null); setLinks([]);
      } else {
        const successResult = result as ApiSuccessResponse;
        setPath(successResult.path || []);
        setDegrees(successResult.degrees !== undefined ? successResult.degrees : null);
        setLinks(successResult.links || []);
        const numDegrees = successResult.degrees;
        if (numDegrees === 0 && successResult.path?.length === 1) {
          setInfoMessage(`${successResult.path[0].name} is selected.`);
        } else if (successResult.path && successResult.path.length > 0 && typeof numDegrees === 'number' && numDegrees >=0 ) {
          setInfoMessage(`Connection in ${numDegrees} ${numDegrees === 1 ? 'degree' : 'degrees'}.`);
        } else if (successResult.message) {
          setInfoMessage(successResult.message);
        } else {
          setInfoMessage('Search complete. No direct path or unexpected response.');
        }
      }
    } catch (e) { 
        console.error('Failed to find connection:', e);
        setError(e instanceof Error ? e.message : 'Failed to connect to the server or parse the response.');
        sessionStorage.removeItem('dos_results'); // Clear potentially bad stored result on error
    } finally { setIsLoading(false); }
  }, [selectedStartPlayer, selectedEndPlayer, router, pathname, searchParams]);

  const clearSelection = useCallback(() => {
    setSelectedStartPlayer(null); setSelectedEndPlayer(null);
    setPath([]); setDegrees(null); setLinks([]);
    setError(null); setInfoMessage(null); setIsLoading(false);
    sessionStorage.removeItem('dos_startPlayer'); sessionStorage.removeItem('dos_endPlayer');
    sessionStorage.removeItem('dos_results');
    const newParams = new URLSearchParams(searchParams?.toString());
    newParams.delete('p1'); newParams.delete('p2');
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100">
      <div className="container mx-auto p-4 text-slate-100 min-h-screen">
        <h1 className="text-4xl font-bold text-sky-400 sm:text-5xl md:text-6xl text-center mb-3">
          Nine Degrees
        </h1>
        <h2 className="text-xl font-semibold text-slate-200 sm:text-2xl text-center mb-2">
          The max separation between any two players is nine degrees.
        </h2>
        <p className="text-lg text-slate-400 sm:text-xl text-center mb-8">
          Can you find one?
        </p>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 mb-6 items-start">
          <div>
            <label htmlFor="startPlayerSearch" className="block text-sm font-medium text-gray-300 mb-1">Select Start Player</label>
            <HeaderSearchBar onPlayerSelected={(player) => { setSelectedStartPlayer(player); setError(null); setInfoMessage(null); setPath([]); setDegrees(null); setLinks([]); /* Clear old results */ }} />
            {selectedStartPlayer && (
              <p className="text-sm text-slate-400 mt-2">
                Selected: <Link href={`/player/${selectedStartPlayer.personId}`} className="font-semibold text-sky-400 hover:text-sky-300">{`${selectedStartPlayer.firstName} ${selectedStartPlayer.lastName}`}</Link>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="endPlayerSearch" className="block text-sm font-medium text-gray-300 mb-1">Select End Player</label>
            <HeaderSearchBar onPlayerSelected={(player) => { setSelectedEndPlayer(player); setError(null); setInfoMessage(null); setPath([]); setDegrees(null); setLinks([]); /* Clear old results */ }} />
            {selectedEndPlayer && (
              <p className="text-sm text-slate-400 mt-2">
                Selected: <Link href={`/player/${selectedEndPlayer.personId}`} className="font-semibold text-sky-400 hover:text-sky-300">{`${selectedEndPlayer.firstName} ${selectedEndPlayer.lastName}`}</Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
          <button onClick={handleFindConnection} disabled={isLoading || !selectedStartPlayer || !selectedEndPlayer} className="w-full sm:w-auto px-6 py-3 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors text-lg font-semibold">
            {isLoading ? 'Searching...' : 'Find Connection'}
          </button>
          {(selectedStartPlayer || selectedEndPlayer || path.length > 0 || error || infoMessage) && (
            <button onClick={clearSelection} className="w-full sm:w-auto px-6 py-3 bg-slate-600 text-slate-100 rounded-md hover:bg-slate-700 transition-colors text-lg">
              Clear
            </button>
          )}
        </div>
        {error && (
          <div className="my-6 p-4 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-center">
            <p className="font-semibold">Error:</p> <p>{error}</p>
          </div>
        )}
        {infoMessage && !error && (
          <div className="my-6 p-4 bg-sky-900/30 border border-sky-700/50 rounded-md text-sky-200 text-center">
            <p>{infoMessage}</p>
          </div>
        )}
        {path.length > 0 && degrees !== null && degrees >= 0 && !error && (
          <div className="mt-8">
            {/* Title for results section is dynamic based on infoMessage or degrees; so only render here if no separate infoMessage */}
            {!infoMessage && (
                 <h2 className="text-2xl font-semibold mb-4 text-slate-100 text-center">
                    Connected in <span className="text-sky-400">{degrees} {degrees === 1 ? "Degree" : "Degrees"}</span>
                 </h2>
            )}
            <div className="space-y-4 lg:space-y-0 lg:grid lg:gap-4 auto-rows-fr">
              {links.map((link, index) => (
                <Fragment key={`link-segment-${link.sourcePlayerId}-${link.targetPlayerId}-${index}`}>
                  <div className="block lg:grid lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.5fr)_minmax(0,_1fr)] lg:items-stretch gap-4 p-2 bg-slate-800/30 rounded-lg">
                    <PlayerCard playerNode={{id: link.sourcePlayerId, name: link.sourcePlayerName}} />
                    <ConnectionDetailsCard linkDetail={link} />
                    <PlayerCard playerNode={{id: link.targetPlayerId, name: link.targetPlayerName}} />
                  </div>
                </Fragment>
              ))}
              {degrees === 0 && path.length === 1 && (
                  <div className="p-2 bg-slate-800/30 rounded-lg max-w-md mx-auto">
                      <PlayerCard playerNode={path[0]} />
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 4: Define a Loading Fallback UI
function LoadingState() {
  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100">
      <div className="container mx-auto p-4 text-slate-100 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-sky-400">
          Nine Degrees
        </h1>
        {/* Basic loading text, you can replace with a spinner or more elaborate skeleton UI */}
        <p className="text-xl text-slate-300">Loading page and connections...</p>
      </div>
    </div>
  );
}

// Step 5: The default export for the page (Server Component)
export default function DegreesOfSeparationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DegreesOfSeparationClientContent />
    </Suspense>
  );
}