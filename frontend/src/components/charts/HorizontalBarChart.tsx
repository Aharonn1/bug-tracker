import React, { useState } from 'react';
import { colors } from '../../styles/theme';

interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number }>;
  barColor?: string;
  selectedLabel?: string | null;
  onBarClick?: (label: string) => void;
}

// גרף עמודות אופקי פשוט - SVG טהור, בלי תלות חיצונית. מספיק לרשימות
// מדורגות קצרות (פילוח לפי משתמש, לפי מערכת וכו'). שורה מתחת לעכבר
// מודגשת ומגדילה את העמודה, ולחיצה על שורה (אם onBarClick סופק) בוחרת
// אותה בצורה קבועה - לא רק בזמן ה-hover
export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, barColor, selectedLabel, onBarClick }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));
  const clickable = !!onBarClick;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {data.map((d) => {
        const isHovered = hovered === d.label;
        const isSelected = selectedLabel === d.label;
        const emphasized = isHovered || isSelected;
        return (
          <div
            key={d.label}
            onMouseEnter={() => setHovered(d.label)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onBarClick?.(d.label)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '4px 8px',
              margin: '0 -8px',
              borderRadius: '8px',
              cursor: clickable ? 'pointer' : 'default',
              backgroundColor: isSelected ? colors.cardHover : isHovered ? colors.card : 'transparent',
              border: isSelected ? `1px solid ${colors.accentSoft}` : '1px solid transparent',
              transition: 'background-color 0.12s ease, border-color 0.12s ease',
            }}
          >
            <span
              style={{
                minWidth: '110px',
                maxWidth: '110px',
                fontSize: '13px',
                color: emphasized ? colors.textPrimary : colors.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: emphasized ? 700 : 400,
                transition: 'color 0.12s ease',
              }}
              title={d.label}
            >
              {d.label}
            </span>
            <div style={{ flex: 1, background: colors.surface, borderRadius: '999px', height: emphasized ? '13px' : '10px', overflow: 'hidden', transition: 'height 0.12s ease' }}>
              <div
                style={{
                  width: `${max > 0 ? (d.value / max) * 100 : 0}%`,
                  height: '100%',
                  background: barColor ?? `linear-gradient(90deg, ${colors.accent}, ${colors.violet})`,
                  borderRadius: '999px',
                  transition: 'width 0.4s ease, filter 0.12s ease',
                  filter: emphasized ? 'brightness(1.25)' : 'none',
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
        );
      })}
    </div>
  );
};

export default HorizontalBarChart;
