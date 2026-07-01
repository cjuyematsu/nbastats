// app/HomeCompareHero.tsx

'use client';

import Link from 'next/link';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { supabase } from '@/lib/supabaseClient';
import { PlayerSuggestion, CareerStatsData } from '@/types/stats';
import { getTodaysMatchup } from '@/app/data/featuredMatchups';

export interface HeroSide {
  name: string;
  stats: CareerStatsData | null;
}

// Logo colors: green (left) and blue (right).
const COLOR_A = '#00b060';
const COLOR_B = '#0090b0';

const STAT_ROWS: { key: keyof CareerStatsData; label: string; isPct?: boolean }[] = [
  { key: 'pts_per_g', label: 'PPG' },
  { key: 'trb_per_g', label: 'RPG' },
  { key: 'ast_per_g', label: 'APG' },
  { key: 'fg_pct', label: 'FG%', isPct: true },
  { key: 'ts_pct', label: 'TS%', isPct: true },
];

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function fmt(v: number | null, isPct?: boolean): string {
  if (v === null) return 'N/A';
  return isPct ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);
}

function playerName(p: PlayerSuggestion): string {
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

async function fetchCareerStats(personId: number): Promise<CareerStatsData | null> {
  const { data } = await supabase.rpc('calculate_player_career_stats', { p_person_id: personId });
  return data && data.length > 0 ? (data[0] as CareerStatsData) : null;
}

async function resolveSide(name: string): Promise<HeroSide | null> {
  const { data } = await supabase.rpc('get_player_suggestions', { search_term: name });
  const p = data && data.length > 0 ? (data[0] as PlayerSuggestion) : null;
  if (!p) return null;
  const stats = await fetchCareerStats(p.personId);
  return { name: playerName(p), stats };
}

interface SearchBoxProps {
  displayName: string;
  onSelect: (p: PlayerSuggestion) => void;
  accentColor: string;
}

function PlayerSearchBox({ displayName, onSelect, accentColor }: SearchBoxProps) {
  const [term, setTerm] = useState(displayName);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTerm(displayName);
  }, [displayName]);

  const debouncedFetch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.rpc('get_player_suggestions', { search_term: query });
        setSuggestions(data || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350),
    []
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pick = (p: PlayerSuggestion) => {
    setTerm(playerName(p));
    setOpen(false);
    onSelect(p);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
      <input
        type="text"
        value={term}
        placeholder="Search a player..."
        onChange={(e) => {
          setTerm(e.target.value);
          debouncedFetch(e.target.value);
        }}
        onFocus={() => term.length >= 2 && suggestions.length > 0 && setOpen(true)}
        className="w-full pl-8 pr-9 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-t-2 border-b-2 border-sky-600 rounded-full animate-spin" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {suggestions.map((p) => (
            <li
              key={`${p.personId}-${p.startYear}-${p.endYear}`}
              onClick={() => pick(p)}
              className="p-2 text-sm cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-sky-500 hover:text-white group"
            >
              <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-white">
                {p.firstName} {p.lastName}
              </span>
              {p.startYear && p.endYear && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 group-hover:text-sky-100">
                  ({p.startYear}-{p.endYear})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatBars({
  statsA,
  statsB,
  loading,
}: {
  statsA: CareerStatsData | null;
  statsB: CareerStatsData | null;
  loading: boolean;
}) {
  return (
    <div className="mt-5 space-y-3">
      {STAT_ROWS.map((row) => {
        const va = toNum(statsA?.[row.key]);
        const vb = toNum(statsB?.[row.key]);
        const max = Math.max(va ?? 0, vb ?? 0) || 1;
        const aPct = ((va ?? 0) / max) * 100;
        const bPct = ((vb ?? 0) / max) * 100;
        const aWins = va !== null && vb !== null && va > vb;
        const bWins = va !== null && vb !== null && vb > va;
        return (
          <div key={String(row.key)} className="grid grid-cols-[1fr_3rem_1fr] items-center gap-2">
            <div className="flex items-center justify-end gap-2">
              <span className={`text-sm tabular-nums ${aWins ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                {fmt(va, row.isPct)}
              </span>
              <div className="h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex justify-end">
                <div
                  className={`h-full rounded-full ${loading ? 'animate-pulse' : ''}`}
                  style={{ width: `${aPct}%`, backgroundColor: COLOR_A }}
                />
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-center">
              {row.label}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${loading ? 'animate-pulse' : ''}`}
                  style={{ width: `${bPct}%`, backgroundColor: COLOR_B }}
                />
              </div>
              <span className={`text-sm tabular-nums ${bWins ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                {fmt(vb, row.isPct)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface HomeCompareHeroProps {
  initialA: HeroSide | null;
  initialB: HeroSide | null;
}

export default function HomeCompareHero({ initialA, initialB }: HomeCompareHeroProps) {
  const [sideA, setSideA] = useState<HeroSide | null>(initialA);
  const [sideB, setSideB] = useState<HeroSide | null>(initialB);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  // Fallback only if the server could not preload the featured matchup.
  useEffect(() => {
    if (initialA || initialB) return;
    let cancelled = false;
    (async () => {
      const m = getTodaysMatchup();
      const [a, b] = await Promise.all([resolveSide(m.a), resolveSide(m.b)]);
      if (cancelled) return;
      setSideA(a);
      setSideB(b);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialA, initialB]);

  const selectA = async (p: PlayerSuggestion) => {
    const name = playerName(p);
    setSideA({ name, stats: null });
    setLoadingA(true);
    const stats = await fetchCareerStats(p.personId);
    setSideA({ name, stats });
    setLoadingA(false);
  };

  const selectB = async (p: PlayerSuggestion) => {
    const name = playerName(p);
    setSideB({ name, stats: null });
    setLoadingB(true);
    const stats = await fetchCareerStats(p.personId);
    setSideB({ name, stats });
    setLoadingB(false);
  };

  const nameA = sideA?.name ?? '';
  const nameB = sideB?.name ?? '';
  const compareHref =
    nameA && nameB
      ? `/compare?players=${encodeURIComponent(nameA)},${encodeURIComponent(nameB)}`
      : '/compare';

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
          Compare any two NBA players
        </h2>
        <span className="hidden sm:inline text-xs font-medium text-slate-400 dark:text-slate-500">
          Career averages
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
        <PlayerSearchBox displayName={nameA} onSelect={selectA} accentColor={COLOR_A} />
        <span className="hidden sm:block text-sm font-semibold text-slate-400 dark:text-slate-500 text-center">
          vs
        </span>
        <PlayerSearchBox displayName={nameB} onSelect={selectB} accentColor={COLOR_B} />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_3rem_1fr] items-center gap-2">
        <span className="text-sm font-semibold text-right truncate" style={{ color: COLOR_A }}>
          {nameA || 'Player 1'}
        </span>
        <span />
        <span className="text-sm font-semibold truncate" style={{ color: COLOR_B }}>
          {nameB || 'Player 2'}
        </span>
      </div>

      <StatBars statsA={sideA?.stats ?? null} statsB={sideB?.stats ?? null} loading={loadingA || loadingB} />

      <div className="mt-6 text-center">
        <Link
          href={compareHref}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          Full comparison
        </Link>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Add up to five players, switch stats, toggle playoffs.
        </p>
      </div>
    </section>
  );
}
