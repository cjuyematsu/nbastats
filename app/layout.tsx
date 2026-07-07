// app/layout.tsx

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '../app/contexts/AuthContext';
import ConditionalChrome from '@/components/ConditionalChrome';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'NBA Player Comparison Tool & Stats | HoopsData',
    template: '%s | HoopsData',
  },
  description: 'Free NBA player comparison tool. Compare players side-by-side, view Top 100 rankings, play basketball trivia, and explore NBA stats and analytics.',
  keywords: ['nba player comparison', 'compare nba players', 'nba player comparison tool', 'nba stats', 'nba player stats', 'basketball stats', 'compare nba player stats', 'nba stat comparison', 'top 100 nba players', 'nba trivia'],
  metadataBase: new URL('https://hoopsdata.net'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hoopsdata.net',
    siteName: 'HoopsData',
    title: 'NBA Player Comparison Tool & Stats | HoopsData',
    description: 'Free NBA player comparison tool. Compare any NBA players side-by-side, view Top 100 rankings, and play basketball trivia games.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'HoopsData - NBA Player Comparison Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NBA Player Comparison Tool & Stats | HoopsData',
    description: 'Free NBA player comparison tool. Compare any NBA players side-by-side, view Top 100 rankings, and play basketball trivia.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "HoopsData",
  "url": "https://hoopsdata.net",
  "logo": "https://hoopsdata.net/logo.svg",
  "sameAs": []
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "HoopsData",
  "url": "https://hoopsdata.net",
  "description": "Free NBA player comparison tool, stats, rankings, and basketball trivia games.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://hoopsdata.net/compare?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
      <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <AuthProvider>
          <ConditionalChrome navbar={<Navbar />} header={<Header />}>
            {children}
            <Footer />
          </ConditionalChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
