import React from 'react';
import {
  ArrowLeft,
  Database,
  Cpu,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Scale,
  School,
  Sprout,
  Wind,
  Layers,
  ArrowRight,
  TrendingDown,
  Truck,
  Activity,
  FileCheck,
  Radio,
  Clock,
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, AlertBanner } from '../components/ui';
import { AppRoute } from '../types';

interface HowItWorksPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-12 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 hover:text-forest transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="sage" size="md">Architecture &amp; Methodology</Badge>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            CPCB NAQI • ECMWF CAMS • 16T Freight
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-forest-950 tracking-tight">
          How It Works: The 4-Stage Environmental Pipeline
        </h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-3xl">
          From continuous atmospheric chemistry telemetry to institutional accountability, our platform executes an auditable four-stage pipeline: Multi-source Ingestion → Deterministic Analysis → Algorithmic Recommendation → Human Administrative Action.
        </p>

        {/* Visual Pipeline Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {[
            { step: '01', title: 'Data Ingestion', sub: 'CAAQMS + CAMS + Crops' },
            { step: '02', title: 'Analysis', sub: 'CPCB 2014 Math + Freight' },
            { step: '03', title: 'Recommendation', sub: 'Windows + Shifts + Off-take' },
            { step: '04', title: 'Action & Audit', sub: 'Sign-offs + 5-Stage Logistics' },
          ].map((s, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-white border border-forest-900/10 shadow-xs flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-forest-900 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                {s.step}
              </div>
              <div>
                <div className="font-bold text-xs text-forest-950">{s.title}</div>
                <div className="text-[10px] text-gray-500 font-medium">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage 1: Data Ingestion */}
      <Card variant="default" className="border-forest-900/10 shadow-sm hover:border-emerald-300 transition">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-forest-900 to-forest text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
              01
            </div>
            <div>
              <CardTitle className="text-xl font-black text-forest-950">Stage 1: Multi-Source Telemetry Ingestion</CardTitle>
              <CardDescription>
                Synchronizing heterogeneous ground measurements, numeric atmospheric forecasts, and crop listings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs sm:text-sm text-gray-700">
          <p className="leading-relaxed">
            The platform continuously ingests three decoupled primary data streams into the unified regional model:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-ivory-100/70 rounded-2xl border border-ivory-300 space-y-2">
              <div className="font-bold text-forest-950 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-700" />
                Physical CAAQMS Stations
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Continuous ground telemetry from DPCC, HSPCB, and PPCB monitoring ambient concentrations of PM2.5, PM10, NO2, SO2, CO, and O3.
              </p>
            </div>
            <div className="p-4 bg-ivory-100/70 rounded-2xl border border-ivory-300 space-y-2">
              <div className="font-bold text-forest-950 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-700" />
                Copernicus CAMS Models
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Hourly numerical forecasts from ECMWF/CAMS capturing diurnal atmospheric inversion layers, wind vector advection, and mixing heights across 72 hours.
              </p>
            </div>
            <div className="p-4 bg-ivory-100/70 rounded-2xl border border-ivory-300 space-y-2">
              <div className="font-bold text-forest-950 flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-amber-700" />
                Residue Supply Listings
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Verified farm batches with geotagged field coordinates, moisture percentage, baling specifications, tonnage, and ex-field pricing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage 2: Rigorous Analysis */}
      <Card variant="default" className="border-forest-900/10 shadow-sm hover:border-emerald-300 transition">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-forest-900 to-forest text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
              02
            </div>
            <div>
              <CardTitle className="text-xl font-black text-forest-950">Stage 2: Deterministic Scientific Analysis</CardTitle>
              <CardDescription>
                Applying mathematical standards without synthetic surrogates or fabricated safety indices.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-xs sm:text-sm text-gray-700">
          <div className="space-y-2">
            <h4 className="font-black text-forest-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              A. CPCB 2014/2015 NAQI Piecewise Linear Math
            </h4>
            <p className="leading-relaxed text-gray-600">
              Sub-indices are computed using exact Indian National Air Quality Index (NAQI) breakpoints:
            </p>
            <div className="p-3 bg-ivory-200/60 rounded-xl font-mono text-xs text-forest-950 border border-ivory-300">
              I_p = [ (I_hi - I_lo) / (B_hi - B_lo) ] * (C_p - B_lo) + I_lo
            </div>
            <p className="leading-relaxed text-gray-600">
              Crucially enforces the <strong>3-pollutant minimum constraint</strong> (requiring at least one particulate metric, either PM2.5 or PM10). When physical stations report incomplete data, the system flags <strong>Data Insufficient</strong> instead of manufacturing a fake number.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-forest-900/10">
            <h4 className="font-black text-forest-950 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-700" />
              B. 16-Ton Hauling Freight Logistics Equation
            </h4>
            <p className="leading-relaxed text-gray-600">
              Computes delivered feedstock economics using standard Northwest India rates:
            </p>
            <div className="p-3 bg-ivory-200/60 rounded-xl font-mono text-xs text-forest-950 border border-ivory-300">
              Delivered Cost = Ex-Field Price + ₹250/ton (Loading/Base) + [ ₹4.50/ton-km * Distance(km) ]
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage 3: Recommendation */}
      <Card variant="default" className="border-forest-900/10 shadow-sm hover:border-emerald-300 transition">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-forest-900 to-forest text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
              03
            </div>
            <div>
              <CardTitle className="text-xl font-black text-forest-950">Stage 3: Contextualized Algorithmic Recommendation</CardTitle>
              <CardDescription>
                Translating atmospheric indices into actionable, role-specific guidance.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs sm:text-sm text-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-emerald-700" />
                Personal Copilot
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Applies health sensitivity multipliers (asthma, cardiac, pediatric) to rank outdoor exercise windows, steering citizens toward 13:00 - 16:30 ventilation periods.
              </p>
            </div>

            <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200/80 space-y-2">
              <div className="font-bold text-sky-900 flex items-center gap-1.5">
                <School className="w-4 h-4 text-sky-700" />
                School Safety
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Evaluates morning sports and assemblies against configured age-bracket thresholds (Primary 5-10, Middle 11-14, Senior 15-18) and proposes auditorium relocations.
              </p>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-amber-700" />
                Parali Off-Take
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Matches crop types and moisture specifications against industrial demand profiles (Bio-CNG, 2G ethanol, pelletizing, and tableware).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage 4: Accountable Action */}
      <Card variant="default" className="border-forest-900/10 shadow-sm hover:border-emerald-300 transition">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-forest-900 to-forest text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
              04
            </div>
            <div>
              <CardTitle className="text-xl font-black text-forest-950">Stage 4: Accountable Action &amp; Audit Trail</CardTitle>
              <CardDescription>
                Recording human administrative sign-offs and physical logistics tracking.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs sm:text-sm text-gray-700">
          <p className="leading-relaxed">
            Recommendations trigger verifiable operational workflows:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 bg-ivory-100/70 rounded-2xl border border-ivory-300 space-y-1">
              <span className="font-bold text-forest-950 block text-sm">Administrative Sign-Off</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                School principals record explicit timestamped approvals, distinguishing automated algorithmic recommendations from authorized human policy actions.
              </p>
            </div>
            <div className="p-4 bg-ivory-100/70 rounded-2xl border border-ivory-300 space-y-1">
              <span className="font-bold text-forest-950 block text-sm">5-Stage Logistics Lifecycle</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                Residue off-take moves through Scheduled → Loading → In Transit → Delivered → Verified weighbridge slip, creating verifiable carbon and stubble diversion receipts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-8 bg-gradient-to-r from-forest-900 via-forest to-forest-950 text-white rounded-3xl shadow-md border border-forest-800">
        <div>
          <h4 className="font-black text-white text-lg">Ready to test the intelligence platform?</h4>
          <p className="text-xs text-emerald-200/80 mt-1">Explore live air quality observations or experience an interactive demonstration.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="glass" size="sm" onClick={() => onNavigate('/air-quality')}>
            Explore Air Quality
          </Button>
          <Button variant="emerald" size="sm" onClick={() => onNavigate('/demo')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Open Demo Portal
          </Button>
        </div>
      </div>
    </div>
  );
};
