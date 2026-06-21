import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';

export default function Auth() {
  const { signUp, signIn } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!email || !password) { toast.error('יש למלא אימייל וסיסמה'); return; }
    if (password.length < 6) { toast.error('סיסמה חייבת להכיל לפחות 6 תווים'); return; }
    if (mode === 'signup' && !name.trim()) { toast.error('יש להזין שם מלא'); return; }
    setBusy(true);
    try {
      const { error } = mode === 'signup'
        ? await signUp(email.trim(), password, { full_name: name.trim() })
        : await signIn(email.trim(), password);
      if (error) { toast.error(error.message); return; }
      toast.success(mode === 'signup' ? 'ברוך הבא למנהל תרופות חכם!' : 'התחברת בהצלחה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-8">
      <div className="pt-6 flex items-center justify-between">
        <span className="font-extrabold text-xl text-primary">מנהל תרופות חכם</span>
      </div>
      <div className="text-center pt-8 pb-6">
        <h1 className="font-extrabold text-2xl text-text mb-1.5">
          {mode === 'signup' ? 'בוא נבנה את הפרופיל שלך' : 'ברוך שובך'}
        </h1>
        <p className="text-sm text-text-muted">
          {mode === 'signup' ? 'הירשם כדי להתחיל לנהל את הטיפול' : 'התחבר/י לחשבונך כדי להמשיך'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 max-w-md mx-auto">
        {mode === 'signup' && (
          <div>
            <label htmlFor="name" className="block font-bold text-sm text-text mb-1.5 pe-1">שם מלא</label>
            <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: מירה לוי"
              className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-base text-text outline-none focus:border-secondary focus:bg-surface" />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block font-bold text-sm text-text mb-1.5 pe-1">כתובת אימייל</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-base text-text outline-none focus:border-secondary focus:bg-surface" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <label htmlFor="pw" className="font-bold text-sm text-text">סיסמה</label>
            <button type="button" onClick={() => setShowPw((s) => !s)} className="text-secondary font-bold text-xs hover:underline">
              {showPw ? 'הסתר' : 'הצג'}
            </button>
          </div>
          <input id="pw" type={showPw ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="לפחות 6 תווים"
            className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-base text-text outline-none focus:border-secondary focus:bg-surface" />
        </div>

        <button type="submit" disabled={busy}
          className="w-full h-12 bg-secondary text-white rounded-xl font-extrabold text-base hover:bg-secondary-dk transition disabled:opacity-60 !mt-5">
          {busy ? 'רגע…' : mode === 'signup' ? 'צור את החשבון שלי' : 'התחבר'}
        </button>
      </form>

      <p className="text-center text-sm text-text-muted mt-5">
        {mode === 'signup' ? 'כבר יש לך חשבון?' : 'אין לך חשבון?'}{' '}
        <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="text-secondary font-extrabold ms-1">
          {mode === 'signup' ? 'התחבר' : 'הירשם'}
        </button>
      </p>
    </div>
  );
}
