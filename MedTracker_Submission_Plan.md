# מנהל תרופות חכם — תוכנית הגשה מלאה (React + Supabase + Vercel)
### פרויקט גמר · קורס פיתוח מוצר מבוסס AI · יעד הגשה: 26/06/2026

מסמך זה לוקח את MedTracker מהמצב הנוכחי (קובץ HTML יחיד, localStorage) למוצר שעומד
במלוא המחוון: React פרוס ב‑Vercel, Backend על Supabase עם מודל נתונים, אינטגרציות
שעובדות, ו‑README/ERD מלאים. הקבצים המצורפים (`schema.sql`, `ERD.md`,
`claude-proxy.edge-function.ts`, `README.md`) הם החלקים המעשיים — המסמך הזה מחבר אותם
לתוכנית ביצוע ולציון.

---

## 1. ניתוח פערים מול המחוון (מצב נוכחי → יעד)

| # | קריטריון | משקל | מצב היום (HTML+localStorage) | פעולה לסגירת הפער |
|---|---|---|---|---|
| 1 | הגדרת מוצר וערך | 15 | חזק — בעיה/קהל/בידול ברורים | מתועד ב‑`README.md` (כבר מוכן) ✅ |
| 2 | עיצוב ו‑UX | 15 | חזק מאוד — RTL, responsive, נגישות | לשמר במעבר ל‑React (אותו Tailwind) ✅ |
| 3 | פונקציונליות ופרונט | 20 | הכול עובד, אך לא React | פירוק לרכיבי React (§4) |
| 4 | בקאנד, מודל נתונים, ERD | 20 | **חסר — אין DB** | Supabase + `schema.sql` + `ERD.md` (§3) |
| 5 | אינטגרציות | 15 | חלקי — AI דורש מפתח בלקוח | Auth אמיתי + Edge Function ל‑AI (§5) |
| 6 | דיפלוי ויציבות | 10 | **לא פרוס** | Vercel + GitHub CI (§6) |
| 7 | תיעוד (README) | 5 | — | `README.md` מוכן ✅ |
| בונוס | מצוינות / Vibe Coding | +5 | פוטנציאל גבוה | לתעד את תהליך ה‑AI‑coding (§8) |

**המנוף הגדול שכבר קיים בקוד:** כל גישה לנתונים עוברת דרך מעטפת אחת — האובייקט `api`
(ו‑`Storage`). זהו בדיוק התפר להחלפה: מחליפים את מימוש `api.*` מ‑localStorage לקריאות
Supabase, וכל מסכי ה‑UI ממשיכים לעבוד ללא שינוי. זה הופך את המעבר ל‑Backend להדרגתי
ובטוח במקום כתיבה מחדש.

---

## 2. ארכיטקטורת היעד
```
React (Vite) ──HTTPS──▶ Supabase
  │  TailwindCSS, RTL        ├── PostgreSQL (schema.sql + RLS)
  │  supabase-js client      ├── Auth (Email + Google OAuth)
  │                          └── Edge Function: claude-proxy ──▶ Anthropic Claude API
  └── פרוס על Vercel (CI מ‑GitHub, env vars)
```
- מפתח ה‑AI חי **רק** כסוד ב‑Supabase (`ANTHROPIC_API_KEY`), לעולם לא בלקוח.
- הלקוח מחזיק רק `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (ציבוריים מטבעם, מוגנים ע״י RLS).

---

## 3. Backend — Supabase (קריטריון §4, 20 נק׳)
1. צור פרויקט ב‑[supabase.com](https://supabase.com) (Region: Frankfurt — קרוב לישראל).
2. **Database → SQL Editor** → הדבק והרץ את [`schema.sql`](./schema.sql).
   זה יוצר 12 טבלאות מנורמלות, enums, אינדקסים, טריגר ליצירת `profile` אוטומטית,
   ומדיניות **RLS** מלאה (גישה לפי בעלות על מטופל / חברות ב‑care_team).
3. **Database → Schema Visualizer** → צילום מסך → שמור כ‑`docs/erd.png` והטמע ב‑README.
   (התרשים גם קיים כ‑Mermaid ב‑[`ERD.md`](./ERD.md) ומתרנדר אוטומטית ב‑GitHub.)
4. **Authentication → Providers:** הפעל Email; הוסף Google OAuth (Client ID/Secret מ‑Google Cloud).
5. בדיקת RLS: נסה לשלוף נתוני מטופל ממשתמש אחר — אמור לחזור ריק. זה מה שנותן את הנקודות על אבטחת גישה.

> כל הטבלאות, הטיפוסים, המפתחות והקשרים שב‑`schema.sql` תואמים אחד‑לאחד ל‑`ERD.md`
> ולמסכי האפליקציה — בדיוק מה שהמחוון דורש ("ERD תואם למימוש").

---

## 4. Frontend — מעבר ל‑React (קריטריון §3, 20 נק׳)
מבנה רכיבים מוצע (מיפוי ישיר מהמסכים הקיימים):
```
src/
  main.jsx, App.jsx                 # ראוטר + שמירת מסך נוכחי
  lib/supabaseClient.js             # createClient(URL, ANON_KEY)
  lib/api.js                        # ★ אותה מעטפת api.*, עכשיו עם Supabase
  context/AuthContext.jsx           # session, signIn/signUp/signOut
  components/  BottomNav, Toast, Modal, Avatar, Confetti
  screens/  Auth, Dashboard, Inventory, AddMedication, Alert,
            Family, Profile, History, Settings, AIAssistant,
            Vitals, Journal, Emergency
  i18n/  (he/en/ru/ar) — אותו מילון + תבניות שכבר נבנו
```
שלבי ביצוע מומלצים (הדרגתי, כל שלב נבדק):
1. `npm create vite@latest medtracker -- --template react` → התקן Tailwind ו‑`@supabase/supabase-js`.
2. העבר את ה‑CSS/tokens וה‑RTL מ‑`MedTracker.html` (ללא שינוי עיצוב — שומר על 15 הנק׳ של §2).
3. בנה `lib/api.js` עם אותו חוזה פונקציות, אך מבוסס Supabase (דוגמה ב‑§4a).
4. פצל כל מסך ל‑component; שמור את לוגיקת התצוגה הקיימת.
5. טפל במצבי קצה: טעינה (skeleton/ספינר), שגיאה (toast), ריק (empty states — כבר קיימים).

### 4a. דוגמת תפר api → Supabase
```js
// lib/api.js
import { supabase } from './supabaseClient';
export const api = {
  meds: {
    async list(patientId) {
      const { data, error } = await supabase
        .from('medications').select('*, medication_times(time_of_day)')
        .eq('patient_id', patientId).eq('archived', false)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    async create(patientId, m) {
      const { data, error } = await supabase.from('medications')
        .insert({ patient_id: patientId, name: m.name, dose: m.dose, color: m.color, qty: m.qty })
        .select().single();
      if (error) throw error;
      if (m.times?.length) {
        await supabase.from('medication_times')
          .insert(m.times.map(t => ({ medication_id: data.id, time_of_day: t })));
      }
      return data;
    },
  },
  // doses, vitals, journal, mood... אותו דפוס
};
```

---

## 5. אינטגרציות (קריטריון §5, 15 נק׳)
1. **Auth:** התחברות אמיתית עם Supabase Auth (אימייל + Google). מחליף את מצב ההדגמה.
2. **AI מאובטח:** פרוס את ה‑Edge Function [`claude-proxy.edge-function.ts`](./claude-proxy.edge-function.ts):
   ```bash
   supabase functions deploy claude-proxy
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
   בלקוח קוראים לה כך (המפתח לא חשוף):
   ```js
   const { data } = await supabase.functions.invoke('claude-proxy', {
     body: { system, messages, max_tokens: 1024 }
   });
   // data.text => תשובת Claude (מידע על תרופות / אינטראקציות / תובנה יומית)
   ```
3. עדכן את טבלת השירותים ב‑`README.md` כך שתתאר את המימוש בפועל (כבר מוכנה).

> נקודת המפתח של המחוון: "מפתחות מוסתרים נכון (דרך Edge Function ולא בצד הלקוח)" — זו בדיוק הסיבה ל‑Edge Function.

---

## 6. דיפלוי — Vercel (קריטריון §6, 10 נק׳)
1. דחוף את הקוד לריפו ה‑GitHub שלך (כבר קיים).
2. ב‑[vercel.com](https://vercel.com) → New Project → ייבא את הריפו (Framework: Vite).
3. הגדר Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy. כל push ל‑main יפרוס אוטומטית.
5. ב‑Supabase → Authentication → URL Configuration: הוסף את דומיין ה‑Vercel ל‑Redirect URLs (עבור OAuth).
6. בדוק את כל הזרימה המרכזית מהקישור החי בדפדפן/מכשיר אחר (incognito) — ללא שגיאות קונסול.

---

## 7. צ׳קליסט הגשה (מתוך ההנחיות)
- [ ] האתר עולה ב‑Vercel ועובד גם בדפדפן/מכשיר אחר
- [ ] הזרימה המרכזית עובדת מקצה לקצה (הרשמה → הוספת תרופה → "לקחתי" → מעקב)
- [ ] הריפו ציבורי ופתוח
- [ ] README כולל: סקירה, בעיה, קהל יעד, מתחרים ובידול ✅ (`README.md`)
- [ ] תרשים ERD מצורף וברור ✅ (`ERD.md` + צילום Schema Visualizer)
- [ ] רשימת שירותים חיצוניים מפורטת ✅ (טבלה ב‑README)
- [ ] משתמש/נתוני דמו מצוינים ✅ (ב‑README)
- [ ] **שם מלא + ת״ז** צוינו ב‑Google Classroom ובראש ה‑README

## 8. בונוס (+5) — Vibe Coding
המחוון מעניק בונוס על תיעוד תהליך בניית המוצר עם כלי AI. הוסף ל‑README קובץ קצר
`docs/vibe-coding.md`: אילו פרומפטים/כלים שימשו לבניית הסכמה, ה‑RLS, רכיבי React וה‑Edge
Function, ואיך ה‑AI שולב גם *בתוך* המוצר (מידע על תרופות + בדיקת אינטראקציות).

---

## נספח — סדר עבודה מומלץ (אם הזמן קצר)
1. **Supabase + schema.sql** (יום 1) — משיג 20 נק׳ §4 + תשתית.
2. **Vite+React scaffold + api.js + Auth** (ימים 2–3) — §3 + §5 (auth).
3. **העברת המסכים** (ימים 4–6) — שומר §2 וה‑§3.
4. **Edge Function ל‑AI** (יום 7) — §5 מלא.
5. **Vercel deploy + בדיקות** (יום 8) — §6.
6. **README/ERD/בונוס + בדיקת RLS ממכשיר אחר** (יום 9) — §7 + בונוס.

הקבצים `schema.sql`, `ERD.md`, `claude-proxy.edge-function.ts` ו‑`README.md` מוכנים לשימוש
מיידי ומקצרים משמעותית את שלבים 1, 5, ו‑7.
