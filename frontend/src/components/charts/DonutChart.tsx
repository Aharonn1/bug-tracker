import React, { useState } from 'react';
import { colors } from '../../styles/theme';

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
  selectedLabel?: string | null;
  onSegmentClick?: (label: string) => void;
}

// דונאט SVG טהור - כל פלח מחושב כקשת (arc) לפי חלקו היחסי מהסכום הכולל.
// מגיב ל-hover: הפלח המרחף מודגש, האחרים מתעממים, והמרכז מציג את הפירוט שלו.
// לחיצה על פלח (אם onSegmentClick סופק) בוחרת אותו בצורה קבועה - לא רק
// בזמן ה-hover
export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 140, thickness = 22, selectedLabel, onSegmentClick }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const clickable = !!onSegmentClick;

  let offsetAccum = 0;
  const active = hovered !== null ? data[hovered] : selectedLabel ? data.find((d) => d.label === selectedLabel) ?? null : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${center} ${center})`}>
          {total === 0 ? (
            <circle cx={center} cy={center} r={radius} fill="none" stroke={colors.surface} strokeWidth={thickness} />
          ) : (
            data.map((d, i) => {
              if (d.value === 0) return null;
              const fraction = d.value / total;
              const dash = fraction * circumference;
              const gap = circumference - dash;
              const isSelected = selectedLabel === d.label;
              const isEmphasized = hovered === i || isSelected;
              const isDimmed = selectedLabel ? !isSelected : hovered !== null && hovered !== i;
              const circle = (
                <circle
                  key={d.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={isEmphasized ? thickness + 4 : thickness}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-offsetAccum}
                  strokeLinecap="butt"
                  opacity={isDimmed ? 0.35 : 1}
                  style={{ cursor: clickable ? 'pointer' : 'default', transition: 'opacity 0.15s ease, stroke-width 0.15s ease' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSegmentClick?.(d.label)}
                />
              );
              offsetAccum += dash;
              return circle;
            })
          )}
        </g>
        <text
          x={center}
          y={center - (active ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={active ? 16 : 22}
          fontWeight={700}
          fill={active ? active.color : colors.textPrimary}
          style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none', transition: 'font-size 0.15s ease' }}
        >
          {active ? active.value : total}
        </text>
        {active && (
          <text
            x={center}
            y={center + 12}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fill={colors.textMuted}
            style={{ pointerEvents: 'none' }}
          >
            {active.label}
          </text>
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((d, i) => {
          const isSelected = selectedLabel === d.label;
          const isDimmed = selectedLabel ? !isSelected : hovered !== null && hovered !== i;
          return (
          <div
            key={d.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSegmentClick?.(d.label)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              cursor: clickable ? 'pointer' : 'default',
              opacity: isDimmed ? 0.45 : 1,
              fontWeight: isSelected ? 700 : 400,
              transition: 'opacity 0.15s ease',
            }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.color, flexShrink: 0, boxShadow: isSelected ? `0 0 0 2px ${colors.textPrimary}33` : 'none' }} />
            <span style={{ color: isSelected ? colors.textPrimary : colors.textSecondary }}>{d.label}</span>
            <span style={{ color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>({d.value})</span>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonutChart;
