// lib/compareCareer.ts
//
// Shared career-table row definitions for /compare/[matchup] (server table)
// and CompareCareerTable (client table) so the two never drift.

import { CareerStatsData } from '@/types/stats';

export interface CompareTableRow {
  key: string;
  label: string;
  get: (s: CareerStatsData) => number | null | undefined;
  format: (v: number) => string;
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
  { key: 'fg_pct', label: 'Field Goal %', get: (s) => s.fg_pct, format: pct },
  { key: 'fg3_pct', label: '3-Point %', get: (s) => s.fg3_pct, format: pct },
  { key: 'ts_pct', label: 'True Shooting %', get: (s) => s.ts_pct, format: pct },
];

// Marks the leader(s) in a row. All row stats are higher-is-better. Nulls never
// lead, ties all lead, and a row with fewer than two comparable values has no leader.
export function rowLeaderFlags(values: (number | null | undefined)[]): boolean[] {
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) return values.map(() => false);
  const max = Math.max(...present);
  return values.map((v) => v != null && v === max);
}
