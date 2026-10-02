import React from 'react';
import { useVersionCheck } from '../hooks/useVersionCheck';
import { colors, radius } from '../styles/theme';

// מוצג כשהטאב הפתוח טוען גרסה ישנה מזו שכרגע פרוסה בשרת (אחרי דיפלוי
// חדש). שונה מתקלה - לא מדווח כאירוע, רק מציע רענון כדי למנוע שגיאות
// JS מוזרות שנובעות מבאנדל ישן (קובץ שכבר לא קיים בשרת וכו')
export const NewVersionBanner: React.FC = () => {
  const hasNewVersion = useVersionCheck();

  if (!hasNewVersion) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: colors.surfaceRaised,
        border: `1px solid ${colors.accentSoft}`,
        borderRadius: radius.md,
        marginBottom: '20px',
      }}
    >
      <span style={{ fontSize: '18px', flexShrink: 0 }}>🆕</span>
      <div style={{ flex: 1, fontSize: '13px', color: colors.textSecondary }}>
        גרסה חדשה של המערכת זמינה. מומלץ לרענן את הדף כדי להימנע משגיאות שעלולות להיגרם מגרסה ישנה בדפדפן.
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          flexShrink: 0,
          padding: '7px 14px',
          background: colors.accent,
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '12px',
        }}
      >
        רענון עכשיו ↻
      </button>
    </div>
  );
};

export default NewVersionBanner;
