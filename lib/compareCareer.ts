// lib/compareCareer.ts
//
// Shared career-table row definitions for /compare/[matchup] (server table)
// and CompareCareerTable (client table) so the two never drift.

import { CareerStatsData } from '@/types/stats';
import { isCareerStatDisplayable, type PercentileKey } from '@/lib/percentiles';

export interface CompareTableRow {
  key: string;
  label: string;
  get: (s: CareerStatsData) => number | null | undefined;
  format: (v: number) => string;
  // When set, the value is dashed for players whose career predates reliable
  // era-wide data for this stat (see lib/percentiles).
  eraKey?: PercentileKey;
}

const int = (v: number) => v.toLocaleString();
const dec = (v: number) => v.toFixed(1);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export const COMPARE_TABLE_ROWS: CompareTableRow[] = [
  { key: 'games_played', label: 'Games Played', get: (s) => s.games_played, format: int },
  { key: 'pts_total', label: 'Career Points', get: (s) => s.pts_total, format: int },
  { key: 'pts_per_g', label: 'Points Per Game', get: (s) => s.pts_per_g, format: dec },
  { key: 'trb_per_g', label: 'Rebounds Per Game', get: (s) => s.trb_per_g, format: dec },
  { key: 'ast_per_g', label: 'Assists Per Game', get: (s) => s.ast_per_g, format: dec },
  { key: 'fg_pct', label: 'Field Goal %', get: (s) => s.fg_pct, format: pct, eraKey: 'fg_pct' },
  { key: 'fg3_pct', label: '3-Point %', get: (s) => s.fg3_pct, format: pct, eraKey: 'fg3_pct' },
  { key: 'ts_pct', label: 'True Shooting %', get: (s) => s.ts_pct, format: pct, eraKey: 'ts_pct' },
];

// The comparable numeric value for leader math: null when the player is missing
// the stat, it predates reliable era-wide data, OR its make/attempt pair doesn't
// hold together (so a 1300% shooter never wins a comparison).
export function compareRowValue(row: CompareTableRow, stats: CareerStatsData | null): number | null {
  if (!stats) return null;
  if (row.eraKey && !isCareerStatDisplayable(stats, row.eraKey)) return null;
  return row.get(stats) ?? null;
}

// Display text for a cell: a dash for era-unreliable or self-contradictory
// stats, "N/A" for a stat the player otherwise lacks, else the formatted value.
export function compareRowText(row: CompareTableRow, stats: CareerStatsData | null): string {
  if (stats && row.eraKey && !isCareerStatDisplayable(stats, row.eraKey)) return '-';
  const v = compareRowValue(row, stats);
  return v != null ? row.format(v) : 'N/A';
}

// Marks the leader(s) in a row. All row stats are higher-is-better. Nulls never
// lead, ties all lead, and a row with fewer than two comparable values has no leader.
export function rowLeaderFlags(values: (number | null | undefined)[]): boolean[] {
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) return values.map(() => false);
  const max = Math.max(...present);
  return values.map((v) => v != null && v === max);
}
