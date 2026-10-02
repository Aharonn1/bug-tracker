import React from 'react';
import { colors } from '../../styles/theme';

interface TrendAreaChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
}

// גרף שטח (area) פשוט למגמה לאורך זמן - SVG טהור. מניח שה-data כבר ממוין
// כרונולוגית
export const TrendAreaChart: React.FC<TrendAreaChartProps> = ({ data, height = 110, color = colors.accentSoft }) => {
  if (data.length === 0) {
    return <div style={{ color: colors.textFaint, fontSize: '13px' }}>אין מספיק נתונים להצגת מגמה</div>;
  }

  const width = 100; // יחידות יחסיות - ה-viewBox עושה scale אוטומטי לרוחב הזמין
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : width / 2;
    const y = height - (d.value / max) * (height - 16) - 4;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: `${height}px`, display: 'block' }}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trendFill)" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={1.8} fill={color} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '11px', color: colors.textFaint }}>{data[0].label}</span>
        <span style={{ fontSize: '11px', color: colors.textFaint }}>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
};

export default TrendAreaChart;
