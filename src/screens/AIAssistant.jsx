import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { adherence } from '../lib/schedule';

const SUGGESTED = [
  'מה תופעות הלוואי השכיחות של אספירין?',
  'האם יש אינטראקציה בין לחץ דם לאספירין?',
  'מה לעשות אם פספסתי מנת בוקר?',
  'סכם איך המטופל עומד בטיפול החודש',
];

export default function AIAssistant({ go }) {
  const { patient, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!patient) return;
      try {
        const [meds, doses] = await Promise.all([api.meds.list(patient.id), api.doses.all(patient.id)]);
        setCtx({ meds, adh: adherence(meds, doses, 30) });
      } catch (e) { console.error(e); }
    })();
  }, [patient]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  function systemPrompt() {
    const medsText = (ctx?.meds || []).length
      ? ctx.meds.map((m) => `- ${m.name}${m.dose ? ` (${m.dose})` : ''} — שעות: ${(m.times || []).join(', ') || 'ללא'}; מלאי: ${m.qty}`).join('\n')
      : '- אין תרופות במעקב';
    return `אתה עוזר AI באפליקציית מעקב תרופות. המטפל/ת ${profile?.full_name || ''} מטפל/ת ב${patient?.full_name || ''}.
תרופות במעקב:
${medsText}
עמידות 30 יום: ${ctx?.adh?.pct ?? '—'}%.
חוקים: ענה בעברית, בקצרה ובחום. בנושא רפואי הוסף שאינך תחליף לייעוץ רפואי ויש להתייעץ עם רופא/רוקח. אל תשנה מינונים. אם מתואר חירום — המלץ להתקשר 101. תשובה אידיאלית 2-4 משפטים.`;
  }

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setLoading(true);
    try {
      const answer = await api.ai.ask({
        system: systemPrompt(),
        messages: next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.text })),
      });
      setMessages([...next, { role: 'assistant', text: answer || '(אין תשובה)' }]);
    } catch (e) {
      console.error(e);
      setMessages([...next, { role: 'assistant', error: true, text: 'לא ניתן להתחבר לעוזר ה-AI. ודא שה-Edge Function "claude-proxy" פרוס ושהוגדר ANTHROPIC_API_KEY.' }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100%' }}>
      <header className="bg-primary text-white px-5 pt-6 pb-5 rounded-b-3xl flex items-center gap-3 flex-shrink-0">
        <button onClick={() => go('dashboard')} aria-label="חזור" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined fill-icon text-2xl" aria-hidden="true">auto_awesome</span>
          <div>
            <h1 className="font-extrabold text-lg leading-tight">עוזר AI</h1>
            <p className="text-xs opacity-90">מבוסס על נתוני התרופות שלך</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
        {messages.length === 0 && !loading && (
          <div>
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-accent mx-auto mb-3 flex items-center justify-center">
                <span className="material-symbols-outlined fill-icon text-secondary text-3xl" aria-hidden="true">auto_awesome</span>
              </div>
              <h2 className="font-bold text-lg text-text">שלום! במה אוכל לעזור?</h2>
              <p className="text-sm text-text-muted">יודע על התרופות שלך, ההיסטוריה והעמידות.</p>
            </div>
            <div className="space-y-2">
              {SUGGESTED.map((p, i) => (
                <button key={i} onClick={() => send(p)} className="w-full text-right p-3 bg-surface border border-border rounded-xl hover:border-secondary transition flex items-center gap-2">
                  <span className="material-symbols-outlined text-text-faint text-lg" aria-hidden="true">arrow_back</span>
                  <span className="text-base text-text flex-1">{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => m.role === 'user' ? (
          <div key={i} className="flex justify-end">
            <div className="bg-secondary text-white rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
              <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>{m.text}</p>
            </div>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-2">
            <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined fill-icon text-secondary text-base" aria-hidden="true">auto_awesome</span>
            </span>
            <div className={`rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] ${m.error ? 'bg-error-bg border border-error/40' : 'bg-surface border border-border'}`}>
              <p className={`text-base leading-relaxed whitespace-pre-wrap ${m.error ? 'text-error' : 'text-text'}`} style={{ wordBreak: 'break-word' }}>{m.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined fill-icon text-secondary text-base" aria-hidden="true">auto_awesome</span>
            </span>
            <div className="bg-surface border border-border rounded-2xl px-4 py-3">
              <span className="material-symbols-outlined text-text-faint animate-spin" aria-hidden="true">progress_activity</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-3 py-3 border-t border-border bg-surface flex-shrink-0">
        <div className="flex items-end gap-2">
          <label htmlFor="ai-in" className="sr-only">שאל שאלה על תרופות</label>
          <textarea id="ai-in" rows={1} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="שאל שאלה על תרופות..."
            className="flex-1 bg-surface-2 border border-border rounded-2xl px-4 py-2.5 text-base text-text outline-none focus:border-secondary resize-none" style={{ maxHeight: 120 }} />
          <button onClick={() => send()} aria-label="שלח" disabled={loading}
            className="w-11 h-11 rounded-full bg-secondary text-white flex items-center justify-center flex-shrink-0 disabled:opacity-60">
            <span className="material-symbols-outlined fill-icon" aria-hidden="true">send</span>
          </button>
        </div>
        <p className="text-xs text-text-faint mt-2 text-center">⚠ אינו תחליף לייעוץ רפואי. התייעץ עם רופא בכל החלטה.</p>
      </div>
    </div>
  );
}
