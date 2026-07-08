'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CareerStatsData, SelectedPlayerForComparison } from '@/types/stats';
import { COMPARE_TABLE_ROWS, rowLeaderFlags } from '@/lib/compareCareer';

interface CompareCareerTableProps {
  players: { player: SelectedPlayerForComparison; color: string }[];
  seasonType: 'regular' | 'playoffs';
  isDarkMode: boolean;
}

export default function CompareCareerTable({ players, seasonType, isDarkMode }: CompareCareerTableProps) {
  const [stats, setStats] = useState<Record<string, CareerStatsData | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef(new Map<string, CareerStatsData | null>());

  const idsKey = players.map((p) => p.player.personId).join(',');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    if (ids.length === 0) {
      setStats({});
      return;
    }
    let cancelled = false;

    const load = async () => {
      const missing = ids.filter((id) => !cacheRef.current.has(`${id}-${seasonType}`));
      if (missing.length > 0) {
        setIsLoading(true);
        await Promise.all(missing.map(async (id) => {
          try {
            const { data, error } = await supabase.rpc(
              seasonType === 'regular' ? 'calculate_player_career_stats' : 'calculate_player_career_playoff_stats',
              { p_person_id: id },
            );
            if (error) throw error;
            const row = Array.isArray(data) && data.length > 0 ? (data[0] as unknown as CareerStatsData) : null;
            cacheRef.current.set(`${id}-${seasonType}`, row);
          } catch (e) {
            console.error(`Error fetching career stats for ${id}:`, e);
            cacheRef.current.set(`${id}-${seasonType}`, null);
          }
        }));
      }
      if (cancelled) return;
      const next: Record<string, CareerStatsData | null> = {};
      for (const id of ids) next[String(id)] = cacheRef.current.get(`${id}-${seasonType}`) ?? null;
      setStats(next);
      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [idsKey, seasonType]);

  if (players.length === 0) return null;

  const columns = players.map(({ player, color }) => ({
    color,
    name: `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim(),
    stats: stats[String(player.personId)] ?? null,
  }));

  const wrapperClasses = isDarkMode
    ? 'overflow-x-auto shadow-md rounded-lg border border-slate-600'
    : 'overflow-x-auto shadow-md rounded-lg border border-gray-200';
  const theadClasses = isDarkMode ? 'bg-slate-600' : 'bg-gray-50';
  const thClasses = isDarkMode
    ? 'px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider'
    : 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider';
  const tbodyClasses = isDarkMode
    ? 'bg-slate-700 divide-y divide-slate-600'
    : 'bg-white divide-y divide-gray-200';
  const labelCellClasses = isDarkMode
    ? 'px-4 py-2 whitespace-nowrap text-sm text-slate-300'
    : 'px-4 py-2 whitespace-nowrap text-sm text-slate-600';
  const valueCellClasses = isDarkMode
    ? 'px-4 py-2 text-right text-sm font-mono text-slate-100'
    : 'px-4 py-2 text-right text-sm font-mono text-slate-800';
  const leaderCellClasses = isDarkMode
    ? 'px-4 py-2 text-right text-sm font-mono font-semibold bg-sky-900/40 text-sky-300'
    : 'px-4 py-2 text-right text-sm font-mono font-semibold bg-sky-100 text-sky-800';

  return (
    <div className="mt-6">
      {isLoading && (
        <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading career stats...</p>
      )}
      <div className={wrapperClasses}>
        <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-600' : 'divide-gray-200'}`}>
          <thead className={theadClasses}>
            <tr>
              <th className={`${thClasses} text-left`}>
                Career ({seasonType === 'regular' ? 'Regular Season' : 'Playoffs'})
              </th>
              {columns.map((c) => (
                <th key={c.name} className={`${thClasses} text-right`}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-baseline" style={{ backgroundColor: c.color }} />
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tbodyClasses}>
            {COMPARE_TABLE_ROWS.map((row) => {
              const values = columns.map((c) => (c.stats ? row.get(c.stats) : null));
              const leaders = rowLeaderFlags(values);
              return (
                <tr key={row.key}>
                  <td className={labelCellClasses}>{row.label}</td>
                  {values.map((v, i) => (
                    <td key={`${row.key}-${columns[i].name}`} className={leaders[i] ? leaderCellClasses : valueCellClasses}>
                      {v != null ? row.format(v) : 'N/A'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
