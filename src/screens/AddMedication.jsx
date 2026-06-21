import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';

const PRESETS = [
  { t: '08:00', label: 'בוקר', icon: 'wb_sunny' },
  { t: '14:00', label: 'צהריים', icon: 'light_mode' },
  { t: '20:00', label: 'ערב', icon: 'wb_twilight' },
  { t: '22:00', label: 'לילה', icon: 'bedtime' },
];
const COLORS = ['#3B82F6', '#EF4444', '#FBBF24', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6', '#1F2937'];

export default function AddMedication({ go }) {
  const { patient } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [dose, setDose] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [times, setTimes] = useState(['08:00']);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  const addTime = (t) => { if (t && !times.includes(t)) setTimes([...times, t].sort()); };
  const removeTime = (t) => setTimes(times.filter((x) => x !== t));

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) { toast.error('יש להזין שם תרופה'); return; }
    if (!qty || Number(qty) < 1) { toast.error('יש להזין כמות חוקית'); return; }
    if (times.length === 0) { toast.error('יש להזין לפחות זמן התראה אחד'); return; }
    setBusy(true);
    try {
      await api.meds.create(patient.id, { name: name.trim(), qty: Number(qty), dose: dose.trim(), color, times });
      toast.success(`${name.trim()} נוסף בהצלחה`);
      go('inventory');
    } catch (err) { toast.error('שגיאה בשמירה'); console.error(err); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <header className="bg-surface border-b border-border h-14 flex items-center justify-between px-4">
        <button onClick={() => go('inventory')} aria-label="סגור" className="p-2 rounded-full hover:bg-surface-2">
          <span className="material-symbols-outlined text-text-muted" aria-hidden="true">close</span>
        </button>
        <h1 className="font-bold text-lg text-primary">תרופה חדשה</h1>
        <span className="w-10" />
      </header>

      <form onSubmit={save} className="px-6 pt-6 pb-10 space-y-6">
        <div className="space-y-2">
          <label htmlFor="m-name" className="block font-bold text-text-muted">שם התרופה *</label>
          <input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: אקמול"
            className="w-full h-14 bg-surface border border-border rounded-lg px-4 text-base text-text outline-none focus:border-secondary" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="m-qty" className="block font-bold text-text-muted">כמות *</label>
            <input id="m-qty" type="number" min="1" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="30"
              className="w-full h-14 bg-surface border border-border rounded-lg px-4 text-base text-text outline-none focus:border-secondary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="m-dose" className="block font-bold text-text-muted">מינון</label>
            <input id="m-dose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="100 מ״ג"
              className="w-full h-14 bg-surface border border-border rounded-lg px-4 text-base text-text outline-none focus:border-secondary" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="block font-bold text-text-muted">צבע הגלולה</span>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`צבע ${c}`}
                className="w-10 h-10 rounded-full border-2 transition"
                style={{ background: c, borderColor: color === c ? 'var(--c-text)' : 'transparent', boxShadow: color === c ? '0 0 0 2px var(--c-surface) inset' : 'none' }} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <span className="block font-bold text-text-muted">זמני התראה *</span>
          {times.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {times.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 bg-accent text-primary rounded-full ps-3 pe-2 py-1.5 font-bold">
                  {t}
                  <button type="button" onClick={() => removeTime(t)} aria-label={`הסר ${t}`} className="w-5 h-5 rounded-full hover:bg-white/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button key={p.t} type="button" onClick={() => addTime(p.t)} disabled={times.includes(p.t)}
                className="border border-border rounded-xl py-2 flex flex-col items-center gap-1 hover:border-secondary disabled:opacity-50 transition">
                <span className="material-symbols-outlined fill-icon text-secondary" aria-hidden="true">{p.icon}</span>
                <span className="text-xs text-text-light">{p.label}</span>
                <span className="font-extrabold text-sm text-text" dir="ltr">{p.t}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="time" value={custom} onChange={(e) => setCustom(e.target.value)}
              className="flex-1 h-11 bg-surface border border-border rounded-xl px-3 text-base text-text outline-none focus:border-secondary" />
            <button type="button" onClick={() => { addTime(custom); setCustom(''); }}
              className="h-11 px-4 rounded-xl border border-dashed border-border font-bold text-text-muted hover:border-secondary">הוסף שעה</button>
          </div>
        </div>

        <button type="submit" disabled={busy}
          className="w-full h-14 bg-secondary text-white rounded-full font-extrabold text-lg hover:bg-secondary-dk transition disabled:opacity-60 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined" aria-hidden="true">save</span>
          {busy ? 'שומר…' : 'שמור תרופה'}
        </button>
      </form>
    </div>
  );
}
