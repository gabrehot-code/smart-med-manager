import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function applySettings(profile) {
  if (!profile) return;
  const root = document.documentElement;

  // מצב כהה
  root.classList.toggle('dark', !!profile.dark_mode);

  // גודל טקסט
  const sizes = { small:'14px', regular:'16px', large:'18px', xlarge:'20px' };
  root.style.fontSize = sizes[profile.text_size] || '16px';

  // ערכת צבעים — שם הנכון הוא --c-primary
  const themes = {
    classic: { p:'#1E3A8A', s:'#3B82F6' },
    green:   { p:'#064E3B', s:'#10B981' },
    purple:  { p:'#4C1D95', s:'#8B5CF6' },
    dark:    { p:'#1F2937', s:'#374151' },
  };
  const t = themes[profile.theme] || themes.classic;
  root.style.setProperty('--c-primary',   t.p);
  root.style.setProperty('--c-secondary', t.s);

  // שפה וכיוון
  root.lang = profile.language || 'he';
  localStorage.setItem('lang', profile.language || 'he');
  root.dir  = profile.language === 'en' ? 'ltr' : 'rtl';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const p  = await api.profile.get();
      setProfile(p);
      applySettings(p);
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
      if (sess) { await bootstrap(); }
      else { setProfile(null); setPatient(null); }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [bootstrap]);

  const updateProfile = useCallback(async (changes) => {
    try {
      const updated = await api.profile.update(changes);
      setProfile(updated);
      applySettings(updated);
      return updated;
    } catch (e) {
      console.error('[updateProfile]', e);
      throw e;
    }
  }, []);

  const value = {
    session,
    user: session?.user || null,
    profile,
    patient,
    loading,
    refreshPatient: bootstrap,
    updateProfile,
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
