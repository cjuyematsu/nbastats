// app/top-100-players/opengraph-image.tsx

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Fan-voted NBA Top 100 player rankings on HoopsData';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type RankedRow = {
  rankNumber: number;
  firstName: string | null;
  lastName: string | null;
};

export default async function Image() {
  let top: RankedRow[] = [];
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_current_ranking_with_details`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        next: { revalidate: 3600 },
      }
    );
    if (res.ok) {
      const rows = (await res.json()) as RankedRow[];
      top = (rows ?? [])
        .filter((r) => r?.lastName)
        .sort((a, b) => a.rankNumber - b.rankNumber)
        .slice(0, 10);
    }
  } catch {
    // fall back to the generic card
  }

  const column = (rows: RankedRow[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
      {rows.map((r) => (
        <div key={r.rankNumber} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{ display: 'flex', width: 44, fontSize: 34, fontWeight: 700, color: '#38bdf8' }}>
            {r.rankNumber}
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: 'white' }}>
            {`${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()}
          </div>
        </div>
      ))}
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
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: 64,
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#38bdf8', marginBottom: 16 }}>
          HOOPSDATA
        </div>
        <div style={{ display: 'flex', fontSize: 68, fontWeight: 700 }}>Fan-Voted NBA Top 100</div>
        {top.length >= 10 ? (
          <div style={{ display: 'flex', gap: 56, marginTop: 36 }}>
            {column(top.slice(0, 5))}
            {column(top.slice(5, 10))}
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 38, color: '#cbd5e1', marginTop: 32 }}>
            Vote players up or down. No sign-in required. Reshuffles every 3 days.
          </div>
        )}
        <div style={{ display: 'flex', fontSize: 26, color: '#64748b', marginTop: 40 }}>
          Vote now at hoopsdata.net/top-100-players
        </div>
      </div>
    ),
    size
  );
}
