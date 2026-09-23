import React, { useEffect } from 'react';
import { useTelemetryProbe } from '../hooks/useTelemetryProbe';
import type { TelemetryStatusColor } from '../types/telemetry.types';

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

export const ConnectionDiagnosticBanner: React.FC = () => {
  const { report, metrics, loading, error, runProbe } = useTelemetryProbe();

  useEffect(() => {
    runProbe();
  }, [runProbe]);

  if (error || (!report && !loading)) return null;
  if (!report) return null;

  const style = STATUS_STYLES[report.statusColor] ?? STATUS_STYLES.Green;
  const os = detectOS();
  const showUptimeHelp = report.isFixableByRestart && os !== 'other';

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
              ['זמן תגובה לשרת (ממוצע)', formatMetric(metrics.latencyMs, 'ms')],
              ['ניתוקים בבדיקה', `${metrics.pingFailures} מתוך ${metrics.pingAttempts} ניסיונות`],
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