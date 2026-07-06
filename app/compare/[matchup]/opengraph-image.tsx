// app/compare/[matchup]/opengraph-image.tsx
//
// Per-matchup "A vs B" social card. Overrides the generic /compare card for
// individual matchup URLs (opengraph-image only receives params inside the
// dynamic segment folder).

import { ImageResponse } from 'next/og';
import { findMatchup, parseCompareSlug } from '@/app/data/compareMatchups';

export const runtime = 'edge';
export const alt = 'NBA player comparison on HoopsData';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

async function statsForName(name: string): Promise<{ name: string; ppg: number | null } | null> {
  try {
    const headers = {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
      'Content-Type': 'application/json',
    };
    const sres = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_player_suggestions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ search_term: name }),
      next: { revalidate: 86400 },
    });
    const sug = sres.ok ? (await sres.json())?.[0] : null;
    if (!sug) return null;
    const cres = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/calculate_player_career_stats`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_person_id: sug.personId }),
      next: { revalidate: 86400 },
    });
    const stats = cres.ok ? (await cres.json())?.[0] : null;
    return { name: `${sug.firstName ?? ''} ${sug.lastName ?? ''}`.trim(), ppg: stats?.pts_per_g ?? null };
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup: slug } = await params;
  const found = findMatchup(slug);
  const parsed = parseCompareSlug(slug);
  const nameA = found ? found.matchup.a : parsed ? titleCase(parsed.a) : 'Player A';
  const nameB = found ? found.matchup.b : parsed ? titleCase(parsed.b) : 'Player B';

  const [ra, rb] = await Promise.all([statsForName(nameA), statsForName(nameB)]);
  const dispA = ra?.name || nameA;
  const dispB = rb?.name || nameB;

  const column = (name: string, ppg: number | null) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 460 }}>
      <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, textAlign: 'center', color: 'white' }}>{name}</div>
      <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, color: '#38bdf8', marginTop: 16 }}>
        {ppg != null ? ppg.toFixed(1) : '--'}
      </div>
      <div style={{ display: 'flex', fontSize: 26, color: '#94a3b8' }}>career PPG</div>
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
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: 60,
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#38bdf8', marginBottom: 40 }}>
          HOOPSDATA
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {column(dispA, ra?.ppg ?? null)}
          <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: '#64748b', margin: '0 20px' }}>VS</div>
          {column(dispB, rb?.ppg ?? null)}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#64748b', marginTop: 48 }}>
          Full comparison at hoopsdata.net
        </div>
      </div>
    ),
    size
  );
}
