// בדיקת מהירות/יציבות הורדה אמיתית - שונה מהותית מה-ping הקיים ב-useTelemetryProbe
// (שמודד latency בלבד, לא throughput). משתמשת בקובץ סטטי שכבר יושב על
// ה-Static Web App עצמו (same-origin) - בלי לגעת ב-CSP בכלל, ובלי תלות
// בשרת חיצוני. בייטים אקראיים (לא אפסים) כדי שאי אפשר יהיה לדחוס אותם -
// מודדים את הזמן האמיתי להעביר 5MB על הרשת, לא גרסה מכווצת שלהם
const TEST_FILE_PATH = '/speedtest-5mb.bin';
const TEST_FILE_BYTES = 5 * 1024 * 1024;

// כמה ניסיונות הורדה *נפרדים* ברצף (לא קובץ אחד גדול) - מדמה בכוונה את
// התרחיש האמיתי שמדאיג כאן: הורדת קבצים גדולים/מרובים מנט המשפט, שיכולה
// להימשך שעות ולהיתקל בניתוקים באמצע. גם אם חלק מהניסיונות נכשלים, עדיין
// מתקבל מידע שימושי מהניסיונות שהצליחו - לא שהבדיקה כולה "נופלת" בלי תשובה
const RELIABILITY_ATTEMPTS = 5;
const ATTEMPT_TIMEOUT_MS = 15000;

interface DownloadAttemptResult {
  success: boolean;
  mbps: number | null;
}

export interface DownloadReliabilityResult {
  successCount: number;
  totalAttempts: number;
  // ממוצע רק מהניסיונות שהצליחו - null אם אף ניסיון לא הצליח
  avgMbps: number | null;
}

async function attemptOnce(): Promise<DownloadAttemptResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  // cache-busting ייחודי לכל ניסיון - לא רק הזמן (כמה ניסיונות יכולים
  // לקרות באותה מילישנייה), אלא גם מספר אקראי
  const url = `${TEST_FILE_PATH}?cb=${Date.now()}-${Math.random()}`;
  const start = performance.now();

  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return { success: false, mbps: null };

    await res.arrayBuffer();
    const durationMs = performance.now() - start;
    const mbps = (TEST_FILE_BYTES * 8) / (durationMs / 1000) / 1_000_000;
    return { success: true, mbps };
  } catch {
    return { success: false, mbps: null };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function measureDownloadReliability(): Promise<DownloadReliabilityResult> {
  const attempts: DownloadAttemptResult[] = [];
  // ברצף, לא במקביל - הורדה ארוכה אמיתית (קובץ של שעות) היא גם רציפה על
  // אותו חיבור, לא כמה זרמים מקבילים שהיו מנפחים את המהירות הנמדדת
  for (let i = 0; i < RELIABILITY_ATTEMPTS; i++) {
    attempts.push(await attemptOnce());
  }

  const successful = attempts.filter((a): a is { success: true; mbps: number } => a.success && a.mbps !== null);
  const avgMbps = successful.length > 0
    ? successful.reduce((sum, a) => sum + a.mbps, 0) / successful.length
    : null;

  return {
    successCount: successful.length,
    totalAttempts: RELIABILITY_ATTEMPTS,
    avgMbps,
  };
}

// הערכת זמן הורדה לקבצים גדולים לפי המהירות שנמדדה - עונה ישירות על "קובץ
// של 3GB ייקח לי כמה זמן בערך", בלי להוריד בפועל 3GB בתוך הבדיקה עצמה
export function estimateDownloadTimeMs(fileSizeBytes: number, mbps: number): number {
  const megabits = (fileSizeBytes * 8) / 1_000_000;
  return (megabits / mbps) * 1000;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours} שעות ו-${minutes} דקות`;
  if (minutes > 0) return `${minutes} דקות ו-${seconds} שניות`;
  return `${seconds} שניות`;
}
