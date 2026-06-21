import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import Modal from '../components/Modal';

export default function Profile({ go }) {
  const { patient, refreshPatient } = useAuth();
  const toast = useToast();
  const [medCount, setMedCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!patient) return;
    try { setMedCount((await api.meds.list(patient.id)).length); } catch (e) { console.error(e); }
  }, [patient]);
  useEffect(() => { load(); }, [load]);

  if (!patient) return null;

  function openEdit() {
    setForm({
      full_name: patient.full_name || '', possessive_nick: patient.possessive_nick || '',
      birth_date: patient.birth_date || '', blood_type: patient.blood_type || '',
      weight: patient.weight || '', height: patient.height || '',
    });
    setOpen(true);
  }
  async function save() {
    if (!form.full_name.trim()) { toast.error('שם לא יכול להיות ריק'); return; }
    setBusy(true);
    try {
      await api.patients.update(patient.id, {
        full_name: form.full_name.trim(), possessive_nick: form.possessive_nick.trim() || patient.possessive_nick,
        birth_date: form.birth_date || null, blood_type: form.blood_type.trim(),
        weight: form.weight.trim(), height: form.height.trim(),
      });
      toast.success('הפרטים נשמרו'); setOpen(false); await refreshPatient(); load();
    } catch (e) { toast.error('שגיאה בשמירה'); console.error(e); }
    finally { setBusy(false); }
  }
  const F = (k, l, type = 'text') => (
    <div className="mb-3">
      <label className="block font-bold text-sm text-text-muted mb-1">{l}</label>
      <input type={type} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="w-full h-11 bg-surface border border-border rounded-lg px-3 text-base text-text outline-none focus:border-secondary" />
    </div>
  );
  const initials = (patient.full_name || '?').replace(/["׳']/g, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('');

  return (
    <div>
      <header className="bg-primary text-white px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex justify-between items-center mb-5">
          <button onClick={() => go('family')} aria-label="חזור" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
          <h1 className="font-extrabold text-lg">פרופיל מטופל</h1>
          <button onClick={openEdit} aria-label="ערוך" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center font-extrabold text-3xl mb-3">{initials || '?'}</div>
          <h2 className="font-extrabold text-2xl">{patient.full_name}</h2>
          <div className="flex gap-2 mt-3">
            <span className="font-bold rounded-lg px-3 py-1 text-xs" style={{ background: 'rgba(16,185,129,.2)', color: '#A7F3D0' }}>פעיל במערכת</span>
            <span className="font-bold rounded-lg px-3 py-1 text-xs" style={{ background: 'rgba(219,234,254,.2)', color: '#BFDBFE' }}>{medCount} תרופות</span>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          <Quick onClick={() => go('history')} icon="history" label="היסטוריה" />
          <Quick onClick={() => go('vitals')} icon="monitor_heart" label="מדדים" />
          <Quick onClick={() => go('emergency')} icon="emergency" label="חירום" tone="error" />
        </div>

        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <Row label="תאריך לידה" value={patient.birth_date || '—'} icon="cake" />
          <Row label="סוג דם" value={patient.blood_type || '—'} icon="bloodtype" />
          <Row label="משקל" value={patient.weight || '—'} icon="scale" />
          <Row label="גובה" value={patient.height || '—'} icon="straighten" last />
        </div>
      </div>

      <Modal open={open} title="עריכת פרופיל" icon="edit" onClose={() => setOpen(false)}>
        {F('full_name', 'שם מלא')}{F('possessive_nick', 'כינוי קצר (אבא/אמא)')}{F('birth_date', 'תאריך לידה', 'date')}
        {F('blood_type', 'סוג דם')}{F('weight', 'משקל')}{F('height', 'גובה')}
        <div className="flex gap-2 mt-2">
          <button onClick={() => setOpen(false)} className="flex-1 h-12 rounded-full font-bold bg-surface-2 text-text">ביטול</button>
          <button onClick={save} disabled={busy} className="flex-1 h-12 rounded-full font-extrabold bg-secondary text-white disabled:opacity-60">{busy ? 'שומר…' : 'שמור'}</button>
        </div>
      </Modal>
    </div>
  );
}

function Quick({ onClick, icon, label, tone }) {
  return (
    <button onClick={onClick} className="bg-surface rounded-2xl p-3 border border-border flex flex-col items-center gap-2 hover:shadow-md transition">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone === 'error' ? 'bg-error-bg' : 'bg-accent'}`}>
        <span className={`material-symbols-outlined text-xl ${tone === 'error' ? 'text-error' : 'text-secondary'}`} aria-hidden="true">{icon}</span>
      </span>
      <span className="font-bold text-xs text-text">{label}</span>
    </button>
  );
}
function Row({ label, value, icon, last }) {
  return (
    <div className={`px-4 py-3 flex items-center gap-3 ${last ? '' : 'border-b border-border'}`}>
      <span className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
        <span className="material-symbols-outlined text-secondary text-base" aria-hidden="true">{icon}</span>
      </span>
      <span className="flex-1 text-sm text-text-light">{label}</span>
      <span className="font-bold text-sm text-text">{value}</span>
    </div>
  );
}
