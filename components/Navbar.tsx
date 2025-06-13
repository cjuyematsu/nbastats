//components/Navbar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

const MenuIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="M4 5H20V7H4z"/>
    <path d="M4 11H20V13H4z"/>
    <path d="M4 17H20V19H4z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="m12.71 8.71-1.42-1.42L6.59 12l4.7 4.71 1.42-1.42-2.3-2.29H17v-2h-6.59z"/>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M5 19V5h14v14z"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="M3 13h1v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7h1c.4 0 .77-.24.92-.62.15-.37.07-.8-.22-1.09l-8.99-9a.996.996 0 0 0-1.41 0l-9.01 9c-.29.29-.37.72-.22 1.09s.52.62.92.62Zm7 7v-5h4v5zm2-15.59 6 6V20h-2v-5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v5H6v-9.59z"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="M10 15h12v2H10zM10 7h12v2H10zM4 19h2c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2m0-4h2v2H4zM4 11h2c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2m0-4h2v2H4z"/>
  </svg>
);

const ChartBarIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="M4 2H2v19c0 .55.45 1 1 1h19v-2H4z"/>
    <path d="M11.25 10.28c.74-.06 1.45.24 1.93.8a4.314 4.314 0 0 0 7.03-.67l1.67-2.91-1.74-.99-1.67 2.91c-.38.66-1.03 1.08-1.79 1.16s-1.48-.22-1.98-.8c-.9-1.05-2.22-1.6-3.6-1.5s-2.6.84-3.34 2.02l-2.61 4.17 1.7 1.06 2.61-4.17c.4-.63 1.05-1.03 1.79-1.08"/>
    </svg>
);

const LinkIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="M19 2c-1.65 0-3 1.35-3 3 0 1 .49 1.87 1.24 2.42l-1.92 4.61c-.11-.01-.21-.03-.32-.03-.46 0-.89.11-1.29.3l-2.02-2.02c.19-.39.3-.82.3-1.29 0-1.65-1.35-3-3-3s-3 1.35-3 3c0 .82.33 1.57.87 2.11l-2.04 4.91c-1.57.09-2.83 1.39-2.83 2.98s1.35 3 3 3 3-1.35 3-3c0-1-.49-1.87-1.24-2.42l1.92-4.61c.11.01.21.03.32.03.46 0 .89-.11 1.29-.3l2.02 2.02c-.19.39-.3.82-.3 1.29 0 1.65 1.35 3 3 3s3-1.35 3-3c0-.82-.33-1.57-.87-2.11l2.04-4.91C20.74 7.89 22 6.59 22 5s-1.35-3-3-3M5 20c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1M8 9c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1m7 7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m4-10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1"/>
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="m18.29,9.29l-3.29,3.29-4.29-4.29c-.39-.39-1.02-.39-1.41,0l-7,7,1.41,1.41,6.29-6.29,4.29,4.29c.39.39,1.02.39,1.41,0l4-4,2.29,2.29v-6h-6l2.29,2.29Z"/>
  </svg>
);
  
const OverUnderGameIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="m6.29 19.29 1.42 1.42 4.29-4.3 4.29 4.3 1.42-1.42-5.71-5.7zM12 7.59l-4.29-4.3-1.42 1.42 5.71 5.7 5.71-5.7-1.42-1.42z"/>
  </svg>
);

const QuizIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="m15,3v5h-6c-.55,0-1,.45-1,1v6H3c-.55,0-1,.45-1,1v6h2v-5h5c.55,0,1-.45,1-1v-6h6c.55,0,1-.45,1-1v-5h5v-2h-6c-.55,0-1,.45-1,1Z"/>
  </svg>
);

const RankingGameIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="m22 6-4-4-4 4h3v12h-3l4 4 4-4h-3V6zM2 11h12v2H2zM2 7h12v2H2zM2 15h12v2H2z"/>
  </svg>
);

const OddManOutIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="M4.5 11h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5h-5C3.67 3 3 3.67 3 4.5v5c0 .83.67 1.5 1.5 1.5M5 5h4v4H5zM19.5 3h-5c-.83 0-1.5.67-1.5 1.5v5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5M19 9h-4V5h4zM4.5 21h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5h-5c-.83 0-1.5.67-1.5 1.5v5c0 .83.67 1.5 1.5 1.5m.5-6h4v4H5zM18 13h-2v3h-3v2h3v3h2v-3h3v-2h-3z"/>
  </svg>
);

const SixDegreesIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="m21,14h-1c0-1.08-.21-2.13-.63-3.11-.4-.95-.98-1.81-1.71-2.54-.54-.54-1.14-.99-1.8-1.35-.45-1.72-2-2.99-3.86-2.99s-3.4,1.28-3.86,2.99c-.66.36-1.26.81-1.8,1.35-.73.73-1.31,1.59-1.71,2.54-.42.99-.63,2.03-.63,3.11h-1c-.55,0-1,.45-1,1v4c0,.55.45,1,1,1h4c.55,0,1-.45,1-1v-4c0-.55-.45-1-1-1h-1c0-.81.16-1.6.47-2.34.3-.71.73-1.36,1.29-1.91.15-.15.33-.27.49-.41.56,1.54,2.02,2.65,3.75,2.65s3.19-1.11,3.75-2.65c.17.13.34.25.49.41.55.55.98,1.19,1.29,1.91.31.74.47,1.52.47,2.33h-1c-.55,0-1,.45-1,1v4c0,.55.45,1,1,1h4c.55,0,1-.45,1-1v-4c0-.55-.45-1-1-1Zm-15,4h-2v-2h2v2Zm6-8c-1.1,0-2-.9-2-2s.9-2,2-2,2,.9,2,2-.9,2-2,2Zm8,8h-2v-2h2v2Z"/>
  </svg>
);

const SalaryVPointsIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" transform="" id="injected-svg">
    <path d="M21 8H7c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1m-1 8c-1.1 0-2 .9-2 2h-8c0-1.1-.9-2-2-2v-4c1.1 0 2-.9 2-2h8c0 1.1.9 2 2 2z"/>
    <path d="M18 4H3c-.55 0-1 .45-1 1v11h2V6h14zM14 12a2 2 0 1 0 0 4 2 2 0 1 0 0-4"/>
  </svg>
)

const MIN_NAV_WIDTH = 80;
const DEFAULT_NAV_WIDTH = 256;
const TEXT_VISIBILITY_THRESHOLD = 160;

const NavLink = ({ href, children, icon, showText }: { href: string; children: React.ReactNode; icon: React.ReactNode; showText: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href + "/")); 

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

  const navRef = useRef<HTMLElement>(null); 
  const toggleButtonRef = useRef<HTMLButtonElement>(null); 

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
    if (typeof window !== 'undefined') {
        const pageInsetPadding = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-inset-padding').replace('px', '')) || 0;
        const navbarHeaderGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-header-gap').replace('px', '')) || 0;
        if (isMdScreen) {
        document.documentElement.style.setProperty('--nav-actual-width', `${navWidth}px`);
        document.documentElement.style.setProperty('--nav-offset-left', `${pageInsetPadding + navWidth + navbarHeaderGap}px`);
        } else {
        document.documentElement.style.setProperty('--nav-actual-width', isOpenOnMobile ? `${DEFAULT_NAV_WIDTH}px` : '0px');
        document.documentElement.style.setProperty('--nav-offset-left', '0px');
        }
    }
  }, [navWidth, isMdScreen, isOpenOnMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMdScreen && isOpenOnMobile && navRef.current && toggleButtonRef.current) {
        if (!navRef.current.contains(event.target as Node) && !toggleButtonRef.current.contains(event.target as Node)) {
          setIsOpenOnMobile(false);
        }
      }
    };
    if (!isMdScreen && isOpenOnMobile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpenOnMobile, isMdScreen]); 

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

  const ToggleButtonIcon = isMdScreen
      ? (navWidth > MIN_NAV_WIDTH ? CloseIcon : MenuIcon)
      : (isOpenOnMobile ? CloseIcon : MenuIcon);

  const hamburgerButtonStyle: React.CSSProperties = {
    left: (() => {
      if (!isMdScreen) { 
        return isOpenOnMobile ? '1.25rem' : '1rem';
      }
      return navWidth > MIN_NAV_WIDTH
        ? `calc(var(--page-inset-padding) + 18px)`
        : `calc(var(--page-inset-padding) + 20px)`;
    })(),
    top: `calc(var(--page-inset-padding) + (var(--header-height) / 2))`,
  };

  return (
    <>
      <button
        ref={toggleButtonRef}
        onClick={handleToggleNav}
        style={hamburgerButtonStyle}
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
        <ToggleButtonIcon/>
      </button>

      {isOpenOnMobile && !isMdScreen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[48] md:hidden"
          onClick={handleToggleNav}
          aria-hidden="true"
        />
      )}

      <nav
        ref={navRef}
        style={navElementStyle}
        className={navElementClasses}
        aria-hidden={!isMdScreen && !isOpenOnMobile}
      >
        {(isMdScreen || isOpenOnMobile) && (
          <>
            <div className={`h-[var(--header-height)] flex items-center px-4 border-b border-gray-200 dark:border-gray-700`}>
            </div>
            <div className="flex-grow flex flex-col space-y-1 p-4 overflow-y-auto">
              <NavLink href="/" icon={<HomeIcon />} showText={showTextInNav}>Home</NavLink>
              
                {!showTextInNav && <hr className="my-2 border-gray-200 dark:border-gray-700" />}
                <NavLink href="/top-100-players" icon={<UsersIcon />} showText={showTextInNav}>Top 100</NavLink>              
                <NavLink href="/compare" icon={<ChartBarIcon />} showText={showTextInNav}>Compare Players</NavLink>
                <NavLink href="/degrees-of-separation" icon={<LinkIcon />} showText={showTextInNav}>Nine Degrees</NavLink>

              <div className="pt-2">
                {showTextInNav && <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Analysis</h3>}
                {!showTextInNav && <hr className="my-2 border-gray-200 dark:border-gray-700" />}
                <NavLink 
                  href="/analysis/salary-vs-points" 
                  icon={<SalaryVPointsIcon />} 
                  showText={showTextInNav}
                >
                  Salary vs. Points
                </NavLink>
                <NavLink 
                  href="/analysis/growth-of-nba" 
                  icon={<TrendingUpIcon />} 
                  showText={showTextInNav}
                >
                  Growth of the NBA
                </NavLink>
              </div>

              <div className="pt-2">
                {showTextInNav && <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Games</h3>}
                {!showTextInNav && <hr className="my-2 border-gray-200 dark:border-gray-700" />}
                
                <NavLink href="/games/stat-over-under" icon={<OverUnderGameIcon />} showText={showTextInNav}>
                  Over/Under
                </NavLink>
                <NavLink href="/games/draft-quiz" icon={<QuizIcon />} showText={showTextInNav}>
                  Fill in the Draft
                </NavLink>
                <NavLink href="/games/ranking-game" icon={<RankingGameIcon />} showText={showTextInNav}>
                  Guess the Ranking
                </NavLink>
                <NavLink href="/games/odd-man-out" icon={<OddManOutIcon />} showText={showTextInNav}>
                  Odd Man Out
                </NavLink>
                <NavLink href="/games/six-degrees" icon={<SixDegreesIcon />} showText={showTextInNav}>
                  Six Degrees
                </NavLink>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}