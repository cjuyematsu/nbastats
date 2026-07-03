// app/articles/[slug]/opengraph-image.tsx

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'NBA analysis on HoopsData';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type ArticleRow = { title: string | null; dek: string | null };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let article: ArticleRow | null = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles?slug=eq.${encodeURIComponent(
        slug
      )}&status=eq.published&select=title,dek&limit=1`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
        },
        next: { revalidate: 86400 },
      }
    );
    if (res.ok) {
      const rows = (await res.json()) as ArticleRow[];
      if (rows?.[0]?.title) article = rows[0];
    }
  } catch {
    // fall back to the generic card
  }

  const title = article?.title ?? 'NBA Analysis';
  const dek = article?.dek ?? 'Data-driven NBA stories on HoopsData';

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
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 6, color: '#38bdf8', marginBottom: 28 }}>
          HOOPSDATA
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, textAlign: 'center', lineHeight: 1.15 }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#cbd5e1', marginTop: 28, textAlign: 'center' }}>
          {dek}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#64748b', marginTop: 48 }}>
          hoopsdata.net
        </div>
      </div>
    ),
    size
  );
}
