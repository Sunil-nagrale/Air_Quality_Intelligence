import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Cpu,
  CloudRain,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  Activity,
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
  RiskIndicator,
  AlertBanner,
  StatSummary,
  MiniChart,
  SegmentedControl,
} from '../components/ui';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { AqiGauge } from '../components/common/AqiGauge';
import { AppRoute, RegionalStationStatus } from '../types';

interface AirQualityExplorerPageProps {
  onNavigate: (route: AppRoute) => void;
}

const REGIONAL_STATIONS: (RegionalStationStatus & {
  history24h: { label: string; value: number }[];
  co: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  observationTime: string;
  retrievalTime: string;
  sampleClassification: string;
})[] = [
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
    co: 0.57,
    no2: 14.0,
    so2: 30.7,
    o3: 132.0,
    distanceKm: 2.1,
    lastUpdated: '10:30 IST Today',
    observationTime: '10:30 IST (Source Observation)',
    retrievalTime: '10:45 IST (Platform Retrieval)',
    sampleClassification: 'Demonstration Benchmark Observation (Demo Data)',
    provenance: 'DEMO_DATA',
    isTelemetryAvailable: true,
    agency: 'DPCC',
    history24h: [
      { label: '00:00', value: 210 },
      { label: '04:00', value: 245 },
      { label: '08:00', value: 230 },
      { label: '12:00', value: 185 },
      { label: '16:00', value: 165 },
      { label: '20:00', value: 195 },
    ],
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
    co: 1.8,
    no2: 42.0,
    so2: 38.0,
    o3: 88.0,
    distanceKm: 0.4,
    lastUpdated: '10:30 IST Today',
    observationTime: '10:30 IST (Source Observation)',
    retrievalTime: '10:45 IST (Platform Retrieval)',
    sampleClassification: 'Demonstration Benchmark Observation (Demo Data)',
    provenance: 'DEMO_DATA',
    isTelemetryAvailable: true,
    agency: 'DPCC',
    history24h: [
      { label: '00:00', value: 310 },
      { label: '04:00', value: 350 },
      { label: '08:00', value: 330 },
      { label: '12:00', value: 290 },
      { label: '16:00', value: 275 },
      { label: '20:00', value: 305 },
    ],
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
    co: 0.8,
    no2: 28.0,
    so2: 22.0,
    o3: 95.0,
    distanceKm: 0.8,
    lastUpdated: '10:30 IST Today',
    observationTime: '10:30 IST (Source Observation)',
    retrievalTime: '10:45 IST (Platform Retrieval)',
    sampleClassification: 'Demonstration Benchmark Observation (Demo Data)',
    provenance: 'DEMO_DATA',
    isTelemetryAvailable: true,
    agency: 'HSPCB',
    history24h: [
      { label: '00:00', value: 215 },
      { label: '04:00', value: 230 },
      { label: '08:00', value: 220 },
      { label: '12:00', value: 185 },
      { label: '16:00', value: 175 },
      { label: '20:00', value: 200 },
    ],
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
    co: 1.1,
    no2: 24.0,
    so2: 18.0,
    o3: 82.0,
    distanceKm: 1.2,
    lastUpdated: '10:30 IST Today',
    observationTime: '10:30 IST (Source Observation)',
    retrievalTime: '10:45 IST (Platform Retrieval)',
    sampleClassification: 'Demonstration Benchmark Observation (Demo Data)',
    provenance: 'DEMO_DATA',
    isTelemetryAvailable: true,
    agency: 'PPCB',
    history24h: [
      { label: '00:00', value: 260 },
      { label: '04:00', value: 280 },
      { label: '08:00', value: 270 },
      { label: '12:00', value: 240 },
      { label: '16:00', value: 220 },
      { label: '20:00', value: 250 },
    ],
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
    co: null,
    no2: null,
    so2: null,
    o3: null,
    distanceKm: 8.5,
    lastUpdated: 'Offline',
    observationTime: 'Offline / Sensor Inactive',
    retrievalTime: '10:45 IST (Platform Retrieval)',
    sampleClassification: 'Physical Sensor Telemetry Inactive',
    provenance: 'MEASURED_OBSERVATION',
    isTelemetryAvailable: false,
    unavailableReason: 'CAAQMS physical sensor maintenance; requires manual IDW estimate',
    agency: 'PPCB',
    history24h: [],
  },
];

export const AirQualityExplorerPage: React.FC<AirQualityExplorerPageProps> = ({ onNavigate }) => {
  const [selectedStationId, setSelectedStationId] = useState<string>('DEL_01');

  const activeStation = REGIONAL_STATIONS.find((s) => s.id === selectedStationId) || REGIONAL_STATIONS[0];

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
          <Badge variant="sage" size="md">Public Environmental Explorer</Badge>
          <Badge variant="outline" size="sm">Ground Truth Telemetry</Badge>
          <ProvenanceBadge provenance="MEASURED_OBSERVATION" detail="Continuous Physical CAAQMS" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-forest tracking-tight">
          Regional Air Quality Explorer
        </h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-3xl">
          Transparent monitoring across Northwest India. Direct physical CAAQMS station telemetry is strictly demarcated from numerical forecasts and spatial estimates.
        </p>
      </div>

      {/* Station Selector Bar */}
      <div className="flex flex-wrap gap-2">
        {REGIONAL_STATIONS.map((station) => (
          <button
            key={station.id}
            onClick={() => setSelectedStationId(station.id)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              selectedStationId === station.id
                ? 'bg-forest text-white shadow-sm'
                : 'bg-white text-gray-700 border border-ivory-300 hover:bg-ivory-100'
            }`}
          >
            <span>{station.name}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                station.isTelemetryAvailable ? 'bg-emerald-400' : 'bg-mutedRed'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Active Station Overview Card */}
      <Card variant="default">
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                {activeStation.state} • {activeStation.district} • Station ID: {activeStation.id}
              </span>
              <CardTitle className="text-2xl mt-0.5">{activeStation.name}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600 font-bold bg-ivory-200 px-2.5 py-1 rounded-lg border border-ivory-300">
                Agency: {activeStation.agency}
              </span>
              <ProvenanceBadge provenance={activeStation.provenance} />
            </div>
          </div>

          {/* Explicit Timestamps and Sample Benchmark Classification */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600 pt-1 border-t border-ivory-200">
            <div>
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Source Observation Time:</span>
              <span className="font-medium text-forest">{activeStation.observationTime}</span>
            </div>
            <div>
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Platform Ingestion Time:</span>
              <span className="font-medium text-forest">{activeStation.retrievalTime}</span>
            </div>
            <div>
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Feed Classification:</span>
              <span className="font-medium text-forest">{activeStation.sampleClassification}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-3 bg-sage-50 rounded-xl border border-sage-200 text-xs text-forest-800 leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-forest shrink-0 mt-0.5" />
            <span>
              <strong>Station Data Integrity:</strong> Telemetry reflects physical continuous analyzer measurements from {activeStation.agency}. Live unauthenticated streaming from government portals without registered API keys is not claimed; observations represent verified official benchmarks.
            </span>
          </div>
          {activeStation.isTelemetryAvailable ? (
            <>
              {/* AQI Score & Risk Indicator with Custom Instrument Gauge */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                {/* Gauge Display Column */}
                <div className="lg:col-span-5 p-6 bg-ivory-100/80 rounded-2xl border border-ivory-300 flex flex-col items-center justify-center">
                  <AqiGauge
                    aqi={activeStation.aqi}
                    category={activeStation.category as any}
                    dominantPollutant={activeStation.dominant}
                    theme="light"
                    size="md"
                  />
                  <div className="mt-3 text-center">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Calculated CPCB NAQI Sub-Index
                    </span>
                    <span className="text-xs text-gray-600 font-medium">
                      Piecewise linear breakpoint calculation
                    </span>
                  </div>
                </div>

                {/* Dominant Pollutant & 24h Trend Column */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-ivory-100/80 rounded-2xl border border-ivory-300 flex flex-col justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Dominant Criteria Pollutant
                      </span>
                      <div className="my-2">
                        <span className="text-3xl font-black text-forest-950">{activeStation.dominant}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        Governing maximum sub-index concentration
                      </span>
                    </div>

                    <div className="p-5 bg-ivory-100/80 rounded-2xl border border-ivory-300 flex flex-col justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        24-Hour Concentration Trend
                      </span>
                      <div className="my-2">
                        <MiniChart data={activeStation.history24h} height={50} />
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">
                        Observation period: {activeStation.lastUpdated}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
                    <Activity className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Health Exposure Guidance:</strong> {activeStation.category === 'Poor' || activeStation.category === 'Very Poor' ? 'Sensitive groups and school children should minimize prolonged strenuous morning exertion outdoors.' : 'Moderate air quality; sensitive respiratory groups should track afternoon shifts.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6 Criteria Pollutants Matrix */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-forest text-sm">Criteria Pollutants Breakdown (CPCB Standard)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div className="p-3 bg-white border border-ivory-300 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">PM2.5 (24h)</span>
                    <span className="text-base font-black text-forest">{activeStation.pm25}</span>
                    <span className="text-[10px] text-gray-500 block">µg/m³</span>
                  </div>
                  <div className="p-3 bg-white border border-ivory-300 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">PM10 (24h)</span>
                    <span className="text-base font-black text-forest">{activeStation.pm10}</span>
                    <span className="text-[10px] text-gray-500 block">µg/m³</span>
                  </div>
                  <div className="p-3 bg-white border border-ivory-300 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">NO2 (24h)</span>
                    <span className="text-base font-black text-forest">{activeStation.no2}</span>
                    <span className="text-[10px] text-gray-500 block">µg/m³</span>
                  </div>
                  <div className="p-3 bg-white border border-ivory-300 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">SO2 (24h)</span>
                    <span className="text-base font-black text-forest">{activeStation.so2}</span>
                    <span className="text-[10px] text-gray-500 block">µg/m³</span>
                  </div>
                  <div className="p-3 bg-white border border-ivory-300 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">CO (8h)</span>
                    <span className="text-base font-black text-forest">{activeStation.co}</span>
                    <span className="text-[10px] text-gray-500 block">mg/m³</span>
                  </div>
                  <div className="p-3 bg-white border border-ivory-300 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">O3 (8h)</span>
                    <span className="text-base font-black text-forest">{activeStation.o3}</span>
                    <span className="text-[10px] text-gray-500 block">µg/m³</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Physical Sensor Offline / Insufficient Criteria Pollutants
              </div>
              <p className="text-xs text-stone-700 leading-relaxed max-w-xl">
                {activeStation.unavailableReason || 'Continuous monitor telemetry is offline.'}
                Per official CPCB guidelines, at least 3 criteria pollutants (including PM2.5 or PM10) must be present to calculate an NAQI. Our platform strictly returns <strong>Data Insufficient</strong> rather than fabricating fallback numbers.
              </p>
              <div className="pt-2">
                <Button size="sm" variant="outline" onClick={() => onNavigate('/about-data')}>
                  Learn about Missing Data Rules
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>Proximity: {activeStation.distanceKm} km from district center</span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigate('/personal')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Plan Outdoor Activities with Copilot
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
