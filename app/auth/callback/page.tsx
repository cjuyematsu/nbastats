// app/auth/callback/page.tsx
//
// OAuth return page. The browser Supabase client (implicit flow) auto-parses the
// token from the URL hash and fires SIGNED_IN, which AuthContext (localStorage
// session) picks up. A server route.ts + exchangeCodeForSession would write a
// cookie session the context can't see, so this stays a client page.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      router.replace('/');
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });
    // Fallback so the page never hangs if no session materialises.
    const timer = setTimeout(finish, 3000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-slate-600 dark:text-slate-300">
      <div className="h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p>Signing you in...</p>
    </div>
  );
}
