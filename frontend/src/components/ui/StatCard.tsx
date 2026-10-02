import React from 'react';
import { colors, radius, spacing } from '../../styles/theme';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  hint?: string;
}

// אריח מדד בודד - משמש גם ב-KeyMetricsRow וגם ב-OpsSummaryPanel, כדי
// שלכל המספרים הגדולים בדשבורד יהיה אותו מראה בדיוק
export const StatCard: React.FC<StatCardProps> = ({ label, value, valueColor = colors.textPrimary, hint }) => (
  <div
    style={{
      background: colors.card,
      padding: `${spacing.lg} ${spacing.xl}`,
      borderRadius: radius.lg,
      border: `1px solid ${colors.border}`,
      flex: '1',
      minWidth: '180px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}
  >
    <span style={{ fontSize: '13px', color: colors.textMuted }}>{label}</span>
    <strong style={{ fontSize: '26px', color: valueColor, fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
    {hint && <span style={{ fontSize: '11px', color: colors.textFaint }}>{hint}</span>}
  </div>
);

export default StatCard;
