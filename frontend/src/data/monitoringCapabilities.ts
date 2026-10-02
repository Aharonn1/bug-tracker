export interface MonitoringCapability {
  id: string;
  icon: string;
  title: string;
  summary: string;
  errorCode?: string;
  howItWorks: string;
  whereToSeeIt: string;
}

// רשימה סטטית - תיעוד חי של כל סוגי התקלות שהמערכת יודעת לזהות ולדווח
// עליהן אוטומטית. מתעדכן ידנית בכל פעם שמוסיפים יכולת ניטור חדשה
export const MONITORING_CAPABILITIES: MonitoringCapability[] = [
  {
    id: 'client-js-crash',
    icon: '🧨',
    title: 'קריסת JavaScript בדפדפן',
    summary: 'כשרכיב באתר קורס לגמרי בזמן תצוגה (render) אצל המשתמש',
    errorCode: 'CLIENT_JS_CRASH',
    howItWorks: 'כל האפליקציה עטופה ב-ErrorBoundary שתופס קריסות רינדור של React. במקום מסך לבן, המשתמש רואה הודעה ידידותית וכפתור רענון, והתקלה מדווחת אוטומטית ברקע עם ה-stack trace המלא.',
    whereToSeeIt: 'מופיע בטבלת התקריות עם קוד השגיאה CLIENT_JS_CRASH, משויך למשתמש שחווה אותה.',
  },
  {
    id: 'client-unhandled-error',
    icon: '⚡',
    title: 'שגיאת JavaScript גלובלית',
    summary: 'שגיאות שקורות מחוץ לתצוגה של React - בתוך event handler, setTimeout וכו׳',
    errorCode: 'CLIENT_UNHANDLED_ERROR',
    howItWorks: 'מאזין ל-window.onerror הגלובלי של הדפדפן - תופס גם שגיאות שה-ErrorBoundary לא רואה בכלל כי הן לא קורות בזמן רינדור.',
    whereToSeeIt: 'טבלת התקריות, קוד CLIENT_UNHANDLED_ERROR.',
  },
  {
    id: 'client-unhandled-rejection',
    icon: '🔌',
    title: 'Promise שנכשל בלי טיפול',
    summary: 'קריאה אסינכרונית (API וכו׳) שנכשלה בלי שהקוד תפס את זה',
    errorCode: 'CLIENT_UNHANDLED_REJECTION',
    howItWorks: 'מאזין ל-unhandledrejection של הדפדפן - תופס מקרים שבהם קוד שכח .catch על Promise, לפני שהמשתמש בכלל שם לב שמשהו נכשל בשקט.',
    whereToSeeIt: 'טבלת התקריות, קוד CLIENT_UNHANDLED_REJECTION.',
  },
  {
    id: 'client-handled-api-failure',
    icon: '🛠️',
    title: 'כשל API שטופל בעדינות',
    summary: 'טעינה/שמירה שנכשלה, אבל המשתמש כבר רואה הודעת שגיאה ברורה במקום',
    errorCode: 'CLIENT_HANDLED_API_FAILURE',
    howItWorks: 'כל מקום שטוען או שומר נתונים (באגים, תקריות, ניטור) תפוס ב-try/catch ומציג הודעה למשתמש. גם כשזה "מטופל" ברמת החוויה, התקלה עדיין מדווחת ברקע כדי שצוות התפעול יידע שזה קורה.',
    whereToSeeIt: 'טבלת התקריות, קוד CLIENT_HANDLED_API_FAILURE.',
  },
  {
    id: 'network-slowness',
    icon: '🌐',
    title: 'איטיות וניתוקים ברשת של הלקוח',
    summary: 'בודק latency, אובדן חבילות וגימגום תצוגה - מבדיל "הרשת שלך" מ"השרת שלנו"',
    howItWorks: 'כל טעינת עמוד מודד 5 ניסיונות תקשורת מהירים, זמן תגובה של ה-thread הראשי, וקפיצות frame. אם זוהתה בעיה, מוצג באנר שמסביר אם זו בעיית רשת מקומית (למשל Wi-Fi) או תקלה אצלנו.',
    whereToSeeIt: 'באנר אדום/צהוב בראש הדף כש-"ConnectionDiagnosticBanner" מזהה בעיה.',
  },
  {
    id: 'server-unhandled-exception',
    icon: '💥',
    title: 'שגיאת שרת בלתי צפויה',
    summary: 'כל חריגה (Exception) לא מטופלת בקוד השרת, מכל endpoint',
    errorCode: 'SERVER_UNHANDLED_EXCEPTION',
    howItWorks: 'Middleware גלובלי בשרת (GlobalExceptionHandler) תופס כל חריגה שלא טופלה במפורש, מחזיר תשובה מסודרת למשתמש, ומדווח את התקלה בשרת - כולל שיוך למשתמש המחובר אם היה.',
    whereToSeeIt: 'טבלת התקריות, קוד SERVER_UNHANDLED_EXCEPTION, חומרה קריטית כברירת מחדל.',
  },
  {
    id: 'db-unavailable',
    icon: '🗄️',
    title: 'בסיס הנתונים לא זמין',
    summary: 'תקלות SQL/timeout בחיבור ל-DB - כולל מצב שבו אי אפשר אפילו לכתוב את התקלה ל-DB',
    errorCode: 'SERVER_DATABASE_UNAVAILABLE',
    howItWorks: 'כשה-DB לא זמין, התקלה נשמרת זמנית בזיכרון השרת (לא ב-DB, כי הוא בדיוק מה שלא עובד) ונכתבת אוטומטית ברגע שהחיבור חוזר. עובד גם לפני שהתחברת - אימות הטוקן (JWT) לא תלוי כלל ב-DB.',
    whereToSeeIt: 'באנר ייעודי בראש הדף + טבלת התקריות אחרי שהחיבור חוזר.',
  },
  {
    id: 'session-expired',
    icon: '🔑',
    title: 'פקיעת התחברות (session)',
    summary: 'כשהטוקן פג באמצע שימוש - מנותק אוטומטית במקום שגיאות מבלבלות',
    howItWorks: 'כל קריאת API שמחזירה 401 מפעילה ניתוק אוטומטי וחזרה למסך login עם הודעה ברורה. זו לא נחשבת "תקלה" ולא נכנסת לטבלת התקריות - זו התנהגות צפויה.',
    whereToSeeIt: 'חזרה אוטומטית למסך login עם הודעה כתומה.',
  },
  {
    id: 'stale-bundle',
    icon: '🆕',
    title: 'גרסה ישנה של האתר אחרי דיפלוי',
    summary: 'כשטאב פתוח נשאר על גרסה ישנה בזמן שעולה דיפלוי חדש',
    howItWorks: 'כל בנייה (build) מקבלת מזהה ייחודי. הדפדפן בודק מול השרת כל כמה דקות (וכשחוזרים לטאב) אם יש אי-התאמה, ומציע רענון לפני שזה גורם לשגיאות מוזרות.',
    whereToSeeIt: 'באנר "גרסה חדשה זמינה" בראש הדף. אם בכל זאת קפצה שגיאה בזמן שגרסה ישנה חשודה, היא מסומנת בטבלת התקריות.',
  },
  {
    id: 'user-attribution',
    icon: '👤',
    title: 'שיוך תקלות למשתמש הספציפי',
    summary: 'כל תקלה יודעת "למי זה קרה" - לא רק "מה קרה"',
    howItWorks: 'כל תקלה משויכת למשתמש (או למספר משתמשים, אם כמה אנשים חוו את אותה תקלה) כולל כמה פעמים וממתי. גם תקלות שקרו לפני התחברות (כמו ניסיון login כושל) נשמרות עם האימייל שהוקלד.',
    whereToSeeIt: 'עמודת "דווח על ידי" בטבלת התקריות, ופילוח לפי משתמש בעמוד הראשי.',
  },
];
