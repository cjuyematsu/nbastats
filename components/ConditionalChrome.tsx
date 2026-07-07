// components/ConditionalChrome.tsx
//
// Renders the full site chrome (nav, header, scroll container, analytics, ads).
// navbar and header are passed in as already-rendered elements so they keep their
// own server/client boundary instead of being pulled into this client component.

'use client';

import Script from 'next/script';
import ScrollRestoration from '@/components/ScrollRestoration';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function ConditionalChrome({
  children,
  navbar,
  header,
}: {
  children: React.ReactNode;
  navbar: React.ReactNode;
  header: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 md:p-[var(--page-inset-padding)] pointer-events-none z-[49]">
        {navbar}
      </div>
      <div
        className="hidden md:block fixed bg-gray-100 dark:bg-gray-900 z-30"
        style={{
          top: '0px',
          left: 'var(--nav-offset-left)',
          right: 'var(--page-inset-padding)',
          height: 'var(--page-inset-padding)',
        }}
      />

      {header}

      <main
        style={{
          paddingTop: `calc(var(--page-inset-padding) + var(--header-height))`,
          height: '100vh',
        }}
      >
        <div className="transition-[margin] duration-300 ease-in-out md:ml-[var(--nav-offset-left)] h-full">
          <div className="flex items-center h-full">
            <div
              id="page-scroll-container"
              className="w-full max-h-full overflow-y-auto p-4 md:pt-[var(--navbar-header-gap)] md:pr-[var(--page-inset-padding)] md:pb-[var(--page-inset-padding)] md:pl-0"
            >
              {children}
            </div>
          </div>
        </div>
      </main>
      <ScrollRestoration />

      {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
        <Script
          id="adsense"
          async
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
        />
      )}
      <Analytics />
      <SpeedInsights />
    </>
  );
}
