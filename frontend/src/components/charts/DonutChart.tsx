import React from 'react';
import { colors } from '../../styles/theme';

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
}

// דונאט SVG טהור - כל פלח מחושב כקשת (arc) לפי חלקו היחסי מהסכום הכולל
export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 140, thickness = 22 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offsetAccum = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${center} ${center})`}>
          {total === 0 ? (
            <circle cx={center} cy={center} r={radius} fill="none" stroke={colors.surface} strokeWidth={thickness} />
          ) : (
            data.map((d) => {
              if (d.value === 0) return null;
              const fraction = d.value / total;
              const dash = fraction * circumference;
              const gap = circumference - dash;
              const circle = (
                <circle
                  key={d.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-offsetAccum}
                  strokeLinecap="butt"
                />
              );
              offsetAccum += dash;
              return circle;
            })
          )}
        </g>
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="22"
          fontWeight={700}
          fill={colors.textPrimary}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {total}
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.color, flexShrink: 0 }} />
            <span style={{ color: colors.textSecondary }}>{d.label}</span>
            <span style={{ color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
