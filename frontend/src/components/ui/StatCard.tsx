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
}

// אריח מדד בודד - משמש גם ב-KeyMetricsRow וגם ב-OpsSummaryPanel, כדי
// שלכל המספרים הגדולים בדשבורד יהיה אותו מראה בדיוק. explain אופציונלי -
// כשמוגדר, מופיע כפתור "i" שפותח הסבר "מה עומד מאחורי המספר הזה"
export const StatCard: React.FC<StatCardProps> = ({ label, value, valueColor = colors.textPrimary, hint, explain }) => {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
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
        position: 'relative',
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
