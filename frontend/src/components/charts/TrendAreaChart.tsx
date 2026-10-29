import React, { useId, useRef, useState } from 'react';
import { colors } from '../../styles/theme';

interface TrendAreaChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  selectedLabel?: string | null;
  onPointClick?: (label: string) => void;
}

// "עגל" את המקסימום לערך נעים לעין (1/2/5 כפול חזקת 10) - אותו אלגוריתם
// קלאסי שכל כלי גרפים רציני משתמש בו, כדי שקווי הרשת לא ייראו כמו מספרים
// אקראיים (למשל 187.4) אלא כמו סולם קריא (0 / 100 / 200)
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * Math.pow(10, exponent);
}

function formatAxisValue(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

// עקומת Catmull-Rom הומרה ל-cubic beziers (tension קבוע 1/6) - קו חלק
// שעדיין עובר בדיוק דרך כל נקודת נתון אמיתית, לא קירוב שמזייף את הערכים
function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// גרף שטח (area) למגמה לאורך זמן - SVG טהור. מניח שה-data כבר ממוין
// כרונולוגית. מגיב לתזוזת עכבר: מוצא את הנקודה הקרובה ביותר לאצבע/סמן
// ומציג עליה קו הנחיה אנכי וחלונית ערך. לחיצה (אם onPointClick סופק)
// בוחרת את הנקודה הקרובה ביותר בצורה קבועה. קווי רשת + ציר Y + תווית
// "ערך נוכחי" קבועה הופכים אותו לקריא גם בלי להעביר עכבר בכלל
export const TrendAreaChart: React.FC<TrendAreaChartProps> = ({ data, height = 110, color = colors.accentSoft, selectedLabel, onPointClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const clickable = !!onPointClick;

  if (data.length === 0) {
    return <div style={{ color: colors.textFaint, fontSize: '13px' }}>אין מספיק נתונים להצגת מגמה</div>;
  }

  const width = 100; // יחידות יחסיות - ה-viewBox עושה scale אוטומטי לרוחב הזמין
  const padTop = 10;
  const padBottom = 18;
  const plotHeight = height - padTop - padBottom;

  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const axisMax = niceCeil(rawMax || 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const yFor = (value: number) => padTop + plotHeight - (value / axisMax) * plotHeight;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : width / 2;
    return { x, y: yFor(d.value), ...d };
  });

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`;

  const gridTicks = [0, axisMax / 2, axisMax];

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

  const handleClick = () => {
    if (hoverIndex !== null) onPointClick?.(points[hoverIndex].label);
  };

  const selectedPoint = selectedLabel ? points.find((p) => p.label === selectedLabel) ?? null : null;
  const hovered = hoverIndex !== null ? points[hoverIndex] : selectedPoint;
  const tooltipFlip = hovered && hovered.x > width - 22;
  const latest = points[points.length - 1];

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          insetInlineEnd: 0,
          fontSize: '11px',
          color: colors.textFaint,
          textAlign: 'end',
          lineHeight: 1.3,
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {formatAxisValue(latest.value)}
        </span>
        <br />
        נוכחי
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: `${height}px`, display: 'block', cursor: clickable ? 'pointer' : 'crosshair' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        onClick={handleClick}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke={colors.borderSubtle}
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : '1.5 2'}
                vectorEffect="non-scaling-stroke"
              />
              <text x={1} y={y - 1.5} fontSize={6.5} fill={colors.textFaint} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatAxisValue(tick)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {(hovered || selectedPoint) && (
          <line
            x1={(hovered ?? selectedPoint)!.x}
            y1={padTop}
            x2={(hovered ?? selectedPoint)!.x}
            y2={padTop + plotHeight}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {points.map((p, i) => {
          const isEmphasized = hoverIndex === i || selectedLabel === p.label;
          const isLast = i === points.length - 1;
          if (!isEmphasized && !isLast) return null;
          return (
            <circle
              key={p.label}
              cx={p.x}
              cy={p.y}
              r={isEmphasized ? 3 : 1.8}
              fill={isEmphasized ? colors.textPrimary : color}
              stroke={isEmphasized ? color : 'none'}
              strokeWidth={isEmphasized ? 1.5 : 0}
              vectorEffect="non-scaling-stroke"
              style={{ transition: 'r 0.1s ease' }}
            />
          );
        })}
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
