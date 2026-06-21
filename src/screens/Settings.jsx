import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';

export default function Settings() {
  const { profile, user, signOut } = useAuth();
  const toast = useToast();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const d = !!profile?.dark_mode;
    setDark(d);
    document.documentElement.classList.toggle('dark', d);
  }, [profile]);

  async function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { await api.profile.update({ dark_mode: next }); } catch (e) { console.error(e); }
  }

  return (
    <div>
      <header className="bg-primary text-white px-6 pt-6 pb-5 rounded-b-3xl">
        <h1 className="font-extrabold text-xl">הגדרות</h1>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-3">
        <div className="bg-surface rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-lg">
            {(profile?.full_name || user?.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-base text-text leading-tight">{profile?.full_name || 'משתמש'}</p>
            <p className="text-xs text-text-light mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <button onClick={toggleDark} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-2 transition text-right">
            <span className="w-10 h-10 rounded-xl bg-text flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-base" aria-hidden="true">dark_mode</span>
            </span>
            <span className="flex-1 font-bold text-base text-text">מצב כהה</span>
            <span className={`w-12 h-7 rounded-full relative transition ${dark ? 'bg-secondary' : 'bg-border'}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${dark ? 'right-1' : 'right-6'}`} />
            </span>
          </button>
        </div>

        <button onClick={() => signOut()}
          className="w-full bg-surface rounded-2xl border border-error/40 p-4 flex items-center justify-center gap-2 hover:bg-error-bg transition">
          <span className="material-symbols-outlined text-error" aria-hidden="true">logout</span>
          <span className="font-bold text-base text-error">התנתק</span>
        </button>

        <p className="text-center text-xs text-text-faint pt-2">מנהל תרופות חכם · React + Supabase · גרסה 3.0.0</p>
      </div>
    </div>
  );
}
