import { incidentService } from '../api/incidentService';
import { TENANT_ID } from '../config';
import type { CreateIncidentDto } from '../types/bug.types';

export type SilentErrorCode =
  | 'CLIENT_UNHANDLED_ERROR'
  | 'CLIENT_UNHANDLED_REJECTION'
  | 'CLIENT_HANDLED_API_FAILURE';

// שגיאות דפדפן ידועות ורועשות שלא מעידות על באג אמיתי בקוד שלנו - לסנן כדי
// לא להציף את טבלת התקלות ב"רעש" לא רלוונטי
const NOISE_PATTERNS = [/ResizeObserver loop/i, /Script error\.?$/i];

// תור דיווחים שנכשלו לגמרי (השרת לא היה נגיש בכלל) - נשמר רק כדי לנסות
// שוב כשהחיבור חוזר. אין כאן שום דבר רגיש: אותם שדות בדיוק שכבר נשלחים
// לשרת בכל דיווח רגיל (קוד שגיאה, הודעה, stack trace, URL) - לא טוקן,
// לא סיסמה, לא תוכן טפסים
const QUEUE_STORAGE_KEY = 'bugtracker.pendingErrorReports';
const MAX_QUEUE_SIZE = 20;
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000;

function isNoise(message: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(message));
}

interface QueuedReport {
  dto: CreateIncidentDto;
  queuedAt: number;
}

function readQueue(): QueuedReport[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedReport[]) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
  } catch {
    // localStorage לא זמין (מצב פרטי, חסימת cookies וכו') - אין מה לעשות
  }
}

function enqueue(dto: CreateIncidentDto) {
  const queue = readQueue();
  queue.push({ dto, queuedAt: Date.now() });
  writeQueue(queue);
}

async function trySend(dto: CreateIncidentDto): Promise<boolean> {
  try {
    await incidentService.create(dto);
    return true;
  } catch {
    return false;
  }
}

function buildDto(errorCode: SilentErrorCode, message: string, stack?: string | null): CreateIncidentDto {
  return {
    tenantId: TENANT_ID,
    errorCode,
    errorMessage: message,
    stackTrace: stack ?? null,
    rawPayload: JSON.stringify({
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
  };
}

// מדווח בשקט ברקע על תקלה - לא משנה את מה שהמשתמש רואה (ההודעה הידידותית
// שכבר מוצגת לו נשארת כמו שהיא). אם השרת עצמו לא נגיש כרגע (למשל נפילה
// מוחלטת), הדיווח נשמר מקומית וייעשה עליו ניסיון חוזר כשהחיבור יחזור
export function reportSilentError(errorCode: SilentErrorCode, message: string | null | undefined, stack?: string | null) {
  if (!message || isNoise(message)) return;

  const dto = buildDto(errorCode, message, stack);

  trySend(dto).then((ok) => {
    if (!ok) enqueue(dto);
  });
}

// מנסה לשלוח מחדש דיווחים שנתקעו בתור המקומי - נקרא בעליית האפליקציה
// ובכל פעם שהדפדפן חוזר online. דיווחים ישנים מדי (מעל 24 שעות) נזרקים
// בלי ניסיון, כי עד אז הם כבר לא רלוונטיים לאבחון
export async function flushPendingReports() {
  const queue = readQueue();
  if (queue.length === 0) return;

  const now = Date.now();
  const fresh = queue.filter((item) => now - item.queuedAt < MAX_QUEUE_AGE_MS);

  const stillPending: QueuedReport[] = [];
  for (const item of fresh) {
    const ok = await trySend(item.dto);
    if (!ok) stillPending.push(item);
  }

  writeQueue(stillPending);
}
