import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { adherence } from '../lib/schedule';
import { formatHebDate } from '../lib/format';

export default function Family({ go }) {
  const { patient } = useAuth();
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    if (!patient) return;
    try {
      const [meds, doses, vitals, journal] = await Promise.all([
        api.meds.list(patient.id), api.doses.all(patient.id),
        api.vitals.list(patient.id), api.journal.list(patient.id),
      ]);
      setStats({ adh: adherence(meds, doses, 30), medCount: meds.length, vitals: vitals.length, journal: journal.length });
    } catch (e) { console.error(e); }
  }, [patient]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <header className="bg-primary text-white px-5 pt-6 pb-6 rounded-b-3xl">
        <p className="text-xs opacity-90">{formatHebDate(new Date())}</p>
        <h1 className="font-extrabold text-2xl leading-tight">מעקב משפחתי</h1>
        <p className="text-xs opacity-90 mt-0.5">
          {patient ? `${patient.full_name} · ${stats ? stats.medCount : '—'} תרופות` : '—'}
        </p>
        {stats && (
          <div className="mt-4 bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined fill-icon text-3xl" aria-hidden="true">monitoring</span>
            <div className="flex-1">
              <p className="font-bold text-base leading-tight">עמידות בטיפול</p>
              <p className="text-xs opacity-90 mt-0.5">30 הימים האחרונים</p>
            </div>
            <span className="font-extrabold text-3xl">{stats.adh.pct}%</span>
          </div>
        )}
      </header>

      <div className="px-4 pt-4 pb-24 space-y-3">
        <p className="font-bold text-sm text-text-light px-1">מעקב נוסף</p>
        <div className="grid grid-cols-2 gap-3">
          <HubCard onClick={() => go('vitals')} icon="monitor_heart" tone="error"
            title="מדדים" sub={stats ? `${stats.vitals} מדידות` : '—'} />
          <HubCard onClick={() => go('journal')} icon="edit_note" tone="secondary"
            title="יומן תסמינים" sub={stats ? `${stats.journal} רשומות` : '—'} />
          <HubCard onClick={() => go('history')} icon="history" tone="secondary"
            title="היסטוריה מלאה" sub="כל הנטילות" />
          <HubCard onClick={() => go('profile')} icon="account_circle" tone="secondary"
            title="פרופיל מטופל" sub={patient ? patient.full_name : '—'} />
        </div>

        <button onClick={() => go('emergency')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 text-right hover:opacity-95 transition"
          style={{ background: 'linear-gradient(135deg,#EF4444,#B91C1C)' }}>
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined fill-icon text-white text-2xl" aria-hidden="true">medical_services</span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-white text-lg leading-tight">מידע חירום (ICE)</p>
            <p className="text-xs text-white/90">אלרגיות, מצבים, אנשי קשר</p>
          </div>
          <span className="material-symbols-outlined text-white/80" aria-hidden="true">chevron_left</span>
        </button>
      </div>
    </div>
  );
}

function HubCard({ onClick, icon, tone, title, sub }) {
  return (
    <button onClick={onClick} className="bg-surface rounded-2xl p-4 border border-border flex flex-col items-start gap-2 hover:shadow-md transition text-right">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone === 'error' ? 'bg-error-bg' : 'bg-accent'}`}>
        <span className={`material-symbols-outlined fill-icon text-xl ${tone === 'error' ? 'text-error' : 'text-secondary'}`} aria-hidden="true">{icon}</span>
      </span>
      <div>
        <p className="font-bold text-base text-text leading-tight">{title}</p>
        <p className="text-xs text-text-light mt-0.5">{sub}</p>
      </div>
    </button>
  );
}
