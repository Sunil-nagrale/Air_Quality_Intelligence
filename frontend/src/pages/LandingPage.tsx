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
  },
  {
    title: '2G Ethanol Bio-Refineries',
    description: 'Cellulosic biochemical refineries converting agricultural residue into advanced biofuels.',
    capacity: '5,000 – 10,000 t/month',
    leadTime: 'Scheduled rail/road fleet',
  },
  {
    title: 'Bio-Pellets & Thermal Co-Firing',
    description: 'Pelletizing plants producing biomass pellets for NTPC power station blending mandates.',
    capacity: '800 – 2,500 t/month',
    leadTime: '24 – 48 hours',
  },
  {
    title: 'Agri-Pulp & Tableware (Kriya Labs Ref.)',
    description: 'Biodegradable packaging and molded pulp production referencing technology developed at IIT Delhi.',
    capacity: '300 – 1,000 t/month',
    leadTime: 'Direct off-take',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [selectedStateFilter, setSelectedStateFilter] = useState<'All' | 'Delhi-NCR' | 'Punjab' | 'Haryana'>('All');

  const filteredStations = REGIONAL_STATIONS.filter(
    (s) => selectedStateFilter === 'All' || s.state === selectedStateFilter
  );

  return (
    <div className="space-y-16 pb-12">
      {/* SECTION 1: HEADER & PROVISIONAL BRANDING INTRO IS HANDLED BY APP HEADER */}

      {/* SECTION 2: HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sage-50 to-ivory-100 border border-sage-200 p-8 sm:p-12 lg:p-16">
        <div className="max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-forest text-white shadow-sm">
              <MapPin className="w-3.5 h-3.5" />
              Delhi-NCR • Punjab • Haryana
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sage-200 text-forest border border-sage-300">
              <ShieldCheck className="w-3.5 h-3.5 text-forest" />
              CPCB NAQI Standard (MoEFCC)
            </span>
            <ProvenanceBadge provenance="FORECAST" detail="Copernicus CAMS 72h" />
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-forest tracking-tight leading-[1.1]">
            Better decisions for the air we breathe.
          </h1>

          <p className="text-base sm:text-lg text-gray-700 font-normal leading-relaxed max-w-3xl">
            A unified environmental intelligence platform for Northwest India. We support personal outdoor exposure decisions, institutional school activity safety planning, and circular agricultural residue recovery across Delhi-NCR, Punjab, and Haryana.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => onNavigate('/personal')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Personal Air Copilot
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => onNavigate('/school')}
              leftIcon={<School className="w-4 h-4 text-forest" />}
            >
              School Safety Planner
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate('/marketplace')}
              leftIcon={<Sprout className="w-4 h-4 text-forest" />}
            >
              Parali Marketplace
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => onNavigate('/how-it-works')}
              leftIcon={<FileText className="w-4 h-4 text-gray-500" />}
            >
              How It Works
            </Button>
          </div>

          {/* Practical Metrics Summary */}
          <div className="pt-6 border-t border-sage-300/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-black text-forest">72 Hours</div>
              <div className="text-xs text-gray-600 font-medium">Hourly Numerical Forecast</div>
            </div>
            <div>
              <div className="text-2xl font-black text-forest">3 Brackets</div>
              <div className="text-xs text-gray-600 font-medium">School Age Safety Policies</div>
            </div>
            <div>
              <div className="text-2xl font-black text-forest">16T Truck</div>
              <div className="text-xs text-gray-600 font-medium">Hauling Economics Model</div>
            </div>
            <div>
              <div className="text-2xl font-black text-forest">100% Provenance</div>
              <div className="text-xs text-gray-600 font-medium">Zero Fabricated Live Data</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: ENTRY CARDS FOR ALL THREE MODULES */}
      <section className="space-y-6">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="sage" size="md">Core Platform Modules</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-forest tracking-tight">
            Integrated Solutions for the Regional Airshed
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Addressing acute winter air quality through citizen guidance, institutional child protection, and root-cause stubble diversion.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Personal Air Copilot */}
          <Card variant="interactive" className="flex flex-col justify-between" onClick={() => onNavigate('/personal')}>
            <CardHeader className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center shadow-md">
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-forest uppercase tracking-wider block">
                  Module 01 • Citizen & Family
                </span>
                <CardTitle className="text-xl mt-0.5">Personal Air Copilot</CardTitle>
                <CardDescription>
                  Evaluates outdoor activities against available air quality forecasts with personalized health sensitivity adjustments.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>72-Hour CAMS Forecast:</strong> Ingests atmospheric chemistry forecasts capturing diurnal inversion cycles.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>Deterministic Window Scoring:</strong> Ranks morning and afternoon hours for running, walking, and commuting.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>Health Sensitivities:</strong> Multipliers for asthma, cardiac vulnerability, child, and elderly sensitivities.</span>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Live & 72h Forecasts</span>
              <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Launch Copilot
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2: School Air Safety Planner */}
          <Card variant="interactive" className="flex flex-col justify-between" onClick={() => onNavigate('/school')}>
            <CardHeader className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center shadow-md">
                <School className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-forest uppercase tracking-wider block">
                  Module 02 • Institutional Governance
                </span>
                <CardTitle className="text-xl mt-0.5">School Air Safety Planner</CardTitle>
                <CardDescription>
                  Multi-campus policy management, age-bracket safety thresholds, alternative hour recommendations, and official sign-off.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>Age-Bracket Policies:</strong> Configurable rules for Primary (5-10), Middle (11-14), and Senior (15-18).</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>Auditorium Migration:</strong> Automatically recommends indoor shifts or afternoon postponement upon threshold breach.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>Administrative Governance:</strong> Distinguishes system recommendations from principal sign-off.</span>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Multi-Campus Ready</span>
              <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Enter Portal
              </Button>
            </CardFooter>
          </Card>

          {/* Card 3: Parali-to-Value Marketplace */}
          <Card variant="interactive" className="flex flex-col justify-between" onClick={() => onNavigate('/marketplace')}>
            <CardHeader className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center shadow-md">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-forest uppercase tracking-wider block">
                  Module 03 • Circular Bio-Economy
                </span>
                <CardTitle className="text-xl mt-0.5">Parali-to-Value Marketplace</CardTitle>
                <CardDescription>
                  Connects stubble farmers with industrial bio-CNG, ethanol, and tableware processors with freight distance calculation.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>Off-Taker Directory:</strong> Bio-pellet, Bio-CNG, 2G ethanol, and tableware referencing Kriya Labs IIT Delhi.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>16T Truck Freight Model:</strong> Regional hauling calculation: ₹250/t base + ₹4.5/t-km.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                <span><strong>5-Stage Logistics:</strong> Track Scheduled → Loading → In Transit → Delivered → Verified weighbridge slip.</span>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between">
              <ProvenanceBadge provenance="DEMO_DATA" detail="Synthetic Demo Feed" />
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Explore Trading
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* SECTION 4: HOW-IT-WORKS SECTION */}
      <section className="rounded-3xl bg-ivory-100 border border-ivory-300 p-8 sm:p-12 space-y-8">
        <div className="max-w-3xl space-y-2">
          <Badge variant="sage" size="sm">System Workflow</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-forest tracking-tight">
            How It Works: Data → Analysis → Recommendation → Action
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            A transparent four-stage pipeline transforming multi-source environmental and supply chain telemetry into accountable decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Step 1 */}
          <div className="p-5 bg-white border border-ivory-300 rounded-2xl shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-forest text-white font-bold text-sm flex items-center justify-center">
              1
            </div>
            <h3 className="font-bold text-forest text-sm">Data Ingestion</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ingests official physical CAAQMS station telemetry, Copernicus CAMS atmospheric chemistry models, Open-Meteo forecasts, and farmer residue listings.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 bg-white border border-ivory-300 rounded-2xl shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-forest text-white font-bold text-sm flex items-center justify-center">
              2
            </div>
            <h3 className="font-bold text-forest text-sm">Rigorous Analysis</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Applies official CPCB 2014/2015 NAQI sub-index math, enforces missing-data guards (fewer than 3 criteria pollutants returns Insufficient Data), and computes 16T truck freight economics.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 bg-white border border-ivory-300 rounded-2xl shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-forest text-white font-bold text-sm flex items-center justify-center">
              3
            </div>
            <h3 className="font-bold text-forest text-sm">Recommendation</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Generates deterministic outdoor window rankings, institutional auditorium migration proposals, and algorithmic residue-buyer compatibility scores.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 bg-white border border-ivory-300 rounded-2xl shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-forest text-white font-bold text-sm flex items-center justify-center">
              4
            </div>
            <h3 className="font-bold text-forest text-sm">Accountable Action</h3>
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
            Learn more about the 4-stage pipeline
          </Button>
        </div>
      </section>

      {/* SECTION 5: AIR-QUALITY PREVIEW */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-forest tracking-tight">
                Air-Quality Regional Preview
              </h2>
              <Badge variant="sage" size="sm">Regional Radar</Badge>
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
            <Card key={station.id} variant="default" className="flex flex-col justify-between">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {station.state} • {station.district} • {station.agency}
                    </span>
                    <CardTitle className="text-base">{station.name}</CardTitle>
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
                    <div className="bg-ivory-100 p-2 rounded-xl">
                      <span className="text-gray-500 block text-[10px] font-bold">PM2.5 (24h)</span>
                      <span className="text-sm font-extrabold text-forest">
                        {station.pm25} <span className="text-[10px] font-medium text-gray-500">µg/m³</span>
                      </span>
                    </div>
                    <div className="bg-ivory-100 p-2 rounded-xl">
                      <span className="text-gray-500 block text-[10px] font-bold">PM10 (24h)</span>
                      <span className="text-sm font-extrabold text-forest">
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

              <CardFooter className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Updated: {station.lastUpdated}</span>
                <button
                  onClick={() => onNavigate('/air-quality')}
                  className="font-bold text-forest hover:text-forest-900 inline-flex items-center gap-1"
                >
                  Full Explorer <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION 6: MARKETPLACE PREVIEW */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-forest tracking-tight">
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
            <Card key={item.id} variant="default" className="flex flex-col justify-between">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {item.district}
                  </span>
                  <ProvenanceBadge provenance="DEMO_DATA" />
                </div>
                <CardTitle className="text-base">{item.crop}</CardTitle>
                <div className="text-xs text-gray-500 font-medium">{item.baling}</div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 p-3 bg-ivory-100 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Quantity</span>
                    <span className="text-xs font-black text-forest">{item.quantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Moisture</span>
                    <span className="text-xs font-black text-forest">{item.moisture}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Asking</span>
                    <span className="text-xs font-black text-forest">{item.price}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage-200 text-forest">
                  Status: {item.status}
                </span>
                <span className="text-gray-400 font-medium">Demo Profile</span>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Buyer Categories */}
        <div className="pt-4 space-y-4">
          <h3 className="text-base font-bold text-forest">
            Industrial Off-Taker Demand Categories (Public Reference)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BUYER_CATEGORIES.map((cat, i) => (
              <div key={i} className="p-4 bg-white border border-ivory-300 rounded-2xl shadow-sm space-y-2">
                <div className="font-bold text-forest text-sm">{cat.title}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{cat.description}</p>
                <div className="pt-2 border-t border-ivory-200 flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>Capacity: {cat.capacity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: DATA TRANSPARENCY SECTION */}
      <section className="bg-sage-50 border border-sage-300 rounded-3xl p-8 sm:p-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-forest" />
              <h2 className="text-2xl font-black text-forest tracking-tight">
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
          <div className="p-4 bg-white border border-sage-200 rounded-2xl space-y-2">
            <ProvenanceBadge provenance="MEASURED_OBSERVATION" />
            <h4 className="font-bold text-forest text-sm mt-2">Physical Telemetry</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Real ground measurements from Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by DPCC, HSPCB, and PPCB.
            </p>
          </div>

          <div className="p-4 bg-white border border-sage-200 rounded-2xl space-y-2">
            <ProvenanceBadge provenance="FORECAST" />
            <h4 className="font-bold text-forest text-sm mt-2">Atmospheric Chemistry</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Numerical models (Copernicus CAMS via Open-Meteo) projecting hourly boundary layer inversion physics and dispersion over 72 hours.
            </p>
          </div>

          <div className="p-4 bg-white border border-sage-200 rounded-2xl space-y-2">
            <ProvenanceBadge provenance="MODELLED_ESTIMATE" />
            <h4 className="font-bold text-forest text-sm mt-2">Spatial Interpolation</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Inverse-Distance-Weighted (IDW) local estimates paired with uncertainty radius metrics for locations between monitors.
            </p>
          </div>

          <div className="p-4 bg-white border border-sage-200 rounded-2xl space-y-2">
            <ProvenanceBadge provenance="DEMO_DATA" />
            <h4 className="font-bold text-forest text-sm mt-2">Isolated Demo Data</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Synthetic residue listings and trial off-taker profiles used exclusively for platform evaluation, strictly isolated from live safety metrics.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8: ROLE-SELECTION AND DEMONSTRATION ENTRY POINT */}
      <section className="rounded-3xl bg-forest text-white p-8 sm:p-12 space-y-8">
        <div className="max-w-3xl space-y-2">
          <Badge variant="sage" size="sm">Interactive Demonstration Portal</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Explore Dedicated Operational Personas
          </h2>
          <p className="text-xs sm:text-sm text-sage-200">
            Launch pre-seeded simulation environments to evaluate activity planning, institutional safety policies, and residue trading workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Persona 1: Citizen */}
          <div className="bg-forest-800 border border-forest-700 rounded-2xl p-5 flex flex-col justify-between hover:bg-forest-700/80 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-forest-700 flex items-center justify-center text-sage-200">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Individual Citizen</h4>
                <p className="text-xs text-sage-200 mt-1 leading-relaxed">
                  Persona: Paras Nath (parasnath@gmail.com). Activity planning with asthma sensitivity multipliers.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-forest-700/60">
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
          <div className="bg-forest-800 border border-forest-700 rounded-2xl p-5 flex flex-col justify-between hover:bg-forest-700/80 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-forest-700 flex items-center justify-center text-sage-200">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">School Principal</h4>
                <p className="text-xs text-sage-200 mt-1 leading-relaxed">
                  Persona: Principal Sharma (kvkailashahar@gmail.com). Multi-campus age-bracket safety thresholds and auditorium shifts.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-forest-700/60">
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
          <div className="bg-forest-800 border border-forest-700 rounded-2xl p-5 flex flex-col justify-between hover:bg-forest-700/80 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-forest-700 flex items-center justify-center text-sage-200">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Stubble Farmer</h4>
                <p className="text-xs text-sage-200 mt-1 leading-relaxed">
                  Persona: Sardar Sunil Singh (sunilnagrale@gmail.com). Sangrur residue listing, baling specs, and 5-stage tracking.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-forest-700/60">
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
          <div className="bg-forest-800 border border-forest-700 rounded-2xl p-5 flex flex-col justify-between hover:bg-forest-700/80 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-forest-700 flex items-center justify-center text-sage-200">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Industrial Off-Taker</h4>
                <p className="text-xs text-sage-200 mt-1 leading-relaxed">
                  Persona: Bio-CNG Procurement Manager. Feedstock compatibility matching and hauling cost models.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-forest-700/60">
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

      {/* SECTION 9: FOOTER IS RENDERED BY APP COMPONENT */}
    </div>
  );
};
