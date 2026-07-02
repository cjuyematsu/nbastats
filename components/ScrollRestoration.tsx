'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const CONTAINER_ID = 'page-scroll-container';
const positions = new Map<string, number>();

export default function ScrollRestoration() {
  const pathname = usePathname();
  const navTypeRef = useRef<'push' | 'pop'>('push');

  useEffect(() => {
    const onPopState = () => {
      navTypeRef.current = 'pop';
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const key = pathname + window.location.search;
    let restoring = navTypeRef.current === 'pop' && positions.has(key);
    navTypeRef.current = 'push';

    const onScroll = () => {
      if (!restoring) positions.set(key, container.scrollTop);
    };
    container.addEventListener('scroll', onScroll, { passive: true });

    let observer: ResizeObserver | null = null;
    let rafId = 0;
    let timeoutId = 0;

    const finish = () => {
      restoring = false;
      observer?.disconnect();
      observer = null;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('wheel', abort);
      window.removeEventListener('touchstart', abort);
      window.removeEventListener('keydown', abort);
    };

    function abort() {
      finish();
    }

    if (restoring) {
      const target = positions.get(key)!;
      container.scrollTop = target; // immediate best-effort restore

      const apply = () => {
        container.scrollTop = target;
        if (Math.abs(container.scrollTop - target) < 2) {
          finish();
        } else {
          rafId = requestAnimationFrame(apply);
        }
      };

      // Content can grow after the loading skeleton is replaced; re-apply on resize.
      observer = new ResizeObserver(() => {
        if (restoring) container.scrollTop = target;
      });
      observer.observe(container);

      window.addEventListener('wheel', abort, { passive: true });
      window.addEventListener('touchstart', abort, { passive: true });
      window.addEventListener('keydown', abort);
      timeoutId = window.setTimeout(finish, 3000);
      rafId = requestAnimationFrame(apply);
    } else {
      container.scrollTop = 0;
    }

    return () => {
      container.removeEventListener('scroll', onScroll);
      finish();
    };
  }, [pathname]);

  return null;
}
