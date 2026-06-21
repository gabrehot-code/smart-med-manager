import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profile + ensure a default patient once a session exists.
  const bootstrap = useCallback(async () => {
    try {
      const p = await api.profile.get();
      setProfile(p);
      const pt = await api.patients.ensureDefault();
      setPatient(pt);
    } catch (e) {
      console.error('[auth bootstrap]', e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await bootstrap();
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess) { await bootstrap(); } else { setProfile(null); setPatient(null); }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [bootstrap]);

  const value = {
    session,
    user: session?.user || null,
    profile,
    patient,
    loading,
    refreshPatient: bootstrap,
    signUp: (email, password, meta = {}) =>
      supabase.auth.signUp({ email, password, options: { data: meta } }),
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
