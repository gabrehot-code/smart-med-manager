import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { humanAgo } from '../lib/format';
import Modal from '../components/Modal';

const TYPES = {
  bp:      { label: 'לחץ דם', icon: 'monitor_heart', unit: 'mmHg', fields: [{ k: 'systolic', l: 'סיסטולי (עליון)' }, { k: 'diastolic', l: 'דיאסטולי (תחתון)' }], fmt: (v) => `${v.systolic}/${v.diastolic}` },
  hr:      { label: 'דופק', icon: 'favorite', unit: 'bpm', fields: [{ k: 'value', l: 'פעימות לדקה' }], fmt: (v) => `${v.value}` },
  weight:  { label: 'משקל', icon: 'scale', unit: 'ק״ג', fields: [{ k: 'value', l: 'ק״ג' }], fmt: (v) => `${v.value}` },
  glucose: { label: 'סוכר בדם', icon: 'water_drop', unit: 'mg/dL', fields: [{ k: 'value', l: 'mg/dL' }], fmt: (v) => `${v.value}` },
  temp:    { label: 'חום גוף', icon: 'device_thermostat', unit: '°C', fields: [{ k: 'value', l: '°C' }], fmt: (v) => `${v.value}°` },
  spo2:    { label: 'סטורציה', icon: 'air', unit: '%', fields: [{ k: 'value', l: '%' }], fmt: (v) => `${v.value}%` },
};

export default function Vitals({ go }) {
  const { patient } = useAuth();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bp');
  const [form, setForm] = useState({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try { setList(await api.vitals.list(patient.id)); }
    catch (e) { toast.error('שגיאה בטעינת המדדים'); console.error(e); }
    finally { setLoading(false); }
  }, [patient, toast]);
  useEffect(() => { load(); }, [load]);

  const latest = {};
  list.forEach((v) => { if (!latest[v.type]) latest[v.type] = v; });

  function openFor(t) { setType(t); setForm({}); setNotes(''); setOpen(true); }

  async function save() {
    const def = TYPES[type];
    const entry = { type, notes };
    let valid = true;
    def.fields.forEach((f) => { const n = Number(form[f.k]); if (!n || n < 0) valid = false; entry[f.k] = n; });
    if (!valid) { toast.error('יש להזין ערך תקין'); return; }
    setBusy(true);
    try {
      await api.vitals.log(patient.id, entry);
      toast.success(`${def.label}: ${def.fmt(entry)} נשמר`);
      setOpen(false); load();
    } catch (e) { toast.error('שגיאה בשמירה'); console.error(e); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!window.confirm('למחוק את המדידה?')) return;
    try { await api.vitals.remove(id); toast.success('המדידה נמחקה'); load(); }
    catch (e) { toast.error('שגיאה במחיקה'); console.error(e); }
  }

  return (
    <div className="relative min-h-full">
      <header className="bg-primary text-white px-5 pt-6 pb-5 rounded-b-3xl flex items-center gap-3">
        <button onClick={() => go('family')} aria-label="חזור" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <div>
          <h1 className="font-extrabold text-xl leading-tight">מדדים</h1>
          <p className="text-xs opacity-90 mt-0.5">{list.length ? `${list.length} מדידות · עדכון ${humanAgo(new Date(list[0].recorded_at))}` : 'טרם נרשמו מדידות'}</p>
        </div>
      </header>

      <div className="px-4 pt-4 pb-28 space-y-3">
        {loading ? <Spin /> : (
          <>
            <p className="font-bold text-sm text-text-light px-1">מדידות אחרונות</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(TYPES).map(([t, def]) => {
                const v = latest[t];
                return (
                  <button key={t} onClick={() => openFor(t)} className="bg-surface rounded-2xl p-3 border border-border text-right hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-xs text-text-light">{def.label}</span>
                      <span className={`material-symbols-outlined text-base ${v ? 'text-secondary' : 'text-text-faint'}`} aria-hidden="true">{def.icon}</span>
                    </div>
                    <p className={`font-extrabold text-xl leading-none ${v ? 'text-text' : 'text-text-faint'}`}>{v ? def.fmt(v) : '—'}</p>
                    <p className="text-xs text-text-light mt-1">{v ? `${def.unit} · ${humanAgo(new Date(v.recorded_at))}` : 'הקש להוספה'}</p>
                  </button>
                );
              })}
            </div>

            <p className="font-bold text-sm text-text-light px-1 pt-2">היסטוריה</p>
            {list.length === 0 ? (
              <div className="bg-surface rounded-2xl p-6 border border-border text-center text-text-muted">אין מדידות עדיין — הקש על מדד כדי להוסיף.</div>
            ) : (
              <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                {list.slice(0, 20).map((v, i) => {
                  const def = TYPES[v.type] || {};
                  const last = i === Math.min(list.length, 20) - 1;
                  return (
                    <div key={v.id} className={`px-4 py-3 flex items-center gap-3 ${last ? '' : 'border-b border-border'}`}>
                      <span className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-secondary text-base" aria-hidden="true">{def.icon || 'monitor_heart'}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base text-text leading-tight">{def.label} · {def.fmt ? def.fmt(v) : ''} {def.unit}</p>
                        <p className="text-xs text-text-light mt-0.5">{humanAgo(new Date(v.recorded_at))}{v.notes ? ` · ${v.notes}` : ''}</p>
                      </div>
                      <button onClick={() => remove(v.id)} aria-label="מחק" className="w-8 h-8 rounded-full hover:bg-error-bg flex items-center justify-center">
                        <span className="material-symbols-outlined text-text-faint text-lg" aria-hidden="true">delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <button onClick={() => openFor('bp')} aria-label="רישום מדד חדש"
        className="fixed bottom-6 z-30 w-14 h-14 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg hover:bg-secondary-dk transition"
        style={{ insetInlineStart: 'max(1.25rem, calc(50% - 360px + 1.25rem))' }}>
        <span className="material-symbols-outlined text-3xl" aria-hidden="true">add</span>
      </button>

      <Modal open={open} title={`מדידת ${TYPES[type].label}`} icon={TYPES[type].icon} onClose={() => setOpen(false)}>
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {Object.entries(TYPES).map(([t, def]) => (
            <button key={t} onClick={() => { setType(t); setForm({}); }}
              className={`px-3 py-1.5 rounded-full text-sm font-bold border ${type === t ? 'bg-secondary text-white border-secondary' : 'bg-surface text-text-muted border-border'}`}>
              {def.label}
            </button>
          ))}
        </div>
        {TYPES[type].fields.map((f) => (
          <div key={f.k} className="mb-3">
            <label className="block font-bold text-sm text-text-muted mb-1">{f.l}</label>
            <input type="number" inputMode="decimal" value={form[f.k] ?? ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              className="w-full h-12 bg-surface border border-border rounded-lg px-3 text-base text-text outline-none focus:border-secondary" />
          </div>
        ))}
        <div className="mb-4">
          <label className="block font-bold text-sm text-text-muted mb-1">הערה (אופציונלי)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full h-12 bg-surface border border-border rounded-lg px-3 text-base text-text outline-none focus:border-secondary" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpen(false)} className="flex-1 h-12 rounded-full font-bold bg-surface-2 text-text">ביטול</button>
          <button onClick={save} disabled={busy} className="flex-1 h-12 rounded-full font-extrabold bg-secondary text-white disabled:opacity-60">{busy ? 'שומר…' : 'שמור'}</button>
        </div>
      </Modal>
    </div>
  );
}

function Spin() {
  return <div className="flex justify-center py-16"><span className="material-symbols-outlined text-primary text-4xl animate-spin" aria-hidden="true">progress_activity</span></div>;
}
