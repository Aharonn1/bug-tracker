import { incidentService } from '../api/incidentService';
import { TENANT_ID } from '../config';

// שגיאות דפדפן ידועות ורועשות שלא מעידות על באג אמיתי בקוד שלנו - לסנן כדי
// לא להציף את טבלת התקלות ב"רעש" לא רלוונטי
const NOISE_PATTERNS = [/ResizeObserver loop/i, /Script error\.?$/i];

function isNoise(message: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(message));
}

function report(errorCode: 'CLIENT_UNHANDLED_ERROR' | 'CLIENT_UNHANDLED_REJECTION', message: string, stack?: string | null) {
  if (isNoise(message)) return;

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
      // אם גם דיווח התקלה נכשל (למשל לפני התחברות), אין מה לעשות - זו כבר
      // שגיאה "ברקע" שהמשתמש לא בהכרח שם לב אליה
    });
}

// תופס שגיאות סקריפט גלובליות שקורות מחוץ למחזור ה-render של React (event
// handler רגיל, setTimeout, קוד חיצוני) - את אלו ה-ErrorBoundary לא תופס בכלל
function handleGlobalError(event: ErrorEvent) {
  report('CLIENT_UNHANDLED_ERROR', event.message || 'שגיאת JavaScript גלובלית לא מזוהה', event.error?.stack);
}

// תופס Promise שנדחה בלי .catch - לרוב קריאת API אסינכרונית שנכשלה בשקט
function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? 'Promise נדחה ללא סיבה ידועה');
  const stack = reason instanceof Error ? reason.stack : undefined;
  report('CLIENT_UNHANDLED_REJECTION', message, stack);
}

let registered = false;

export function registerGlobalErrorHandlers() {
  if (registered) return;
  registered = true;

  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}
