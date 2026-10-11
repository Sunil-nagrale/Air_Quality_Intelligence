import React from 'react';

interface AtmosphericVisualProps {
  className?: string;
  variant?: 'hero' | 'module' | 'compact';
}

export const AtmosphericAirflowVisual: React.FC<AtmosphericVisualProps> = ({
  className = '',
  variant = 'hero',
}) => {
  return (
    <div
      className={`relative overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 800 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-60"
      >
        <defs>
          <linearGradient id="streamGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
            <stop offset="40%" stopColor="#0EA5E9" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#E9A23B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#173F35" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="streamGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#065F46" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="inversionLayerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E9A23B" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#173F35" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Diurnal Thermal Inversion Boundary Zone */}
        <path
          d="M0,180 C150,140 320,210 500,160 C640,120 720,170 800,150 L800,320 C680,340 500,290 350,330 C200,370 80,310 0,340 Z"
          fill="url(#inversionLayerGrad)"
        />

        {/* Atmospheric Streamlines (representing North-Westerly winter drift across Indo-Gangetic Plain) */}
        <path
          d="M-50,120 C180,90 350,220 550,140 C680,90 750,160 850,130"
          stroke="url(#streamGrad1)"
          strokeWidth="3"
          strokeDasharray="8 6"
          className="animate-pulse-subtle"
        />

        <path
          d="M-80,180 C120,130 280,260 480,180 C620,130 720,220 880,170"
          stroke="url(#streamGrad2)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <path
          d="M-30,240 C150,200 320,310 520,240 C660,190 760,270 870,230"
          stroke="url(#streamGrad1)"
          strokeWidth="2"
          strokeDasharray="4 8"
        />

        <path
          d="M-60,300 C110,250 270,360 470,290 C610,240 730,320 860,280"
          stroke="url(#streamGrad2)"
          strokeWidth="1.5"
        />

        {/* Topographic elevation contours of the Shivalik foothills / Aravalli ridge */}
        <path
          d="M0,380 C180,360 300,420 500,380 C680,350 740,400 800,385"
          stroke="rgba(23, 63, 53, 0.15)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <path
          d="M0,430 C200,410 350,460 550,420 C700,390 750,440 800,425"
          stroke="rgba(23, 63, 53, 0.1)"
          strokeWidth="1.5"
        />

        {/* Particulate Concentration Nodes (Delhi, Sangrur, Ludhiana, Gurugram) */}
        {variant !== 'compact' && (
          <g>
            {/* Delhi-NCR Node */}
            <circle cx="510" cy="240" r="18" fill="rgba(233, 162, 59, 0.15)" />
            <circle cx="510" cy="240" r="6" fill="#E9A23B" />
            <circle cx="510" cy="240" r="2" fill="#FFFFFF" />

            {/* Sangrur / Malwa Punjab Node */}
            <circle cx="280" cy="190" r="16" fill="rgba(201, 75, 67, 0.15)" />
            <circle cx="280" cy="190" r="5" fill="#C94B43" />
            <circle cx="280" cy="190" r="1.5" fill="#FFFFFF" />

            {/* Ludhiana Node */}
            <circle cx="210" cy="140" r="14" fill="rgba(233, 162, 59, 0.15)" />
            <circle cx="210" cy="140" r="4.5" fill="#E9A23B" />

            {/* Karnal Haryana Node */}
            <circle cx="390" cy="210" r="12" fill="rgba(16, 185, 129, 0.15)" />
            <circle cx="390" cy="210" r="4" fill="#10B981" />
          </g>
        )}
      </svg>
    </div>
  );
};
