import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabaseClient';

export default function Settings() {
  const { t } = useTranslation();
  const { profile, user, signOut, updateProfile } = useAuth();
  const toast = useToast();
  const [apiKey, setApiKey]   = useState('');
  const [showKey, setShowKey] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifReminder, setNotifReminder] = useState(true);
  const [notifMissed,   setNotifMissed]   = useState(true);
  const [notifLowStock, setNotifLowStock] = useState(true);

  useEffect(() => {
    setApiKey(localStorage.getItem('anthropic_api_key') || '');
    setNotifEnabled(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  }, []);

  async function change(field, value) {
    try {
      await updateProfile({ [field]: value });
      // ;
    } catch { toast.error(t('save_error')); }
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  async function requestNotif() {
    if (typeof Notification === 'undefined') { toast.error('התראות לא נתמכות בדפדפן זה'); return; }
    const p = await Notification.requestPermission();
    if (p === 'granted') { setNotifEnabled(true); toast.success('התראות הופעלו ✓'); }
    else toast.error('ההרשאה נדחתה');
  }

  async function exportData() {
    try {
      const { data: patients }    = await supabase.from('patients').select('*');
      const { data: medications } = await supabase.from('medications').select('*');
      const { data: doses }       = await supabase.from('doses').select('*');
      const blob = new Blob([JSON.stringify({ patients, medications, doses }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `medtracker-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success('הנתונים יוצאו');
    } catch { toast.error('שגיאה בייצוא'); }
  }

  async function deleteAllData() {
    if (!confirm('למחוק את כל הנתונים לצמיתות?')) return;
    if (!confirm('אישור סופי — אין דרך חזרה!')) return;
    try {
      await supabase.from('doses').delete().neq('id','');
      await supabase.from('medications').delete().neq('id','');
      await supabase.from('patients').delete().neq('id','');
      toast.success('כל הנתונים נמחקו');
    } catch { toast.error('שגיאה'); }
  }

  const Section = ({ title, children }) => (
    <div>
      <p className="text-xs font-bold text-text-light px-1 mb-2 mt-4">{title}</p>
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">{children}</div>
    </div>
  );

  const Toggle = ({ value, onChange }) => (
    <span onClick={e=>{e.stopPropagation();onChange(!value);}}
      className={`w-11 h-6 rounded-full relative transition flex-shrink-0 cursor-pointer ${value?'bg-primary':'bg-border'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value?'right-0.5':'right-5'}`}/>
    </span>
  );

  const Row = ({ icon, label, children, onClick, danger }) => (
    <div onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 border-b border-border last:border-0 cursor-pointer
        ${danger?'hover:bg-error-bg':'hover:bg-surface-2'}`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger?'bg-error-bg':'bg-primary/10'}`}>
        <span className={`material-symbols-outlined text-base ${danger?'text-error':'text-primary'}`}>{icon}</span>
      </span>
      <span className={`flex-1 font-bold text-sm ${danger?'text-error':'text-text'}`}>{label}</span>
      {children}
    </div>
  );

  const SelectRow = ({ icon, label, value, onChange, options }) => (
    <div className="w-full px-4 py-3 flex items-center gap-3 border-b border-border last:border-0">
      <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-primary text-base">{icon}</span>
      </span>
      <span className="flex-1 font-bold text-sm text-text">{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)}
        onClick={e=>e.stopPropagation()}
        className="text-sm text-primary font-bold bg-transparent border-none outline-none cursor-pointer">
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <header className="bg-primary text-white px-6 pt-6 pb-5 rounded-b-3xl">
        <h1 className="font-extrabold text-xl">{t('settings')}</h1>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-1">
        {/* פרופיל */}
        <div className="bg-surface rounded-2xl border border-border p-4 flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-lg flex-shrink-0">
            {(profile?.full_name||user?.email||'?').slice(0,1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-base text-text">{profile?.full_name||'משתמש'}</p>
            <p className="text-xs text-text-light">{user?.email}</p>
          </div>
        </div>

        <Section title="התראות">
          <Row icon="medication" label={t('med_reminder')}>
            <p className="text-xs text-text-light ml-2">5 דקות לפני</p>
            <Toggle value={notifReminder} onChange={setNotifReminder}/>
          </Row>
          <Row icon="notifications_off" label={t('missed_alert')}>
            <p className="text-xs text-text-light ml-2">30 דקות</p>
            <Toggle value={notifMissed} onChange={setNotifMissed}/>
          </Row>
          <Row icon="inventory_2" label={t('low_stock')}>
            <p className="text-xs text-text-light ml-2">מתחת ל-7 ימים</p>
            <Toggle value={notifLowStock} onChange={setNotifLowStock}/>
          </Row>
          <Row icon="add_alert" label={t('enable_notif')} onClick={!isIOS ? requestNotif : undefined}>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${notifEnabled?'bg-green-100 text-green-700':'bg-border text-text-light'}`}>
              {isIOS ? 'לא נתמך ב-iOS' : notifEnabled ? t('notif_active') : t('notif_off')}
            </span>
          </Row>
        </Section>

        <Section title="העדפות יישום">
          <SelectRow icon="language" label={t('language')}
            value={profile?.language||'he'}
            onChange={v=>change('language',v)}
            options={[{value:'he',label:'עברית'},{value:'en',label:'English'}]}/>
          <SelectRow icon="format_size" label={t('text_size')}
            value={profile?.text_size||'regular'}
            onChange={v=>change('text_size',v)}
            options={[{value:'small',label:t('size_small')},{value:'regular',label:t('size_regular')},{value:'large',label:t('size_large')},{value:'xlarge',label:t('size_xlarge')}]}/>
          <SelectRow icon="palette" label={t('color_theme')}
            value={profile?.theme||'classic'}
            onChange={v=>change('theme',v)}
            options={[{value:'classic',label:t('theme_classic')},{value:'green',label:t('theme_green')},{value:'purple',label:t('theme_purple')},{value:'dark',label:t('theme_dark')}]}/>
          <Row icon="dark_mode" label={t('dark_mode')} onClick={()=>change('dark_mode',!profile?.dark_mode)}>
            <Toggle value={!!profile?.dark_mode} onChange={v=>change('dark_mode',v)}/>
          </Row>
        </Section>

        <Section title="פרטיות ונתונים">
          <Row icon="download" label={t('export_data')} onClick={exportData}>
            <span className="material-symbols-outlined text-text-light text-base">chevron_left</span>
          </Row>
          <Row icon="delete_forever" label={t('delete_data')} onClick={deleteAllData} danger>
            <span className="material-symbols-outlined text-error text-base">chevron_left</span>
          </Row>
        </Section>

        <Section title="בינה מלאכותית">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-base">smart_toy</span>
              </span>
              <span className="flex-1 font-bold text-sm text-text">{t('api_key')}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${apiKey?'bg-green-100 text-green-700':'bg-border text-text-light'}`}>
                {apiKey?t('api_set'):t('api_not_set')}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input type={showKey?'text':'password'} value={apiKey}
                  onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-..."
                  className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2 outline-none focus:border-primary"/>
                <button onClick={()=>setShowKey(!showKey)} className="absolute left-2 top-2.5">
                  <span className="material-symbols-outlined text-text-light text-base">{showKey?'visibility_off':'visibility'}</span>
                </button>
              </div>
              <button onClick={()=>{localStorage.setItem('anthropic_api_key',apiKey);// ;}}
                className="bg-primary text-white text-sm font-bold px-3 py-2 rounded-xl">{t('save')}</button>
            </div>
          </div>
        </Section>

        <button onClick={()=>signOut()}
          className="w-full bg-surface rounded-2xl border border-error/40 p-4 flex items-center justify-center gap-2 hover:bg-error-bg transition mt-2">
          <span className="material-symbols-outlined text-error">logout</span>
          <span className="font-bold text-base text-error">{t('sign_out')}</span>
        </button>

        <p className="text-center text-xs text-text-faint pt-2">מנהל תרופות חכם · גרסה 3.0.0</p>
      </div>
    </div>
  );
}
