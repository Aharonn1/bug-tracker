import React, { useRef, useState } from 'react';
import { colors } from '../../styles/theme';

interface TrendAreaChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
}

// גרף שטח (area) פשוט למגמה לאורך זמן - SVG טהור. מניח שה-data כבר ממוין
// כרונולוגית. מגיב לתזוזת עכבר: מוצא את הנקודה הקרובה ביותר לאצבע/סמן
// ומציג עליה קו הנחיה אנכי וחלונית ערך
export const TrendAreaChart: React.FC<TrendAreaChartProps> = ({ data, height = 110, color = colors.accentSoft }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relativeX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipFlip = hovered && hovered.x > width - 22;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: `${height}px`, display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trendFill)" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />

        {hovered && (
          <line
            x1={hovered.x}
            y1={0}
            x2={hovered.x}
            y2={height}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {points.map((p, i) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r={hoverIndex === i ? 3 : 1.8}
            fill={hoverIndex === i ? colors.textPrimary : color}
            stroke={hoverIndex === i ? color : 'none'}
            strokeWidth={hoverIndex === i ? 1.5 : 0}
            vectorEffect="non-scaling-stroke"
            style={{ transition: 'r 0.1s ease' }}
          />
        ))}
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: tooltipFlip ? undefined : `${hovered.x}%`,
            right: tooltipFlip ? `${100 - hovered.x}%` : undefined,
            transform: tooltipFlip ? 'translateX(8px)' : 'translateX(-50%)',
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            padding: '5px 9px',
            fontSize: '11px',
            color: colors.textPrimary,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
          }}
        >
          <span style={{ color: colors.textMuted }}>{hovered.label}: </span>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{hovered.value}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '11px', color: colors.textFaint }}>{data[0].label}</span>
        <span style={{ fontSize: '11px', color: colors.textFaint }}>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
};

export default TrendAreaChart;
