// lib/teamLogos.ts
//
// Maps a full team name to one of the local logo PNGs in public/. Only files
// that actually exist are returned (see TEAM_LOGO_FILES) so we never render a
// broken <img>; unknown names return null and the caller shows a text chip.
// The scheme matches the existing stat-over-under game: last word of the name,
// lowercased, with Trail Blazers special-cased.

// Basenames present in public/ (kept in sync by hand; PNGs rarely change).
const TEAM_LOGO_FILES = new Set([
  '76ers', 'blackhawks', 'bobcats', 'braves', 'bucks', 'bullets', 'bulls',
  'cavaliers', 'celtics', 'clippers', 'grizzlies', 'hawks', 'heat', 'hornets',
  'jazz', 'kings', 'knicks', 'lakers', 'magic', 'mavericks', 'nationals', 'nets',
  'nuggets', 'pacers', 'packers', 'pelicans', 'pistons', 'raptors', 'rockets',
  'royals', 'spurs', 'suns', 'supersonics', 'thunder', 'timberwolves',
  'trailblazers', 'warriors', 'wizards', 'zephyrs',
]);

// Rows for a traded/aggregated season aren't a real team.
const NON_TEAM = /^(tot|total|\d?tm)$/i;

export function teamLogo(teamName: string | null | undefined): string | null {
  if (!teamName) return null;
  const name = teamName.trim();
  if (NON_TEAM.test(name)) return null;
  if (name.toLowerCase().includes('trail blazers')) return '/trailblazers.png';
  const parts = name.split(/\s+/);
  const base = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
  return TEAM_LOGO_FILES.has(base) ? `/${base}.png` : null;
}

export interface TeamStint {
  team: string;
  logo: string | null;
  startYear: number;
  endYear: number;
}

// Collapses season rows into an ordered list of team stints (consecutive
// seasons on the same team merge into one span). Aggregated/traded rows (TOT,
// 2TM) are skipped so the timeline shows real franchises.
export function teamTimeline(
  seasons: { SeasonYear: number; playerteamName: string | null }[],
): TeamStint[] {
  const rows = [...seasons]
    .filter((s) => s.playerteamName && !NON_TEAM.test(s.playerteamName.trim()))
    .sort((a, b) => a.SeasonYear - b.SeasonYear);

  const out: TeamStint[] = [];
  for (const s of rows) {
    const team = s.playerteamName as string;
    const last = out[out.length - 1];
    if (last && last.team === team) {
      last.endYear = s.SeasonYear;
    } else {
      out.push({ team, logo: teamLogo(team), startYear: s.SeasonYear, endYear: s.SeasonYear });
    }
  }
  return out;
}
