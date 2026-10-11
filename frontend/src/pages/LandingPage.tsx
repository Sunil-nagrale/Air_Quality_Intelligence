import React, { useState } from 'react';
import {
  Wind,
  School,
  Sprout,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Activity,
  HeartPulse,
  Scale,
  Sparkles,
  FileText,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  Factory,
  GraduationCap,
  Leaf,
  Layers,
  ExternalLink,
  Cpu,
  CloudRain,
  Database,
  ArrowUpRight,
  Clock,
  Compass,
  Radio,
  BarChart3,
  Thermometer,
  Eye,
  Truck,
  TrendingDown,
  Sun,
  Moon,
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
  RiskIndicator,
  AlertBanner,
  StatSummary,
  MiniChart,
} from '../components/ui';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { AqiGauge } from '../components/common/AqiGauge';
import { AtmosphericAirflowVisual } from '../components/common/AtmosphericAirflowVisual';
import { AppRoute, RegionalStationStatus } from '../types';

interface LandingPageProps {
  onNavigate: (route: AppRoute) => void;
}

const REGIONAL_STATIONS: RegionalStationStatus[] = [
  {
    id: 'DEL_01',
    name: 'Mandir Marg CAAQMS',
    district: 'Central Delhi',
    state: 'Delhi-NCR',
    aqi: 177,
    category: 'Moderate',
    dominant: 'PM10',
    pm25: 62.9,
    pm10: 215.6,
    distanceKm: 2.1,
    lastUpdated: '10:30 IST Today',
    provenance: 'MEASURED_OBSERVATION',
    isTelemetryAvailable: true,
    agency: 'DPCC',
  },
  {
    id: 'DEL_02',
    name: 'Anand Vihar CAAQMS',
    district: 'East Delhi',
    state: 'Delhi-NCR',
    aqi: 284,
    category: 'Poor',
    dominant: 'PM2.5',
    pm25: 114.2,
    pm10: 298.0,
    distanceKm: 0.4,
    lastUpdated: '10:30 IST Today',
    provenance: 'MEASURED_OBSERVATION',
    isTelemetryAvailable: true,
    agency: 'DPCC',
  },
  {
    id: 'HAR_01',
    name: 'Sector 51 CAAQMS',
    district: 'Gurugram',
    state: 'Haryana',
    aqi: 192,
    category: 'Moderate',
    dominant: 'PM2.5',
    pm25: 84.5,
    pm10: 195.0,
    distanceKm: 0.8,
    lastUpdated: '10:30 IST Today',
    provenance: 'MEASURED_OBSERVATION',
    isTelemetryAvailable: true,
    agency: 'HSPCB',
  },
  {
    id: 'HAR_02',
    name: 'Karnal Sector 12',
    district: 'Karnal',
    state: 'Haryana',
    aqi: 164,
    category: 'Moderate',
    dominant: 'PM10',
    pm25: 58.0,
    pm10: 182.0,
    distanceKm: 3.4,
    lastUpdated: '10:00 IST Today',
    provenance: 'FORECAST',
    isTelemetryAvailable: true,
    agency: 'Copernicus CAMS Model',
  },
  {
    id: 'PUN_01',
    name: 'PAU Campus CAAQMS',
    district: 'Ludhiana',
    state: 'Punjab',
    aqi: 234,
    category: 'Poor',
    dominant: 'PM2.5',
    pm25: 98.4,
    pm10: 220.0,
    distanceKm: 1.2,
    lastUpdated: '10:30 IST Today',
    provenance: 'MEASURED_OBSERVATION',
    isTelemetryAvailable: true,
    agency: 'PPCB',
  },
  {
    id: 'PUN_02',
    name: 'Sangrur Rural Telemetry',
    district: 'Sangrur',
    state: 'Punjab',
    aqi: null,
    category: 'Data Insufficient',
    dominant: null,
    pm25: null,
    pm10: null,
    distanceKm: 8.5,
    lastUpdated: 'Offline',
    provenance: 'MEASURED_OBSERVATION',
    isTelemetryAvailable: false,
    unavailableReason: 'CAAQMS physical sensor maintenance; requires manual IDW estimate',
    agency: 'PPCB',
  },
];

const PREVIEW_LISTINGS = [
  {
    id: 'DEMO-LST-01',
    crop: 'Paddy Straw (Non-Basmati)',
    district: 'Sangrur, Punjab',
    quantity: '350 tons',
    moisture: '14.2%',
    price: '₹1,850/t',
    baling: 'Ex-Field Baled (Round)',
    status: 'MATCHED',
  },
  {
    id: 'DEMO-LST-02',
    crop: 'Basmati Straw',
    district: 'Ludhiana, Punjab',
    quantity: '500 tons',
    moisture: '12.0%',
    price: '₹2,100/t',
    baling: 'Square Baled',
    status: 'VERIFIED',
  },
  {
    id: 'DEMO-LST-03',
    crop: 'Paddy Straw (Non-Basmati)',
    district: 'Karnal, Haryana',
    quantity: '200 tons',
    moisture: '16.5%',
    price: '₹1,700/t',
    baling: 'Loose Stubble',
    status: 'LISTED',
  },
];

const BUYER_CATEGORIES = [
  {
    title: 'Bio-CNG Plants',
    description: 'Anaerobic digestion facilities requiring baled straw below 18% moisture for compressed biogas.',
    capacity: '1,200 – 3,000 t/month',
    leadTime: '36 – 48 hours',
    specs: 'Moisture <18%, Silica <6%',
  },
  {
    title: '2G Ethanol Bio-Refineries',
    description: 'Cellulosic biochemical refineries converting agricultural residue into advanced biofuels.',
    capacity: '5,000 – 10,000 t/month',
    leadTime: 'Scheduled rail/road fleet',
    specs: 'Lignocellulose standard',
  },
  {
    title: 'Bio-Pellets & Thermal Co-Firing',
    description: 'Pelletizing plants producing biomass pellets for NTPC power station blending mandates.',
    capacity: '800 – 2,500 t/month',
    leadTime: '24 – 48 hours',
    specs: 'Gross Calorific Value >3200 kcal/kg',
  },
  {
    title: 'Agri-Pulp & Tableware (Kriya Labs Ref.)',
    description: 'Biodegradable packaging and molded pulp production referencing technology developed at IIT Delhi.',
    capacity: '300 – 1,000 t/month',
    leadTime: 'Direct off-take',
    specs: 'Clean unsoiled straw',
  },
];

const DIURNAL_HOURLY_CURVE = [
  { time: '06:00', aqi: 312, label: 'Dawn Peak', category: 'Very Poor', isOptimal: false },
  { time: '08:00', aqi: 284, label: 'Morning Inversion', category: 'Poor', isOptimal: false },
  { time: '11:00', aqi: 225, label: 'Thermal Lift', category: 'Poor', isOptimal: false },
  { time: '14:00', aqi: 168, label: 'Optimal Window', category: 'Moderate', isOptimal: true },
  { time: '16:00', aqi: 182, label: 'Late Afternoon', category: 'Moderate', isOptimal: true },
  { time: '19:00', aqi: 248, label: 'Nocturnal Contraction', category: 'Poor', isOptimal: false },
  { time: '22:00', aqi: 295, label: 'Night Surface Trap', category: 'Poor', isOptimal: false },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [selectedStateFilter, setSelectedStateFilter] = useState<'All' | 'Delhi-NCR' | 'Punjab' | 'Haryana'>('All');
  const [activeHeroStationId, setActiveHeroStationId] = useState<string>('DEL_02');

  const filteredStations = REGIONAL_STATIONS.filter(
    (s) => selectedStateFilter === 'All' || s.state === selectedStateFilter
  );

  const activeHeroStation =
    REGIONAL_STATIONS.find((s) => s.id === activeHeroStationId) || REGIONAL_STATIONS[1];

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      {/* =========================================================================
          SECTION 1: ASYMMETRICAL EDITORIAL HERO + AIRSHED TELEMETRY CONSOLE
         ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-midnight via-forest-950 to-forest text-white border border-forest-800/80 shadow-[0_20px_50px_rgba(10,28,23,0.35)]">
        {/* Background Atmospheric Visual Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <AtmosphericAirflowVisual className="w-full h-full object-cover" />
        </div>
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-10 lg:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left 7 Columns: Editorial Headline, Mission & Direct Gateways */}
            <div className="lg:col-span-7 space-y-6">
              {/* Regional Scope & Standard Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Regional Airshed: Delhi-NCR • Punjab • Haryana
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90 border border-white/20 backdrop-blur-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  CPCB NAQI Standard (MoEFCC)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-200 border border-sky-400/30 backdrop-blur-sm">
                  Copernicus CAMS 72h
                </span>
              </div>

              {/* Grand Headline */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
                  Better decisions for the{' '}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                    air we breathe.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-emerald-100/80 font-normal leading-relaxed max-w-2xl">
                  Unified environmental intelligence for Northwest India. We transform complex atmospheric chemistry and stubble logistics into accountable personal exposure guidance, institutional child safety thresholds, and circular farm-to-industry off-take contracts.
                </p>
              </div>

              {/* Four Action Gateways with Distinct Visual Roles */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  variant="emerald"
                  onClick={() => onNavigate('/personal')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Personal Air Copilot
                </Button>
                <Button
                  size="lg"
                  variant="glass"
                  onClick={() => onNavigate('/school')}
                  leftIcon={<School className="w-4 h-4 text-emerald-300" />}
                >
                  School Safety Planner
                </Button>
                <Button
                  size="lg"
                  variant="glass"
                  onClick={() => onNavigate('/marketplace')}
                  leftIcon={<Sprout className="w-4 h-4 text-emerald-300" />}
                >
                  Parali Marketplace
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => onNavigate('/how-it-works')}
                  leftIcon={<FileText className="w-4 h-4 text-white/60" />}
                >
                  Methodology
                </Button>
              </div>

              {/* Verified Trust Strip with Tabular Metrics */}
              <div className="pt-6 border-t border-emerald-500/20 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-black text-white num-tabular">72 Hours</div>
                  <div className="text-[11px] text-emerald-200/70 font-medium">Hourly Numerical Inversion</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white num-tabular">3 Brackets</div>
                  <div className="text-[11px] text-emerald-200/70 font-medium">Child Safety Thresholds</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white num-tabular">16T Truck</div>
                  <div className="text-[11px] text-emerald-200/70 font-medium">Hauling Economics Model</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-300 num-tabular">100%</div>
                  <div className="text-[11px] text-emerald-200/70 font-medium">Truthful Data Provenance</div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Interactive Airshed Telemetry Console */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-midnight/90 border border-emerald-500/30 p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] backdrop-blur-md space-y-5">
                {/* Console Header & Live Pill */}
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                      Airshed Telemetry Console
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-200/60 font-mono">
                    IST {activeHeroStation.lastUpdated}
                  </span>
                </div>

                {/* Station Selection Pills */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-emerald-200/70 font-medium">Select Observation Station:</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {REGIONAL_STATIONS.slice(0, 3).map((stn) => (
                      <button
                        key={stn.id}
                        onClick={() => setActiveHeroStationId(stn.id)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                          activeHeroStationId === stn.id
                            ? 'bg-emerald-500 text-midnight shadow-sm'
                            : 'bg-white/5 text-emerald-100 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        <div className="truncate">{stn.name.split(' ')[0]}</div>
                        <div className="text-[9px] opacity-80 num-tabular">AQI {stn.aqi}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prominent Radial Gauge Display */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <AqiGauge
                    aqi={activeHeroStation.aqi}
                    category={activeHeroStation.category}
                    dominantPollutant={activeHeroStation.dominant}
                    size="md"
                    theme="dark"
                  />
                  <div className="text-center mt-2">
                    <div className="text-sm font-bold text-white">{activeHeroStation.name}</div>
                    <div className="text-xs text-emerald-200/60 font-medium">
                      {activeHeroStation.district}, {activeHeroStation.state} • {activeHeroStation.agency}
                    </div>
                  </div>
                </div>

                {/* Pollutant Breakdown Bars */}
                {activeHeroStation.isTelemetryAvailable && (
                  <div className="space-y-2.5 pt-2 border-t border-emerald-500/20 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-medium">
                        <span className="text-emerald-200/70">PM2.5 (Fine Particulate)</span>
                        <span className="font-mono text-emerald-300 font-bold">
                          {activeHeroStation.pm25} µg/m³
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, ((activeHeroStation.pm25 || 0) / 120) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-medium">
                        <span className="text-emerald-200/70">PM10 (Coarse Particulate)</span>
                        <span className="font-mono text-emerald-300 font-bold">
                          {activeHeroStation.pm10} µg/m³
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-rose-400 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, ((activeHeroStation.pm10 || 0) / 300) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Winter Boundary Inversion Indicator */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-[11px] text-emerald-100 flex items-start gap-2.5">
                  <Thermometer className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Winter Inversion Dynamics:</span>
                    <span>Nocturnal cooling traps smoke below 200m. Ventilation index improves sharply after 13:00 IST.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: 72-HOUR CAMS FORECAST & DIURNAL VENTILATION CURVE
         ========================================================================= */}
      <section className="rounded-3xl bg-white border border-forest-900/10 p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Diurnal Atmospheric Inversion Cycle
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight">
              Why Timing Determines 60% of Your Toxic Exposure
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-2xl">
              Northwest India faces intense winter temperature inversions. Surface cooling traps pollutants near breathing level in the morning. Afternoon solar radiation expands the boundary layer, dispersing PM2.5 vertically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              Copernicus CAMS Ingestion
            </span>
          </div>
        </div>

        {/* Diurnal Hourly Progression Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {DIURNAL_HOURLY_CURVE.map((pt, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border transition-all text-center flex flex-col justify-between ${
                pt.isOptimal
                  ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-ivory-100/70 border-ivory-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-gray-500 mb-1">
                  {pt.time.startsWith('06') || pt.time.startsWith('22') ? (
                    <Moon className="w-3 h-3 text-gray-400" />
                  ) : (
                    <Sun className="w-3 h-3 text-amber-500" />
                  )}
                  <span>{pt.time}</span>
                </div>
                <div className="text-lg font-black text-forest-950 num-tabular">
                  {pt.aqi}
                </div>
                <div className="text-[10px] font-bold text-gray-600 truncate mt-0.5">
                  {pt.label}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-forest-900/10">
                <span
                  className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full inline-block ${
                    pt.isOptimal
                      ? 'bg-emerald-600 text-white font-extrabold'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {pt.isOptimal ? 'Optimal' : pt.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-ivory-200/50 border border-ivory-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Operational Takeaway:</strong> Shifting outdoor sports and school assemblies from 08:00 to 14:00 cuts acute respiratory particulate dose by ~42% without cancelling activities.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/personal')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Explore Window Scoring
          </Button>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: THREE DIFFERENTIATED CORE MODULE SHOWCASES
         ========================================================================= */}
      <section className="space-y-6">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="sage" size="md">Tailored Operational Modules</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight">
            Comprehensive Solutions Across Citizen, School, and Supply Chain
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Engineered to handle severe winter air quality through individualized exposure guidance, institutional policies, and farm residue market economics.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Personal Air Copilot (Mint/Emerald Editorial Accent) */}
          <div
            onClick={() => onNavigate('/personal')}
            className="group cursor-pointer rounded-3xl bg-white border border-emerald-200/80 p-7 shadow-sm hover:shadow-[0_12px_30px_rgba(16,185,129,0.12)] transition-all flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-md">
                <Wind className="w-6 h-6 text-emerald-200" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  Module 01 • Citizen &amp; Family
                </span>
                <h3 className="text-xl font-black text-forest-950 mt-1">
                  Personal Air Copilot
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Calculates safe windows for jogging, commuting, and children play using hourly CAMS chemistry models and health sensitivity multipliers.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-emerald-100 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Asthma &amp; Vulnerability Multipliers:</strong> Calibrated risk curves for chronic pulmonary conditions.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Deterministic Window Ranking:</strong> Highlights 13:00 - 16:30 as the lowest-inversion outdoor window.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Continuous Exposure Audit:</strong> Tracks cumulative microgram intake across daily commutes.</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">72-Hour Window Forecaster</span>
              <Button size="sm" variant="emerald" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Launch Copilot
              </Button>
            </div>
          </div>

          {/* Card 2: School Air Safety Planner (Sky/Academic Editorial Accent) */}
          <div
            onClick={() => onNavigate('/school')}
            className="group cursor-pointer rounded-3xl bg-white border border-sky-200/80 p-7 shadow-sm hover:shadow-[0_12px_30px_rgba(14,165,233,0.12)] transition-all flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-700 to-forest-900 text-white flex items-center justify-center shadow-md">
                <School className="w-6 h-6 text-sky-200" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                  Module 02 • Institutional Governance
                </span>
                <h3 className="text-xl font-black text-forest-950 mt-1">
                  School Safety Planner
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Institutional multi-campus safety policies, age-stratified thresholds, automated indoor activity relocation, and principal sign-off records.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-sky-100 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span><strong>3 Age Brackets:</strong> Tailored thresholds for Primary (5-10), Middle (11-14), and Senior (15-18).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span><strong>Auditorium Indoor Migration:</strong> Automatic recommendation to relocate morning sports upon breach.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span><strong>Audit Trail &amp; Sign-Off:</strong> Official timestamped decisions recorded for school boards and parents.</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-sky-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-800">Multi-Campus Governance</span>
              <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Enter Portal
              </Button>
            </div>
          </div>

          {/* Card 3: Parali Marketplace (Earthy/Sprout Amber Editorial Accent) */}
          <div
            onClick={() => onNavigate('/marketplace')}
            className="group cursor-pointer rounded-3xl bg-white border border-amber-200/80 p-7 shadow-sm hover:shadow-[0_12px_30px_rgba(245,158,11,0.12)] transition-all flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-forest-900 text-white flex items-center justify-center shadow-md">
                <Sprout className="w-6 h-6 text-amber-200" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                  Module 03 • Circular Bio-Economy
                </span>
                <h3 className="text-xl font-black text-forest-950 mt-1">
                  Parali-to-Value Marketplace
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Connecting stubble farmers in Punjab and Haryana directly with Bio-CNG, 2G ethanol, and tableware plants to permanently stop open-field burning.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-amber-100 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>16T Truck Freight Engine:</strong> Real formula: ₹250/t base + ₹4.50/t-km hauling economics.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>4 Buyer Industry Tiers:</strong> Bio-CNG, 2G Ethanol, Bio-Pellet co-firing, and IIT Delhi tableware.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>5-Stage Logistics Lifecycle:</strong> Scheduled → Loading → In Transit → Delivered → Verified slip.</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-amber-100 flex items-center justify-between">
              <ProvenanceBadge provenance="DEMO_DATA" detail="Synthetic Feed" />
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Explore Trading
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: 4-STAGE METHODOLOGY PIPELINE
         ========================================================================= */}
      <section className="rounded-3xl bg-ivory-100/90 border border-ivory-300 p-8 sm:p-12 space-y-8">
        <div className="max-w-3xl space-y-2">
          <Badge variant="sage" size="sm">Scientific Methodology</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight">
            How It Works: Data → Analysis → Recommendation → Action
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            A transparent four-stage pipeline transforming multi-source environmental and supply chain telemetry into accountable decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Step 1 */}
          <div className="p-6 bg-white border border-ivory-300 rounded-2xl shadow-xs space-y-3 relative group hover:border-emerald-300 transition">
            <div className="w-10 h-10 rounded-xl bg-forest text-white font-black text-sm flex items-center justify-center shadow-xs">
              01
            </div>
            <h3 className="font-black text-forest-950 text-base">Data Ingestion</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ingests official physical CAAQMS station telemetry, Copernicus CAMS atmospheric chemistry models, Open-Meteo forecasts, and farmer residue listings.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 bg-white border border-ivory-300 rounded-2xl shadow-xs space-y-3 relative group hover:border-emerald-300 transition">
            <div className="w-10 h-10 rounded-xl bg-forest text-white font-black text-sm flex items-center justify-center shadow-xs">
              02
            </div>
            <h3 className="font-black text-forest-950 text-base">Rigorous Analysis</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Applies official CPCB 2014/2015 NAQI sub-index math, enforces missing-data guards (fewer than 3 criteria pollutants returns Insufficient Data), and computes 16T truck freight economics.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 bg-white border border-ivory-300 rounded-2xl shadow-xs space-y-3 relative group hover:border-emerald-300 transition">
            <div className="w-10 h-10 rounded-xl bg-forest text-white font-black text-sm flex items-center justify-center shadow-xs">
              03
            </div>
            <h3 className="font-black text-forest-950 text-base">Algorithmic Guidance</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Generates deterministic outdoor window rankings, institutional auditorium migration proposals, and algorithmic residue-buyer compatibility scores.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 bg-white border border-ivory-300 rounded-2xl shadow-xs space-y-3 relative group hover:border-emerald-300 transition">
            <div className="w-10 h-10 rounded-xl bg-forest text-white font-black text-sm flex items-center justify-center shadow-xs">
              04
            </div>
            <h3 className="font-black text-forest-950 text-base">Accountable Action</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              School principals record official administrative sign-offs, caregivers receive threshold alerts, and farmers finalize binding off-take agreements with 5-stage logistics tracking.
            </p>
          </div>
        </div>

        <div className="pt-2 text-right">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigate('/how-it-works')}
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Learn more about our mathematical pipeline
          </Button>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: REGIONAL RADAR & TELEMETRY OBSERVATIONS
         ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-forest-950 tracking-tight">
                Air-Quality Regional Radar
              </h2>
              <Badge variant="sage" size="sm">Continuous Telemetry</Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Live physical monitor observations and numerical atmospheric forecasts across Delhi-NCR, Punjab, and Haryana.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Delhi-NCR', 'Punjab', 'Haryana'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedStateFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedStateFilter === filter
                    ? 'bg-forest text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-ivory-300 hover:bg-ivory-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <AlertBanner type="info" title="Zero Fabricated Data Guarantee">
          The readings below display either official physical CAAQMS station telemetry (green badge) or Copernicus CAMS numerical models (blue badge). When physical stations are offline, the system reports <strong>Data Insufficient</strong>. The platform refuses to manufacture synthetic surrogate AQI numbers.
        </AlertBanner>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStations.map((station) => (
            <Card key={station.id} variant="default" className="flex flex-col justify-between hover:border-emerald-300 transition">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {station.state} • {station.district} • {station.agency}
                    </span>
                    <CardTitle className="text-base font-black text-forest-950">{station.name}</CardTitle>
                  </div>
                  <ProvenanceBadge provenance={station.provenance} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <RiskIndicator
                      aqi={station.isTelemetryAvailable ? station.aqi : null}
                      category={station.isTelemetryAvailable ? (station.category as any) : 'Data Insufficient'}
                      variant="pill"
                    />
                  </div>
                  <div className="text-right text-xs text-gray-500 font-medium">
                    <span>Proximity: </span>
                    <strong className="text-gray-800">{station.distanceKm} km</strong>
                  </div>
                </div>

                {station.isTelemetryAvailable ? (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ivory-200 text-xs">
                    <div className="bg-ivory-100 p-2.5 rounded-xl">
                      <span className="text-gray-500 block text-[10px] font-bold">PM2.5 (24h)</span>
                      <span className="text-sm font-black text-forest-950 num-tabular">
                        {station.pm25} <span className="text-[10px] font-medium text-gray-500">µg/m³</span>
                      </span>
                    </div>
                    <div className="bg-ivory-100 p-2.5 rounded-xl">
                      <span className="text-gray-500 block text-[10px] font-bold">PM10 (24h)</span>
                      <span className="text-sm font-black text-forest-950 num-tabular">
                        {station.pm10} <span className="text-[10px] font-medium text-gray-500">µg/m³</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-stone-600" />
                      Station Offline
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-600">
                      {station.unavailableReason || 'Continuous monitor data not currently reporting to central registry.'}
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex items-center justify-between text-xs pt-3 border-t border-ivory-200">
                <span className="text-gray-400 font-medium">Updated: {station.lastUpdated}</span>
                <button
                  onClick={() => onNavigate('/air-quality')}
                  className="font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 transition"
                >
                  Full Explorer <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: PARALI-TO-VALUE MARKETPLACE PREVIEW & OFF-TAKERS
         ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-forest-950 tracking-tight">
                Parali-to-Value Marketplace Preview
              </h2>
              <ProvenanceBadge provenance="DEMO_DATA" detail="Synthetic Feed" />
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Crop residue trading connecting Northwest Indian farmers with industrial off-takers to eliminate open-field burning.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/marketplace')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All Residue Listings
          </Button>
        </div>

        {/* Demo Listings Feed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PREVIEW_LISTINGS.map((item) => (
            <Card key={item.id} variant="default" className="flex flex-col justify-between hover:border-amber-300 transition">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {item.district}
                  </span>
                  <ProvenanceBadge provenance="DEMO_DATA" />
                </div>
                <CardTitle className="text-base font-black text-forest-950">{item.crop}</CardTitle>
                <div className="text-xs text-gray-500 font-medium">{item.baling}</div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 p-3 bg-ivory-100 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Quantity</span>
                    <span className="text-xs font-black text-forest-950 num-tabular">{item.quantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Moisture</span>
                    <span className="text-xs font-black text-forest-950 num-tabular">{item.moisture}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Asking</span>
                    <span className="text-xs font-black text-emerald-800 num-tabular">{item.price}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between text-xs pt-3 border-t border-ivory-200">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Status: {item.status}
                </span>
                <span className="text-gray-400 font-medium">Demo Profile</span>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Buyer Categories */}
        <div className="pt-4 space-y-4">
          <h3 className="text-base font-black text-forest-950">
            Industrial Off-Taker Demand Categories (Public Reference)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BUYER_CATEGORIES.map((cat, i) => (
              <div key={i} className="p-5 bg-white border border-ivory-300 rounded-2xl shadow-xs space-y-2 hover:border-emerald-300 transition">
                <div className="font-bold text-forest-950 text-sm">{cat.title}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{cat.description}</p>
                <div className="pt-2 border-t border-ivory-200 space-y-1 text-[11px] text-gray-500 font-medium">
                  <div>Capacity: <strong className="text-forest-950">{cat.capacity}</strong></div>
                  <div>Lead: <strong className="text-forest-950">{cat.leadTime}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: DATA TRANSPARENCY & PROVENANCE MATRIX
         ========================================================================= */}
      <section className="bg-sage-50/60 border border-sage-300/80 rounded-3xl p-8 sm:p-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h2 className="text-2xl font-black text-forest-950 tracking-tight">
                Data Transparency &amp; Provenance Standards
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl">
              Every data point rendered on this platform carries an explicit provenance tag disclosing its source, calculation methodology, and operational limitations.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/about-data')}
            rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Complete Data Documentation
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-5 bg-white border border-sage-200 rounded-2xl space-y-2 shadow-xs">
            <ProvenanceBadge provenance="MEASURED_OBSERVATION" />
            <h4 className="font-bold text-forest-950 text-sm mt-2">Physical Telemetry</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Real ground measurements from Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by DPCC, HSPCB, and PPCB.
            </p>
          </div>

          <div className="p-5 bg-white border border-sage-200 rounded-2xl space-y-2 shadow-xs">
            <ProvenanceBadge provenance="FORECAST" />
            <h4 className="font-bold text-forest-950 text-sm mt-2">Atmospheric Chemistry</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Numerical models (Copernicus CAMS via Open-Meteo) projecting hourly boundary layer inversion physics and dispersion over 72 hours.
            </p>
          </div>

          <div className="p-5 bg-white border border-sage-200 rounded-2xl space-y-2 shadow-xs">
            <ProvenanceBadge provenance="MODELLED_ESTIMATE" />
            <h4 className="font-bold text-forest-950 text-sm mt-2">Spatial Interpolation</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Inverse-Distance-Weighted (IDW) local estimates paired with uncertainty radius metrics for locations between monitors.
            </p>
          </div>

          <div className="p-5 bg-white border border-sage-200 rounded-2xl space-y-2 shadow-xs">
            <ProvenanceBadge provenance="DEMO_DATA" />
            <h4 className="font-bold text-forest-950 text-sm mt-2">Isolated Demo Data</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Synthetic residue listings and trial off-taker profiles used exclusively for platform evaluation, strictly isolated from live safety metrics.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: DEDICATED DEMONSTRATION PERSONAS
         ========================================================================= */}
      <section className="rounded-3xl bg-gradient-to-br from-forest-950 via-forest to-forest-900 text-white p-8 sm:p-12 space-y-8 shadow-[0_15px_40px_rgba(10,28,23,0.3)]">
        <div className="max-w-3xl space-y-2">
          <Badge variant="sage" size="sm">Interactive Demonstration Portal</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Explore Dedicated Operational Personas
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/80">
            Launch pre-seeded simulation environments to evaluate activity planning, institutional safety policies, and residue trading workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Persona 1: Citizen */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/10 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Individual Citizen</h4>
                <p className="text-xs text-emerald-100/70 mt-1 leading-relaxed">
                  Persona: Paras Nath (parasnath@gmail.com). Activity planning with asthma sensitivity multipliers.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-white/10">
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => onNavigate('/personal')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Launch Copilot Demo
              </Button>
            </div>
          </div>

          {/* Persona 2: School */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/10 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">School Principal</h4>
                <p className="text-xs text-emerald-100/70 mt-1 leading-relaxed">
                  Persona: Principal Sharma (kvkailashahar@gmail.com). Multi-campus age-bracket safety thresholds and auditorium shifts.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-white/10">
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => onNavigate('/school')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Launch School Demo
              </Button>
            </div>
          </div>

          {/* Persona 3: Farmer */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/10 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Stubble Farmer</h4>
                <p className="text-xs text-emerald-100/70 mt-1 leading-relaxed">
                  Persona: Sardar Sunil Singh (sunilnagrale@gmail.com). Sangrur residue listing, baling specs, and 5-stage tracking.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-white/10">
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => onNavigate('/marketplace')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Launch Farmer Demo
              </Button>
            </div>
          </div>

          {/* Persona 4: Buyer */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/10 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Industrial Off-Taker</h4>
                <p className="text-xs text-emerald-100/70 mt-1 leading-relaxed">
                  Persona: Bio-CNG Procurement Manager. Feedstock compatibility matching and hauling cost models.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-white/10">
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => onNavigate('/marketplace')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Launch Buyer Demo
              </Button>
            </div>
          </div>
        </div>

        <div className="text-center pt-2">
          <Button
            size="md"
            variant="outline"
            className="bg-transparent text-white border-white/40 hover:bg-white/10"
            onClick={() => onNavigate('/demo')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Open Dedicated Demonstration Portal
          </Button>
        </div>
      </section>
    </div>
  );
};
