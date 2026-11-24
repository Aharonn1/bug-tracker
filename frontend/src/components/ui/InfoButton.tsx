import React from 'react';
import { colors } from '../../styles/theme';

interface Props {
  onClick: () => void;
  label?: string;
}

// כפתור "i" קטן - פותח הסבר "מה עומד מאחורי המספר הזה" (ענן/קוד). עוצר
// את ה-event מלהמשיך כדי לא להתנגש עם לחיצות-סינון קיימות על אותו כרטיס
// (לדוגמה: לחיצה על פלח בדונאט, או על עמודה בגרף המשתמשים)
export const InfoButton: React.FC<Props> = ({ onClick, label = 'מה עומד מאחורי המספר הזה' }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
    title={label}
    style={{
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      border: `1px solid ${colors.border}`,
      background: 'transparent',
      color: colors.textMuted,
      fontSize: '11px',
      fontWeight: 700,
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      lineHeight: 1,
      flexShrink: 0,
      padding: 0,
    }}
  >
    i
  </button>
);

export default InfoButton;
