export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5279';

// מזהה הלקוח (משרד עורכי הדין) הנוכחי - כרגע קבוע כי אין עדיין מערכת התחברות
// אמיתית. השרת מסתמך על ה-header הזה (לא על גוף הבקשה) כדי להפריד בין לקוחות.
export const TENANT_ID = 'default-tenant';

export function tenantHeaders(extra: HeadersInit = {}): HeadersInit {
  return {
    ...extra,
    'X-Tenant-Id': TENANT_ID,
  };
}
