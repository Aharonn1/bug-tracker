import React, { useEffect, useRef, useState } from 'react';
import { useTelemetryProbe } from '../hooks/useTelemetryProbe';
import type { TelemetryStatusColor } from '../types/telemetry.types';
import { InfoButton } from './ui/InfoButton';
import { MetricInfoModal, type MetricExplain } from './ui/MetricInfoModal';

const LATENCY_EXPLAIN: MetricExplain = {
  source: 'frontend',
  body: [
    'המדידה רצה בדפדפן: 5 בדיקות fetch רצופות (ברצף, לא במקביל) מול health endpoint קל שלנו, כדי למדוד זמן תגובה אמיתי בלי להעמיס על ה-DB. הבדיקה הראשונה מוצאת מהממוצע בכוונה - היא לפעמים כוללת עלות חד-פעמית של פתיחת חיבור, לא latency יציב.',
    'הממוצע נשלח לשרת, ושם (לא בדפדפן) נקבע אם זה "מעל הסף" - הסף (100ms) והניסוח של ההודעה חיים בקוד השרת, לא בקוד הלקוח.',
  ],
  qa: [
    { q: 'למה דווקא 5 בדיקות, ולמה הראשונה לא נספרת בממוצע?', a: '5 נותן תמונה יציבה בלי להעמיס יותר מדי. הראשונה מוצאת כי לפעמים היא כוללת זמן פתיחת-חיבור חד-פעמי שלא חוזר בבדיקות הבאות - בלעדיה, חיבור-קר בודד היה מעוות את הממוצע כלפי מעלה.' },
    { q: '100ms זה סף קבוע, או שהוא מתאים את עצמו?', a: 'קבוע כרגע, מוגדר בקוד השרת - לא נלמד או מתעדכן אוטומטית לפי היסטוריה.' },
    { q: 'אם כל 5 הבדיקות נכשלות לגמרי (לא רק איטיות), מה קורה?', a: 'זה מזוהה כ"ניתוקים", לא "איטיות" - הודעה שונה לגמרי ללקוח, לא רק מספר-מילישניות גבוה.' },
  ],
};

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

// דיליי התחלתי לפני הבדיקה האוטומטית, באותו עיקרון בדיוק כמו ב-useVersionCheck -
// 8 בקשות הפינג (5 לשרת שלנו + 3 ל-Google) לא קריטיות באותה שנייה, ותחרות
// איתן ברשת מאטה דווקא את הבקשה שבאמת חשובה: טעינת רשימת התקריות עצמה
const INITIAL_PROBE_DELAY_MS = 5000;

export const ConnectionDiagnosticBanner: React.FC = () => {
  const { report, metrics, externalConnectivity, loading, error, runProbe } = useTelemetryProbe();

  // מגן מפני הרצה כפולה ב-StrictMode (dev בלבד - React מדמה mount→unmount→
  // mount כדי לתפוס תלויות ניקוי חסרות). ה-ref שורד את הדימוי הזה, אז בפועל
  // הבדיקה רצה פעם אחת אמיתית - בלי זה כל login/מעבר דף היה שולח 2 פינגים
  const hasRunRef = useRef(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const timeoutId = setTimeout(runProbe, INITIAL_PROBE_DELAY_MS);
    return () => clearTimeout(timeoutId);
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <InfoButton onClick={() => setInfoOpen(true)} />
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
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'בודק...' : 'בדוק שוב'}
          </button>
        </div>
      </div>

      {infoOpen && (
        <MetricInfoModal
          title="זמן תגובה - איך זה נמדד"
          source={LATENCY_EXPLAIN.source}
          body={LATENCY_EXPLAIN.body}
          qa={LATENCY_EXPLAIN.qa}
          onClose={() => setInfoOpen(false)}
        />
      )}

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
              [
                'זמן תגובה לשרת שלנו (ממוצע)',
                // כש-כל הניסיונות נכשלו, metrics.latencyMs הוא רק ה-timeout
                // המקסימלי (לא מדידה אמיתית) - מציגים את זה ככשל, לא כמספר
                metrics.pingFailures === metrics.pingAttempts ? 'אין תגובה בכלל' : formatMetric(metrics.latencyMs, 'ms'),
              ],
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