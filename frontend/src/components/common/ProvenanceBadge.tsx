import React from 'react';
import { ShieldCheck, CloudRain, Cpu, AlertTriangle } from 'lucide-react';
import { DataProvenance } from '../../types';

export type ProvenanceType =
  | 'MEASURED_OBSERVATION'
  | 'FORECAST'
  | 'MODELLED_ESTIMATE'
  | 'DEMO_DATA'
  | DataProvenance;

interface Props {
  provenance: ProvenanceType;
  subtext?: string;
  detail?: string;
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance, subtext, detail }) => {
  const displayDetail = detail || subtext;

  switch (provenance) {
    case 'MEASURED_OBSERVATION':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 select-none"
          title="Direct official sensor telemetry from physical CAAQMS station"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>MEASURED OBSERVATION</span>
          {displayDetail && <span className="text-emerald-700 font-normal">({displayDetail})</span>}
        </span>
      );

    case 'FORECAST':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300 select-none"
          title="Numerical atmospheric chemistry model (Copernicus CAMS)"
        >
          <CloudRain className="w-3.5 h-3.5 text-blue-700" />
          <span>FORECAST</span>
          {displayDetail && <span className="text-blue-700 font-normal">({displayDetail})</span>}
        </span>
      );

    case 'MODELLED_ESTIMATE':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-300 select-none"
          title="Inverse-distance-weighted spatial interpolation with uncertainty bounds"
        >
          <Cpu className="w-3.5 h-3.5 text-purple-700" />
          <span>MODELLED ESTIMATE</span>
          {displayDetail && <span className="text-purple-700 font-normal">({displayDetail})</span>}
        </span>
      );

    case 'DEMO_DATA':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-400 select-none"
          title="Synthetic demonstration record for workflow evaluation"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          <span>DEMO DATA</span>
          {displayDetail && <span className="text-amber-800 font-normal">({displayDetail})</span>}
        </span>
      );

    default:
      return null;
  }
};
