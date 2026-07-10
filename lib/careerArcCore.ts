// lib/careerArcCore.ts
//
// Pure Career Arc pieces (no supabase import) so tests can load them directly.

export interface CareerArcSeasonRow {
  SeasonYear: number | null;
  G: number | null;
  PTS_total: number | null;
  PTS_per_g: number | null;
  playerteamName: string | null;
}

export interface CareerArcPoint {
  year: number;
  ppg: number;
}

export interface CareerArcReveal {
  label: string;
  value: string;
}

// Traded seasons appear as one row per team; collapse to one point per season.
export function buildCareerArcSeries(rows: CareerArcSeasonRow[]): CareerArcPoint[] {
  const byYear = new Map<number, { pts: number; g: number; bestG: number; bestPerG: number | null }>();
  for (const r of rows) {
    if (r.SeasonYear == null) continue;
    const agg = byYear.get(r.SeasonYear) ?? { pts: 0, g: 0, bestG: -1, bestPerG: null };
    if (r.PTS_total != null && r.G != null) {
      agg.pts += r.PTS_total;
      agg.g += r.G;
    }
    if ((r.G ?? 0) > agg.bestG) {
      agg.bestG = r.G ?? 0;
      agg.bestPerG = r.PTS_per_g;
    }
    byYear.set(r.SeasonYear, agg);
  }
  return [...byYear.entries()]
    .map(([year, agg]) => {
      const ppg = agg.g > 0 ? agg.pts / agg.g : agg.bestPerG;
      return ppg == null ? null : { year, ppg: Math.round(ppg * 10) / 10 };
    })
    .filter((p): p is CareerArcPoint => p !== null)
    .sort((a, b) => a.year - b.year);
}

export function teamsInOrder(rows: CareerArcSeasonRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of [...rows].sort((a, b) => (a.SeasonYear ?? 0) - (b.SeasonYear ?? 0))) {
    const team = r.playerteamName;
    if (team && !seen.has(team)) {
      seen.add(team);
      out.push(team);
    }
  }
  return out;
}

export function assembleReveals({
  draftRow,
  teams,
  teammateName,
  seasonCount,
}: {
  draftRow: { Year: number | null; Round: number | null; Pick: number | null; school: string | null } | null;
  teams: string[];
  teammateName: string | null;
  seasonCount: number;
}): CareerArcReveal[] {
  return [
    {
      label: 'Draft',
      value: draftRow?.Year
        ? `Drafted ${draftRow.Year}${draftRow.Pick ? `, Round ${draftRow.Round ?? 1} Pick ${draftRow.Pick}` : ''}`
        : 'Went undrafted',
    },
    {
      label: 'Teams',
      value: teams.length > 0 ? teams.join(', ') : `${seasonCount} NBA seasons`,
    },
    {
      label: 'Teammate',
      value: teammateName ? `Played the most games with ${teammateName}` : 'Teammate data unavailable',
    },
    {
      label: 'Pre-NBA team',
      value: draftRow?.school ? draftRow.school : 'Unknown',
    },
  ];
}
