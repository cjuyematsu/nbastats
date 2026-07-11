// lib/gameOg.tsx
//
// Shared OG-card template for the trivia game routes, matching the
// top-100-players card style. Edge-safe: only next/og.

import { ImageResponse } from 'next/og';

export const GAME_OG_SIZE = { width: 1200, height: 630 };

export function gameOgImage({
  title,
  tagline,
  url,
  eyebrow = 'HOOPSDATA DAILY',
}: {
  title: string;
  tagline: string;
  url: string;
  eyebrow?: string;
}) {
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
          {eyebrow}
        </div>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 38, color: '#cbd5e1', marginTop: 28, lineHeight: 1.3 }}>
          {tagline}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#64748b', marginTop: 44 }}>
          Play free at {url}
        </div>
      </div>
    ),
    GAME_OG_SIZE
  );
}
