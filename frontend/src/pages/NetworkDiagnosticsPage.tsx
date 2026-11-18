import React, { useState } from 'react';
import { colors, radius, spacing } from '../styles/theme';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { measureDownloadSpeedMbps } from '../utils/measureDownloadSpeed';
import { telemetryService } from '../api/telemetryService';
import type { GatewayDiagnosticResult } from '../types/telemetry.types';

type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: T }
  | { status: 'error'; message: string };

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
  const [speedTest, setSpeedTest] = useState<AsyncState<{ mbps: number }>>({ status: 'idle' });
  const [gatewayCheck, setGatewayCheck] = useState<AsyncState<GatewayDiagnosticResult>>({ status: 'idle' });

  const runSpeedTest = async () => {
    setSpeedTest({ status: 'loading' });
    try {
      const { mbps } = await measureDownloadSpeedMbps();
      setSpeedTest({ status: 'done', data: { mbps } });
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
        <Card title="מהירות הורדה בפועל">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6 }}>
            מורידה קובץ בדיקה (5MB) מהאתר הזה ומודדת כמה זמן זה באמת לוקח - לא רק זמן תגובה (ping), אלא מהירות הורדה אמיתית.
          </p>

          <ActionButton onClick={runSpeedTest} disabled={speedTest.status === 'loading'}>
            {speedTest.status === 'loading' ? 'בודק...' : 'בדוק מהירות הורדה'}
          </ActionButton>

          {speedTest.status === 'loading' && (
            <p style={{ marginTop: '12px', fontSize: '12.5px', color: colors.textMuted }}>
              מוריד קובץ בדיקה (5MB)...
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
              <div style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary, marginBottom: '4px' }}>
                {speedTest.data.mbps.toFixed(1)} Mbps
              </div>
              <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: describeDownloadSpeed(speedTest.data.mbps).color }}>
                {describeDownloadSpeed(speedTest.data.mbps).text}
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
