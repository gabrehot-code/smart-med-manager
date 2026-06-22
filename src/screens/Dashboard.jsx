import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { plannedForDate, indexDoses, statusOf, adherence } from '../lib/schedule';
import { useTranslation } from 'react-i18next';
import { formatEta } from '../lib/format';
import { startNotificationScheduler } from '../lib/notifications';

export default function Dashboard({ go }) {
  const { t } = useTranslation();
  const { patient, profile } = useAuth();
  const toast = useToast();
  const [meds, setMeds]             = useState([]);
  const [doses, setDoses]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [alertModal, setAlertModal] = useState(null);
  const [snoozed, setSnoozed]       = useState(false);

  const load = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const [m, d] = await Promise.all([api.meds.list(patient.id), api.doses.all(patient.id)]);
      setMeds(m); setDoses(d);
      startNotificationScheduler(m);
    } catch(e) { toast.error(e?.message || 'שגיאה'); console.error(e); }
    finally { setLoading(false); }
  }, [patient, toast]);

  useEffect(() => { load(); }, [load]);
  if (!patient || loading) return <CenterSpinner />;

  const planned    = plannedForDate(meds, new Date());
  const idx        = indexDoses(doses);
  const now        = Date.now();
  const past       = planned.filter(p => new Date(p.scheduledAt).getTime() <= now);
  const takenToday = past.filter(p => statusOf(idx, p).status === 'taken').length;
  const total      = planned.length;
  const allDone    = past.length > 0 && past.every(p => statusOf(idx, p).status === 'taken');
  const adh        = adherence(meds, doses, 30);
  const upcoming   = planned.find(p => new Date(p.scheduledAt).getTime() > now && statusOf(idx, p).status !== 'taken');
  const activeMeds  = meds.filter(m => !m.archived);
  const needsRefill = meds.filter(m => !m.archived && m.qty <= 7);
  const missedDoses = past.filter(p => statusOf(idx, p).status !== 'taken');
  const lastDose    = doses.filter(d => d.status==='taken'&&d.taken_at).sort((a,b)=>new Date(b.taken_at)-new Date(a.taken_at))[0];
  const daysSince   = lastDose ? Math.floor((Date.now()-new Date(lastDose.taken_at))/86400000) : null;

  async function take(p) {
    try {
      await api.doses.record(p.medId, p.scheduledAt, 'taken');
      toast.success(p.medName + ' נרשם! 🎉');
      setAlertModal(null); load();
    } catch(e) { toast.error(e?.message || 'שגיאה'); console.error(e); }
  }

  function openAlert(p) {
    setAlertModal({ ...p, med: meds.find(m => m.id === p.medId) });
    setSnoozed(false);
  }

  return (
    <div>
      {/* ALERT MODAL */}
      {alertModal && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 pt-8 pb-4">
            <button onClick={() => setAlertModal(null)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface">
              <span className="material-symbols-outlined text-text-light text-xl">close</span>
            </button>
            <div className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold text-sm">
              <span className="material-symbols-outlined text-base">notifications</span>
              מערכת התראות
            </div>
            <div className="w-9" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
            <h1 className="font-extrabold text-3xl text-primary text-center mb-10">{t('med_time')}</h1>
            <div className="w-full max-w-xs bg-white border border-border rounded-3xl shadow-sm p-8 flex flex-col items-center gap-4 mb-8">
              <div className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: (alertModal.med?.color||'#3B82F6')+'22' }}>
                <span className="material-symbols-outlined fill-icon text-5xl"
                  style={{ color: alertModal.med?.color||'#3B82F6' }}>medication</span>
              </div>
              <div className="text-center">
                <p className="font-extrabold text-xl text-primary">{alertModal.medName}</p>
                <p className="text-text-light text-sm mt-1">{alertModal.med?.dose||''}</p>
              </div>
              <div className="w-full bg-surface rounded-2xl px-5 py-3 flex items-center justify-center gap-3 border border-border">
                <span className="font-bold text-xl text-text">{alertModal.time}</span>
                <span className="material-symbols-outlined text-text-light">schedule</span>
              </div>
            </div>
            <button onClick={() => take(alertModal)}
              className="w-full max-w-xs h-14 bg-secondary text-white rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3">
              <span className="material-symbols-outlined fill-icon text-2xl">check_circle</span>
              לקחתי!
            </button>
            <button onClick={() => { setSnoozed(true); toast.success('תוזכר בעוד 10 דקות'); }}
              className="mt-4 flex items-center gap-2 text-text-light text-sm">
              <span className="material-symbols-outlined text-base">snooze</span>
              {snoozed ? t('remind_set') : t('remind_10')}
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-primary text-white px-6 pb-7 pt-6 rounded-b-3xl">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs opacity-90 mb-1">שלום, {profile?.full_name?.split(' ')[0]||''}</p>
            <h1 className="font-extrabold text-2xl leading-tight">התרופות של {patient.possessive_nick||''}</h1>
          </div>
          <button onClick={() => go('profile')} className="w-11 h-11 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center font-extrabold">
            {(patient.full_name||'?').trim()[0]||'?'}
          </button>
        </div>
        <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined fill-icon text-3xl">{allDone&&total>0?'check_circle':'pending'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">
              {allDone&&total>0?t('all_taken'):total===0?t('no_meds'):t('meds_pending')}
            </p>
            <p className="text-xs opacity-90 mt-0.5">{takenToday} מתוך {total} תרופות</p>
          </div>
          <span className="font-extrabold text-3xl">{total===0?100:Math.round((takenToday/total)*100)}%</span>
        </div>
      </header>

      <div className="px-4 pt-5 pb-6 space-y-3">
        {/* 4 STAT CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-text-muted font-semibold">{t('adherence')}</span>
              <span className="material-symbols-outlined text-lg text-secondary">monitoring</span>
            </div>
            <p className="font-extrabold text-3xl text-primary">{adh.pct}%</p>
            <p className="text-xs text-text-muted mt-1">נלקח בזמן {lastDose?.taken_at&&<span className="text-green-500 font-bold">{new Date(lastDose.taken_at).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</span>}</p>
          </div>
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-text-muted font-semibold">{t('next_med')}</span>
              <span className="material-symbols-outlined text-lg text-error">schedule</span>
            </div>
            <p className="font-bold text-base text-text">{upcoming?upcoming.medName:t('none')}</p>
            <p className="text-xs text-text-muted mt-0.5">{upcoming?upcoming.time:t('done_today')}</p>
            {upcoming&&<div className="mt-2 bg-error-bg text-error rounded-lg px-2 py-1 font-bold text-xs text-center">{formatEta(Math.round((new Date(upcoming.scheduledAt).getTime()-now)/60000))}</div>}
          </div>
          <div className="bg-surface rounded-2xl p-4 border border-border flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-text-muted font-semibold mb-1">{t('doctor_visit')}</p>
              <p className="font-bold text-base text-text">יום ג׳, 14.05</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
            </div>
          </div>
          <div className="bg-surface rounded-2xl p-4 border border-border flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-text-muted font-semibold mb-1">{t('last_update')}</p>
              <p className="font-bold text-base text-text">{daysSince!==null?'לפני '+daysSince+' ימים':'אין נתונים'}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-lg">history</span>
            </div>
          </div>
        </div>

        {/* התראה פעילה */}
        <button onClick={() => {
          if (missedDoses.length > 0) {
            openAlert(missedDoses[0]);
          } else if (upcoming) {
            openAlert(upcoming);
          } else if (planned.length > 0) {
            openAlert(planned[0]);
          }
        }}
          className="w-full rounded-2xl p-4 flex items-center gap-3 text-right" style={{background:'#1E3A8A'}}>
          <div className="flex-1">
            <p className="font-extrabold text-white text-base">{t('active_alert')}</p>
            <p className="text-sm text-white/70 mt-0.5">{missedDoses.length>0?missedDoses.length+' תרופות ממתינות':t('no_alerts')}</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined fill-icon text-white text-xl">{missedDoses.length>0?'notifications_active':'notifications'}</span>
          </div>
          <span className="material-symbols-outlined text-white/60">chevron_left</span>
        </button>

        {/* מלאי */}
        <button onClick={() => go('inventory')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 text-right" style={{background:'#EFF6FF'}}>
          <div className="flex-1">
            <p className="font-extrabold text-primary text-base">{t('inventory_title')}</p>
            <p className="text-sm text-primary/60 mt-0.5">{activeMeds.length} תרופות פעילות{needsRefill.length>0?' · '+needsRefill.length+' דורשת חידוש':''}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">inventory_2</span>
          </div>
          <span className="material-symbols-outlined text-primary/40">chevron_left</span>
        </button>

        {/* תרופות היום — עיצוב משודרג */}
        <p className="font-bold text-sm text-text-light px-1 pt-1">{t('todays_meds')}</p>
        {planned.length === 0 ? (
          <div className="bg-surface rounded-2xl p-6 border border-border text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-primary text-2xl">medication</span>
            </div>
            <p className="text-text-muted text-sm mb-4">אין תרופות מתוזמנות היום</p>
            <button onClick={() => go('add')} className="h-11 px-6 bg-secondary text-white rounded-full font-bold text-sm">+ הוסף תרופה</button>
          </div>
        ) : (
          <div className="space-y-2">
            {planned.map((p) => {
              const s   = statusOf(idx, p).status;
              const med = meds.find(m => m.id === p.medId);
              const color = med?.color || '#3B82F6';
              const isTaken  = s === 'taken';
              const isMissed = s === 'missed';
              return (
                <div key={p.key}
                  className="bg-surface rounded-2xl border border-border overflow-hidden flex items-center gap-0"
                  style={{ opacity: isTaken ? 0.75 : 1 }}>
                  {/* צבע בצד */}
                  <div className="w-1 self-stretch rounded-r-full flex-shrink-0" style={{ background: color }} />
                  {/* אייקון תרופה */}
                  <div className="flex-shrink-0 mx-3 my-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: color + '18' }}>
                      <span className="material-symbols-outlined fill-icon text-xl" style={{ color }}>medication</span>
                    </div>
                  </div>
                  {/* פרטים */}
                  <div className="flex-1 min-w-0 py-3">
                    <p className="font-extrabold text-base text-text leading-tight">{p.medName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.dose && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: color + '18', color }}>
                          {p.dose}
                        </span>
                      )}
                      <span className="text-xs text-text-light flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {p.time}
                      </span>
                    </div>
                  </div>
                  {/* כפתור פעולה */}
                  <div className="flex-shrink-0 px-3">
                    {isTaken ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined fill-icon text-green-600 text-lg">check_circle</span>
                        </div>
                        <span className="text-xs text-green-600 font-semibold">נלקח</span>
                      </div>
                    ) : isMissed ? (
                      <button onClick={() => openAlert(p)}
                        className="flex flex-col items-center gap-1">
                        <div className="w-9 h-9 bg-error-bg rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined fill-icon text-error text-lg">error</span>
                        </div>
                        <span className="text-xs text-error font-semibold">פוספס</span>
                      </button>
                    ) : (
                      <button onClick={() => openAlert(p)}
                        className="h-9 px-4 rounded-full font-bold text-sm text-white"
                        style={{ background: color }}>
                        לקחתי
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI */}
        <button onClick={() => go('ai')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 text-right hover:opacity-95 transition mt-1"
          style={{background:'linear-gradient(135deg,#1E3A8A,#3B82F6)'}}>
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined fill-icon text-white text-2xl">auto_awesome</span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-white text-lg">{t('ask_ai')}</p>
            <p className="text-xs text-white/90 mt-0.5">{t('ai_sub')}</p>
          </div>
          <span className="material-symbols-outlined text-white/80">chevron_left</span>
        </button>
      </div>
    </div>
  );
}

function CenterSpinner() {
  return <div className="flex items-center justify-center py-20"><span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span></div>;
}
