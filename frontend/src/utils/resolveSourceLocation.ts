// מפענח stack trace מכווץ (minified) בחזרה למיקום בקוד המקור האמיתי -
// הדינמי בכוונה (import() בתוך הפונקציה, לא בראש הקובץ): הספרייה והמפות
// עצמן נטענות רק כשבאמת קורית שגיאה, לא עולות כלום לבאנדל הראשי בתרחיש
// הרגיל (בלי שגיאות)
export interface ResolvedSourceLocation {
  filePath: string;
  line: number;
}

const consumerCache = new Map<string, Promise<any | null>>();

function loadConsumer(bundleUrl: string): Promise<any | null> {
  let cached = consumerCache.get(bundleUrl);
  if (cached) return cached;

  cached = (async () => {
    try {
      const [{ SourceMapConsumer }, mapRes] = await Promise.all([
        import('source-map-js'),
        fetch(`${bundleUrl}.map`),
      ]);
      if (!mapRes.ok) return null;
      const mapJson = await mapRes.json();
      return new SourceMapConsumer(mapJson);
    } catch {
      return null;
    }
  })();

  consumerCache.set(bundleUrl, cached);
  return cached;
}

// נתיבי ה-sources במפה של Vite הם יחסיים (למשל
// "../../../src/components/IncidentTable.tsx") - לוקחים הכל החל מ-"src/"
// ואילך ומוסיפים "frontend/" בתחילה, כדי לא להיות תלויים בעומק היחסי המדויק
function normalizeSourcePath(rawSource: string): string | null {
  const idx = rawSource.indexOf('src/');
  if (idx === -1) return null;
  return `frontend/${rawSource.slice(idx)}`;
}

export async function resolveSourceLocation(stack: string | null | undefined): Promise<ResolvedSourceLocation | null> {
  if (!stack) return null;

  const frameMatch = stack.match(/(https?:\/\/[^\s)]+\.js):(\d+):(\d+)/);
  if (!frameMatch) return null;

  const [, bundleUrl, lineStr, colStr] = frameMatch;

  try {
    const consumer = await loadConsumer(bundleUrl);
    if (!consumer) return null;

    const original = consumer.originalPositionFor({
      line: parseInt(lineStr, 10),
      column: parseInt(colStr, 10),
    });

    if (!original.source || original.line === null) return null;

    const filePath = normalizeSourcePath(original.source);
    if (!filePath) return null;

    return { filePath, line: original.line };
  } catch {
    return null;
  }
}
