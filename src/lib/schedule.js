// Pure scheduling/adherence helpers. They operate on plain arrays loaded
// from Supabase, so they are easy to test and reuse across screens.
//   meds:  [{ id, name, dose, color, qty, times: ['08:00','20:00'] }]
//   doses: [{ medication_id, scheduled_at(ISO), status, taken_at }]
import { ymd, hm, normalizeTime } from './format';

const keyFor = (medId, dateObj) => `${medId}|${ymd(dateObj)}|${hm(dateObj)}`;

export function daysLeft(med) {
  const perDay = (med.times || []).length || 1;
  return Math.floor((med.qty || 0) / perDay);
}

export function indexDoses(doses) {
  const map = new Map();
  (doses || []).forEach((d) => {
    map.set(keyFor(d.medication_id, new Date(d.scheduled_at)), d);
  });
  return map;
}

export function plannedForDate(meds, date = new Date()) {
  const dateKey = ymd(date);
  const out = [];
  (meds || []).forEach((m) => {
    (m.times || []).forEach((t) => {
      const time = normalizeTime(t);
      const scheduledAt = new Date(`${dateKey}T${time}:00`).toISOString();
      out.push({
        medId: m.id, medName: m.name, dose: m.dose, time,
        scheduledAt,
        key: keyFor(m.id, new Date(scheduledAt)),
      });
    });
  });
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

export function statusOf(dosesIndex, plan) {
  const rec = dosesIndex.get(plan.key);
  if (rec) return { status: rec.status, dose: rec };
  const sched = new Date(plan.scheduledAt).getTime();
  if (Date.now() > sched + 30 * 60 * 1000) return { status: 'missed' };
  return { status: 'pending' };
}

export function adherence(meds, doses, days = 30) {
  const idx = indexDoses(doses);
  const out = { total: 0, taken: 0, missed: 0 };
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    plannedForDate(meds, d).forEach((p) => {
      if (new Date(p.scheduledAt).getTime() > Date.now()) return;
      out.total++;
      const s = statusOf(idx, p).status;
      if (s === 'taken') out.taken++; else if (s === 'missed') out.missed++;
    });
  }
  out.pct = out.total === 0 ? 100 : Math.round((out.taken / out.total) * 100);
  return out;
}

export function streak(meds, doses) {
  const idx = indexDoses(doses);
  let count = 0;
  const now = new Date();
  for (let i = 1; i <= 365; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const planned = plannedForDate(meds, d);
    if (planned.length === 0) break;
    if (planned.every((p) => statusOf(idx, p).status === 'taken')) count++; else break;
  }
  return count;
}

export function weekArray(meds, doses, days = 7) {
  const idx = indexDoses(doses);
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const planned = plannedForDate(meds, d);
    const isToday = i === 0;
    const counted = planned.filter((p) => !(isToday && new Date(p.scheduledAt).getTime() > Date.now()));
    const taken = counted.filter((p) => statusOf(idx, p).status === 'taken').length;
    out.push({
      date: d,
      label: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][d.getDay()] + '׳',
      taken, total: counted.length,
      pct: counted.length === 0 ? 0 : Math.round((taken / counted.length) * 100),
    });
  }
  return out;
}
