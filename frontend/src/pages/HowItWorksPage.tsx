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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-forest-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="sage" size="md">Architecture &amp; Process</Badge>
          <Badge variant="outline" size="sm">4-Stage Pipeline</Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-forest tracking-tight">
          How It Works: The 4-Stage Intelligence Pipeline
        </h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-3xl">
          From raw atmospheric observations and supply chain listings to institutional decisions, our system operates on a verifiable four-stage pipeline: Data → Analysis → Recommendation → Action.
        </p>
      </div>

      {/* Stage 1: Data Ingestion */}
      <Card variant="default">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest text-white font-bold text-base flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <CardTitle className="text-xl">Stage 1: Multi-Source Data Ingestion</CardTitle>
              <CardDescription>
                Collecting heterogeneous physical measurements, numerical models, and agricultural listings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs sm:text-sm text-gray-700">
          <p className="leading-relaxed">
            The platform connects to three primary continuous data streams:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300 space-y-2">
              <div className="font-bold text-forest flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-forest" />
                Physical CAAQMS Stations
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Direct sensor readings from DPCC, HSPCB, and PPCB monitoring ambient concentrations of $PM_{2.5}, PM_{10}, NO_2, SO_2, CO,$ and $O_3$.
              </p>
            </div>
            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300 space-y-2">
              <div className="font-bold text-forest flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-forest" />
                Copernicus CAMS Forecasts
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Hourly numerical forecasts from ECMWF/CAMS capturing diurnal atmospheric inversion layers and convective mixing over a rolling 72-hour horizon.
              </p>
            </div>
            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300 space-y-2">
              <div className="font-bold text-forest flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-forest" />
                Farmer Residue Listings
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Structured crop residue batches with verified coordinates, moisture percentage, baling specifications, tonnage, and ex-field asking prices.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage 2: Rigorous Analysis */}
      <Card variant="default">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest text-white font-bold text-base flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <CardTitle className="text-xl">Stage 2: Deterministic Scientific Analysis</CardTitle>
              <CardDescription>
                Applying mathematical standards without black-box alterations or fabricated estimates.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs sm:text-sm text-gray-700">
          <div className="space-y-3">
            <h4 className="font-bold text-forest">A. CPCB 2014/2015 NAQI Math</h4>
            <p className="leading-relaxed">
              Calculates sub-indices via piecewise linear interpolation. Crucially enforces the <strong>3-pollutant minimum constraint</strong> (requiring at least one particulate metric). If data is insufficient, the system reports <strong>Data Insufficient</strong> rather than fabricating an artificially safe score.
            </p>
          </div>
          <div className="space-y-3 pt-2 border-t border-ivory-200">
            <h4 className="font-bold text-forest">B. 16-Ton Freight Hauling Economics</h4>
            <p className="leading-relaxed">
              Computes delivered feedstock economics using standard Northwest India rates: <code className="bg-ivory-200 px-1 py-0.5 rounded font-mono text-forest font-bold">₹250/ton base + ₹4.50/ton-km</code> hauling cost.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stage 3: Recommendation */}
      <Card variant="default">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest text-white font-bold text-base flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <CardTitle className="text-xl">Stage 3: Contextualized Recommendation</CardTitle>
              <CardDescription>
                Translating raw indices into role-specific decision proposals.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs sm:text-sm text-gray-700">
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Personal Citizen:</strong> Evaluates planned running/walking windows, applies health sensitivity penalties (asthma, cardiac, pediatric), and identifies comparatively better hours.</li>
            <li><strong>School Administration:</strong> Evaluates sports days against configured institutional thresholds (Primary/Middle/Senior), recommending indoor auditorium migration or afternoon postponement.</li>
            <li><strong>Agricultural Trading:</strong> Computes compatibility scores matching crop type, moisture thresholds, and hauling radiuses between farmers and industrial processors.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Stage 4: Accountable Action */}
      <Card variant="default">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest text-white font-bold text-base flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <CardTitle className="text-xl">Stage 4: Accountable Action &amp; Audit Trail</CardTitle>
              <CardDescription>
                Recording authorized decisions and multi-stage physical execution.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs sm:text-sm text-gray-700">
          <p className="leading-relaxed">
            Recommendations trigger auditable real-world workflows:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
              <span className="font-bold text-forest block mb-1">Administrative Sign-Off</span>
              <p className="text-xs text-gray-600">
                School principals record explicit authorization, distinguishing official human administrative decisions from automated recommendations.
              </p>
            </div>
            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
              <span className="font-bold text-forest block mb-1">5-Stage Logistics Tracking</span>
              <p className="text-xs text-gray-600">
                Residue off-take moves through Scheduled → Loading → In Transit → Delivered → Verified weighbridge slip, recording auditable impact.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-ivory-100 rounded-3xl border border-ivory-300">
        <div>
          <h4 className="font-bold text-forest text-base">Ready to test the pipeline?</h4>
          <p className="text-xs text-gray-600">Explore our public air quality explorer or try an interactive demonstration.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('/air-quality')}>
            Explore Air Quality
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('/demo')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Open Demo Portal
          </Button>
        </div>
      </div>
    </div>
  );
};
