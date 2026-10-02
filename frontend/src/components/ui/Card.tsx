import React from 'react';
import { colors, radius, spacing } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  padded?: boolean;
  style?: React.CSSProperties;
}

// מעטפת כרטיס אחידה - כל אזור בדשבורד (טבלה, גרף, סיכום) משתמש באותו
// מסגרת/רקע/רדיוס, כדי שהעמוד ייראה כמערכת אחת ולא כמדבקות שונות
export const Card: React.FC<CardProps> = ({ children, title, action, padded = true, style }) => (
  <div
    style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...style,
    }}
  >
    {title && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing.md} ${spacing.lg}`,
          borderBottom: `1px solid ${colors.borderSubtle}`,
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textSecondary }}>{title}</span>
        {action}
      </div>
    )}
    <div style={{ padding: padded ? spacing.lg : 0 }}>{children}</div>
  </div>
);

export default Card;
