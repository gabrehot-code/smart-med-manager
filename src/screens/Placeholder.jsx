// Stub screen for areas ported from the HTML prototype but not yet wired to
// Supabase (Family, Vitals, Journal, Emergency, AI, History, Profile).
// Each maps to an existing table in schema.sql and a ready api.* method.
export default function Placeholder({ title, go }) {
  return (
    <div>
      <header className="bg-primary text-white px-6 pt-6 pb-5 rounded-b-3xl flex items-center gap-3">
        <button onClick={() => go('dashboard')} aria-label="חזור" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <h1 className="font-extrabold text-xl">{title}</h1>
      </header>
      <div className="px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-secondary text-3xl" aria-hidden="true">construction</span>
        </div>
        <p className="font-bold text-lg text-text mb-1">{title} — בקרוב</p>
        <p className="text-sm text-text-muted max-w-xs mx-auto">
          המסך הזה קיים באב-טיפוס וממופה לטבלה ב-Supabase ולמתודת <code>api</code> מוכנה.
          ניתן לחבר אותו באותו דפוס כמו לוח הבקרה והמלאי.
        </p>
        <button onClick={() => go('dashboard')} className="mt-6 h-12 px-6 bg-secondary text-white rounded-full font-bold">
          חזרה ללוח הבקרה
        </button>
      </div>
    </div>
  );
}
