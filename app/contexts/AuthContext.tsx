// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, Subscription } from '@supabase/supabase-js'; // Added Subscription type
import { supabase } from '@/lib/supabaseClient'; // Adjust path if your supabaseClient is elsewhere

interface AuthContextType {
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

    // onAuthStateChange returns an object with a data property, 
    // which in turn has a subscription property.
    const { data: authStateChangeListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Set loading to false after initial session is processed or auth state changes
        if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
          setIsLoading(false);
        }
      }
    );

    // The object returned by onAuthStateChange has a `subscription` property.
    // That subscription object has the `unsubscribe` method.
    return () => {
      authStateChangeListener?.subscription?.unsubscribe(); // Corrected: access subscription property
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
    }
    // onAuthStateChange will handle setting session and user to null
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut }}>
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