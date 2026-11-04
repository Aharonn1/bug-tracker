export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5279';

// מזהה הלקוח (משרד עורכי הדין) הנוכחי - כרגע קבוע כי אין עדיין תמיכה במספר
// משרדים. השרת מסתמך על ה-header הזה (לא על גוף הבקשה) כדי להפריד בין לקוחות.
export const TENANT_ID = 'default-tenant';

export const AUTH_TOKEN_STORAGE_KEY = 'bugtracker.authToken';

// מקור יחיד לכתובת ה-repo - היה כתוב ישירות בתוך IncidentDetailsModal.tsx,
// אין שום סיבה שזה לא יהיה כאן עם שאר הכתובות. הערה: יש עותק נפרד (בהכרח -
// זה קוד C#, לא ניתן לשתף קבוע JS) גם ב-RcaAgentService.cs בבקאנד - אם ה-repo
// אי-פעם יעבור (ארגון/שם אחר), צריך לעדכן בשני המקומות
export const GITHUB_REPO_URL = 'https://github.com/Aharonn1/bug-tracker';

export function tenantHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  return {
    ...extra,
    'X-Tenant-Id': TENANT_ID,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
