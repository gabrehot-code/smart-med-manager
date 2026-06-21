import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let nextId = 1;
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = 'info', duration = 2600) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const value = {
    show,
    info: (m) => show(m, 'info'),
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
  };

  const palette = {
    info: { bg: 'bg-accent', fg: 'text-primary', icon: 'info' },
    success: { bg: 'bg-success-bg', fg: 'text-success', icon: 'check_circle' },
    error: { bg: 'bg-error-bg', fg: 'text-error', icon: 'error' },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-3 inset-x-3 z-[60] flex flex-col gap-2 pointer-events-none"
           style={{ maxWidth: 700, marginInline: 'auto' }}
           role="status" aria-live="assertive">
        {toasts.map((t) => {
          const p = palette[t.type] || palette.info;
          return (
            <div key={t.id}
              className="pointer-events-auto bg-surface border border-border rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.bg}`}>
                <span className={`material-symbols-outlined fill-icon ${p.fg} text-lg`} aria-hidden="true">{p.icon}</span>
              </span>
              <p className="font-bold text-base text-text flex-1">{t.msg}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
