import React, { useState } from 'react';
import { colors, radius, spacing } from '../styles/theme';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { measureDownloadReliability, estimateDownloadTimeMs, formatDuration, type DownloadReliabilityResult } from '../utils/measureDownloadSpeed';
import { telemetryService } from '../api/telemetryService';
import type { GatewayDiagnosticResult } from '../types/telemetry.types';

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
    </section>
  );
};

export default NetworkDiagnosticsPage;
