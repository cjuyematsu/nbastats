// components/Header.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { PlayerSuggestion } from '@/types/stats'; // Make sure this path is correct
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link for navigation
import HeaderSearchBar from '@/components/HeaderSearchBar';
import { useAuth } from '../app/contexts/AuthContext'; // Import useAuth

export default function Header() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  
  const { user, isLoading: authIsLoading, signOut } = useAuth();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)'); 
    const handleResize = () => setIsMobile(mediaQuery.matches);
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePlayerSelection = (player: PlayerSuggestion) => {
    router.push(`/player/${player.personId}?name=${encodeURIComponent(player.firstName + " " + player.lastName)}`);
  };

  const handleSignOut = async () => {
    await signOut();
    // Optional: Redirect after sign out, e.g., to home or sign-in page
    router.push('/'); 
  };

  // Dynamic styles for the <header> element (no change here)
  const headerStyle: React.CSSProperties = isMobile ? {
    left: '0px',
    right: '0px',
    top: '0px',
  } : {
    top: 'var(--page-inset-padding)',
    left: 'var(--nav-offset-left)', 
    right: 'var(--page-inset-padding)',
  };

  // Conditional classes for the <header> element (no change here)
  const headerClasses = `fixed z-40 transition-all duration-200 ease-in-out
    ${isMobile 
      ? 'bg-white dark:bg-gray-800 shadow-sm' 
      : 'bg-white dark:bg-gray-800 rounded-lg' 
    }`;
  
  const contentPaddingLeft = isMobile ? 'pl-[64px]' : 'pl-4'; 

  return (
    <header
      style={headerStyle}
      className={headerClasses}
    >
      <div className={`flex items-center justify-between h-[var(--header-height)] ${contentPaddingLeft} pr-4`}>
        <div className="flex-grow min-w-0"> 
          <HeaderSearchBar onPlayerSelected={handlePlayerSelection} />
        </div>

        {/* Simplified Auth Button Area */}
        <div className="ml-4 flex-none flex items-center"> 
          {authIsLoading ? (
            // Placeholder while auth state is loading
            <div className="h-8 w-20 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
          ) : user ? (
            // User is signed in - Show Sign Out button
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-500 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            // User is not signed in - Show Sign In button (as a Link)
            <Link
              href="/signin"
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-sky-500 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}