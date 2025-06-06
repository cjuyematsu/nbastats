'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Import the SupabaseClient type
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
// This is your shared client, which is great!
import { supabase } from '@/lib/supabaseClient';

// --- 1. ADD `supabase` TO THE TYPE DEFINITION ---
interface AuthContextType {
  supabase: SupabaseClient; // Add this line
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Your existing useEffect logic is perfectly fine, no changes needed here.
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // --- 2. ADD `supabase` TO THE VALUE PROVIDED BY THE CONTEXT ---
  const value = {
    session,
    user,
    isLoading,
    signOut,
    supabase, // Add this line
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