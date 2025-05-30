// app/api/degrees/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Adjust path if your client is elsewhere

// --- Type Definitions ---
interface Player {
    id: number;
    name: string;
}

interface LinkDetailApi {
  sourcePlayerId: number;
  sourcePlayerName: string;
  targetPlayerId: number;
  targetPlayerName: string;
  sharedTeams: string;
  sharedGamesRecord: string;
  startYearTogether?: number;
}

interface BFSResult {
    path: Player[];
    degrees: number;
    links: LinkDetailApi[];
    searchedPlayerIds?: { p1: string; p2: string };
}

// --- In-memory cache, loadGraphData ---
let adjList: Record<string, number[]> | null = null;
let playerMap: Record<string, string> | null = null;
let graphDataLoaded = false;

async function loadGraphData(): Promise<{ adjList: Record<string, number[]>; playerMap: Record<string, string> }> {
    if (graphDataLoaded && adjList && playerMap) {
        return { adjList: adjList!, playerMap: playerMap! };
    }
    console.log("Attempting to load graph data from JSON files...");
    try {
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const adjResponse = await fetch(`${baseUrl}/adjacency_list.json`);
        if (!adjResponse.ok) throw new Error(`Failed to fetch adjacency_list.json: ${adjResponse.status} ${adjResponse.statusText}`);
        const localAdjList = await adjResponse.json() as Record<string, number[]>;

        const mapResponse = await fetch(`${baseUrl}/player_map.json`);
        if (!mapResponse.ok) throw new Error(`Failed to fetch player_map.json: ${mapResponse.status} ${mapResponse.statusText}`);
        const localPlayerMap = await mapResponse.json() as Record<string, string>;

        if (typeof localAdjList !== 'object' || localAdjList === null ) {
             throw new Error("Adjacency list data is not in the expected object format or is null.");
        }
        if (typeof localPlayerMap !== 'object' || localPlayerMap === null ) {
             throw new Error("Player map data is not in the expected object format or is null.");
        }

        adjList = localAdjList;
        playerMap = localPlayerMap;
        graphDataLoaded = true;
        console.log("Graph data from JSON loaded and cached successfully.");
        return { adjList, playerMap };
    } catch (error) {
        console.error("Error loading graph data from JSON in loadGraphData:", error);
        adjList = null; playerMap = null; graphDataLoaded = false;
        if (error instanceof Error) throw new Error(`Failed to load graph data: ${error.message}`);
        throw new Error(`Failed to load graph data: ${String(error)}`);
    }
}


// --- Breadth-First Search (BFS) Implementation ---
async function performBFS(
    startNodeIdStr: string,
    endNodeIdStr: string,
    currentAdjList: Record<string, number[]>,
    currentPlayerMap: Record<string, string>
): Promise<BFSResult | null> {
    const startNodeIdNum = parseInt(startNodeIdStr, 10);
    const endNodeIdNum = parseInt(endNodeIdStr, 10);

    if (isNaN(startNodeIdNum) || isNaN(endNodeIdNum)) {
        console.error("BFS Error: Invalid player IDs (not numbers)."); return null;
    }
    const startPlayerName = currentPlayerMap[startNodeIdStr];
    const endPlayerName = currentPlayerMap[endNodeIdStr];
    if (!startPlayerName || !endPlayerName) { return null; }

    const searchedPlayerIds = { p1: startNodeIdStr, p2: endNodeIdStr };
    if (startNodeIdNum === endNodeIdNum) {
        return { path: [{ id: startNodeIdNum, name: startPlayerName }], degrees: 0, links: [], searchedPlayerIds };
    }

    const queue: { nodeId: number; currentNumericPath: number[] }[] = [{ nodeId: startNodeIdNum, currentNumericPath: [startNodeIdNum] }];
    const visited = new Set<number>([startNodeIdNum]);
    const maxDegrees = 6;

    while (queue.length > 0) {
        const { nodeId: currentNodeId, currentNumericPath } = queue.shift()!;
        if (currentNumericPath.length - 1 >= maxDegrees) continue;

        const neighbors = currentAdjList[String(currentNodeId)] || [];
        for (const neighborIdNum of neighbors) {
            if (!visited.has(neighborIdNum)) {
                visited.add(neighborIdNum);
                const newNumericPath = [...currentNumericPath, neighborIdNum];

                if (neighborIdNum === endNodeIdNum) {
                    const pathWithNames: Player[] = newNumericPath.map(idNum => ({
                        id: idNum, name: currentPlayerMap[String(idNum)] || "Unknown Player"
                    }));
                    const linksDetails: LinkDetailApi[] = [];

                    for (let i = 0; i < pathWithNames.length - 1; i++) {
                        const sourcePlayer = pathWithNames[i];
                        const targetPlayer = pathWithNames[i+1];
                        const queryPlayerID = Math.min(sourcePlayer.id, targetPlayer.id);
                        const queryTeammateID = Math.max(sourcePlayer.id, targetPlayer.id);

                        let sharedTeamsData = "Details N/A";
                        let sharedGamesRecordData = "Details N/A";
                        let startYearData: number | undefined = undefined;

                        try {
                            const { data: teammateData, error: dbError } = await supabase
                                .from('teammates')
                                .select('SharedTeams, SharedGamesRecord, StartYearTogether')
                                .eq('PlayerID', queryPlayerID)
                                .eq('TeammateID', queryTeammateID)
                                .single();

                            if (dbError) {
                                if (dbError.code === 'PGRST116') {
                                     console.warn(`No teammate data in Supabase for ${sourcePlayer.name} & ${targetPlayer.name}`);
                                } else {
                                     console.error(`Supabase error for ${sourcePlayer.name} & ${targetPlayer.name}:`, dbError.message);
                                }
                            } else if (teammateData) {
                                sharedTeamsData = teammateData.SharedTeams || "Not specified";
                                sharedGamesRecordData = teammateData.SharedGamesRecord || "Not specified";
                                startYearData = teammateData.StartYearTogether ?? undefined;
                            } else {
                                console.warn(`No teammate data (null) from Supabase for ${sourcePlayer.name} & ${targetPlayer.name}`);
                            }
                        } catch (catchError: unknown) { // FIX 1: unknown type and safe message access
                            const errorMessage = catchError instanceof Error ? catchError.message : String(catchError);
                            console.error(`Exception fetching teammates data for ${sourcePlayer.name} & ${targetPlayer.name}:`, errorMessage);
                        }

                        linksDetails.push({
                            sourcePlayerId: sourcePlayer.id,
                            sourcePlayerName: sourcePlayer.name,
                            targetPlayerId: targetPlayer.id,
                            targetPlayerName: targetPlayer.name,
                            sharedTeams: sharedTeamsData,
                            sharedGamesRecord: sharedGamesRecordData,
                            startYearTogether: startYearData
                        });
                    }
                    return { path: pathWithNames, degrees: newNumericPath.length - 1, links: linksDetails, searchedPlayerIds };
                }
                if (newNumericPath.length - 1 < maxDegrees) {
                   queue.push({ nodeId: neighborIdNum, currentNumericPath: newNumericPath });
                }
            }
        }
    }
    return null;
}

// --- API POST Handler ---
export async function POST(request: Request) {
    const getRequestBody = async (req: Request): Promise<{startPlayerId?: string, endPlayerId?: string}> => {
        try { return await req.json(); } catch { return {}; }
    };
    const body = await getRequestBody(request);
    const { startPlayerId, endPlayerId } = body;
    const startIdStr = startPlayerId ? String(startPlayerId) : undefined;
    const endIdStr = endPlayerId ? String(endPlayerId) : undefined;
    const searchedPlayerIdsForError = { p1: startIdStr || "unknown", p2: endIdStr || "unknown" };

    try {
        if (!startIdStr || !endIdStr) {
            return NextResponse.json({ error: 'Start and End player IDs are required.', message: 'Start and End player IDs are required.', searchedPlayerIds: searchedPlayerIdsForError }, { status: 400 });
        }
        const searchedPlayerIds = { p1: startIdStr, p2: endIdStr };
        let currentGraphData;
        try {
            currentGraphData = await loadGraphData();
        } catch (loadError: unknown) { // FIX 3: unknown type and safe message access
            const details = loadError instanceof Error ? loadError.message : String(loadError);
            return NextResponse.json({
                error: 'Graph data (JSON) could not be loaded.',
                details: details,
                message: `Graph data (JSON) could not be loaded: ${details}`,
                searchedPlayerIds
            }, { status: 503 });
        }
        const { adjList: loadedAdjList, playerMap: loadedPlayerMap } = currentGraphData;
        if (!loadedPlayerMap[startIdStr] || !loadedPlayerMap[endIdStr]) {
            return NextResponse.json({ message: 'One or both players not found in our player mapping.', path: [], degrees: -1, links: [], searchedPlayerIds }, { status: 404 });
        }
        const result = await performBFS(startIdStr, endIdStr, loadedAdjList, loadedPlayerMap);
        if (result) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ message: 'No connection found within the allowed degrees.', path: [], degrees: -1, links: [], searchedPlayerIds });
        }
    } catch (error: unknown) { // FIX 4: unknown type
        console.error('API Error in /api/degrees POST handler:', error);
        // Existing instanceof check is good and works with unknown
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({
            error: 'An unexpected error occurred on the server.',
            details: errorMessage,
            message: `Server error: ${errorMessage}`,
            searchedPlayerIds: searchedPlayerIdsForError
        }, { status: 500 });
    }
}