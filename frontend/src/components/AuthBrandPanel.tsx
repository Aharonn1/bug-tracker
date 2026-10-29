import React from 'react';
import { colors } from '../styles/theme';

// לא תמונה חיצונית בכוונה - ה-CSP של האתר (img-src 'self') חוסם תמונות
// ממקור חיצוני, וזו בחירה אבטחתית שלא כדאי לרופף רק בשביל קישוט מסך
// הכניסה. SVG/CSS מצוירים בעצמנו עונים גם על "מרשים" וגם נשארים מהמקור
// שלנו בלבד - ועם אנימציה, יש כאן תחושת "חי" גם בלי קובץ וידאו אמיתי

export const AuthBrandPanel: React.FC = () => (
  <div className="auth-brand-panel" style={{ position: 'relative', overflow: 'hidden' }}>
    <style>{`
      .auth-brand-panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 32px;
        flex: 1 1 50%;
        padding: 48px 40px;
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

    <div
      style={{
        position: 'relative',
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
      }}
    >
      <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.accentSoft, display: 'inline-block' }} />
      מערכת פעילה
    </div>

    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, lineHeight: 1.3, textWrap: 'balance' as any, color: colors.textPrimary, position: 'relative' }}>
      ניטור תקריות חכם
      <br />
      למשרדי עורכי דין
    </h1>

    {/* "פס דופק" חי - מדמה גרף ניטור בזמן אמת, אנימציה רציפה */}
    <svg viewBox="0 0 400 80" style={{ width: '100%', maxWidth: '320px', height: '64px', position: 'relative' }} preserveAspectRatio="none">
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
  </div>
);

export default AuthBrandPanel;
