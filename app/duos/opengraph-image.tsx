// app/duos/opengraph-image.tsx

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'NBA duo stats on HoopsData';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        <div style={{ display: 'flex', fontSize: 80, fontWeight: 700 }}>NBA Duos</div>
        <div style={{ display: 'flex', fontSize: 38, color: '#cbd5e1', marginTop: 32 }}>
          Games, record, and teams for any two teammates in NBA history
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#64748b', marginTop: 44 }}>
          hoopsdata.net/duos
        </div>
      </div>
    ),
    size
  );
}
