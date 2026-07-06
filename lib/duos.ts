// lib/duos.ts
//
// Shared duo helpers used by the /duos tool (client) and /duos/[slug] pages (server).

export type DuoRow = {
  PlayerID: number;
  TeammateID: number;
  PlayerName: string | null;
  TeammateName: string;
  SharedGamesTotal: number | null;
  SharedGamesRecord: string | null;
  SharedTeams: string | null;
  StartYearTogether: number | null;
  EndYearTogether: number | null;
  CombinedPtsPerGame: number | null;
  CombinedAstPerGame: number | null;
  CombinedRebPerGame: number | null;
};

export function parseRecord(record: string | null): { wins: number; losses: number } | null {
  if (!record) return null;
  const m = record.match(/^\s*(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  return { wins: Number(m[1]), losses: Number(m[2]) };
}

// SharedTeams mixes in All-Star and Rising Stars squads (East, West, World,
// Team LeBron as "LeBron", ...). Keep only real franchises.
const NON_TEAM_TOKENS = new Set(['East', 'West', 'World', 'USA']);

export function cleanSharedTeams(sharedTeams: string | null, names: string[]): string | null {
  if (!sharedTeams) return null;
  const firstNames = names.map((n) => n.split(' ')[0]);
  const teams = sharedTeams
    .split(',')
    .map((s) => s.trim())
    .filter((t) => t && !NON_TEAM_TOKENS.has(t) && !firstNames.includes(t));
  return teams.length > 0 ? teams.join(', ') : null;
}
