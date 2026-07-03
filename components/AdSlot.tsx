// components/AdSlot.tsx
//
// Renders nothing until NEXT_PUBLIC_ADSENSE_CLIENT_ID is set and a real slot id
// from the AdSense dashboard replaces the placeholder passed in.

'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export default function AdSlot({ slot, className }: { slot: string; className?: string }) {
  useEffect(() => {
    if (!CLIENT_ID || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore blocked or double-initialized ads
    }
  }, [slot]);

  if (!CLIENT_ID || !slot) return null;

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
