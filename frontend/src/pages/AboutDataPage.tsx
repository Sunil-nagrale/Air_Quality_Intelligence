import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Cpu,
  CloudRain,
  AlertTriangle,
  Info,
  Scale,
  FileText,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  AlertBanner,
} from '../components/ui';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { AppRoute } from '../types';

interface AboutDataPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const AboutDataPage: React.FC<AboutDataPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
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
          <Badge variant="sage" size="md">Scientific Transparency</Badge>
          <Badge variant="outline" size="sm">MoEFCC &amp; CPCB Standards</Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-forest tracking-tight">
          About Our Data: Sources, Methodology &amp; Limitations
        </h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-3xl">
          Complete disclosure of telemetry endpoints, mathematical sub-indices, atmospheric forecasting models, and environmental impact verification constraints.
        </p>
      </div>

      {/* 4 Data Classifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="default">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <ProvenanceBadge provenance="MEASURED_OBSERVATION" />
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <CardTitle className="text-lg">1. Measured Station Observations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-600 leading-relaxed">
            <p>
              <strong>Data Source:</strong> Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by state pollution control boards (DPCC, HSPCB, PPCB) and CPCB.
            </p>
            <p>
              <strong>Pollutants:</strong> $PM_{2.5}, PM_{10}, NO_2, SO_2, CO,$ and $O_3$.
            </p>
            <p>
              <strong>Freshness:</strong> Reported on an hourly basis. When a station is offline, the platform marks it as <em>Data Insufficient</em> or requires manual review.
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <ProvenanceBadge provenance="FORECAST" />
              <CloudRain className="w-5 h-5 text-blue-700" />
            </div>
            <CardTitle className="text-lg">2. Numerical Atmospheric Forecasts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-600 leading-relaxed">
            <p>
              <strong>Data Source:</strong> Copernicus Atmosphere Monitoring Service (CAMS) European regional and global models via Open-Meteo Air Quality API.
            </p>
            <p>
              <strong>Resolution:</strong> $0.1^\circ$ (~11 km spatial grid), updated hourly over a rolling 72-hour window.
            </p>
            <p>
              <strong>Physics Modeled:</strong> Nighttime thermal inversion trapping and afternoon boundary layer convective dispersion.
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <ProvenanceBadge provenance="MODELLED_ESTIMATE" />
              <Cpu className="w-5 h-5 text-purple-700" />
            </div>
            <CardTitle className="text-lg">3. Spatial Local Estimates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-600 leading-relaxed">
            <p>
              <strong>Methodology:</strong> Inverse-Distance-Weighted (IDW) spatial interpolation applied when a user is located between physical monitoring stations.
            </p>
            <p>
              <strong>Uncertainty Bounds:</strong> Every modelled estimate exposes the distance to the nearest physical sensor and an uncertainty standard deviation radius ($\pm \sigma$).
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <ProvenanceBadge provenance="DEMO_DATA" />
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <CardTitle className="text-lg">4. Synthetic Demonstration Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-600 leading-relaxed">
            <p>
              <strong>Purpose:</strong> Used exclusively for platform workflow testing (crop residue listings, trial negotiations, simulated deliveries).
            </p>
            <p>
              <strong>Isolation Guarantee:</strong> Demo data is strictly separated in the database and never influences live human health safety rankings or official institutional audits.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mandatory Missing Data Constraint */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-lg">CPCB NAQI Minimum Data Requirement</CardTitle>
          <CardDescription>
            Official Ministry of Environment, Forest and Climate Change (MoEFCC) protocol for overall index calculation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <AlertBanner type="warning" title="Minimum 3 Criteria Pollutants Guard">
            Under official CPCB standard guidelines, an overall NAQI can only be produced if at least <strong>3 criteria pollutants</strong> have valid measurements, and <strong>at least one of them is Particulate Matter ($PM_{2.5}$ or $PM_{10}$)</strong>.
            <br className="mt-1" />
            If either condition is violated, our engine returns <strong>Data Insufficient</strong>. The system refuses to fabricate surrogate numbers or treat incomplete data as clean air.
          </AlertBanner>

          <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300 font-mono text-center text-xs text-forest font-bold">
            AQI = max( I_PM2.5, I_PM10, I_NO2, I_SO2, I_CO, I_O3 ) [Subject to ≥3 pollutants with PM]
          </div>
        </CardContent>
      </Card>

      {/* Environmental Impact Verification Policy */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-lg">Environmental Impact Accounting &amp; LCA Standards</CardTitle>
          <CardDescription>
            Why literature emissions coefficients are held pending physical weighbridge verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <p>
            Academic literature establishes that diverting one ton of paddy stubble from open-field burning mitigates approximately <strong>1.46 t CO₂e</strong> of greenhouse gases and <strong>3.00 kg PM2.5</strong> of hazardous aerosols.
          </p>
          <AlertBanner type="info" title="LCA Anti-Greenwashing Rule">
            To prevent unsubstantiated environmental claims, our platform marks uncertified residue batches as <code className="bg-ivory-200 px-1 py-0.5 rounded font-mono font-bold">PENDING_BATCH_LCA_CERTIFICATION</code>. Emitted savings are only booked as verified impact once an off-taker issues an official weighbridge delivery slip and certified batch processing record.
          </AlertBanner>
        </CardContent>
      </Card>

      {/* Back to Home */}
      <div className="text-center pt-2">
        <Button variant="primary" size="md" onClick={() => onNavigate('/')} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Return to Overview
        </Button>
      </div>
    </div>
  );
};
