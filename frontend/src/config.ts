export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5279';

// מזהה הלקוח (משרד עורכי הדין) הנוכחי - כרגע קבוע כי אין עדיין תמיכה במספר
// משרדים. השרת מסתמך על ה-header הזה (לא על גוף הבקשה) כדי להפריד בין לקוחות.
export const TENANT_ID = 'default-tenant';

export const AUTH_TOKEN_STORAGE_KEY = 'bugtracker.authToken';

export function tenantHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  return {
    ...extra,
    'X-Tenant-Id': TENANT_ID,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
