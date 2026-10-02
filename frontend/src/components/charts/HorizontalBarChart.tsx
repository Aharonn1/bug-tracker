import React from 'react';
import { colors } from '../../styles/theme';

interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number }>;
  barColor?: string;
}

// גרף עמודות אופקי פשוט - SVG טהור, בלי תלות חיצונית. מספיק לרשימות
// מדורגות קצרות (פילוח לפי משתמש, לפי מערכת וכו')
export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, barColor }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              minWidth: '110px',
              maxWidth: '110px',
              fontSize: '13px',
              color: colors.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={d.label}
          >
            {d.label}
          </span>
          <div style={{ flex: 1, background: colors.surface, borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${max > 0 ? (d.value / max) * 100 : 0}%`,
                height: '100%',
                background: barColor ?? `linear-gradient(90deg, ${colors.accent}, ${colors.violet})`,
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span
            style={{
              minWidth: '28px',
              fontSize: '13px',
              fontWeight: 700,
              color: colors.textPrimary,
              textAlign: 'left',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default HorizontalBarChart;
