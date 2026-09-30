import { incidentService } from '../api/incidentService';
import { TENANT_ID } from '../config';

export type SilentErrorCode =
  | 'CLIENT_UNHANDLED_ERROR'
  | 'CLIENT_UNHANDLED_REJECTION'
  | 'CLIENT_HANDLED_API_FAILURE';

// שגיאות דפדפן ידועות ורועשות שלא מעידות על באג אמיתי בקוד שלנו - לסנן כדי
// לא להציף את טבלת התקלות ב"רעש" לא רלוונטי
const NOISE_PATTERNS = [/ResizeObserver loop/i, /Script error\.?$/i];

function isNoise(message: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(message));
}

// מדווח בשקט ברקע על תקלה - לא משנה את מה שהמשתמש רואה (ההודעה הידידותית
// שכבר מוצגת לו נשארת כמו שהיא). המטרה: גם כשל שכבר "טופל יפה" בממשק
// (המשתמש רק רואה הודעת שגיאה ולא מתלונן) עדיין יירשם אצלנו לצורך מעקב
export function reportSilentError(errorCode: SilentErrorCode, message: string | null | undefined, stack?: string | null) {
  if (!message || isNoise(message)) return;

  incidentService
    .create({
      tenantId: TENANT_ID,
      errorCode,
      errorMessage: message,
      stackTrace: stack ?? null,
      rawPayload: JSON.stringify({
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    })
    .catch(() => {
      // אם גם דיווח התקלה נכשל, אין מה לעשות מעבר לזה - זו כבר "שכבה שנייה"
      // של דיווח ברקע, לא קריטית כמו התגובה למשתמש עצמה
    });
}
