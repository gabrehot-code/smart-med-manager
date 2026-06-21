import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { ymd, humanAgo } from '../lib/format';
import Modal from '../components/Modal';

const SYMPTOMS = [
  { id: 'pain', label: 'כאב' }, { id: 'dizziness', label: 'סחרחורת' },
  { id: 'nausea', label: 'בחילה' }, { id: 'fatigue', label: 'עייפות' },
  { id: 'fever', label: 'חום' }, { id: 'headache', label: 'כאב ראש' },
  { id: 'cough', label: 'שיעול' }, { id: 'mood', label: 'מצב רוח' },
];

export default function Journal({ go }) {
  const { patient } = useAuth();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [medId, setMedId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const [j, m] = await Promise.all([api.journal.list(patient.id), api.meds.list(patient.id)]);
      setList(j); setMeds(m);
    } catch (e) { toast.error('שגיאה בטעינת היומן'); console.error(e); }
    finally { setLoading(false); }
  }, [patient, toast]);
  useEffect(() => { load(); }, [load]);

  function openNew() { setBody(''); setTags([]); setMedId(''); setOpen(true); }
  const toggleTag = (id) => setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  async function save() {
    if (!body.trim()) { toast.error('יש להזין טקסט להערה'); return; }
    setBusy(true);
    try {
      await api.journal.create(patient.id, { body: body.trim(), symptoms: tags, medication_id: medId || null });
      toast.success('ההערה נשמרה'); setOpen(false); load();
    } catch (e) { toast.error('שגיאה בשמירה'); console.error(e); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!window.confirm('למחוק את ההערה?')) return;
    try { await api.journal.remove(id); toast.success('ההערה נמחקה'); load(); }
    catch (e) { toast.error('שגיאה במחיקה'); console.error(e); }
  }

  // group by day
  const groups = {};
  list.forEach((j) => { const k = ymd(new Date(j.recorded_at)); (groups[k] = groups[k] || []).push(j); });

  return (
    <div className="relative min-h-full">
      <header className="bg-primary text-white px-5 pt-6 pb-5 rounded-b-3xl flex items-center gap-3">
        <button onClick={() => go('family')} aria-label="חזור" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <div>
          <h1 className="font-extrabold text-xl leading-tight">יומן תסמינים</h1>
          <p className="text-xs opacity-90 mt-0.5">{list.length ? `${list.length} רשומות · אחרונה ${humanAgo(new Date(list[0].recorded_at))}` : 'טרם נרשמו הערות'}</p>
        </div>
      </header>

      <div className="px-4 pt-4 pb-28 space-y-3">
        {loading ? <Spin /> : list.length === 0 ? (
          <div className="bg-surface rounded-2xl p-8 border border-border text-center">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-secondary text-3xl" aria-hidden="true">edit_note</span>
            </div>
            <p className="font-bold text-base text-text mb-1">היומן ריק</p>
            <p className="text-sm text-text-muted mb-4">תעד תסמינים, הערות, או כל דבר חשוב לרופא בביקור הבא.</p>
            <button onClick={openNew} className="h-12 px-6 bg-secondary text-white rounded-full font-bold">+ הערה ראשונה</button>
          </div>
        ) : (
          Object.entries(groups).map(([k, entries]) => {
            const d = new Date(k + 'T00:00:00');
            const label = ymd(d) === ymd(new Date()) ? 'היום'
              : ymd(d) === ymd(new Date(Date.now() - 86400000)) ? 'אתמול'
              : d.toLocaleDateString('he-IL', { day: '2-digit', month: 'long' });
            return (
              <div key={k}>
                <p className="font-bold text-xs text-text-light mb-2 px-1">{label}</p>
                <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                  {entries.map((j, i) => {
                    const time = new Date(j.recorded_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                    const med = j.medication_id ? meds.find((m) => m.id === j.medication_id) : null;
                    const syms = (j.journal_symptoms || []).map((s) => SYMPTOMS.find((x) => x.id === s.symptom)?.label).filter(Boolean);
                    return (
                      <div key={j.id} className={`px-4 py-3 ${i === entries.length - 1 ? '' : 'border-b border-border'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-semibold text-text-light">{time}</span>
                          <button onClick={() => remove(j.id)} aria-label="מחק" className="w-7 h-7 rounded-full hover:bg-error-bg flex items-center justify-center">
                            <span className="material-symbols-outlined text-text-faint text-base" aria-hidden="true">delete</span>
                          </button>
                        </div>
                        <p className="text-base text-text leading-relaxed mb-2 whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>{j.body}</p>
                        {(syms.length > 0 || med) && (
                          <div className="flex flex-wrap gap-1.5">
                            {syms.map((s) => <span key={s} className="px-2 py-0.5 rounded-full bg-accent text-secondary text-xs font-bold">{s}</span>)}
                            {med && <span className="px-2 py-0.5 rounded-full bg-success-bg text-success text-xs font-bold">💊 {med.name}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button onClick={openNew} aria-label="הערה חדשה"
        className="fixed bottom-6 z-30 w-14 h-14 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg hover:bg-secondary-dk transition"
        style={{ insetInlineStart: 'max(1.25rem, calc(50% - 360px + 1.25rem))' }}>
        <span className="material-symbols-outlined text-3xl" aria-hidden="true">add</span>
      </button>

      <Modal open={open} title="הערה חדשה" icon="edit_note" onClose={() => setOpen(false)}>
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="מה תיעדת היום? לדוגמה: התלוננה על כאב ראש קל אחרי ארוחת בוקר"
          className="w-full bg-surface border border-border rounded-lg p-3 text-base text-text outline-none focus:border-secondary resize-none mb-3" style={{ minHeight: 80 }} />
        <p className="font-bold text-sm text-text-muted mb-1.5">תסמינים</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SYMPTOMS.map((s) => (
            <button key={s.id} onClick={() => toggleTag(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold border ${tags.includes(s.id) ? 'bg-accent text-secondary border-secondary' : 'bg-surface text-text-muted border-border'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="font-bold text-sm text-text-muted mb-1">קשור לתרופה</p>
        <select value={medId} onChange={(e) => setMedId(e.target.value)}
          className="w-full h-11 bg-surface border border-border rounded-lg px-2 text-base text-text outline-none focus:border-secondary mb-4">
          <option value="">— ללא קישור —</option>
          {meds.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
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
