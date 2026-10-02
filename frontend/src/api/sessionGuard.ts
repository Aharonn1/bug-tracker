import { SessionExpiredError } from './SessionExpiredError';

// נקרא ב-AuthProvider כדי לנתק אוטומטית ולהציג הודעה כשטוקן פג
export const SESSION_EXPIRED_EVENT = 'bugtracker:session-expired';

// נקרא בכל שירות API (חוץ מ-authService, ששם 401 פירושו "סיסמה שגויה" ולא
// "session פג") מיד אחרי res.ok === false. אם זו 401, משדר אירוע גלובלי
// (ה-AuthProvider מאזין ומנתק את המשתמש בחזרה למסך login) וזורק שגיאה
// ייעודית במקום השגיאה הגנרית
export function throwIfSessionExpired(res: Response): void {
  if (res.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new SessionExpiredError();
  }
}
