import { supabase } from './supabaseClient';

let timer = null;

export function startNotificationScheduler(meds) {
  if (timer) clearInterval(timer);
  if (!meds || meds.length === 0) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  timer = setInterval(() => {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5); // "08:00"

    meds.forEach(med => {
      if (!med.times) return;
      med.times.forEach(t => {
        if (t === hhmm) {
          new Notification('💊 זמן לתרופה!', {
            body: `${med.name} — ${med.dose || ''}`,
            icon: '/favicon.ico',
            tag: `med-${med.id}-${hhmm}`,
          });
        }
      });
    });
  }, 60 * 1000); // בודק כל דקה
}

export function stopNotificationScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}
