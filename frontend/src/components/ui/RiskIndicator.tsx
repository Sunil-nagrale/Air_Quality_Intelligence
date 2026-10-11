import React from 'react';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

export type AQICategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe'
  | 'Data Insufficient';

interface RiskConfig {
  label: AQICategory;
  range: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
  guidance: string;
}

const RISK_CONFIGS: Record<AQICategory, RiskConfig> = {
  Good: {
    label: 'Good',
    range: '0 – 50',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-900',
    borderClass: 'border-emerald-300',
    badgeBg: 'bg-emerald-700 text-white',
    icon: CheckCircle2,
    guidance: 'Minimal health impact; suitable for unrestricted outdoor activities.',
  },
  Satisfactory: {
    label: 'Satisfactory',
    range: '51 – 100',
    bgClass: 'bg-green-50',
    textClass: 'text-green-900',
    borderClass: 'border-green-300',
    badgeBg: 'bg-green-700 text-white',
    icon: CheckCircle2,
    guidance: 'Minor breathing discomfort to highly sensitive individuals.',
  },
  Moderate: {
    label: 'Moderate',
    range: '101 – 200',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-950',
    borderClass: 'border-amber-300',
    badgeBg: 'bg-amber-600 text-white',
    icon: Info,
    guidance: 'Breathing discomfort to people with lung disease, asthma, and heart conditions.',
  },
  Poor: {
    label: 'Poor',
    range: '201 – 300',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-950',
    borderClass: 'border-orange-300',
    badgeBg: 'bg-orange-600 text-white',
    icon: AlertTriangle,
    guidance: 'Breathing discomfort to most people upon prolonged outdoor exertion.',
  },
  'Very Poor': {
    label: 'Very Poor',
    range: '301 – 400',
    bgClass: 'bg-red-50',
    textClass: 'text-red-950',
    borderClass: 'border-red-300',
    badgeBg: 'bg-red-700 text-white',
    icon: AlertOctagon,
    guidance: 'Respiratory illness on prolonged exposure; avoid intense outdoor exercise.',
  },
  Severe: {
    label: 'Severe',
    range: '401 – 500+',
    bgClass: 'bg-stone-100',
    textClass: 'text-stone-950',
    borderClass: 'border-stone-400',
    badgeBg: 'bg-stone-900 text-white',
    icon: ShieldAlert,
    guidance: 'Affects healthy individuals and severely impacts vulnerable populations.',
  },
  'Data Insufficient': {
    label: 'Data Insufficient',
    range: 'N/A (<3 pollutants or no PM)',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-900',
    borderClass: 'border-gray-300',
    badgeBg: 'bg-gray-700 text-white',
    icon: HelpCircle,
    guidance: 'Mandatory CPCB criteria not met. Automated safety recommendations suspended.',
  },
};

export function getCategoryFromAQI(aqi: number | null | undefined): AQICategory {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return 'Data Insufficient';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

interface RiskIndicatorProps {
  aqi?: number | null;
  category?: AQICategory;
  variant?: 'compact' | 'pill' | 'card' | 'banner';
  showGuidance?: boolean;
  className?: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  aqi,
  category,
  variant = 'compact',
  showGuidance = false,
  className = '',
}) => {
  const resolvedCategory = category || getCategoryFromAQI(aqi);
  const config = RISK_CONFIGS[resolvedCategory];
  const IconComponent = config.icon;

  if (variant === 'pill') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bgClass} ${config.textClass} ${config.borderClass} ${className}`}
        role="status"
        aria-label={`Air Quality: ${resolvedCategory}, Score: ${aqi ?? 'Insufficient'}`}
      >
        <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          {resolvedCategory} {aqi !== undefined && aqi !== null ? `(${aqi})` : ''}
        </span>
      </span>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`p-4 rounded-xl border ${config.bgClass} ${config.borderClass} ${className}`}
        role="region"
        aria-label={`Air Quality Status: ${resolvedCategory}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${config.badgeBg}`}>
              <IconComponent className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-gray-500">
                CPCB NAQI Category
              </div>
              <div className={`text-base font-extrabold ${config.textClass}`}>
                {resolvedCategory}
              </div>
            </div>
          </div>
          {aqi !== undefined && aqi !== null ? (
            <div className="text-right">
              <span className={`text-2xl font-black ${config.textClass}`}>{aqi}</span>
              <span className="text-[10px] block font-semibold text-gray-500">Sub-Index</span>
            </div>
          ) : (
            <div className="text-right text-xs font-semibold text-gray-500">
              Uncertified / Incomplete
            </div>
          )}
        </div>
        {showGuidance && (
          <p className="mt-2.5 pt-2 border-t border-black/5 text-xs text-gray-700 leading-relaxed">
            <strong>Advisory:</strong> {config.guidance}
          </p>
        )}
      </div>
    );
  }

  // default 'compact'
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgClass} ${config.borderClass} ${className}`}
      role="status"
    >
      <IconComponent className={`w-4 h-4 shrink-0 ${config.textClass}`} aria-hidden="true" />
      <div className="text-xs leading-tight">
        <span className={`font-bold ${config.textClass}`}>{resolvedCategory}</span>
        {aqi !== undefined && aqi !== null && (
          <span className="text-gray-600 font-semibold ml-1.5">[{aqi}]</span>
        )}
      </div>
    </div>
  );
};
