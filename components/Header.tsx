//components/Header.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { PlayerSuggestion } from '@/types/stats';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HeaderSearchBar from '@/components/HeaderSearchBar';
import { useAuth } from '../app/contexts/AuthContext';
import Image from 'next/image';

export default function Header() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  const { user, isLoading: authIsLoading, signOut } = useAuth();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleResize = () => setIsMobile(mediaQuery.matches);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePlayerSelection = (player: PlayerSuggestion) => {
    router.push(`/player/${player.personId}?name=${encodeURIComponent(player.firstName + " " + player.lastName)}`);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const headerStyle: React.CSSProperties = isMobile ? {
    left: '0px',
    right: '0px',
    top: '0px',
  } : {
    top: 'var(--page-inset-padding)',
    left: 'var(--nav-offset-left)',
    right: 'var(--page-inset-padding)',
  };

  const headerClasses = `fixed z-40 transition-all duration-200 ease-in-out
    ${isMobile
      ? 'bg-white dark:bg-gray-800 shadow-sm dark:border-b dark:border-gray-700'
      : 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'
    }`;

  const contentPaddingLeft = isMobile ? 'pl-[64px]' : 'pl-4';

  return (
    <header
      style={headerStyle}
      className={headerClasses}
    >
      <div className={`flex items-center justify-between h-[var(--header-height)] ${contentPaddingLeft} pr-4`}>
        {/* --- Logo and Brand --- */}
        <div className="flex items-center flex-shrink-0">
          <div className="flex items-center">
            <Image
              src="/logo2.png"
              alt="Site Logo"
              width={40}
              height={40}
              className="h-9 w-9"
              priority
            />
            {/* UPDATED: The site name is now hidden when isMobile is true */}
            {!isMobile && (
              <span className="ml-2 mr-5 text-xl font-bold tracking-tight text-gray-600 dark:text-slate-100">
                hoops data
              </span>
            )}
          </div>
        </div>

        {/* --- Search Bar --- */}
        {/* UPDATED: Added horizontal margin on mobile for better spacing */}
        <div className={`flex-grow min-w-0 ${isMobile ? 'mx-2' : ''}`}>
          <HeaderSearchBar onPlayerSelected={handlePlayerSelection} />
        </div>

        {/* --- Auth Button --- */}
        {/* UPDATED: Adjusted margin to avoid doubling up on mobile */}
        <div className={`${isMobile ? 'ml-0' : 'ml-4'} flex-none flex items-center`}>
          {authIsLoading ? (
            <div className="h-8 w-20 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
          ) : user ? (
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-sky-500 dark:bg-sky-600 border-sky-700 hover:bg-sky-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/signin"
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-sky-500 dark:bg-sky-600 border-sky-700 hover:bg-sky-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-sky-500 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}