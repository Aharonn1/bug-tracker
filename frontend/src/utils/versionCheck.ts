// מזהה הבנייה שהטאב הנוכחי טוען - קבוע בזיכרון מרגע הטעינה, לא משתנה
// כל עוד הטאב לא מרוענן
const CURRENT_BUILD_ID = __BUILD_ID__;

let staleBundleDetected = false;

// נקרא מתוך globalErrorHandlers.ts כדי לתייג שגיאות JS שקרו בזמן שכבר
// ידוע שהטאב טוען גרסה ישנה - כאלה הן לרוב תוצר של קובץ שלא קיים יותר
// בשרת, לא באג אמיתי בקוד
export function isStaleBundleSuspected(): boolean {
  return staleBundleDetected;
}

// משווה מול build-version.json (נכתב מחדש בכל דיפלוי) - קובץ לא-ממוספר
// וקצר, לכן cache: 'no-store' זול ולא פוגע בביצועים גם כשנקרא מדי כמה דקות
export async function checkForNewVersion(): Promise<boolean> {
  try {
    const res = await fetch('/build-version.json', { cache: 'no-store' });
    if (!res.ok) return staleBundleDetected;

    const data = await res.json();
    if (data?.buildId && data.buildId !== CURRENT_BUILD_ID) {
      staleBundleDetected = true;
    }
  } catch {
    // אין רשת / קובץ לא זמין - לא מסיק כלום, רק לא משנה את הסטטוס הקיים
  }

  return staleBundleDetected;
}
