import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { plannedForDate, indexDoses, statusOf, adherence } from '../lib/schedule';
import { ymd, hm } from '../lib/format';

const FILTERS = [
  { id: 'today', label: 'היום', days: 1 },
  { id: 'week', label: 'השבוע', days: 7 },
  { id: 'month', label: 'החודש', days: 30 },
];

export default function History({ go }) {
  const { patient } = useAuth();
  const [meds, setMeds] = useState([]);
  const [doses, setDoses] = useState([]);
  const [filter, setFilter] = useState('week');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const [m, d] = await Promise.all([api.meds.list(patient.id), api.doses.all(patient.id)]);
      setMeds(m); setDoses(d);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [patient]);
  useEffect(() => { load(); }, [load]);

  const idx = indexDoses(doses);
  const adh = adherence(meds, doses, 30);
  const days = FILTERS.find((f) => f.id === filter).days;
  const now = new Date();
  const groups = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const planned = plannedForDate(meds, d).filter((p) => new Date(p.scheduledAt).getTime() <= Date.now() || ymd(d) === ymd(now));
    if (planned.length) groups.push({ d, planned });
  }

  return (
    <div>
      <header className="bg-primary text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => go('family')} aria-label="חזור" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
          <h1 className="font-extrabold text-lg">היסטוריה מלאה</h1>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat n={`${adh.pct}%`} l="עמידות 30 יום" />
          <Stat n={adh.taken} l="נטילות בזמן" color="#6EE7B7" />
          <Stat n={adh.missed} l="פספוסים" color="#FCA5A5" />
        </div>
      </header>

      <div className="px-4 py-3 flex gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`font-bold rounded-full px-4 py-2 text-sm ${filter === f.id ? 'bg-secondary text-white' : 'bg-surface text-text-muted border border-border'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-24 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><span className="material-symbols-outlined text-primary text-4xl animate-spin" aria-hidden="true">progress_activity</span></div>
        ) : groups.length === 0 ? (
          <div className="bg-surface rounded-2xl p-6 border border-border text-center text-text-muted">אין רישומים בטווח שנבחר</div>
        ) : groups.map((g, gi) => {
          const label = ymd(g.d) === ymd(now) ? 'היום'
            : ymd(g.d) === ymd(new Date(Date.now() - 86400000)) ? 'אתמול'
            : g.d.toLocaleDateString('he-IL', { day: '2-digit', month: 'long' });
          return (
            <div key={gi}>
              <p className="font-bold text-xs text-text-light mb-2 px-1">{label}</p>
              <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                {g.planned.map((p, i) => {
                  const st = statusOf(idx, p);
                  const last = i === g.planned.length - 1;
                  const rec = st.dose;
                  const time = st.status === 'taken' && rec?.taken_at ? hm(new Date(rec.taken_at)) : p.time;
                  const cfg = {
                    taken: { icon: 'check', cls: 'text-success', bg: 'bg-success-bg', txt: 'נלקח בזמן' },
                    missed: { icon: 'close', cls: 'text-error', bg: 'bg-error-bg', txt: 'לא נלקח' },
                    pending: { icon: 'schedule', cls: 'text-text-faint', bg: 'bg-surface-2', txt: 'ממתין' },
                  }[st.status];
                  return (
                    <div key={p.key} className={`px-4 py-3 flex items-center gap-3 ${last ? '' : 'border-b border-border'}`}>
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <span className={`material-symbols-outlined text-base ${cfg.cls}`} aria-hidden="true">{cfg.icon}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base text-text leading-tight">{p.medName}{p.dose ? ` · ${p.dose}` : ''}</p>
                        <p className={`text-xs mt-0.5 ${cfg.cls}`}>{cfg.txt}</p>
                      </div>
                      <span className="font-semibold text-sm text-text-light">{time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ n, l, color }) {
  return (
    <div className="rounded-2xl p-3 text-center bg-white/10">
      <p className="font-extrabold leading-none" style={{ fontSize: 22, color: color || '#fff' }}>{n}</p>
      <p className="text-xs mt-1 text-white/70">{l}</p>
    </div>
  );
}
