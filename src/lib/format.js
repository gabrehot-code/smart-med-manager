// Small date/format helpers (Hebrew).
export function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function hm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function normalizeTime(t) {
  // '08:00:00' (Postgres time) or '08:00' -> '08:00'
  return String(t).slice(0, 5);
}
export function humanAgo(d) {
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'הרגע';
  if (sec < 3600) return `לפני ${Math.round(sec / 60)} דק׳`;
  if (sec < 86400) return `לפני ${Math.round(sec / 3600)} שע׳`;
  const days = Math.round(sec / 86400);
  if (days === 1) return 'אתמול';
  return `לפני ${days} ימים`;
}
export function formatEta(mins) {
  if (mins < 0) return 'באיחור';
  if (mins < 60) return `בעוד ${mins} דק׳`;
  const hr = Math.floor(mins / 60);
  return hr === 1 ? 'בעוד שעה' : `בעוד ${hr} שעות`;
}
export function formatHebDate(d) {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  return `${days[d.getDay()]}, ${d.getDate()} ב${months[d.getMonth()]} ${d.getFullYear()}`;
}
