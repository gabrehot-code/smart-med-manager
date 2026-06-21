const ITEMS = [
  { id: 'dashboard', label: 'לוח בקרה', icon: 'home' },
  { id: 'inventory', label: 'מלאי', icon: 'inventory_2' },
  { id: 'family', label: 'מעקב', icon: 'family_restroom' },
  { id: 'settings', label: 'הגדרות', icon: 'settings' },
];

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="sticky bottom-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-20"
         aria-label="ניווט ראשי">
      {ITEMS.map((it) => {
        const on = active === it.id;
        return (
          <button key={it.id} onClick={() => onNavigate(it.id)} aria-label={it.label}
            className={`flex flex-col items-center gap-0.5 flex-1 min-h-[56px] justify-center transition ${on ? 'text-primary' : 'text-text-faint'}`}>
            <span className={`material-symbols-outlined text-2xl ${on ? 'fill-icon' : ''}`} aria-hidden="true">{it.icon}</span>
            <span className="font-bold text-xs">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
