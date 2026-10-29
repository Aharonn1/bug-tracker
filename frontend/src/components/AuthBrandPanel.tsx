import React from 'react';
import { colors } from '../styles/theme';

// לא תמונה חיצונית בכוונה - ה-CSP של האתר (img-src 'self') חוסם תמונות
// ממקור חיצוני, וזו בחירה אבטחתית שלא כדאי לרופף רק בשביל קישוט מסך
// הכניסה. SVG/CSS מצוירים בעצמנו עונים גם על "מרשים" וגם נשארים מהמקור
// שלנו בלבד - ועם אנימציה, יש כאן תחושת "חי" גם בלי קובץ וידאו אמיתי
const FEATURES = [
  { label: 'בידוד מלא בין לקוחות', icon: '🔒' },
  { label: 'סוכן AI לחקירת תקלות', icon: '🧭' },
  { label: 'ניטור Azure בזמן אמת', icon: '📡' },
];

export const AuthBrandPanel: React.FC = () => (
  <div className="auth-brand-panel" style={{ position: 'relative', overflow: 'hidden' }}>
    <style>{`
      .auth-brand-panel {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 28px;
        flex: 1 1 50%;
        max-width: 560px;
        padding: 56px 48px;
        background: linear-gradient(160deg, #0b0f19 0%, #0f1a33 55%, #131033 100%);
        color: ${colors.textPrimary};
      }
      @media (max-width: 860px) {
        .auth-brand-panel { display: none; }
      }
      @keyframes pulse-dash {
        to { stroke-dashoffset: -200; }
      }
      @keyframes pulse-dot {
        0%, 100% { opacity: 0.35; transform: scale(0.9); }
        50% { opacity: 1; transform: scale(1.15); }
      }
      .pulse-line { animation: pulse-dash 6s linear infinite; }
      .pulse-dot { animation: pulse-dot 2.4s ease-in-out infinite; transform-origin: center; }
    `}</style>

    {/* רשת דקה ברקע - תחושת "דשבורד", לא רק רקע ריק */}
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="authGrid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 L 0 0 0 36" fill="none" stroke={colors.border} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#authGrid)" />
    </svg>

    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: colors.accentSoft,
          backgroundColor: 'rgba(56,189,248,0.12)',
          border: `1px solid rgba(56,189,248,0.3)`,
          padding: '5px 12px',
          borderRadius: '999px',
          marginBottom: '22px',
        }}
      >
        <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.accentSoft, display: 'inline-block' }} />
        מערכת פעילה
      </div>

      <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, lineHeight: 1.3, textWrap: 'balance' as any, color: colors.textPrimary }}>
        ניטור תקריות חכם
        <br />
        למשרדי עורכי דין
      </h1>
      <p style={{ margin: '14px 0 0', fontSize: '15px', color: colors.textMuted, lineHeight: 1.7, maxWidth: '420px' }}>
        זיהוי תקלות בזמן אמת, חקירת שורש-הבעיה בעזרת AI, ובידוד נתונים מלא בין כל לקוח ולקוח - הכול במקום אחד.
      </p>
    </div>

    {/* "פס דופק" חי - מדמה גרף ניטור בזמן אמת, אנימציה רציפה */}
    <svg viewBox="0 0 400 80" style={{ width: '100%', height: '72px', position: 'relative' }} preserveAspectRatio="none">
      <polyline
        className="pulse-line"
        points="0,40 40,40 55,15 70,65 85,40 140,40 155,25 170,55 185,40 400,40"
        fill="none"
        stroke={colors.accentSoft}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 6"
        opacity={0.85}
      />
      <circle cx="185" cy="40" r="4" fill={colors.accentSoft} className="pulse-dot" />
    </svg>

    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {FEATURES.map((f) => (
        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: colors.textSecondary }}>
          <span
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            {f.icon}
          </span>
          {f.label}
        </div>
      ))}
    </div>
  </div>
);

export default AuthBrandPanel;
