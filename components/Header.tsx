  // components/Header.tsx
  'use client';

  import React, { useState, useEffect } from 'react';
  import { PlayerSuggestion } from '@/types/stats'; // Make sure this path is correct
  import { useRouter } from 'next/navigation';
  import HeaderSearchBar from '@/components/HeaderSearchBar'; // Assuming HeaderSearchBar.tsx is in src/components/

  export default function Header() {
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);

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

    // Dynamic styles for the <header> element
    const headerStyle: React.CSSProperties = isMobile ? {
      left: '0px',
      right: '0px',
      top: '0px',
    } : {
      // Desktop: Inset from all sides (left is handled by --nav-offset-left)
      top: 'var(--page-inset-padding)',
      left: 'var(--nav-offset-left)', // This already includes page inset + nav width + gap
      right: 'var(--page-inset-padding)',
    };

    // Conditional classes for the <header> element
    const headerClasses = `fixed z-40 transition-all duration-300 ease-in-out
      ${isMobile 
        ? 'bg-white dark:bg-gray-800 shadow-sm' // Mobile: edge-to-edge, standard shadow
        // Desktop: inset, rounded, NO BORDER/SHADOW to match Navbar's flat look
        : 'bg-white dark:bg-gray-800 rounded-lg' 
      }`;
    
    // Padding for the content INSIDE the header bar
    // On mobile, accounts for the fixed hamburger button
    const contentPaddingLeft = isMobile ? 'pl-[64px]' : 'pl-4'; 

    return (
      <header
        style={headerStyle}
        className={headerClasses}
      >
        {/* Inner container for header items, respecting header height */}
        <div className={`flex items-center h-[var(--header-height)] ${contentPaddingLeft} pr-4`}>
        {/* Search bar container takes up all available space */}
        <div className="flex-grow min-w-0"> 
          <HeaderSearchBar onPlayerSelected={handlePlayerSelection} />
        </div>

        {/* Sign In button area */}
        <div className="ml-4 flex-none"> 
          <button>Sign In</button>
        </div>
      </div>
      </header>
    );
  }