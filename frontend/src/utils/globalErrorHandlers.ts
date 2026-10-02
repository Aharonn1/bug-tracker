import { reportSilentError } from './errorReporting';
import { isStaleBundleSuspected } from './versionCheck';

// אם כבר ידוע שהטאב טוען גרסה ישנה, מצרף את זה כהקשר - עוזר לצוות התפעול
// להבחין בין "באג אמיתי בקוד" לבין "סתם קובץ ישן שנשאר טעון בטאב פתוח"
function staleBundleContext(): Record<string, unknown> | undefined {
  return isStaleBundleSuspected() ? { suspectedStaleBundle: true } : undefined;
}

// תופס שגיאות סקריפט גלובליות שקורות מחוץ למחזור ה-render של React (event
// handler רגיל, setTimeout, קוד חיצוני) - את אלו ה-ErrorBoundary לא תופס בכלל
function handleGlobalError(event: ErrorEvent) {
  reportSilentError('CLIENT_UNHANDLED_ERROR', event.message || 'שגיאת JavaScript גלובלית לא מזוהה', event.error?.stack, staleBundleContext());
}

// תופס Promise שנדחה בלי .catch - לרוב קריאת API אסינכרונית שנכשלה בשקט
function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? 'Promise נדחה ללא סיבה ידועה');
  const stack = reason instanceof Error ? reason.stack : undefined;
  reportSilentError('CLIENT_UNHANDLED_REJECTION', message, stack, staleBundleContext());
}

let registered = false;

export function registerGlobalErrorHandlers() {
  if (registered) return;
  registered = true;

  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}
