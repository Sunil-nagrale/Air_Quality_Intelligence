import React, { useState } from 'react';

export interface ChartDataPoint {
  label: string;
  value: number;
  subtext?: string;
}

export interface MiniChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  title?: string;
  className?: string;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  height = 80,
  color = '#173F35',
  title = 'Trend Visualizer',
  className = '',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = 300;
  const paddingX = 15;
  const paddingY = 15;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * chartWidth;
    const y = height - paddingY - (d.value / maxValue) * chartHeight;
    return { x, y, point: d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  return (
    <div className={`relative ${className}`} role="img" aria-label={title}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
      >
        {/* Subtle background grid line */}
        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke="#E2E0D5"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Trend Area path */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`}
          fill={color}
          fillOpacity="0.08"
        />

        {/* Trend Stroke line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Dots */}
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="4"
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="2"
            className="cursor-pointer transition-transform hover:scale-150"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredPoint(pt.point);
              setHoverPos({ x: pt.x, y: pt.y });
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && hoverPos && (
        <div
          className="absolute z-10 -top-8 bg-forest-950 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${(hoverPos.x / width) * 100}%` }}
        >
          {hoveredPoint.label}: {hoveredPoint.value} {hoveredPoint.subtext && `(${hoveredPoint.subtext})`}
        </div>
      )}
    </div>
  );
};
