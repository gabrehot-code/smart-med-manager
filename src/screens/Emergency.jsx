import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import Modal from '../components/Modal';

export default function Emergency({ go }) {
  const { patient, refreshPatient } = useAuth();
  const toast = useToast();
  const [meds, setMeds] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    if (!patient) return;
    try {
      const [m, c] = await Promise.all([api.meds.list(patient.id), api.contacts.list(patient.id)]);
      setMeds(m); setContacts(c);
    } catch (e) { console.error(e); }
  }, [patient]);
  useEffect(() => { load(); }, [load]);

  if (!patient) return null;
  const emergency = contacts.find((c) => c.type === 'emergency');
  const doctor = contacts.find((c) => c.type === 'doctor');

  function openEdit() {
    setForm({
      blood_type: patient.blood_type || '', weight: patient.weight || '', height: patient.height || '',
      allergies: (patient.allergies || []).join(', '), conditions: (patient.conditions || []).join(', '),
      ecName: emergency?.name || '', ecPhone: emergency?.phone || '', ecRel: emergency?.relation || '',
      docName: doctor?.name || '', docPhone: doctor?.phone || '', docClinic: doctor?.clinic || '',
    });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    try {
      await api.patients.update(patient.id, {
        blood_type: form.blood_type.trim(), weight: form.weight.trim(), height: form.height.trim(),
        allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        conditions: form.conditions.split(',').map((s) => s.trim()).filter(Boolean),
      });
      await api.contacts.save(patient.id, 'emergency', { name: form.ecName.trim(), phone: form.ecPhone.trim(), relation: form.ecRel.trim() });
      await api.contacts.save(patient.id, 'doctor', { name: form.docName.trim(), phone: form.docPhone.trim(), clinic: form.docClinic.trim() });
      toast.success('מידע החירום עודכן');
      setOpen(false); await refreshPatient(); load();
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

  return (
    <div>
      <header className="px-5 pt-6 pb-5 rounded-b-3xl" style={{ background: 'linear-gradient(135deg,#EF4444,#B91C1C)' }}>
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => go('family')} aria-label="חזור" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
          <h1 className="font-extrabold text-white text-lg">מידע חירום</h1>
          <button onClick={openEdit} aria-label="ערוך" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white">
            <span className="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
        </div>
        <div className="text-white">
          <p className="font-extrabold text-xl leading-tight">{patient.full_name}</p>
          <p className="text-xs" style={{ color: 'rgba(254,226,226,.95)' }}>
            סוג דם {patient.blood_type || '—'} · משקל {patient.weight || '—'}
          </p>
        </div>
        <a href="tel:101" className="mt-4 w-full h-14 rounded-full bg-white text-error font-extrabold text-lg flex items-center justify-center gap-2 no-underline">
          <span className="material-symbols-outlined fill-icon" aria-hidden="true">emergency</span>
          התקשר 101 (מד״א)
        </a>
      </header>

      <div className="px-4 pt-4 pb-10 space-y-3">
        <Section icon="warning" tone="error" title="אלרגיות" border>
          {(patient.allergies || []).length ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {patient.allergies.map((a) => <span key={a} className="bg-error text-white font-bold text-sm px-3 py-1 rounded-full">⚠ {a}</span>)}
            </div>
          ) : <p className="text-sm text-text-muted mt-2">לא נרשמו</p>}
        </Section>

        <Section icon="medical_information" title="מצבים רפואיים">
          {(patient.conditions || []).length ? (
            <ul className="space-y-1 mt-2">
              {patient.conditions.map((c) => (
                <li key={c} className="flex items-center gap-2 text-base text-text">
                  <span className="material-symbols-outlined text-error text-base" aria-hidden="true">circle</span>{c}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-text-muted mt-2">לא נרשמו</p>}
        </Section>

        <Section icon="medication" title="תרופות שניטלות">
          {meds.length ? (
            <ul className="space-y-2 mt-2">
              {meds.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-base mt-0.5" aria-hidden="true">medication</span>
                  <div>
                    <p className="font-bold text-base text-text leading-tight">{m.name}</p>
                    <p className="text-xs text-text-light">{m.dose || ''} {m.times?.length ? `· ${m.times.join(', ')}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-text-muted mt-2">לא נרשמו</p>}
        </Section>

        {emergency?.phone && <ContactCard icon="contacts" title="איש קשר לחירום" name={emergency.name} sub={emergency.relation} phone={emergency.phone} />}
        {doctor?.phone && <ContactCard icon="stethoscope" title="רופא/ה מטפל/ת" name={doctor.name} sub={doctor.clinic} phone={doctor.phone} tone="success" />}
      </div>

      <Modal open={open} title="עריכת מידע חירום" icon="medical_information" onClose={() => setOpen(false)}>
        <div className="max-h-[55vh] overflow-y-auto pe-1">
          {F('blood_type', 'סוג דם')}{F('weight', 'משקל')}{F('height', 'גובה')}
          {F('allergies', 'אלרגיות (מופרד בפסיק)')}{F('conditions', 'מצבים (מופרד בפסיק)')}
          {F('ecName', 'איש קשר חירום — שם')}{F('ecPhone', 'איש קשר — טלפון', 'tel')}{F('ecRel', 'איש קשר — קרבה')}
          {F('docName', 'רופא/ה — שם')}{F('docPhone', 'רופא/ה — טלפון', 'tel')}{F('docClinic', 'רופא/ה — קופ״ח')}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => setOpen(false)} className="flex-1 h-12 rounded-full font-bold bg-surface-2 text-text">ביטול</button>
          <button onClick={save} disabled={busy} className="flex-1 h-12 rounded-full font-extrabold bg-secondary text-white disabled:opacity-60">{busy ? 'שומר…' : 'שמור'}</button>
        </div>
      </Modal>
    </div>
  );
}

function Section({ icon, title, tone, border, children }) {
  return (
    <div className={`bg-surface rounded-2xl p-4 ${border ? 'border-2 border-error' : 'border border-border'}`}>
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined fill-icon text-2xl ${tone === 'error' ? 'text-error' : 'text-primary'}`} aria-hidden="true">{icon}</span>
        <span className={`font-extrabold text-lg ${tone === 'error' ? 'text-error' : 'text-text'}`}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function ContactCard({ icon, title, name, sub, phone, tone }) {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <span className={`material-symbols-outlined text-2xl ${tone === 'success' ? 'text-success' : 'text-primary'}`} aria-hidden="true">{icon}</span>
        <span className="font-extrabold text-lg text-text">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-text leading-tight">{name}</p>
          <p className="text-xs text-text-light mt-0.5">{sub || ''}</p>
        </div>
        <a href={`tel:${phone}`} aria-label="התקשר" className={`w-11 h-11 rounded-full flex items-center justify-center text-white no-underline ${tone === 'success' ? 'bg-success' : 'bg-secondary'}`}>
          <span className="material-symbols-outlined" aria-hidden="true">call</span>
        </a>
      </div>
    </div>
  );
}
