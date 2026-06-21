import { useEffect } from 'react';

export default function Modal({ open, title, icon = 'edit', onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
         style={{ background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
         role="dialog" aria-modal="true">
      <div className="bg-surface rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">{icon}</span>
        </div>
        <h3 className="font-extrabold text-xl text-text mb-4 text-center">{title}</h3>
        {children}
      </div>
    </div>
  );
}
