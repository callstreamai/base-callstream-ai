'use client';
import * as React from 'react';
import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase';

type Profile = {
  id: string;
  display_name: string | null;
  company_name: string | null;
  company_role: string | null;
  avatar_url: string | null;
};

type AuthCtx = {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  openAuth: (mode?: 'login' | 'signup') => void;
  closeAuth: () => void;
  authOpen: boolean;
  authMode: 'login' | 'signup';
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  supabaseReady: boolean;
};

const Ctx = React.createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = React.useState<SupabaseClient | null>(() => {
    if (typeof window === 'undefined') return null;
    return getBrowserSupabase();
  });
  const supabaseReady = !!supabase;

  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(supabaseReady);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'login' | 'signup'>('login');

  const fetchProfile = React.useCallback(
    async (userId: string) => {
      if (!supabase) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(data ?? null);
    },
    [supabase],
  );

  React.useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) fetchProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) fetchProfile(sess.user.id);
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signOut = React.useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, [supabase]);

  const openAuth = React.useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);
  const closeAuth = React.useCallback(() => setAuthOpen(false), []);

  const refreshProfile = React.useCallback(async () => {
    if (session?.user) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  return (
    <Ctx.Provider value={{
      supabase, session, user: session?.user ?? null, profile, loading,
      openAuth, closeAuth, authOpen, authMode, signOut, refreshProfile, supabaseReady,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
