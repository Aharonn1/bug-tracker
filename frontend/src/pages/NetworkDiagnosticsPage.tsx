import React, { useEffect, useState } from 'react';
import { colors, radius, spacing } from '../styles/theme';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { measureDownloadReliability, estimateDownloadTimeMs, formatDuration, monitorPingOnce, type DownloadReliabilityResult } from '../utils/measureDownloadSpeed';
import { telemetryService } from '../api/telemetryService';
import type { GatewayDiagnosticResult } from '../types/telemetry.types';

interface LiveLogEntry {
  time: string;
  mbps: number | null;
  netMishpatStatus: string | null;
}

// כל כמה שניות המוניטור החי דוגם מחדש - לא מהיר מדי (עלות דאטה מצטברת
// לאורך זמן ארוך), ולא איטי מדי (אחרת ניתוק קצר באמצע עלול "ליפול בין
// הכיסאות" ולא להירשם בכלל)
const MONITOR_INTERVAL_MS = 10_000;
// עצירה אוטומטית אחרי כ-30 דקות - רשת ביטחון למקרה שמישהו שוכח שהמעקב
// עדיין רץ ברקע ומשאיר אותו פתוח שעות
const MAX_MONITOR_TICKS = 180;

type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: T }
  | { status: 'error'; message: string };

// משרדים גדולים יכולים לקבל קבצים עד כ-3GB (לרוב קטן משמעותית מזה, אבל
// זו התקרה שצריך לדעת עליה) - מציגים טווח שלם במקום רק את קובץ הבדיקה
// (5MB) עצמו, כדי לענות ישירות על "כמה זמן זה באמת ייקח לי"
const FILE_SIZE_PRESETS = [
  { label: 'מסמך בודד', bytes: 5 * 1024 * 1024 },
  { label: 'תיק בינוני', bytes: 500 * 1024 * 1024 },
  { label: 'תיק גדול', bytes: 1024 * 1024 * 1024 },
  { label: 'תיק ענק (עד כ-3GB)', bytes: 3 * 1024 * 1024 * 1024 },
];

// פירוש מעשי של המהירות הנמדדת, ביחס לתרחיש האמיתי שמטריד את המשתמשים -
// הורדת קבצים כבדים ממערכות ממשלתיות כמו נט המשפט/ההוצאה לפועל. הספים
// נבחרו לפי תחושת המתנה סבירה לקובץ בגודל כמה MB, לא נתון רשמי
function describeDownloadSpeed(mbps: number): { text: string; color: string } {
  if (mbps >= 10) {
    return { text: 'מהיר מספיק להורדת קבצים כבדים (כמו סריקות מנט המשפט או ההוצאה לפועל) בלי המתנה משמעותית.', color: colors.successSoft };
  }
  if (mbps >= 3) {
    return { text: 'מהירות בינונית - קבצים גדולים או הרבה קבצים ביחד עשויים לקחת זמן ניכר להורדה.', color: colors.warningSoft };
  }
  return { text: 'מהירות נמוכה - צפויה המתנה ארוכה בהורדת קבצים כבדים. זו כנראה הסיבה האמיתית לתחושת האיטיות, לא תקלה אצלנו.', color: colors.dangerSoft };
}

// X מתוך 5 ניסיונות נכשלו - חשוב בדיוק כמו המהירות עצמה: הורדה של קובץ
// ענק נמשכת שעות, ואם כבר עכשיו, בבדיקה של כמה שניות, יש ניתוקים - הסיכוי
// לניתוק גם באמצע הורדה ארוכה אמיתי, לא רק תיאורטי
function describeReliability(result: DownloadReliabilityResult): { text: string; color: string } | null {
  const failures = result.totalAttempts - result.successCount;
  if (failures === 0) return null;

  return {
    text: `זוהו ניתוקים בבדיקה עצמה (${failures} מתוך ${result.totalAttempts} ניסיונות נכשלו) - יש סיכוי ממשי לניתוק גם באמצע הורדה ארוכה של קובץ גדול.`,
    color: colors.warningSoft,
  };
}

// Healthy/Degraded/Down/Unknown - ראו GatewayDiagnosticResult בבקאנד
function describeGatewayStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'Healthy':
      return { label: 'נט המשפט מגיב כצפוי', color: colors.successSoft };
    case 'Degraded':
      return { label: 'נט המשפט מגיב, אך באיטיות/בשגיאה', color: colors.warningSoft };
    case 'Down':
      return { label: 'נט המשפט לא מגיב בכלל כרגע', color: colors.dangerSoft };
    default:
      return { label: 'לא ניתן לקבוע סטטוס כרגע', color: colors.textMuted };
  }
}

const ActionButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      backgroundColor: disabled ? colors.cardHover : colors.accent,
      color: '#fff',
      border: 'none',
      borderRadius: radius.sm,
      padding: '9px 18px',
      fontSize: '13.5px',
      fontWeight: 600,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.7 : 1,
    }}
  >
    {children}
  </button>
);

const NetworkDiagnosticsPage: React.FC = () => {
  const [speedTest, setSpeedTest] = useState<AsyncState<DownloadReliabilityResult>>({ status: 'idle' });
  const [gatewayCheck, setGatewayCheck] = useState<AsyncState<GatewayDiagnosticResult>>({ status: 'idle' });

  const runSpeedTest = async () => {
    setSpeedTest({ status: 'loading' });
    try {
      const result = await measureDownloadReliability();
      if (result.avgMbps === null) {
        setSpeedTest({ status: 'error', message: 'כל ניסיונות הבדיקה נכשלו - ייתכן שהחיבור מנותק כרגע.' });
        return;
      }
      setSpeedTest({ status: 'done', data: result });
    } catch (err: any) {
      setSpeedTest({ status: 'error', message: err?.message || 'בדיקת המהירות נכשלה' });
    }
  };

  const runGatewayCheck = async () => {
    setGatewayCheck({ status: 'loading' });
    try {
      const data = await telemetryService.getNetMishpatStatus();
      setGatewayCheck({ status: 'done', data });
    } catch (err: any) {
      setGatewayCheck({ status: 'error', message: err?.message || 'בדיקת נט המשפט נכשלה' });
    }
  };

  // מעקב חי - רץ כל MONITOR_INTERVAL_MS, מתועד כ-useEffect (לא לולאה ידנית)
  // כדי שה-cleanup (עצירה) יקרה אוטומטית גם אם המשתמש פשוט עוזב את הדף,
  // לא רק בלחיצה מפורשת על "עצור"
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [liveLog, setLiveLog] = useState<LiveLogEntry[]>([]);

  useEffect(() => {
    if (!isMonitoring) return;

    let cancelled = false;
    let tickCount = 0;

    const tick = async () => {
      const [downloadResult, gatewayResult] = await Promise.allSettled([
        monitorPingOnce(),
        telemetryService.getNetMishpatStatus(),
      ]);
      if (cancelled) return;

      const mbps = downloadResult.status === 'fulfilled' && downloadResult.value.success ? downloadResult.value.mbps : null;
      const netMishpatStatus = gatewayResult.status === 'fulfilled' ? gatewayResult.value.status : null;

      setLiveLog((prev) => [...prev, { time: new Date().toLocaleTimeString('he-IL'), mbps, netMishpatStatus }]);

      tickCount += 1;
      if (tickCount >= MAX_MONITOR_TICKS) {
        setIsMonitoring(false);
      }
    };

    tick();
    const intervalId = setInterval(tick, MONITOR_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isMonitoring]);

  const toggleMonitoring = () => {
    if (!isMonitoring) setLiveLog([]);
    setIsMonitoring((prev) => !prev);
  };

  return (
    <section>
      <SectionHeader
        title="בדיקת רשת ואינטרנט"
        subtitle="בדיקות עצמאיות שעוזרות להבין אם איטיות בהורדת קבצים (למשל מנט המשפט) קשורה לחיבור שלכם, או למערכת החיצונית."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing.lg }}>
        <Card title="מהירות וחוזק החיבור להורדת קבצים">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6 }}>
            מורידה קובץ בדיקה (5MB) כמה פעמים ברצף, כדי למדוד גם מהירות וגם יציבות - בדיוק מה שמשפיע על הורדת תיקים גדולים וארוכות-זמן.
          </p>

          <ActionButton onClick={runSpeedTest} disabled={speedTest.status === 'loading'}>
            {speedTest.status === 'loading' ? 'בודק...' : 'בדוק מהירות וחוזק חיבור'}
          </ActionButton>

          {speedTest.status === 'loading' && (
            <p style={{ marginTop: '12px', fontSize: '12.5px', color: colors.textMuted }}>
              מוריד קובץ בדיקה כמה פעמים ברצף...
            </p>
          )}
          {speedTest.status === 'error' && (
            <p style={{ marginTop: '12px', fontSize: '12.5px', color: colors.dangerSoft }}>{speedTest.message}</p>
          )}
          {speedTest.status === 'done' && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 12px',
                backgroundColor: colors.surface,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: radius.sm,
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary, marginBottom: '2px' }}>
                {speedTest.data.avgMbps!.toFixed(1)} Mbps (ממוצע)
              </div>
              <div style={{ fontSize: '11.5px', color: colors.textMuted, marginBottom: '8px' }}>
                {speedTest.data.successCount} מתוך {speedTest.data.totalAttempts} ניסיונות הצליחו
              </div>
              <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: describeDownloadSpeed(speedTest.data.avgMbps!).color, marginBottom: '10px' }}>
                {describeDownloadSpeed(speedTest.data.avgMbps!).text}
              </div>

              {describeReliability(speedTest.data) && (
                <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: describeReliability(speedTest.data)!.color, marginBottom: '12px' }}>
                  ⚠️ {describeReliability(speedTest.data)!.text}
                </div>
              )}

              <div style={{ borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: '10px' }}>
                <div style={{ fontSize: '11.5px', color: colors.textMuted, marginBottom: '6px' }}>
                  זמן הורדה משוער, לפי המהירות שנמדדה:
                </div>
                <div style={{ display: 'grid', gap: '4px' }}>
                  {FILE_SIZE_PRESETS.map((preset) => (
                    <div key={preset.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: colors.textSecondary }}>{preset.label}</span>
                      <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                        {formatDuration(estimateDownloadTimeMs(preset.bytes, speedTest.data.avgMbps!))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="סטטוס נט המשפט">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6 }}>
            בודקת אם מערכת נט המשפט (court.gov.il) מגיבה כרגע, כדי להבדיל בין "האינטרנט שלי איטי" לבין "המערכת הממשלתית עצמה איטית/לא זמינה".
          </p>

          <ActionButton onClick={runGatewayCheck} disabled={gatewayCheck.status === 'loading'}>
            {gatewayCheck.status === 'loading' ? 'בודק...' : 'בדוק את נט המשפט'}
          </ActionButton>

          {gatewayCheck.status === 'loading' && (
            <p style={{ marginTop: '12px', fontSize: '12.5px', color: colors.textMuted }}>פונה לנט המשפט...</p>
          )}
          {gatewayCheck.status === 'error' && (
            <p style={{ marginTop: '12px', fontSize: '12.5px', color: colors.dangerSoft }}>{gatewayCheck.message}</p>
          )}
          {gatewayCheck.status === 'done' && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 12px',
                backgroundColor: colors.surface,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: radius.sm,
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: describeGatewayStatus(gatewayCheck.data.status).color }}>
                {describeGatewayStatus(gatewayCheck.data.status).label}
              </div>
              <div style={{ fontSize: '12.5px', color: colors.textMuted }}>
                זמן תגובה: {gatewayCheck.data.latencyMs}ms · קוד HTTP: {gatewayCheck.data.httpCode}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: spacing.lg }}>
        <Card title="מעקב חי לאורך זמן">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6 }}>
            הפעילו את זה בלשונית נפרדת, במקביל להורדה אמיתית מנט המשפט. כל 10 שניות נבדוק גם את מהירות החיבור וגם את זמינות נט המשפט -
            כדי לראות בדיוק <strong>מתי</strong> משהו השתנה, אם בכלל, במקום רק לדעת שמשהו "נתקע" בסוף.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <ActionButton onClick={toggleMonitoring}>
              {isMonitoring ? 'עצור מעקב' : 'התחל מעקב חי'}
            </ActionButton>
            {isMonitoring && (
              <span style={{ fontSize: '12.5px', color: colors.warningSoft }}>
                ● עוקב... (עצירה אוטומטית אחרי 30 דקות)
              </span>
            )}
          </div>

          {liveLog.length > 0 && (
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: radius.sm,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: colors.surface, position: 'sticky', top: 0 }}>
                    <th style={{ textAlign: 'right', padding: '8px 10px', color: colors.textMuted, fontWeight: 600 }}>שעה</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', color: colors.textMuted, fontWeight: 600 }}>מהירות חיבור</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', color: colors.textMuted, fontWeight: 600 }}>נט המשפט</th>
                  </tr>
                </thead>
                <tbody>
                  {liveLog.map((entry, i) => {
                    const connectionOk = entry.mbps !== null;
                    const gatewayOk = entry.netMishpatStatus === 'Healthy';
                    return (
                      <tr key={i} style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
                        <td style={{ padding: '6px 10px', color: colors.textMuted }}>{entry.time}</td>
                        <td style={{ padding: '6px 10px', color: connectionOk ? colors.successSoft : colors.dangerSoft, fontWeight: 600 }}>
                          {connectionOk ? `${entry.mbps!.toFixed(1)} Mbps` : 'אין תגובה'}
                        </td>
                        <td style={{ padding: '6px 10px', color: gatewayOk ? colors.successSoft : entry.netMishpatStatus ? colors.warningSoft : colors.textMuted, fontWeight: 600 }}>
                          {entry.netMishpatStatus ? describeGatewayStatus(entry.netMishpatStatus).label : 'לא ידוע'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default NetworkDiagnosticsPage;
