// app/contexts/AuthContext.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { readCachedAdmin, writeCachedAdmin, readPersistedUserId } from '@/lib/adminCache';

interface AuthContextType {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Optimistically seed from the last-known cached value so a returning admin's
  // "Review" link renders on first paint instead of popping in after the fetch.
  const [isAdmin, setIsAdmin] = useState<boolean>(() =>
    readCachedAdmin(readPersistedUserId())
  );

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error("Error fetching initial session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    const { data: authStateChangeListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
          setIsLoading(false);
        }
      }
    );

    return () => {
      authStateChangeListener?.subscription?.unsubscribe();
    };
  }, []);

  // Admin status (drives the owner-only "Review" link) is looked up once per
  // set of credentials and shared via context, rather than refetched by every
  // consumer. Keyed on the access token so it only re-runs on a real
  // sign-in / token change, not on every new session object reference.
  useEffect(() => {
    const token = session?.access_token;
    const userId = session?.user?.id;
    if (!token || !userId) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    fetch('/api/articles/is-admin', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => {
        const admin = Boolean(j?.admin);
        writeCachedAdmin(userId, admin);
        if (active) setIsAdmin(admin);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [session?.access_token, session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    isLoading,
    isAdmin,
    signOut,
    supabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};