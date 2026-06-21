import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { plannedForDate, indexDoses, statusOf, adherence } from '../lib/schedule';
import { formatEta } from '../lib/format';

export default function Dashboard({ go }) {
  const { patient, profile } = useAuth();
  const toast = useToast();
  const [meds, setMeds] = useState([]);
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const [m, d] = await Promise.all([api.meds.list(patient.id), api.doses.all(patient.id)]);
      setMeds(m); setDoses(d);
    } catch (e) { toast.error('שגיאה בטעינת הנתונים'); console.error(e); }
    finally { setLoading(false); }
  }, [patient, toast]);

  useEffect(() => { load(); }, [load]);

  if (!patient || loading) {
    return <CenterSpinner />;
  }

  const planned = plannedForDate(meds, new Date());
  const idx = indexDoses(doses);
  const now = Date.now();
  const past = planned.filter((p) => new Date(p.scheduledAt).getTime() <= now);
  const takenToday = past.filter((p) => statusOf(idx, p).status === 'taken').length;
  const total = planned.length;
  const allDone = past.length > 0 && past.every((p) => statusOf(idx, p).status === 'taken');
  const adh = adherence(meds, doses, 30);
  const upcoming = planned.find((p) => new Date(p.scheduledAt).getTime() > now && statusOf(idx, p).status !== 'taken');

  async function take(p) {
    try {
      await api.doses.record(p.medId, p.scheduledAt, 'taken');
      toast.success(`${p.medName} נרשם — כל הכבוד! 🎉`);
      load();
    } catch (e) { toast.error('לא הצלחנו לרשום את הנטילה'); console.error(e); }
  }

  return (
    <div>
      <header className="bg-primary text-white px-6 pb-7 pt-6 rounded-b-3xl">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs opacity-90 mb-1">שלום, {profile?.full_name?.split(' ')[0] || ''}</p>
            <h1 className="font-extrabold text-2xl leading-tight">התרופות של {patient.possessive_nick || ''}</h1>
          </div>
          <button onClick={() => go('profile')} aria-label="פרופיל מטופל"
            className="w-11 h-11 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center font-extrabold">
            {(patient.full_name || '?').trim()[0] || '?'}
          </button>
        </div>
        <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3" role="status" aria-live="polite">
          <span className="material-symbols-outlined fill-icon text-3xl" aria-hidden="true">{allDone && total > 0 ? 'check_circle' : 'pending'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">
              {allDone && total > 0 ? 'הכל נלקח בזמן היום' : total === 0 ? 'אין תרופות מתוזמנות היום' : 'יש תרופות ממתינות היום'}
            </p>
            <p className="text-xs opacity-90 mt-0.5">{takenToday} מתוך {total} תרופות</p>
          </div>
          <span className="font-extrabold text-3xl">{total === 0 ? 100 : Math.round((takenToday / total) * 100)}%</span>
        </div>
      </header>

      <div className="px-4 pt-5 pb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <Row label="עמידות בטיפול (30 ימים)" icon="monitoring" />
            <p className="font-extrabold text-3xl text-primary leading-none">{adh.pct}%</p>
            <p className="text-xs text-text-muted mt-1.5">{adh.taken} נטילות · {adh.missed} פספוסים</p>
          </Card>
          <Card>
            <Row label="התרופה הבאה" icon="schedule" tone="error" />
            <p className="font-bold text-base text-text leading-tight">{upcoming ? upcoming.medName : 'אין'}</p>
            <p className="text-xs text-text-muted mt-0.5">{upcoming ? upcoming.time : 'הסתיים להיום'}</p>
            {upcoming && (
              <div className="mt-2 bg-error-bg text-error rounded-lg px-2 py-1 font-bold text-xs text-center">
                {formatEta(Math.round((new Date(upcoming.scheduledAt).getTime() - now) / 60000))}
              </div>
            )}
          </Card>
        </div>

        <p className="font-bold text-sm text-text-light px-1 pt-1">התרופות של היום</p>
        {planned.length === 0 ? (
          <Card>
            <p className="text-center text-text-muted py-3">אין תרופות מתוזמנות. הוסף תרופה כדי להתחיל.</p>
            <button onClick={() => go('add')} className="w-full h-11 bg-secondary text-white rounded-full font-bold">+ הוסף תרופה</button>
          </Card>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            {planned.map((p, i) => {
              const s = statusOf(idx, p).status;
              const last = i === planned.length - 1;
              return (
                <div key={p.key} className={`px-4 py-3 flex items-center gap-3 ${last ? '' : 'border-b border-border'}`}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: meds.find((m) => m.id === p.medId)?.color || '#3B82F6' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-text leading-tight">{p.medName}</p>
                    <p className="text-xs text-text-light mt-0.5">{p.dose || 'ללא מינון'} · {p.time}</p>
                  </div>
                  {s === 'taken' ? (
                    <span className="font-semibold text-sm text-success">✓ נלקח</span>
                  ) : s === 'missed' ? (
                    <button onClick={() => take(p)} className="font-bold text-xs px-3 py-1.5 rounded-full bg-error-bg text-error">פוספס · סמן</button>
                  ) : (
                    <button onClick={() => take(p)} className="font-bold text-sm px-4 py-1.5 rounded-full bg-secondary text-white">לקחתי</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => go('ai')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 text-right hover:opacity-95 transition mt-1"
          style={{ background: 'linear-gradient(135deg,#1E3A8A,#3B82F6)' }}>
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined fill-icon text-white text-2xl" aria-hidden="true">auto_awesome</span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-white text-lg leading-tight">שאל את Claude AI</p>
            <p className="text-xs text-white/90 mt-0.5">מידע על תרופות, אינטראקציות וטיפים</p>
          </div>
          <span className="material-symbols-outlined text-white/80" aria-hidden="true">chevron_left</span>
        </button>
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div className="bg-surface rounded-2xl p-4 border border-border">{children}</div>;
}
function Row({ label, icon, tone }) {
  return (
    <div className="flex justify-between items-start mb-2">
      <span className="font-semibold text-xs text-text-muted">{label}</span>
      <span className={`material-symbols-outlined text-lg ${tone === 'error' ? 'text-error' : 'text-secondary'}`} aria-hidden="true">{icon}</span>
    </div>
  );
}
function CenterSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <span className="material-symbols-outlined text-primary text-4xl animate-spin" aria-hidden="true">progress_activity</span>
    </div>
  );
}
