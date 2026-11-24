import React from 'react';
import { colors, radius, spacing } from '../../styles/theme';

export type MetricSource = 'cloud' | 'code' | 'backend' | 'frontend' | 'gap';

export interface MetricExplain {
  source: MetricSource;
  body: string[];
  // שאלות שהמנכ"ל עשוי לשאול על הכרטיס הזה בהצגה, עם תשובה קצרה מוכנה -
  // אופציונלי, לשימוש בעיקר בעמוד אבטחה ואמון
  qa?: { q: string; a: string }[];
}

interface Props extends MetricExplain {
  title: string;
  onClose: () => void;
}

const SOURCE_BADGE: Record<MetricSource, { text: string; color: string }> = {
  cloud: { text: '☁️ מגיע ישירות מהענן (Azure)', color: colors.accentSoft },
  code: { text: '💻 מחושב בקוד (בדפדפן/בשרת שלנו)', color: colors.successSoft },
  backend: { text: '🛠️ נאכף בקוד השרת (Backend)', color: colors.violet },
  frontend: { text: '🖥️ מוגדר בצד הלקוח (Frontend)', color: '#f472b6' },
  // "פער" - לשימוש כן וישר כשתיאור כרטיס מתאר משהו שעדיין לא ממומש
  // במלואו, במקום להמציא הסבר טכני לדבר שלא קיים
  gap: { text: '⚠️ פער ידוע - לא ממומש במלואו', color: colors.warningSoft },
};

// מודאל הסבר גנרי - "מה קורה מאחורי הקלעים" לכל מדד בדשבורד. נבנה פעם
// אחת, מוזן בתוכן שונה לכל כרטיס/גרף דרך metricExplanations.ts
export const MetricInfoModal: React.FC<Props> = ({ title, source, body, qa, onClose }) => {
  const badge = SOURCE_BADGE[source];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          maxWidth: '440px',
          width: '100%',
          padding: spacing.xl,
          boxSizing: 'border-box',
          direction: 'rtl',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="סגור"
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <span
          style={{
            display: 'inline-block',
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: colors.surfaceRaised,
            color: badge.color,
            marginBottom: '14px',
          }}
        >
          {badge.text}
        </span>

        {body.map((paragraph, i) => (
          <p
            key={i}
            style={{
              margin: i === 0 ? 0 : '10px 0 0 0',
              fontSize: '13px',
              lineHeight: 1.6,
              color: colors.textSecondary,
            }}
          >
            {paragraph}
          </p>
        ))}

        {qa && qa.length > 0 && (
          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: colors.textFaint, marginBottom: '10px' }}>
              שאלות שהמנכ"ל עשוי לשאול על זה
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {qa.map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: colors.textPrimary, marginBottom: '3px' }}>
                    ש: {item.q}
                  </div>
                  <div style={{ fontSize: '12.5px', color: colors.textMuted, lineHeight: 1.6 }}>
                    ת: {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricInfoModal;
