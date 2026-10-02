import React, { useState } from 'react';
import { colors } from '../../styles/theme';

interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number }>;
  barColor?: string;
}

// גרף עמודות אופקי פשוט - SVG טהור, בלי תלות חיצונית. מספיק לרשימות
// מדורגות קצרות (פילוח לפי משתמש, לפי מערכת וכו'). שורה מתחת לעכבר
// מודגשת ומגדילה את העמודה כדי שהגרף ירגיש אינטראקטיבי
export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, barColor }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {data.map((d) => {
        const isHovered = hovered === d.label;
        return (
          <div
            key={d.label}
            onMouseEnter={() => setHovered(d.label)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '4px 8px',
              margin: '0 -8px',
              borderRadius: '8px',
              cursor: 'default',
              backgroundColor: isHovered ? colors.cardHover : 'transparent',
              transition: 'background-color 0.12s ease',
            }}
          >
            <span
              style={{
                minWidth: '110px',
                maxWidth: '110px',
                fontSize: '13px',
                color: isHovered ? colors.textPrimary : colors.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: isHovered ? 700 : 400,
                transition: 'color 0.12s ease',
              }}
              title={d.label}
            >
              {d.label}
            </span>
            <div style={{ flex: 1, background: colors.surface, borderRadius: '999px', height: isHovered ? '13px' : '10px', overflow: 'hidden', transition: 'height 0.12s ease' }}>
              <div
                style={{
                  width: `${max > 0 ? (d.value / max) * 100 : 0}%`,
                  height: '100%',
                  background: barColor ?? `linear-gradient(90deg, ${colors.accent}, ${colors.violet})`,
                  borderRadius: '999px',
                  transition: 'width 0.4s ease, filter 0.12s ease',
                  filter: isHovered ? 'brightness(1.25)' : 'none',
                }}
              />
            </div>
            <span
              style={{
                minWidth: '28px',
                fontSize: '13px',
                fontWeight: 700,
                color: isHovered ? colors.textPrimary : colors.textPrimary,
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
