// components/ShareResult.tsx

'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';

interface ShareResultProps {
  shareText: string;
  game: string;
  surface: string;
  className?: string;
}

const DEFAULT_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-green-500 hover:bg-green-600 dark:bg-[rgb(60,192,103)] dark:hover:bg-green-400 text-white font-semibold px-6 py-2 transition-all';

export default function ShareResult({ shareText, game, surface, className }: ShareResultProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    track('share_clicked', { game, surface });
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    if (isTouch && navigator.share) {
      try {
        await navigator.share({ text: shareText });
        track('result_shared', { game, surface, method: 'webshare' });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track('result_shared', { game, surface, method: 'clipboard' });
    } catch {
      // clipboard unavailable; nothing else to try
    }
  };

  return (
    <button onClick={handleShare} className={`${className ?? DEFAULT_CLASSES} active:scale-95`} aria-live="polite">
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
