//app/degrees-of-seperation/DegreesOfSeparationClient.tsx

'use client';

import { Suspense, useState, useCallback, Fragment, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import HeaderSearchBar from '@/components/HeaderSearchBar';
import type { PlayerSuggestion } from '@/types/stats';

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

const useThemeDetector = () => {
    const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return isDarkMode;
};


const PlayerCard = ({ playerNode, className, linkClassName }: { playerNode: PathNode, className: string, linkClassName: string }) => {
  return (
    <div className={className}>
      <Link href={`/player/${playerNode.id}`} className={linkClassName}>
        {playerNode.name}
      </Link>
    </div>
  );
};

const ConnectionDetailsCard = ({ linkDetail, className, labelClassName, valueClassName }: { linkDetail: LinkDetail, className: string, labelClassName: string, valueClassName: string }) => {
  return (
    <div className={className}>
      {linkDetail.startYearTogether && (
        <div className="mb-3">
          <p className={labelClassName}>FIRST YEAR AS TEAMMATES</p>
          <p className={valueClassName}>{linkDetail.startYearTogether}</p>
        </div>
      )}
      <div className="mb-2">
        <p className={labelClassName}>SHARED TEAMS</p>
        <p className="text-md">{linkDetail.sharedTeams}</p>
      </div>
      <div>
        <p className={labelClassName}>RECORD TOGETHER</p>
        <p className="text-md">{linkDetail.sharedGamesRecord}</p>
      </div>
    </div>
  );
};


function DegreesOfSeparationClientContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedStartPlayer, setSelectedStartPlayer] = useState<PlayerSuggestion | null>(null);
  const [selectedEndPlayer, setSelectedEndPlayer] = useState<PlayerSuggestion | null>(null);
  const [path, setPath] = useState<PathNode[]>([]);
  const [links, setLinks] = useState<LinkDetail[]>([]);
  const [degrees, setDegrees] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  
  const isDarkMode = useThemeDetector();

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
        const storedP1Id = parsedResults.searchedPlayerIds?.p1;
        const storedP2Id = parsedResults.searchedPlayerIds?.p2;

        if (queryP1Id === storedP1Id && queryP2Id === storedP2Id) {
          setPath(parsedResults.path || []);
          setDegrees(parsedResults.degrees !== undefined ? parsedResults.degrees : null);
          setLinks(parsedResults.links || []);
          setError(null); 
          if (parsedResults.degrees === 0 && parsedResults.path.length === 1) {
            setInfoMessage(`${parsedResults.path[0].name} is the selected player.`);
          } else if (parsedResults.path.length > 0 && typeof parsedResults.degrees === 'number' && parsedResults.degrees >= 0) {
            setInfoMessage(`Connection found in ${parsedResults.degrees} ${parsedResults.degrees === 1 ? 'degree' : 'degrees'}.`);
          } else if (parsedResults.message) {
            setInfoMessage(parsedResults.message);
          }
        } else {
          sessionStorage.removeItem('dos_results');
        }
      } catch (e) { 
        console.error("Error parsing results from session storage:", e); 
        sessionStorage.removeItem('dos_results');
      }
    }
  }, [searchParams]);

  const handleFindConnection = useCallback(async () => {
    if (!selectedStartPlayer || !selectedEndPlayer) { setError('Please select both players.'); return; }
    const startIdStr = String(selectedStartPlayer.personId);
    const endIdStr = String(selectedEndPlayer.personId);

    const newParams = new URLSearchParams(searchParams?.toString());
    newParams.set('p1', startIdStr);
    newParams.set('p2', endIdStr);
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    
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

    setIsLoading(true); setError(null); setInfoMessage(null);

    try {
      const response = await fetch('/api/degrees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startPlayerId: selectedStartPlayer.personId, endPlayerId: selectedEndPlayer.personId }),
      });
      const result: ApiSuccessResponse | ApiErrorOrMessageResponse = await response.json();
      
      if (result.searchedPlayerIds?.p1 !== startIdStr || result.searchedPlayerIds?.p2 !== endIdStr) {
          console.warn("Received stale search result, ignoring.");
          setIsLoading(false);
          return;
      }
      sessionStorage.setItem('dos_results', JSON.stringify(result)); 

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
        sessionStorage.removeItem('dos_results');
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
  
  if (isDarkMode === null) {
    return null;
  }
  const mainContainerClasses = isDarkMode 
    ? "w-full bg-gray-800 rounded-lg text-slate-100" 
    : "w-full bg-white rounded-lg text-gray-800";
  const textColor = isDarkMode ? "text-slate-100" : "text-gray-900";
  const mutedTextColor = isDarkMode ? "text-slate-400" : "text-gray-500";
  const labelColor = isDarkMode ? "text-gray-300" : "text-gray-600";
  const highlightColor = isDarkMode ? "text-sky-400" : "text-sky-600";
  const highlightHoverColor = isDarkMode ? "hover:text-sky-300" : "hover:text-sky-500";
  const clearButtonClasses = isDarkMode 
    ? "w-full sm:w-auto px-6 py-3 bg-slate-600 text-slate-100 rounded-md hover:bg-slate-700 transition-colors text-lg" 
    : "w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-lg";
  const errorBoxClasses = isDarkMode
    ? "my-6 p-4 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-center"
    : "my-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-center";
  const infoBoxClasses = isDarkMode
    ? "my-6 p-4 bg-sky-900/30 border border-sky-700/50 rounded-md text-sky-400 text-center"
    : "my-6 p-4 bg-sky-50 border border-sky-200 rounded-md text-sky-700 text-center";
  const linkSegmentContainerClasses = isDarkMode 
    ? "block lg:grid lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.5fr)_minmax(0,_1fr)] lg:items-stretch gap-4 p-2 bg-slate-800/30 rounded-lg"
    : "block lg:grid lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.5fr)_minmax(0,_1fr)] lg:items-stretch gap-4 p-2 bg-gray-100 rounded-lg";
  const playerCardClasses = isDarkMode
    ? "bg-slate-700 border border-slate-500 rounded-lg shadow-lg p-4 flex flex-col justify-center h-full transition-all hover:shadow-sky-500/30 hover:border-sky-500/50"
    : "bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex flex-col justify-center h-full transition-all hover:shadow-sky-500/20 hover:border-sky-400";
  const playerCardLinkClasses = `text-xl text-center font-bold leading-tight cursor-pointer ${textColor} ${highlightHoverColor}`;
  const connectionCardClasses = isDarkMode
    ? "bg-slate-800 border border-slate-600 rounded-lg shadow-md p-4 md:p-6 flex flex-col justify-center items-center text-center h-full text-slate-300"
    : "bg-gray-50 border border-gray-200 rounded-lg shadow-md p-4 md:p-6 flex flex-col justify-center items-center text-center h-full text-gray-700";
  const connectionLabelClasses = `text-xs font-bold ${highlightColor}`;
  const connectionValueClasses = `text-lg font-bold ${highlightColor}`;

  return (
    <div className={`${mainContainerClasses} rounded-lg border border-gray-200 dark:border-gray-700`}>
      <div className={`container mx-auto p-4 min-h-screen ${textColor}`}>
        <h1 className={`mt-4 text-4xl font-bold sm:text-5xl md:text-6xl text-center mb-3 ${highlightColor}`}>
            NBA Player Connection Explorer
        </h1>
        <h2 className={`text-xl font-bold sm:text-2xl text-center mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
          The max separation between any two players is nine degrees.
        </h2>
        <h3>
          
        </h3>
        <p className={`text-lg sm:text-xl text-center mb-8 ${mutedTextColor}`}>
          Can you find one?
        </p>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 mb-6 items-start">
          <div>
            <label htmlFor="startPlayerSearch" className={`block text-sm font-medium mb-1 ${labelColor}`}>Select Start Player</label>
            <HeaderSearchBar onPlayerSelected={(player) => { setSelectedStartPlayer(player); setError(null); setInfoMessage(null); setPath([]); setDegrees(null); setLinks([]);}} />
            {selectedStartPlayer && (
              <p className={`text-sm mt-2 ${mutedTextColor}`}>
                Selected: <Link href={`/player/${selectedStartPlayer.personId}`} className={`font-bold ${highlightColor} ${highlightHoverColor}`}>{`${selectedStartPlayer.firstName} ${selectedStartPlayer.lastName}`}</Link>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="endPlayerSearch" className={`block text-sm font-medium mb-1 ${labelColor}`}>Select End Player</label>
            <HeaderSearchBar onPlayerSelected={(player) => { setSelectedEndPlayer(player); setError(null); setInfoMessage(null); setPath([]); setDegrees(null); setLinks([]);}} />
            {selectedEndPlayer && (
              <p className={`text-sm mt-2 ${mutedTextColor}`}>
                Selected: <Link href={`/player/${selectedEndPlayer.personId}`} className={`font-bold ${highlightColor} ${highlightHoverColor}`}>{`${selectedEndPlayer.firstName} ${selectedEndPlayer.lastName}`}</Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
          <button onClick={handleFindConnection} disabled={isLoading || !selectedStartPlayer || !selectedEndPlayer} className={`w-full sm:w-auto px-6 py-3 rounded-md transition-colors text-lg font-bold ${isDarkMode ? 'bg-sky-600 text-white hover:bg-sky-700 disabled:bg-slate-500' : 'bg-sky-500 text-white hover:bg-sky-700 disabled:bg-gray-400'} disabled:cursor-not-allowed`}>
            {isLoading ? 'Searching...' : 'Find Connection'}
          </button>
          {(selectedStartPlayer || selectedEndPlayer || path.length > 0 || error || infoMessage) && (
            <button onClick={clearSelection} className={clearButtonClasses}>
              Clear
            </button>
          )}
        </div>
        {error && <div className={errorBoxClasses}><p className="font-bold">Error:</p> <p>{error}</p></div>}
        {infoMessage && !error && <div className={infoBoxClasses}><p>{infoMessage}</p></div>}
        
        {path.length > 0 && degrees !== null && degrees >= 0 && !error && (
          <div className="mt-8">
            {!infoMessage && (
                 <h2 className={`text-2xl font-bold mb-4 text-center ${textColor}`}>
                    Connected in <span className={highlightColor}>{degrees} {degrees === 1 ? "Degree" : "Degrees"}</span>
                 </h2>
            )}
            <div className="space-y-4 lg:space-y-0 lg:grid lg:gap-4 auto-rows-fr">
              {links.map((link, index) => (
                <Fragment key={`link-segment-${link.sourcePlayerId}-${link.targetPlayerId}-${index}`}>
                  <div className={linkSegmentContainerClasses}>
                    <PlayerCard playerNode={{id: link.sourcePlayerId, name: link.sourcePlayerName}} className={playerCardClasses} linkClassName={playerCardLinkClasses} />
                    <ConnectionDetailsCard linkDetail={link} className={connectionCardClasses} labelClassName={connectionLabelClasses} valueClassName={connectionValueClasses} />
                    <PlayerCard playerNode={{id: link.targetPlayerId, name: link.targetPlayerName}} className={playerCardClasses} linkClassName={playerCardLinkClasses} />
                  </div>
                </Fragment>
              ))}
              {degrees === 0 && path.length === 1 && (
                  <div className={`p-2 rounded-lg max-w-md mx-auto ${isDarkMode ? 'bg-slate-800/30' : 'bg-gray-100'}`}>
                      <PlayerCard playerNode={path[0]} className={playerCardClasses} linkClassName={playerCardLinkClasses} />
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  const isDarkMode = useThemeDetector();

  if (isDarkMode === null) {
      return (
        <div className="w-full bg-transparent">
           <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
              <p className="text-xl text-gray-500 dark:text-gray-400">Loading Connections...</p>
           </div>
        </div>
      );
  }

  const mainContainerClasses = isDarkMode 
    ? "w-full bg-gray-800 text-slate-100" 
    : "w-full bg-white text-gray-800";
  const highlightColor = isDarkMode ? "text-sky-400" : "text-sky-600";
  const textColor = isDarkMode ? "text-slate-300" : "text-gray-600";
  
  return (
    <div className={mainContainerClasses}>
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <h1 className={`text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center ${highlightColor}`}>
          Nine Degrees
        </h1>
        <p className={`text-xl ${textColor}`}>Loading page and connections...</p>
      </div>
    </div>
  );
}

export default function DegreesOfSeparationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DegreesOfSeparationClientContent />
    </Suspense>
  );
}