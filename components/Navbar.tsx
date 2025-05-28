// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Removed useRef from here if navRef is no longer used for anything else
import { useState, useEffect } from 'react';

// --- Icon Components (as provided by you) ---
// ... (MenuIcon, CloseIcon, etc. remain the same)
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
    );
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
    );
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
  </svg>
);
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const MIN_NAV_WIDTH = 80;
const DEFAULT_NAV_WIDTH = 256;
const TEXT_VISIBILITY_THRESHOLD = 160;

const NavLink = ({ href, children, icon, showText }: { href: string; children: React.ReactNode; icon: React.ReactNode; showText: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center py-2.5 rounded-md text-sm font-medium transition-colors group
                  ${isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                  ${showText ? 'px-3 justify-start' : 'px-2 justify-center'}`}
    >
      {icon}
      {showText && (
        <span className="ml-3 whitespace-nowrap overflow-hidden">
          {children}
        </span>
      )}
    </Link>
  );
};

export default function Navbar() {
  const [isOpenOnMobile, setIsOpenOnMobile] = useState(false);
  const [navWidth, setNavWidth] = useState(DEFAULT_NAV_WIDTH);
  const [lastExpandedDesktopWidth, setLastExpandedDesktopWidth] = useState(DEFAULT_NAV_WIDTH);
  const [isMdScreen, setIsMdScreen] = useState(false);

  // const navRef = useRef<HTMLElement>(null); // REMOVED as it's no longer used

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleScreenResize = () => {
      const currentlyIsMdScreen = mediaQuery.matches;
      if (isMdScreen !== currentlyIsMdScreen) {
        setIsMdScreen(currentlyIsMdScreen);
        if (currentlyIsMdScreen) {
          if (isOpenOnMobile) setIsOpenOnMobile(false);
           setNavWidth(prevWidth => {
            if (prevWidth === MIN_NAV_WIDTH) return MIN_NAV_WIDTH;
            return lastExpandedDesktopWidth > MIN_NAV_WIDTH ? lastExpandedDesktopWidth : DEFAULT_NAV_WIDTH;
           });
        }
      }
    };
    handleScreenResize();
    mediaQuery.addEventListener('change', handleScreenResize);
    return () => mediaQuery.removeEventListener('change', handleScreenResize);
  }, [isMdScreen, isOpenOnMobile, lastExpandedDesktopWidth]);

  useEffect(() => {
    const pageInsetPadding = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-inset-padding').replace('px', '')) || 0;
    const navbarHeaderGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-header-gap').replace('px', '')) || 0;
    if (isMdScreen) {
      document.documentElement.style.setProperty('--nav-actual-width', `${navWidth}px`);
      document.documentElement.style.setProperty('--nav-offset-left', `${pageInsetPadding + navWidth + navbarHeaderGap}px`);
    } else {
      document.documentElement.style.setProperty('--nav-actual-width', isOpenOnMobile ? `${DEFAULT_NAV_WIDTH}px` : '0px');
      document.documentElement.style.setProperty('--nav-offset-left', '0px');
    }
  }, [navWidth, isMdScreen, isOpenOnMobile]);

  const handleToggleNav = () => {
    if (isMdScreen) {
      if (navWidth > MIN_NAV_WIDTH) {
        setLastExpandedDesktopWidth(navWidth);
        setNavWidth(MIN_NAV_WIDTH);
      } else {
        setNavWidth(lastExpandedDesktopWidth > MIN_NAV_WIDTH ? lastExpandedDesktopWidth : DEFAULT_NAV_WIDTH);
      }
    } else {
      setIsOpenOnMobile(!isOpenOnMobile);
    }
  };

  const showTextInNav = (isMdScreen && navWidth >= TEXT_VISIBILITY_THRESHOLD) || (!isMdScreen && isOpenOnMobile);

  let navElementStyle: React.CSSProperties = {};
  let navElementClasses = "flex flex-col pointer-events-auto ";
  if (isMdScreen) {
    navElementStyle = { width: `${navWidth}px`, transition: 'width 0.2s ease-in-out' };
    navElementClasses += "relative h-full rounded-lg bg-white dark:bg-gray-800 overflow-hidden";
  } else {
    navElementStyle = { width: `${DEFAULT_NAV_WIDTH}px` };
    navElementClasses += `fixed top-0 left-0 h-screen z-50 bg-white dark:bg-gray-800 shadow-xl border-r dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${isOpenOnMobile ? 'translate-x-0' : '-translate-x-full'}`;
  }

  // MODIFIED ToggleButtonIcon logic
    const ToggleButtonIcon = isMdScreen
        ? (navWidth > MIN_NAV_WIDTH ? CloseIcon : MenuIcon) // If expanded, show Close/Collapse; if collapsed, show Menu/Expand
        : (isOpenOnMobile ? CloseIcon : MenuIcon);

    const hamburgerButtonStyle: React.CSSProperties = {
        left: isMdScreen
            ? (navWidth > MIN_NAV_WIDTH // Check if navbar is expanded on desktop
                ? `calc(var(--page-inset-padding) + 18px)` // Offset for EXPANDED state (centers align at 50px)
                : `calc(var(--page-inset-padding) + 20px)` // Offset for COLLAPSED state (centers hamburger in nav, aligns all centers at 52px)
            )
            : '1rem', // Mobile styling
        top: `calc(var(--page-inset-padding) + (var(--header-height) / 2))`,
        };

  return (
    <>
      <button
        onClick={handleToggleNav}
        style={hamburgerButtonStyle} // This now uses the new dynamic 'left' for collapsed state
        className={`
          fixed z-[60] p-2 rounded-md transform -translate-y-1/2
          text-gray-600 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-700
          hover:text-gray-800 dark:hover:text-gray-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
          transition-all duration-150 ease-in-out
          pointer-events-auto
        `}
        aria-label={
          isMdScreen
            ? (navWidth > MIN_NAV_WIDTH ? "Collapse navigation" : "Expand navigation")
            : (isOpenOnMobile ? "Close menu" : "Open menu")
        }
      >
        <ToggleButtonIcon className="h-6 w-6" />
      </button>

      {isOpenOnMobile && !isMdScreen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[48] md:hidden"
          onClick={handleToggleNav}
          aria-hidden="true"
        />
      )}

      <nav
        // ref={navRef} // REMOVED as navRef is no longer used
        style={navElementStyle}
        className={navElementClasses}
        aria-hidden={!isMdScreen && !isOpenOnMobile}
      >
        {(isMdScreen || isOpenOnMobile) && (
          <>
            <div className={`h-[var(--header-height)] flex items-center px-4 border-b border-gray-200 dark:border-gray-700 ${!isMdScreen && isOpenOnMobile ? 'mt-12' : ''}`}>
              {/* Logo area empty */}
            </div>
            <div className="flex-grow flex flex-col space-y-1 p-4 overflow-y-auto">
              <NavLink href="/" icon={<HomeIcon className="w-5 h-5 flex-shrink-0" />} showText={showTextInNav}>Home</NavLink>
              <NavLink href="/player" icon={<UsersIcon className="w-5 h-5 flex-shrink-0" />} showText={showTextInNav}>Player Stats</NavLink>
              <NavLink href="/compare" icon={<ChartBarIcon className="w-5 h-5 flex-shrink-0" />} showText={showTextInNav}>Compare Players</NavLink>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {showTextInNav && (
                     <p className="text-xs text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} Your App</p>
                )}
            </div>
          </>
        )}
      </nav>
    </>
  );
}