// app/HomeTop100Teaser.tsx

import { supabase } from '@/lib/supabaseClient';
import CountdownTimer from '@/components/CountdownTimer';
import { getNextRearrangementIso } from '@/lib/top100Time';
import HomeTop100QuickVote, { QuickVoteRow } from './HomeTop100QuickVote';
import type { RpcRankedPlayerData } from '@/app/top-100-players/types';

async function loadRows(): Promise<QuickVoteRow[] | null> {
  try {
    const { data } = await supabase.rpc('get_current_ranking_with_details');
    if (!data || data.length === 0) return null;
    const ranked = data as RpcRankedPlayerData[];
    const ids = ranked.map((p) => p.personId);
    const { data: histories } = await supabase.rpc('get_players_ranking_histories_with_current', {
      player_ids_array: ids,
    });
    const changeById = new Map<number, number>();
    if (Array.isArray(histories)) {
      (histories as unknown as Array<{ player_id: number; weekly_change: number }>).forEach((h) => {
        changeById.set(h.player_id, h.weekly_change ?? 0);
      });
    }
    const rows = ranked
      .map((p) => ({
        personId: p.personId,
        name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
        rank: p.rankNumber,
        change: changeById.get(p.personId) ?? 0,
      }))
      .filter((r) => r.name.length > 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5);
    return rows.length === 5 ? rows : null;
  } catch {
    return null;
  }
}

export default async function HomeTop100Teaser() {
  const rows = await loadRows();
  if (!rows) return null;

  return (
    <section className="bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Who runs the NBA? You decide.
        </h2>
        <CountdownTimer
          compact
          targetTimeIso={getNextRearrangementIso()}
          label="Reshuffle in"
          completedText="Rankings are reshuffling now!"
        />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        The fan-voted Top 100. Vote right here, no account needed.
      </p>
      <HomeTop100QuickVote rows={rows} />
    </section>
  );
}
