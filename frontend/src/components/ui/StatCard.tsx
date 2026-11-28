import React, { useState } from 'react';
import { colors, radius, spacing } from '../../styles/theme';
import { InfoButton } from './InfoButton';
import { MetricInfoModal, type MetricExplain } from './MetricInfoModal';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  hint?: string;
  explain?: MetricExplain;
  onClick?: () => void;
  active?: boolean;
}

// אריח מדד בודד - משמש גם ב-KeyMetricsRow וגם ב-OpsSummaryPanel, כדי
// שלכל המספרים הגדולים בדשבורד יהיה אותו מראה בדיוק. explain אופציונלי -
// כשמוגדר, מופיע כפתור "i" שפותח הסבר "מה עומד מאחורי המספר הזה". onClick
// אופציונלי - כשמוגדר, הכרטיס הופך לבר-לחיצה (למשל כדי לסנן טבלה למטה
// לפי הכרטיס הזה בלבד); active מסמן ויזואלית שזה הסינון הפעיל כרגע
export const StatCard: React.FC<StatCardProps> = ({ label, value, valueColor = colors.textPrimary, hint, explain, onClick, active }) => {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{
        background: colors.card,
        padding: `${spacing.lg} ${spacing.xl}`,
        borderRadius: radius.lg,
        border: `1px solid ${active ? colors.accent : colors.border}`,
        boxShadow: active ? `0 0 0 1px ${colors.accent}` : undefined,
        flex: '1',
        minWidth: '180px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'relative',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {explain && (
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <InfoButton onClick={() => setInfoOpen(true)} />
        </div>
      )}
      <span style={{ fontSize: '13px', color: colors.textMuted }}>{label}</span>
      <strong style={{ fontSize: '26px', color: valueColor, fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
      {hint && <span style={{ fontSize: '11px', color: colors.textFaint }}>{hint}</span>}
      {explain && infoOpen && (
        <MetricInfoModal title={label} source={explain.source} body={explain.body} onClose={() => setInfoOpen(false)} />
      )}
    </div>
  );
};

export default StatCard;
