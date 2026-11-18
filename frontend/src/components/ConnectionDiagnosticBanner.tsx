import React, { useEffect, useRef, useState } from 'react';
import { useTelemetryProbe } from '../hooks/useTelemetryProbe';
import type { TelemetryStatusColor } from '../types/telemetry.types';
import { measureDownloadSpeedMbps } from '../utils/measureDownloadSpeed';

const STATUS_STYLES: Record<TelemetryStatusColor, { bg: string; border: string; text: string; dot: string }> = {
  Red: { bg: '#450a0a', border: '#991b1b', text: '#fca5a5', dot: '#ef4444' },
  Yellow: { bg: '#451a03', border: '#b45309', text: '#fcd34d', dot: '#f59e0b' },
  Green: { bg: '#052e16', border: '#15803d', text: '#86efac', dot: '#22c55e' },
};

function detectOS(): 'windows' | 'mac' | 'linux' | 'other' {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'mac';
  if (/Linux|X11/i.test(ua)) return 'linux';
  return 'other';
}

const UPTIME_STEPS: Record<'windows' | 'mac' | 'linux', string[]> = {
  windows: [
    'לחצו יחד על המקשים Ctrl + Shift + Esc — ייפתח "מנהל המשימות"',
    'למעלה, לחצו על הלשונית "ביצועים" (Performance)',
    'בצד ימין לחצו על "מעבד" (CPU)',
    'למטה תראו שורה "זמן פעולה" (Uptime) — זה כמה זמן המחשב דולק ברציפות',
  ],
  mac: [
    'לחצו על סמל התפוח בפינה השמאלית העליונה של המסך',
    'בחרו "About This Mac" (על המק הזה)',
    'לחצו על הכפתור "System Report" (דוח מערכת)',
    'בתפריט הצד לחצו על "Software" (תוכנה) — תראו שם "Time since boot", כמה זמן עבר מההפעלה האחרונה',
  ],
  linux: [
    'לחצו על מקש Super (מקש עם סמל Windows) או על "Activities" בפינה השמאלית העליונה',
    'הקלידו "Terminal" ופתחו אותו',
    'הקלידו את הפקודה uptime ולחצו Enter',
    'תראו כמה זמן המחשב פועל ברציפות (למשל "up 7 days")',
  ],
};

const RESTART_STEPS: Record<'windows' | 'mac' | 'linux', string[]> = {
  windows: [
    'שמרו את כל הקבצים הפתוחים וסגרו תוכנות',
    'לחצו על לחצן "התחל" (Start) בפינה השמאלית התחתונה, או על מקש Windows במקלדת',
    'לחצו על סמל ההפעלה/כיבוי (Power)',
    'בחרו "הפעל מחדש" (Restart)',
    'המתינו כדקה-שתיים עד שהמחשב עולה מחדש, ופתחו שוב את הדפדפן',
  ],
  mac: [
    'שמרו את כל הקבצים הפתוחים וסגרו תוכנות',
    'לחצו על סמל התפוח בפינה השמאלית העליונה של המסך',
    'בחרו "Restart…" (הפעל מחדש…)',
    'אשרו בחלון שנפתח',
    'המתינו כדקה-שתיים עד שהמחשב עולה מחדש, ופתחו שוב את הדפדפן',
  ],
  linux: [
    'שמרו את כל הקבצים הפתוחים וסגרו תוכנות',
    'לחצו על תפריט המערכת בפינה העליונה (או "Activities")',
    'לחצו על סמל ההפעלה/כיבוי (Power), ובחרו "Restart"',
    'אשרו את ההפעלה מחדש',
    'המתינו כדקה-שתיים עד שהמחשב עולה מחדש, ופתחו שוב את הדפדפן',
  ],
};

function formatMetric(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined ? 'לא זמין בדפדפן זה' : `${Math.round(value)}${unit}`;
}

// משווה את זמן התגובה אלינו מול זמן התגובה ל-Google כדי לענות על השאלה
// "זו בעיה אצלי באינטרנט, או דווקא אצלכם בשרת?" - רמז נוסף לצד האבחנה
// המלאה מהשרת, לא תחליף לה. שמרני בכוונה: רק כש ההבדל ברור, לא מנחש
// כששני הצדדים דומים
function buildComparisonNote(
  internalLatencyMs: number,
  external: { latencyMs: number | null; pingAttempts: number; pingFailures: number }
): string | null {
  const externalIsBad = external.pingFailures === external.pingAttempts || (external.latencyMs ?? 0) > 400;
  const externalIsGood = external.latencyMs !== null && external.latencyMs < 150 && external.pingFailures === 0;

  if (externalIsBad) {
    return 'בדיקה מול Google (לא קשור אלינו) הראתה את אותה בעיה בדיוק - זה כמעט בוודאות הרשת/הספק (ISP) שלך, לא השרת שלנו.';
  }
  if (externalIsGood && internalLatencyMs > 400) {
    return 'בדיקה מול Google הראתה חיבור תקין ומהיר - הרשת שלך נראית בסדר. ייתכן שהתקלה דווקא אצלנו בשרת, לא אצלך.';
  }
  return null;
}

// פירוש מעשי של המהירות הנמדדת, ביחס לתרחיש האמיתי שמטריד את המשתמשים -
// הורדת קבצים כבדים ממערכות ממשלתיות כמו נט המשפט/ההוצאה לפועל. הספים
// נבחרו לפי תחושת המתנה סבירה לקובץ בגודל כמה MB, לא נתון רשמי
function describeDownloadSpeed(mbps: number): string {
  if (mbps >= 10) {
    return 'מהיר מספיק להורדת קבצים כבדים (כמו סריקות מנט המשפט או ההוצאה לפועל) בלי המתנה משמעותית.';
  }
  if (mbps >= 3) {
    return 'מהירות בינונית - קבצים גדולים או הרבה קבצים ביחד עשויים לקחת זמן ניכר להורדה.';
  }
  return 'מהירות נמוכה - צפויה המתנה ארוכה בהורדת קבצים כבדים. זו כנראה הסיבה האמיתית לתחושת האיטיות, לא תקלה אצלנו.';
}

export const ConnectionDiagnosticBanner: React.FC = () => {
  const { report, metrics, externalConnectivity, loading, error, runProbe } = useTelemetryProbe();

  // בדיקת מהירות הורדה אמיתית (throughput) - נפרדת לגמרי מה-ping האוטומטי
  // למעלה: זו הורדת 5MB בפועל, אז היא רצה רק בלחיצה מפורשת, לא אוטומטית
  // בטעינת הדף (בניגוד ל-runProbe, שהיא קלה ומתבצעת אוטומטית)
  const [speedTest, setSpeedTest] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'done'; mbps: number } | { status: 'error'; message: string }
  >({ status: 'idle' });

  const runSpeedTest = async () => {
    setSpeedTest({ status: 'loading' });
    try {
      const { mbps } = await measureDownloadSpeedMbps();
      setSpeedTest({ status: 'done', mbps });
    } catch (err: any) {
      setSpeedTest({ status: 'error', message: err?.message || 'בדיקת המהירות נכשלה' });
    }
  };

  // מגן מפני הרצה כפולה ב-StrictMode (dev בלבד - React מדמה mount→unmount→
  // mount כדי לתפוס תלויות ניקוי חסרות). ה-ref שורד את הדימוי הזה, אז בפועל
  // הבדיקה רצה פעם אחת אמיתית - בלי זה כל login/מעבר דף היה שולח 2 פינגים
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    runProbe();
  }, [runProbe]);

  if (error || (!report && !loading)) return null;
  if (!report) return null;

  const style = STATUS_STYLES[report.statusColor] ?? STATUS_STYLES.Green;
  const os = detectOS();
  const showUptimeHelp = report.isFixableByRestart && os !== 'other';
  const comparisonNote =
    report.statusColor !== 'Green' && metrics && externalConnectivity
      ? buildComparisonNote(metrics.latencyMs, externalConnectivity)
      : null;

  return (
    <div
      style={{
        padding: '14px 16px',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '10px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: style.dot,
            marginTop: '4px',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: style.text, fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            {report.summaryTitle}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>
            {report.actionableRecommendation}
          </div>
          {comparisonNote && (
            <div
              style={{
                color: style.text,
                fontSize: '12.5px',
                lineHeight: 1.6,
                marginTop: '8px',
                padding: '8px 10px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                border: `1px solid ${style.border}`,
                borderRadius: '6px',
              }}
            >
              🔍 {comparisonNote}
            </div>
          )}

          <div style={{ marginTop: '10px' }}>
            {speedTest.status === 'idle' && (
              <button
                onClick={runSpeedTest}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${style.border}`,
                  color: style.text,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                בדוק מהירות הורדה בפועל (כמו הורדת קובץ כבד)
              </button>
            )}
            {speedTest.status === 'loading' && (
              <div style={{ color: style.text, fontSize: '12.5px' }}>מוריד קובץ בדיקה (5MB) כדי למדוד מהירות אמיתית...</div>
            )}
            {speedTest.status === 'error' && (
              <div style={{ color: style.text, fontSize: '12.5px' }}>{speedTest.message}</div>
            )}
            {speedTest.status === 'done' && (
              <div
                style={{
                  fontSize: '12.5px',
                  lineHeight: 1.6,
                  padding: '8px 10px',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  border: `1px solid ${style.border}`,
                  borderRadius: '6px',
                }}
              >
                <div style={{ color: style.text, fontWeight: 600, marginBottom: '2px' }}>
                  מהירות הורדה נמדדת: {speedTest.mbps.toFixed(1)} Mbps
                </div>
                <div style={{ color: '#cbd5e1' }}>{describeDownloadSpeed(speedTest.mbps)}</div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={runProbe}
          disabled={loading}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${style.border}`,
            color: style.text,
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: loading ? 'default' : 'pointer',
            flexShrink: 0,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'בודק...' : 'בדוק שוב'}
        </button>
      </div>

      {showUptimeHelp && (
        <details style={{ marginTop: '12px', marginRight: '22px' }}>
          <summary style={{ color: style.text, fontSize: '12.5px', cursor: 'pointer' }}>
            איך בודקים כמה זמן המחשב דולק ברציפות?
          </summary>
          <ol style={{ color: '#cbd5e1', fontSize: '12.5px', lineHeight: 1.9, margin: '10px 0 0', paddingRight: '20px' }}>
            {UPTIME_STEPS[os].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <p style={{ color: '#cbd5e1', fontSize: '12.5px', lineHeight: 1.7, margin: '10px 0 0' }}>
            אם עברו יותר מ-2–3 ימים מאז ההפעלה האחרונה — מומלץ להפעיל מחדש את המחשב. זה פותר את רוב בעיות האיטיות.
          </p>
        </details>
      )}

      {showUptimeHelp && (
        <details style={{ marginTop: '8px', marginRight: '22px' }}>
          <summary style={{ color: style.text, fontSize: '12.5px', cursor: 'pointer' }}>
            איך מפעילים מחדש את המחשב?
          </summary>
          <ol style={{ color: '#cbd5e1', fontSize: '12.5px', lineHeight: 1.9, margin: '10px 0 0', paddingRight: '20px' }}>
            {RESTART_STEPS[os].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </details>
      )}

      {metrics && (
        <details style={{ marginTop: '8px', marginRight: '22px' }}>
          <summary style={{ color: style.text, fontSize: '12.5px', cursor: 'pointer' }}>
            נתוני חומרה ומדידה מלאים
          </summary>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px',
              marginTop: '10px',
            }}
          >
            {[
              ['זמן תגובה לשרת שלנו (ממוצע)', formatMetric(metrics.latencyMs, 'ms')],
              ['ניתוקים בבדיקה (לשרת שלנו)', `${metrics.pingFailures} מתוך ${metrics.pingAttempts} ניסיונות`],
              ...(externalConnectivity
                ? ([
                    ['זמן תגובה ל-Google (בדיקת רשת כללית)', formatMetric(externalConnectivity.latencyMs, 'ms')],
                    ['ניתוקים בבדיקה (ל-Google)', `${externalConnectivity.pingFailures} מתוך ${externalConnectivity.pingAttempts} ניסיונות`],
                  ] as [string, string][])
                : []),
              ['סוג חיבור מדווח', metrics.effectiveConnectionType ?? 'לא זמין בדפדפן זה'],
              ['עומס מעבד (Event Loop Lag)', formatMetric(metrics.executionLagMs, 'ms')],
              ['גימגום תצוגה (Frame Jank)', formatMetric(metrics.frameJankMs, 'ms')],
              ['ליבות מעבד', metrics.hardwareConcurrency ?? 'לא זמין בדפדפן זה'],
              ['זיכרון מוערך (RAM)', metrics.deviceMemoryGb ? `${metrics.deviceMemoryGb}GB` : 'לא זמין בדפדפן זה'],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '10.5px', marginBottom: '3px' }}>{label}</div>
                <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};