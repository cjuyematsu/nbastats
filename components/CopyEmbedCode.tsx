// components/CopyEmbedCode.tsx
//
// "Embed this" affordance on the compare/duo/player pages. The copied snippet
// carries both the iframe AND a followed link to the page that sits OUTSIDE the
// iframe, so it lands in the host page's own HTML as a real backlink (an iframe
// alone passes no link equity).

'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';

interface CopyEmbedCodeProps {
  embedPath: string; // e.g. /embed/compare/lebron-james-vs-michael-jordan
  canonicalPath: string; // e.g. /compare/lebron-james-vs-michael-jordan
  title: string; // e.g. "LeBron James vs Michael Jordan"
  width?: number;
  height?: number;
}

const BASE = 'https://hoopsdata.net';

export default function CopyEmbedCode({
  embedPath,
  canonicalPath,
  title,
  width = 480,
  height = 320,
}: CopyEmbedCodeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet =
    `<iframe src="${BASE}${embedPath}" width="${width}" height="${height}" ` +
    `style="border:0;max-width:100%" loading="lazy" title="${title} - Hoops Data"></iframe>\n` +
    `<p>Via <a href="${BASE}${canonicalPath}">Hoops Data</a></p>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track('embed_code_copied', { surface: canonicalPath });
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 text-sm font-semibold px-4 py-1.5 transition-all active:scale-95"
        aria-expanded={open}
      >
        Embed this
      </button>
      {open && (
        <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Paste this into any site to embed a live widget that links back here.
          </p>
          <textarea
            readOnly
            value={snippet}
            onFocus={(e) => e.currentTarget.select()}
            rows={4}
            className="w-full text-xs font-mono rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 p-2 resize-none"
          />
          <button
            onClick={copy}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold px-4 py-1.5 transition-all active:scale-95"
            aria-live="polite"
          >
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
      )}
    </div>
  );
}
