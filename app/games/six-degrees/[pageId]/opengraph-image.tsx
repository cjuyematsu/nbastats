//app/games/six-degrees/[pageId]/opengraph-image.tsx

import { ImageResponse } from 'next/og';
import { getLaDateString, sixDegreesPuzzleNumber } from '@/lib/dailyTime';

export const runtime = 'edge';
export const alt = 'Six Degrees of NBA on HoopsData';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;

  let heading = 'Six Degrees of NBA';
  let matchupLine = 'Connect two NBA players through former teammates';

  if (pageId === 'daily') {
    try {
      const today = getLaDateString();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/daily_connection_games?game_date=eq.${today}&select=game_date,player_a_name,player_b_name`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
          },
          next: { revalidate: 3600 },
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as {
          game_date: string;
          player_a_name: string;
          player_b_name: string;
        }[];
        const daily = rows?.[0];
        if (daily) {
          heading = `Six Degrees of NBA #${sixDegreesPuzzleNumber(daily.game_date)}`;
          matchupLine = `${daily.player_a_name}  →  ???  →  ${daily.player_b_name}`;
        }
      }
    } catch {
      // fall back to the generic card
    }
  }

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
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, textAlign: 'center' }}>
          {heading}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 40,
            color: '#cbd5e1',
            marginTop: 32,
            textAlign: 'center',
          }}
        >
          {matchupLine}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#64748b', marginTop: 44 }}>
          A new puzzle every day at hoopsdata.net
        </div>
      </div>
    ),
    size
  );
}
