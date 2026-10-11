import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { DataProvenance } from '../../types';

export interface StatSummaryProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  provenance?: DataProvenance;
  provenanceDetail?: string;
  icon?: React.ReactNode;
  description?: string;
  className?: string;
}

export const StatSummary: React.FC<StatSummaryProps> = ({
  label,
  value,
  unit,
  change,
  trend,
  provenance,
  provenanceDetail,
  icon,
  description,
  className = '',
}) => {
  return (
    <div
      className={`p-5 bg-white border border-ivory-300 rounded-2xl shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-sage-100 flex items-center justify-center text-forest-800 shrink-0">
              {icon}
            </div>
          )}
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
        {provenance && (
          <ProvenanceBadge provenance={provenance} detail={provenanceDetail} />
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-forest-950 tracking-tight">{value}</span>
          {unit && <span className="text-sm font-semibold text-gray-500">{unit}</span>}
        </div>

        {change && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            {trend === 'positive' && (
              <span className="flex items-center gap-1 text-emerald-700">
                <TrendingDown className="w-3.5 h-3.5" /> {change}
              </span>
            )}
            {trend === 'negative' && (
              <span className="flex items-center gap-1 text-mutedRed">
                <TrendingUp className="w-3.5 h-3.5" /> {change}
              </span>
            )}
            {trend === 'neutral' && (
              <span className="flex items-center gap-1 text-gray-500">
                <Minus className="w-3.5 h-3.5" /> {change}
              </span>
            )}
            {description && <span className="text-gray-400">• {description}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
