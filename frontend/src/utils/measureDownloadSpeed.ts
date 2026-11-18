// בדיקת מהירות הורדה אמיתית - שונה מהותית מה-ping הקיים ב-useTelemetryProbe
// (שמודד latency בלבד, לא throughput). משתמשת בקובץ סטטי שכבר יושב על
// ה-Static Web App עצמו (same-origin) - בלי לגעת ב-CSP בכלל, ובלי תלות
// בשרת חיצוני. בייטים אקראיים (לא אפסים) כדי שאי אפשר יהיה לדחוס אותם -
// מודדים את הזמן האמיתי להעביר 5MB על הרשת, לא גרסה מכווצת שלהם
const TEST_FILE_PATH = '/speedtest-5mb.bin';
const TEST_FILE_BYTES = 5 * 1024 * 1024;

export interface DownloadSpeedResult {
  mbps: number;
  durationMs: number;
}

export async function measureDownloadSpeedMbps(): Promise<DownloadSpeedResult> {
  // פרמטר cache-busting כדי למדוד הורדה אמיתית מהרשת בכל פעם - לא פגיעה
  // ב-cache של הדפדפן או של ה-CDN, שהייתה מראה מהירות "אינסופית" כוזבת
  const url = `${TEST_FILE_PATH}?cb=${Date.now()}`;
  const start = performance.now();

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`בדיקת המהירות נכשלה (סטטוס ${res.status})`);
  }
  await res.arrayBuffer();

  const durationMs = performance.now() - start;
  const mbps = (TEST_FILE_BYTES * 8) / (durationMs / 1000) / 1_000_000;

  return { mbps, durationMs };
}
