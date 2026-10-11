import React from 'react';
import { AQICategory, getCategoryFromAQI } from '../ui/RiskIndicator';

interface AqiGaugeProps {
  aqi: number | null | undefined;
  dominantPollutant?: string | null;
  stationName?: string;
  category?: AQICategory | string;
  theme?: 'light' | 'dark';
  isDark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AqiGauge: React.FC<AqiGaugeProps> = ({
  aqi,
  dominantPollutant = 'PM2.5',
  stationName,
  category,
  theme,
  isDark = true,
  size = 'md',
  className = '',
}) => {
  const effectiveIsDark = theme !== undefined ? theme === 'dark' : isDark;
  const resolvedCategory = (category as AQICategory) || getCategoryFromAQI(aqi);
  const numericAqi = aqi !== null && aqi !== undefined && !isNaN(aqi) ? Math.min(Math.max(aqi, 0), 500) : null;

  // CPCB Color Scheme
  const getCategoryColor = (cat: AQICategory): string => {
    switch (cat) {
      case 'Good':
        return '#16A34A';
      case 'Satisfactory':
        return '#22C55E';
      case 'Moderate':
        return '#E9A23B';
      case 'Poor':
        return '#EA580C';
      case 'Very Poor':
        return '#C94B43';
      case 'Severe':
        return '#7F1D1D';
      default:
        return '#94A3B8';
    }
  };

  const currentColor = getCategoryColor(resolvedCategory);

  // Gauge dimensions
  const dims = {
    sm: { width: 180, height: 140, radius: 65, stroke: 10, cx: 90, cy: 95 },
    md: { width: 260, height: 200, radius: 95, stroke: 14, cx: 130, cy: 135 },
    lg: { width: 320, height: 240, radius: 120, stroke: 16, cx: 160, cy: 165 },
  }[size];

  // Arc angles: 180 degree semi-circle (from 180deg to 360deg, i.e., -180 to 0)
  // Let's use 220 degree arc for a modern instrument dial (-200 to 20 deg)
  const startAngle = -200;
  const endAngle = 20;
  const totalSweep = endAngle - startAngle; // 220 degrees

  const progressFraction = numericAqi !== null ? numericAqi / 500 : 0;
  const currentAngle = startAngle + progressFraction * totalSweep;

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(cx, cy, r, endA);
    const end = polarToCartesian(cx, cy, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // 6 CPCB Segment Spans (0-50, 50-100, 100-200, 200-300, 300-400, 400-500)
  const segments = [
    { from: 0, to: 50, color: '#16A34A', label: 'Good' },
    { from: 50, to: 100, color: '#22C55E', label: 'Satisfactory' },
    { from: 100, to: 200, color: '#E9A23B', label: 'Moderate' },
    { from: 200, to: 300, color: '#EA580C', label: 'Poor' },
    { from: 300, to: 400, color: '#C94B43', label: 'Very Poor' },
    { from: 400, to: 500, color: '#7F1D1D', label: 'Severe' },
  ];

  return (
    <div
      className={`flex flex-col items-center justify-center select-none relative ${className}`}
      role="region"
      aria-label={`Air Quality Index Gauge: ${numericAqi ?? 'Data Insufficient'} (${resolvedCategory})`}
    >
      <svg
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        className="w-full max-w-[320px] overflow-visible drop-shadow-sm"
        style={{ height: dims.height }}
      >
        <defs>
          <filter id={`glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id={`gauge-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={currentColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={currentColor} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background track segments */}
        {segments.map((seg, idx) => {
          const a1 = startAngle + (seg.from / 500) * totalSweep;
          const a2 = startAngle + (seg.to / 500) * totalSweep;
          return (
            <path
              key={idx}
              d={describeArc(dims.cx, dims.cy, dims.radius, a1 + 1, a2 - 1)}
              fill="none"
              stroke={effectiveIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(23,63,53,0.08)'}
              strokeWidth={dims.stroke}
              strokeLinecap="round"
            />
          );
        })}

        {/* Active progress arc */}
        {numericAqi !== null && numericAqi > 0 && (
          <path
            d={describeArc(dims.cx, dims.cy, dims.radius, startAngle, currentAngle)}
            fill="none"
            stroke={`url(#gauge-grad-${size})`}
            strokeWidth={dims.stroke}
            strokeLinecap="round"
            filter={`url(#glow-${size})`}
            className="transition-all duration-700 ease-out"
          />
        )}

        {/* Indicator bead at current value */}
        {numericAqi !== null && (
          (() => {
            const beadPos = polarToCartesian(dims.cx, dims.cy, dims.radius, currentAngle);
            return (
              <g className="transition-all duration-700 ease-out">
                <circle
                  cx={beadPos.x}
                  cy={beadPos.y}
                  r={dims.stroke * 0.75}
                  fill="#FFFFFF"
                  stroke={currentColor}
                  strokeWidth="3"
                  className="shadow-md"
                />
                <circle cx={beadPos.x} cy={beadPos.y} r={dims.stroke * 0.3} fill={currentColor} />
              </g>
            );
          })()
        )}

        {/* Calibrated Tick Marks & Scale numbers */}
        {[0, 100, 200, 300, 400, 500].map((val) => {
          const angle = startAngle + (val / 500) * totalSweep;
          const pInner = polarToCartesian(dims.cx, dims.cy, dims.radius - dims.stroke / 2 - 4, angle);
          const pOuter = polarToCartesian(dims.cx, dims.cy, dims.radius - dims.stroke / 2 - 10, angle);
          const pText = polarToCartesian(dims.cx, dims.cy, dims.radius - dims.stroke / 2 - 20, angle);

          return (
            <g key={val}>
              <line
                x1={pInner.x}
                y1={pInner.y}
                x2={pOuter.x}
                y2={pOuter.y}
                stroke={effectiveIsDark ? 'rgba(255,255,255,0.2)' : 'rgba(23,63,53,0.2)'}
                strokeWidth="1.5"
              />
              <text
                x={pText.x}
                y={pText.y + 3}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={effectiveIsDark ? 'rgba(255,255,255,0.4)' : 'rgba(23,63,53,0.4)'}
                fontFamily="sans-serif"
              >
                {val}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Center Reading Overlay */}
      <div
        className="absolute flex flex-col items-center justify-center text-center pointer-events-none"
        style={{ top: `${dims.cy - dims.radius * 0.35}px` }}
      >
        <span
          className={`text-[10px] uppercase tracking-widest font-bold ${
            effectiveIsDark ? 'text-white/50' : 'text-gray-500'
          }`}
        >
          CPCB NAQI
        </span>

        <div className="flex items-baseline gap-1 my-0.5">
          <span
            className={`font-black tracking-tight num-tabular ${
              size === 'lg' ? 'text-5xl sm:text-6xl' : size === 'md' ? 'text-4xl sm:text-5xl' : 'text-3xl'
            }`}
            style={{ color: currentColor }}
          >
            {numericAqi !== null ? numericAqi : '—'}
          </span>
          <span className={`text-[11px] font-semibold ${effectiveIsDark ? 'text-white/40' : 'text-gray-400'}`}>
            / 500
          </span>
        </div>

        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide shadow-sm"
          style={{ backgroundColor: `${currentColor}22`, color: currentColor, border: `1px solid ${currentColor}44` }}
        >
          {resolvedCategory}
        </span>

        {dominantPollutant && (
          <span className={`text-[10px] mt-1.5 font-medium ${effectiveIsDark ? 'text-white/60' : 'text-gray-500'}`}>
            Dominant: <strong className={effectiveIsDark ? 'text-white/90' : 'text-forest'}>{dominantPollutant}</strong>
          </span>
        )}
      </div>

      {stationName && (
        <div
          className={`text-[11px] text-center font-medium mt-1 truncate max-w-[240px] ${
            effectiveIsDark ? 'text-white/60' : 'text-gray-500'
          }`}
        >
          {stationName}
        </div>
      )}
    </div>
  );
};
