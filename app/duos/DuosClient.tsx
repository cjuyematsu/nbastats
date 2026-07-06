// app/duos/DuosClient.tsx

'use client';

import Link from 'next/link';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { debounce } from 'lodash';
import { track } from '@vercel/analytics';
import { supabase } from '@/lib/supabaseClient';
import { PlayerSuggestion } from '@/types/stats';
import { type DuoRow, parseRecord, cleanSharedTeams } from '@/lib/duos';
import { buildDuoSlug } from '@/app/data/duoPages';

const COLOR_A = '#00b060';
const COLOR_B = '#0090b0';

type Picked = { id: number; name: string };

const FAMOUS_DUOS: [string, string][] = [
  ['Michael Jordan', 'Scottie Pippen'],
  ["Shaquille O'Neal", 'Kobe Bryant'],
  ['Stephen Curry', 'Klay Thompson'],
  ['LeBron James', 'Dwyane Wade'],
  ['Tim Duncan', 'Manu Ginobili'],
  ['Magic Johnson', 'Kareem Abdul-Jabbar'],
  ['Nikola Jokic', 'Jamal Murray'],
  ['John Stockton', 'Karl Malone'],
];

function playerName(p: PlayerSuggestion): string {
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

async function resolveName(name: string): Promise<Picked | null> {
  try {
    const { data } = await supabase.rpc('get_player_suggestions', { search_term: name });
    const p = data && data.length > 0 ? (data[0] as PlayerSuggestion) : null;
    return p ? { id: p.personId, name: playerName(p) } : null;
  } catch {
    return null;
  }
}

function PlayerSearch({
  picked,
  onSelect,
  placeholder,
  accentColor,
}: {
  picked: Picked | null;
  onSelect: (p: Picked) => void;
  placeholder: string;
  accentColor: string;
}) {
  const [term, setTerm] = useState(picked?.name ?? '');
  const [results, setResults] = useState<Picked[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTerm(picked?.name ?? '');
  }, [picked]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.rpc('get_player_suggestions', { search_term: query });
        setResults(
          (data || []).map((p: PlayerSuggestion) => ({ id: p.personId, name: playerName(p) }))
        );
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
      <input
        type="text"
        value={term}
        placeholder={placeholder}
        onChange={(e) => {
          setTerm(e.target.value);
          debouncedFetch(e.target.value);
        }}
        onFocus={() => term.length >= 2 && results.length > 0 && setOpen(true)}
        className="w-full pl-8 pr-9 py-2.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-t-2 border-b-2 border-sky-600 rounded-full animate-spin" />
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {results.map((r) => (
            <li
              key={r.id}
              onMouseDown={() => {
                setTerm(r.name);
                setResults([]);
                setOpen(false);
                onSelect(r);
              }}
              className="p-2 text-sm cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-800 dark:text-gray-200 hover:bg-sky-500 hover:text-white"
            >
              {r.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DuosClient() {
  const searchParams = useSearchParams();
  const [a, setA] = useState<Picked | null>(null);
  const [b, setB] = useState<Picked | null>(null);
  const [duo, setDuo] = useState<DuoRow | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_teammates' | 'same_player'>('idle');

  // Deep links: /duos?players=John+Stockton,Karl+Malone
  useEffect(() => {
    const q = searchParams.get('players');
    if (!q) return;
    const [nameA, nameB] = q.split(',').map((s) => s.trim());
    if (!nameA || !nameB) return;
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const [pa, pb] = await Promise.all([resolveName(nameA), resolveName(nameB)]);
      if (cancelled) return;
      if (pa && pb) {
        setA(pa);
        setB(pb);
      } else {
        setStatus('idle');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!a || !b) return;
    if (a.id === b.id) {
      setDuo(null);
      setStatus('same_player');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const lo = Math.min(a.id, b.id);
      const hi = Math.max(a.id, b.id);
      const { data } = await supabase
        .from('teammates')
        .select('*')
        .eq('PlayerID', lo)
        .eq('TeammateID', hi)
        .maybeSingle();
      if (cancelled) return;
      setDuo((data as DuoRow) ?? null);
      setStatus(data ? 'found' : 'not_teammates');
      track('duo_viewed', { found: !!data });
      // A real duo gets the crawlable/shareable permalink; non-teammates (no
      // page exists) keep the query-param URL.
      window.history.replaceState(
        null,
        '',
        data
          ? `/duos/${buildDuoSlug(a.name, b.name)}`
          : `/duos?players=${encodeURIComponent(a.name)},${encodeURIComponent(b.name)}`
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [a, b]);

  const pickFamousDuo = async (nameA: string, nameB: string) => {
    setStatus('loading');
    const [pa, pb] = await Promise.all([resolveName(nameA), resolveName(nameB)]);
    if (pa) setA(pa);
    if (pb) setB(pb);
    if (!pa || !pb) setStatus('idle');
  };

  const record = parseRecord(duo?.SharedGamesRecord ?? null);
  const winPct = record && record.wins + record.losses > 0
    ? ((record.wins / (record.wins + record.losses)) * 100).toFixed(1)
    : null;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          NBA Duos
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-slate-600 dark:text-slate-300">
          Pick any two players who shared a locker room and see how they did together:
          games played, win-loss record, and every team they suited up for side by side.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
        <PlayerSearch picked={a} onSelect={setA} placeholder="First player..." accentColor={COLOR_A} />
        <span className="hidden sm:block text-slate-400 dark:text-slate-500 font-bold">&amp;</span>
        <PlayerSearch picked={b} onSelect={setB} placeholder="Second player..." accentColor={COLOR_B} />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {FAMOUS_DUOS.map(([na, nb]) => (
          <button
            key={`${na}-${nb}`}
            onClick={() => pickFamousDuo(na, nb)}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all"
          >
            {na.split(' ').slice(-1)} &amp; {nb.split(' ').slice(-1)}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/60 p-6">
          <div className="flex justify-center mb-2">
            <div className="h-7 w-64 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          <div className="flex justify-center mb-6">
            <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          <div className="flex flex-wrap justify-around text-center gap-6 mb-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-8 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            <div className="h-10 w-40 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-10 w-40 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>
      )}

      {status === 'same_player' && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400 animate-fadeIn">
          Pick two different players.
        </div>
      )}

      {status === 'not_teammates' && a && b && (
        <div className="text-center py-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/60 animate-fadeIn">
          <p className="text-lg text-slate-700 dark:text-slate-200 font-semibold mb-2">
            {a.name} and {b.name} never played together.
          </p>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            But every NBA player is connected through someone.
          </p>
          <Link
            href="/degrees-of-separation"
            className="inline-block px-5 py-2 rounded-lg bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 text-white font-semibold transition-colors"
          >
            Find their connection
          </Link>
        </div>
      )}

      {status === 'found' && duo && a && b && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/60 p-6 animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-1">
            <Link href={`/player/${a.id}`} className="hover:underline" style={{ color: COLOR_A }}>
              {a.name}
            </Link>
            <span className="text-slate-400 dark:text-slate-500"> &amp; </span>
            <Link href={`/player/${b.id}`} className="hover:underline" style={{ color: COLOR_B }}>
              {b.name}
            </Link>
          </h2>
          {duo.StartYearTogether && duo.EndYearTogether && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
              Teammates from {duo.StartYearTogether} to {duo.EndYearTogether}
            </p>
          )}

          <div className="flex flex-wrap justify-around text-center gap-6 mb-6">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {duo.SharedGamesTotal?.toLocaleString() ?? 'N/A'}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Games Together</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {duo.SharedGamesRecord ?? 'N/A'}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Record Together</p>
            </div>
            {winPct && (
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{winPct}%</p>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Win Percentage</p>
              </div>
            )}
          </div>

          {duo.CombinedPtsPerGame != null && (
            <div className="mb-6">
              <p className="text-center text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                Combined per game
              </p>
              <div className="flex flex-wrap justify-around text-center gap-6">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {duo.CombinedPtsPerGame.toFixed(1)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Points</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {duo.CombinedAstPerGame?.toFixed(1) ?? 'N/A'}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Assists</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {duo.CombinedRebPerGame?.toFixed(1) ?? 'N/A'}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rebounds</p>
                </div>
              </div>
            </div>
          )}

          {cleanSharedTeams(duo.SharedTeams, [a.name, b.name]) && (
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Shared Teams</p>
              <p className="text-slate-800 dark:text-slate-200">{cleanSharedTeams(duo.SharedTeams, [a.name, b.name])}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/compare?players=${encodeURIComponent(a.name)},${encodeURIComponent(b.name)}`}
              onClick={() => track('post_game_profile_click', { game: 'duos', target: 'compare' })}
              className="px-5 py-2 rounded-lg bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 text-white font-semibold transition-colors"
            >
              Compare their stats
            </Link>
            <Link
              href="/games/six-degrees"
              className="px-5 py-2 rounded-lg bg-green-500 hover:bg-green-600 dark:bg-[rgb(60,192,103)] dark:hover:bg-green-400 text-white font-semibold transition-colors"
            >
              Play Six Degrees
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
