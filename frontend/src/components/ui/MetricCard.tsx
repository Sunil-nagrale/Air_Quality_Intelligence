import React from 'react';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { DataProvenance } from '../../types';
import { TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  secondaryValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  provenance?: DataProvenance;
  provenanceDetail?: string;
  isUnavailable?: boolean;
  unavailableReason?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  secondaryValue,
  trend,
  provenance,
  provenanceDetail,
  isUnavailable = false,
  unavailableReason,
  className = '',
}) => {
  return (
    <div
      className={`p-4 bg-white border border-ivory-300 rounded-2xl shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {provenance && (
          <ProvenanceBadge provenance={provenance} detail={provenanceDetail} />
        )}
      </div>

      <div className="mt-3">
        {isUnavailable || value === null || value === undefined ? (
          <div className="flex items-center gap-2 text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-200">
            <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">Unavailable</span>
              <span className="text-[10px] text-gray-500">
                {unavailableReason || 'Telemetry offline or unconfigured'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight">
              {value}
            </span>
            {unit && <span className="text-xs font-semibold text-gray-500">{unit}</span>}
          </div>
        )}

        {(secondaryValue || trend) && !isUnavailable && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />}
            {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-red-600" />}
            <span>{secondaryValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};
