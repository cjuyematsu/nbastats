// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar'; 
import Header from '@/components/Header'; 
import { AuthProvider } from '../app/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NBA Player Stats',
  description: 'Search and compare NBA player statistics',
};

const DEFAULT_NAV_WIDTH_FOR_LAYOUT = 256;
const PAGE_INSET_PADDING_PX = 12;
const NAVBAR_HEADER_GAP_PX = 12;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --header-height: 64px; 
            --page-inset-padding: ${PAGE_INSET_PADDING_PX}px;
            --navbar-header-gap: ${NAVBAR_HEADER_GAP_PX}px;
            --nav-actual-width: ${DEFAULT_NAV_WIDTH_FOR_LAYOUT}px;
            --nav-offset-left: calc(var(--page-inset-padding) + ${DEFAULT_NAV_WIDTH_FOR_LAYOUT}px + var(--navbar-header-gap));
          }

          @media (max-width: 767px) { 
            :root {
              --nav-actual-width: 0px; 
              --nav-offset-left: 0px; 
              --page-inset-padding: 0px; 
              --navbar-header-gap: 0px;
            }
          }
        `}} />
      </head>
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
      <AuthProvider>
          <div 
            className="fixed inset-0 md:p-[var(--page-inset-padding)] pointer-events-none z-[49]"
          >
            <Navbar /> 
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
          
          <Header /> 
          
          <main
            className="transition-all duration-300 ease-in-out"
            style={{
              paddingTop: `calc(var(--page-inset-padding) + var(--header-height))`,
            }}
          >
            <div 
              className="transition-all duration-300 ease-in-out md:ml-[var(--nav-offset-left)]"
            >
              <div className="p-4 md:pt-[var(--navbar-header-gap)] md:pr-[var(--page-inset-padding)] md:pb-[var(--page-inset-padding)] md:pl-0">
                  {children}
              </div>
            </div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
