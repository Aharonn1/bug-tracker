// רשימת אימיילים של משתמשי SiteAdmin (מנהל-על חוצה-לקוחות) - קבועה כאן
// בכוונה, לא נטענת מה-API, כי GET /api/Users זמין רק ל-SiteAdmin עצמו.
// Admin רגיל (מנהל משרד) צריך להחריג את האימיילים האלה מכל תצוגת "מי דיווח"
// (כולל חילוץ attemptedEmail מתוך rawPayload, שלא עובר דרך reportedByUsers
// ולכן לא מסונן אוטומטית לפי Role) - אותו שיקול כמו בשאר הסינונים
export const SITE_ADMIN_EMAILS = ['aharon.halevy@lawfirm.co.il'];

export function isSiteAdminEmail(email: string | null): boolean {
  return email !== null && SITE_ADMIN_EMAILS.includes(email.toLowerCase());
}
