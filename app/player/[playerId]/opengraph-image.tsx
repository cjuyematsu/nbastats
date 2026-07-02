//app/player/[playerId]/opengraph-image.tsx

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'NBA player career stats on HoopsData';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type CareerRow = {
  firstName: string | null;
  lastName: string | null;
  startYear: number | null;
  endYear: number | null;
  pts_per_g: number | null;
  trb_per_g: number | null;
  ast_per_g: number | null;
};

export default async function Image({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;

  let player: CareerRow | null = null;
  const id = Number(playerId);
  if (Number.isFinite(id)) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/calculate_player_career_stats`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_person_id: id }),
          next: { revalidate: 86400 },
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as CareerRow[];
        if (rows?.[0]?.lastName) player = rows[0];
      }
    } catch {
      // fall back to the generic card
    }
  }

  const name = player ? `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() : 'NBA Player Stats';
  const years = player?.startYear && player?.endYear ? `${player.startYear} to ${player.endYear}` : '';
  const statBlock = (label: string, value: number | null) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 40px' }}>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: 'white' }}>
        {value != null ? value.toFixed(1) : '--'}
      </div>
      <div style={{ display: 'flex', fontSize: 28, color: '#94a3b8' }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: 60,
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 6, color: '#38bdf8', marginBottom: 28 }}>
          HOOPSDATA
        </div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, textAlign: 'center' }}>{name}</div>
        {years && (
          <div style={{ display: 'flex', fontSize: 32, color: '#cbd5e1', marginTop: 12 }}>
            Career {years}
          </div>
        )}
        {player && (
          <div style={{ display: 'flex', marginTop: 44 }}>
            {statBlock('PPG', player.pts_per_g)}
            {statBlock('RPG', player.trb_per_g)}
            {statBlock('APG', player.ast_per_g)}
          </div>
        )}
        <div style={{ display: 'flex', fontSize: 28, color: '#64748b', marginTop: 44 }}>
          Full career stats at hoopsdata.net
        </div>
      </div>
    ),
    size
  );
}
