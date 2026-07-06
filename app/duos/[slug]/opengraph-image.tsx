// app/duos/[slug]/opengraph-image.tsx
//
// Per-duo "A & B" social card with games-played-together. Overrides the generic
// /duos card for individual duo URLs.

import { ImageResponse } from 'next/og';
import { findDuo, parseDuoSlug } from '@/app/data/duoPages';

export const runtime = 'edge';
export const alt = 'NBA duo on HoopsData';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

async function resolveDuo(nameA: string, nameB: string): Promise<{ a: string; b: string; games: number | null }> {
  const headers = {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
    'Content-Type': 'application/json',
  };
  const suggest = async (name: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_player_suggestions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ search_term: name }),
        next: { revalidate: 86400 },
      });
      return res.ok ? (await res.json())?.[0] ?? null : null;
    } catch {
      return null;
    }
  };
  const [sa, sb] = await Promise.all([suggest(nameA), suggest(nameB)]);
  const a = sa ? `${sa.firstName ?? ''} ${sa.lastName ?? ''}`.trim() : titleCase(nameA);
  const b = sb ? `${sb.firstName ?? ''} ${sb.lastName ?? ''}`.trim() : titleCase(nameB);
  let games: number | null = null;
  if (sa && sb) {
    const lo = Math.min(sa.personId, sb.personId);
    const hi = Math.max(sa.personId, sb.personId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teammates?PlayerID=eq.${lo}&TeammateID=eq.${hi}&select=SharedGamesTotal`,
        { headers, next: { revalidate: 86400 } }
      );
      const row = res.ok ? (await res.json())?.[0] : null;
      games = row?.SharedGamesTotal ?? null;
    } catch {
      games = null;
    }
  }
  return { a, b, games };
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findDuo(slug);
  const parsed = parseDuoSlug(slug);
  const nameA = found ? found.duo.a : parsed ? parsed.a : 'Player A';
  const nameB = found ? found.duo.b : parsed ? parsed.b : 'Player B';
  const { a, b, games } = await resolveDuo(nameA, nameB);

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
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#38bdf8', marginBottom: 36 }}>
          HOOPSDATA
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, textAlign: 'center' }}>
          {a} &amp; {b}
        </div>
        {games != null ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 44 }}>
            <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, color: '#38bdf8' }}>
              {games.toLocaleString()}
            </div>
            <div style={{ display: 'flex', fontSize: 28, color: '#94a3b8' }}>games played together</div>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 32, color: '#cbd5e1', marginTop: 28 }}>
            Games played together, record and teams
          </div>
        )}
        <div style={{ display: 'flex', fontSize: 26, color: '#64748b', marginTop: 48 }}>
          See their record at hoopsdata.net
        </div>
      </div>
    ),
    size
  );
}
