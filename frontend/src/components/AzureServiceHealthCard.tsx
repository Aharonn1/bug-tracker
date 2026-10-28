import React from 'react';
import { useAzureServiceHealth } from '../hooks/useAzureServiceHealth';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';

// שונה מהותית מ-AzureAppServiceHealthCard/AzureSqlHealthCard - אלה בודקים
// "האם המשאב שלנו מגיב" (מדדים שנגזרים מהמשאב עצמו). זה בודק "האם ל-Azure
// עצמו יש תקלה מוכרזת" (Service Health) - עובדה שמיקרוסופט מפרסמת, לא
// משהו שנגזר. בדיוק ההבדל בין "זה אנחנו" ל"זה אז'ור" כשמאבחנים תקרית
export const AzureServiceHealthCard: React.FC = () => {
  const { health, loading, error, reload } = useAzureServiceHealth();

  return (
    <Card
      title="Azure Service Health - תקלות מוכרזות של מיקרוסופט"
      action={
        <button
          onClick={reload}
          disabled={loading}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textMuted,
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'טוען...' : 'רענן'}
        </button>
      }
    >
      {error ? (
        <div style={{ color: colors.dangerSoft, fontSize: '13px' }}>
          שגיאה בבדיקת Azure Service Health: {error}
        </div>
      ) : loading && !health ? (
        <div style={{ color: colors.textFaint, fontSize: '13px' }}>טוען...</div>
      ) : !health ? (
        <div style={{ color: colors.textFaint, fontSize: '13px' }}>
          Azure Service Health לא מוגדר כרגע (חסרה הרשאת Reader על ה-subscription, או שהפרטים עדיין לא הוגדרו ב-App Settings).
        </div>
      ) : health.activeEvents.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: colors.successBg,
            border: `1px solid ${colors.success}`,
          }}
        >
          <span style={{ fontSize: '16px' }}>✓</span>
          <span style={{ fontSize: '13.5px', color: colors.successSoft }}>
            אין תקלות מוכרזות של Azure כרגע באזור/בשירותים שלנו
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {health.activeEvents.map((ev, i) => (
            <div
              key={i}
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: colors.dangerBg,
                border: `1px solid ${colors.dangerBorder}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: colors.dangerSoft }}>{ev.title}</span>
                <span style={{ fontSize: '11px', color: colors.textFaint }}>{ev.eventType}</span>
              </div>
              {ev.summary && (
                <div style={{ fontSize: '12.5px', color: colors.textMuted, marginBottom: '6px' }}>{ev.summary}</div>
              )}
              {ev.impactedServices.length > 0 && (
                <div style={{ fontSize: '11.5px', color: colors.textFaint }}>
                  שירותים מושפעים: {ev.impactedServices.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '11px', color: colors.textFaint, marginTop: '14px', lineHeight: 1.6 }}>
        זה לא מדד שנגזר מהמשאבים שלנו - זו הכרזת תקלה רשמית של מיקרוסופט ברמת ה-subscription/אזור. כשתקרית נחקרת על ידי סוכן ה-RCA, המידע הזה מוזרק אוטומטית לניתוח שלו, כדי שהוא יוכל להבדיל בין "באג אצלנו" לבין "תקלת תשתית של Azure עצמו".
      </div>
    </Card>
  );
};

export default AzureServiceHealthCard;
