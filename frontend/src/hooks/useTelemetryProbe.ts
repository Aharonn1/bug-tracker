import { useState, useCallback } from 'react';
import { telemetryService } from '../api/telemetryService';
import type { ClientTelemetryProbeDto, TelemetryDiagnosticReport } from '../types/telemetry.types';
import { API_BASE_URL, TENANT_ID, tenantHeaders } from '../config';

const LATENCY_PING_URL = `${API_BASE_URL}/api/Bugs`;
const PING_ATTEMPTS = 15;
const PING_TIMEOUT_MS = 4000;

function measureExecutionLagMs(): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now();
    setTimeout(() => resolve(performance.now() - start), 0);
  });
}

// ניסיון תקשורת בודד - לעולם לא נכשל (throw), רק מחזיר null כשהוא נכשל/נתקע,
// כדי שאובדן חיבור אמיתי ייספר כניתוק ולא יפיל את כל הבדיקה
async function pingOnce(): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  const start = performance.now();
  try {
    await fetch(LATENCY_PING_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: tenantHeaders({ Accept: 'application/json' }),
      signal: controller.signal,
    });
    return performance.now() - start;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// כמה ניסיונות תקשורת רצופים (כמו ping -c) - כדי להבחין בין "איטי אבל יציב"
// (latency גבוה) לבין "ניתוקים בפועל" (חלק מהניסיונות נכשלים לגמרי)
async function measureConnectivity(): Promise<{ latencyMs: number; pingAttempts: number; pingFailures: number }> {
  const results = await Promise.all(Array.from({ length: PING_ATTEMPTS }, () => pingOnce()));
  const successful = results.filter((r): r is number => r !== null);
  const pingFailures = PING_ATTEMPTS - successful.length;
  const latencyMs =
    successful.length > 0 ? successful.reduce((sum, v) => sum + v, 0) / successful.length : PING_TIMEOUT_MS;

  return { latencyMs, pingAttempts: PING_ATTEMPTS, pingFailures };
}

// שיא זמן הפריים על פני חלון דגימה קצר - קפיצות גבוהות מרמזות על גימגום תצוגה
// (למשל חיבור RDP/Citrix איטי), לא רק על עומס מעבד רגיל. אם הטאב ברקע
// requestAnimationFrame מוקפא לגמרי, ולכן מדלגים על המדידה כדי לא לקבל false positive.
function measureFrameJankMs(sampleWindowMs = 600): Promise<number | null> {
  return new Promise((resolve) => {
    if (document.hidden) {
      resolve(null);
      return;
    }

    const frameDeltas: number[] = [];
    let last = performance.now();
    const start = last;

    function tick(now: number) {
      frameDeltas.push(now - last);
      last = now;
      if (now - start < sampleWindowMs) {
        requestAnimationFrame(tick);
      } else {
        resolve(Math.max(...frameDeltas));
      }
    }

    requestAnimationFrame(tick);
  });
}

// כשגם השרת שלנו לא עונה, אי אפשר לבקש ממנו אבחנה - אבל כבר יש לנו מקומית
// את תוצאות ה-ping, אז אפשר לבנות אבחנה בסיסית בלי להסתיר את הבאנר לגמרי
function buildFallbackReport(dto: ClientTelemetryProbeDto): TelemetryDiagnosticReport {
  if (dto.pingFailures > 0) {
    const lossPercent = Math.round((100 * dto.pingFailures) / dto.pingAttempts);
    return {
      statusColor: 'Red',
      summaryTitle: 'זוהו ניתוקים חוזרים בחיבור האינטרנט',
      actionableRecommendation: `מתוך ${dto.pingAttempts} ניסיונות תקשורת, ${dto.pingFailures} נכשלו לגמרי (כ-${lossPercent}% אובדן חבילות), וגם השרת שלנו לא הצליח להגיב. ייתכן שזו בעיה אצל ספק האינטרנט (ISP) שלך - מומלץ לבדוק את קו האינטרנט או לפנות לספק.`,
      isIssueLocalToClient: true,
      isFixableByRestart: false,
    };
  }

  return {
    statusColor: 'Yellow',
    summaryTitle: 'לא ניתן להתחבר לשרת כרגע',
    actionableRecommendation: 'הרשת שלך נראית תקינה, אך השרת שלנו לא הגיב. ייתכן שמדובר בתקלה זמנית אצלנו - נסו שוב בעוד מספר דקות.',
    isIssueLocalToClient: false,
    isFixableByRestart: false,
  };
}

export const useTelemetryProbe = () => {
  const [report, setReport] = useState<TelemetryDiagnosticReport | null>(null);
  const [metrics, setMetrics] = useState<ClientTelemetryProbeDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runProbe = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [connectivity, executionLagMs, frameJankMs] = await Promise.all([
        measureConnectivity(),
        measureExecutionLagMs(),
        measureFrameJankMs(),
      ]);

      const connection = (navigator as any).connection;

      const probeDto: ClientTelemetryProbeDto = {
        tenantId: TENANT_ID,
        stationId: null,
        latencyMs: connectivity.latencyMs,
        effectiveConnectionType: connection?.effectiveType ?? null,
        downlinkSpeedMbps: connection?.downlink ?? null,
        executionLagMs,
        frameJankMs,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        deviceMemoryGb: (navigator as any).deviceMemory ?? null,
        pingAttempts: connectivity.pingAttempts,
        pingFailures: connectivity.pingFailures,
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
      };

      setMetrics(probeDto);

      try {
        setReport(await telemetryService.probe(probeDto));
      } catch {
        // השרת שלנו לא הגיב - כבר יש לנו מקומית את תוצאות ה-ping,
        // אז נציג אבחנה מבוססת עליהן במקום להסתיר את הבאנר
        setReport(buildFallbackReport(probeDto));
      }
    } catch (err: any) {
      setError(err.message || 'כשל בבדיקת איכות החיבור');
    } finally {
      setLoading(false);
    }
  }, []);

  return { report, metrics, loading, error, runProbe };
};
