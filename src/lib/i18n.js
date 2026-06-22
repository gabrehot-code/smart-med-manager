const translations = {
  he: {
    'התרופות של': 'התרופות של',
    'שלום': 'שלום',
    'הכל נלקח היום': 'הכל נלקח היום',
    'אין תרופות היום': 'אין תרופות היום',
    'יש תרופות ממתינות': 'יש תרופות ממתינות',
    'עמידות בטיפול': 'עמידות בטיפול',
    'התרופה הבאה': 'התרופה הבאה',
    'ביקור רופא': 'ביקור רופא',
    'עדכון אחרון': 'עדכון אחרון',
    'התראה פעילה': 'התראה פעילה',
    'אין התראות כעת': 'אין התראות כעת',
    'ניהול מלאי תרופות': 'ניהול מלאי תרופות',
    'התרופות של היום': 'התרופות של היום',
    'לקחתי': 'לקחתי',
    'נלקח': 'נלקח',
    'פוספס': 'פוספס',
    'הגדרות': 'הגדרות',
    'התראות': 'התראות',
    'העדפות יישום': 'העדפות יישום',
    'שפה': 'שפה',
    'גודל טקסט': 'גודל טקסט',
    'ערכת צבעים': 'ערכת צבעים',
    'מצב כהה': 'מצב כהה',
    'התנתק': 'התנתק',
    'שאל את Claude AI': 'שאל את Claude AI',
  },
  en: {
    'התרופות של': 'Medications for',
    'שלום': 'Hello',
    'הכל נלקח היום': 'All taken today',
    'אין תרופות היום': 'No medications today',
    'יש תרופות ממתינות': 'Medications pending',
    'עמידות בטיפול': 'Adherence',
    'התרופה הבאה': 'Next medication',
    'ביקור רופא': 'Doctor visit',
    'עדכון אחרון': 'Last update',
    'התראה פעילה': 'Active alert',
    'אין התראות כעת': 'No alerts now',
    'ניהול מלאי תרופות': 'Medication inventory',
    'התרופות של היום': "Today's medications",
    'לקחתי': 'Taken',
    'נלקח': 'Taken ✓',
    'פוספס': 'Missed',
    'הגדרות': 'Settings',
    'התראות': 'Notifications',
    'העדפות יישום': 'App preferences',
    'שפה': 'Language',
    'גודל טקסט': 'Text size',
    'ערכת צבעים': 'Color theme',
    'מצב כהה': 'Dark mode',
    'התנתק': 'Sign out',
    'שאל את Claude AI': 'Ask Claude AI',
  }
};

let currentLang = localStorage.getItem('lang') || 'he';

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
}

export function t(key) {
  return translations[currentLang]?.[key] || key;
}

export function getLang() {
  return currentLang;
}
