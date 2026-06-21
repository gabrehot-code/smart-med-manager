import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { daysLeft } from '../lib/schedule';

export default function Inventory({ go }) {
  const { patient } = useAuth();
  const toast = useToast();
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try { setMeds(await api.meds.list(patient.id)); }
    catch (e) { toast.error('שגיאה בטעינת המלאי'); console.error(e); }
    finally { setLoading(false); }
  }, [patient, toast]);

  useEffect(() => { load(); }, [load]);

  async function remove(id, name) {
    if (!window.confirm(`למחוק את "${name}"? ההיסטוריה תישמר.`)) return;
    try { await api.meds.remove(id); toast.success('התרופה נמחקה'); load(); }
    catch (e) { toast.error('שגיאה במחיקה'); console.error(e); }
  }

  return (
    <div className="relative min-h-full">
      <header className="bg-surface border-b border-border px-6 py-4">
        <h1 className="font-extrabold text-2xl text-primary leading-tight">מלאי תרופות</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {meds.length ? `${meds.length} תרופות במעקב` : 'אין תרופות עדיין — הוסף אחת כדי להתחיל'}
        </p>
      </header>

      <div className="px-4 pt-4 pb-28 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-primary text-4xl animate-spin" aria-hidden="true">progress_activity</span>
          </div>
        ) : meds.length === 0 ? (
          <div className="bg-surface rounded-2xl p-8 border border-border text-center">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-secondary text-3xl" aria-hidden="true">medication</span>
            </div>
            <p className="font-bold text-base text-text mb-1">המלאי ריק</p>
            <p className="text-sm text-text-muted mb-4">הוסף את התרופה הראשונה ונתחיל לעקוב.</p>
            <button onClick={() => go('add')} className="h-12 px-6 bg-secondary text-white rounded-full font-bold">+ הוסף תרופה</button>
          </div>
        ) : (
          meds.map((m) => {
            const days = daysLeft(m);
            const low = days <= 7;
            const times = (m.times || []).join(' · ') || 'ללא תזמון';
            return (
              <div key={m.id} className={`bg-surface rounded-2xl overflow-hidden ${low ? 'border-2 border-error' : 'border border-border'}`}>
                <div className="p-4 flex justify-between items-start gap-3">
                  <span className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ background: m.color || '#3B82F6' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-lg text-text leading-tight">{m.name}</p>
                    <p className="text-sm text-text-muted mt-0.5">{m.dose ? `${m.dose} · ` : ''}{times}</p>
                  </div>
                  <button onClick={() => remove(m.id, m.name)} aria-label={`מחק ${m.name}`}
                    className="w-9 h-9 rounded-full hover:bg-error-bg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-text-faint text-lg" aria-hidden="true">delete</span>
                  </button>
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0 ${low ? 'bg-error' : ''}`}
                       style={low ? {} : { background: m.color || '#3B82F6' }}>
                    <span className="font-extrabold text-2xl leading-none">{m.qty}</span>
                    <span className="font-semibold text-[10px] opacity-90 mt-0.5">{days <= 0 ? 'נגמר!' : 'נותרו'}</span>
                  </div>
                </div>
                <div className={`px-4 py-2.5 flex items-center gap-2 ${low ? 'bg-error-bg' : 'bg-success-bg'}`}>
                  <span className={`material-symbols-outlined text-lg ${low ? 'text-error' : 'text-success fill-icon'}`} aria-hidden="true">
                    {low ? 'warning' : 'check_circle'}
                  </span>
                  <span className={`font-bold text-sm ${low ? 'text-error' : 'text-success'}`}>
                    {low ? 'מלאי נמוך — כדאי לחדש מרשם' : `מלאי תקין — מספיק ל-${days} ימים`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button onClick={() => go('add')} aria-label="הוסף תרופה"
        className="fixed bottom-20 z-30 w-14 h-14 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg hover:bg-secondary-dk transition"
        style={{ insetInlineStart: 'max(1.25rem, calc(50% - 360px + 1.25rem))' }}>
        <span className="material-symbols-outlined text-3xl" aria-hidden="true">add</span>
      </button>
    </div>
  );
}
