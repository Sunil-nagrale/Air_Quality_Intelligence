import { CPCBNaqiResult, DataProvenance, PollutantValues } from '../types';
import { calculateCPCBNaqi } from './cpcbNaqi';
import { calculateHaversineDistanceKm } from './matchingEngine';

export interface StationMetadata {
  stationId: string;
  name: string;
  district: string;
  state: string;
  coordinates: { lat: number; lon: number };
  agency: 'CPCB' | 'DPCC' | 'PPCB' | 'HSPCB';
  lastKnownValues?: PollutantValues;
  lastObservedAt?: string;
  isOnline: boolean;
}

// Officially cataloged regional CAAQMS monitoring stations
export const REGIONAL_STATIONS: StationMetadata[] = [
  {
    stationId: 'DEL_ANAND_VIHAR',
    name: 'Anand Vihar, Delhi',
    district: 'East Delhi',
    state: 'Delhi-NCR',
    coordinates: { lat: 28.6469, lon: 77.3160 },
    agency: 'DPCC',
    isOnline: true,
  },
  {
    stationId: 'DEL_PUNJABI_BAGH',
    name: 'Punjabi Bagh, Delhi',
    district: 'West Delhi',
    state: 'Delhi-NCR',
    coordinates: { lat: 28.6740, lon: 77.1310 },
    agency: 'DPCC',
    isOnline: true,
  },
  {
    stationId: 'DEL_MANDIR_MARG',
    name: 'Mandir Marg, Central Delhi',
    district: 'New Delhi',
    state: 'Delhi-NCR',
    coordinates: { lat: 28.6258, lon: 77.2014 },
    agency: 'DPCC',
    isOnline: true,
  },
  {
    stationId: 'HR_GURUGRAM_SEC51',
    name: 'Sector 51, Gurugram',
    district: 'Gurugram',
    state: 'Haryana',
    coordinates: { lat: 28.4282, lon: 77.0722 },
    agency: 'HSPCB',
    isOnline: true,
  },
  {
    stationId: 'PB_LUDHIANA_PAU',
    name: 'PAU, Ludhiana',
    district: 'Ludhiana',
    state: 'Punjab',
    coordinates: { lat: 30.9010, lon: 75.8073 },
    agency: 'PPCB',
    isOnline: true,
  },
  {
    stationId: 'PB_PATIALA_CIVIL_LINES',
    name: 'Civil Lines, Patiala',
    district: 'Patiala',
    state: 'Punjab',
    coordinates: { lat: 30.3400, lon: 76.3800 },
    agency: 'PPCB',
    isOnline: true,
  },
  {
    stationId: 'HR_KARNAL_SECTOR12',
    name: 'Sector 12, Karnal',
    district: 'Karnal',
    state: 'Haryana',
    coordinates: { lat: 29.6857, lon: 76.9905 },
    agency: 'HSPCB',
    isOnline: true,
  },
];

export function findNearestStation(
  lat: number,
  lon: number
): { station: StationMetadata; distanceKm: number } {
  let nearest = REGIONAL_STATIONS[0];
  let minDistance = calculateHaversineDistanceKm(
    lat,
    lon,
    nearest.coordinates.lat,
    nearest.coordinates.lon
  );

  for (const st of REGIONAL_STATIONS) {
    const dist = calculateHaversineDistanceKm(lat, lon, st.coordinates.lat, st.coordinates.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = st;
    }
  }

  return { station: nearest, distanceKm: minDistance };
}

export async function fetchLiveOpenMeteoForecast(
  lat: number,
  lon: number,
  hoursAhead: number = 72
): Promise<CPCBNaqiResult[]> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&forecast_hours=${hoursAhead}&timezone=Asia%2FKolkata`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = (await res.json()) as any;
    const hourly = data.hourly;
    if (!hourly || !hourly.time) {
      throw new Error('Invalid Open-Meteo response structure');
    }

    const results: CPCBNaqiResult[] = [];

    for (let i = 0; i < hourly.time.length; i++) {
      const values: PollutantValues = {
        pm10: hourly.pm10?.[i],
        pm25: hourly.pm2_5?.[i],
        co: hourly.carbon_monoxide?.[i] ? hourly.carbon_monoxide[i] / 1000 : undefined, // convert ug/m3 to mg/m3
        no2: hourly.nitrogen_dioxide?.[i],
        so2: hourly.sulphur_dioxide?.[i],
        o3: hourly.ozone?.[i],
      };

      const result = calculateCPCBNaqi(
        values,
        'FORECAST',
        'Copernicus CAMS Atmospheric Chemistry Model (Open-Meteo)',
        hourly.time[i]
      );
      results.push(result);
    }

    return results;
  } catch (error: any) {
    // Return empty array on failure so callers know forecast is unavailable
    console.error('Failed to fetch Open-Meteo air quality forecast:', error.message);
    return [];
  }
}

export function computeModelledLocalEstimate(
  lat: number,
  lon: number,
  stationReadings: Array<{ station: StationMetadata; values: PollutantValues }>
): CPCBNaqiResult {
  const MAX_IDW_RADIUS_KM = 50.0;

  if (!stationReadings || stationReadings.length === 0) {
    return {
      aqi: null,
      category: 'Insufficient Data',
      dominantPollutant: null,
      subIndices: {},
      isSufficientData: false,
      missingPollutants: ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'],
      provenance: 'MODELLED_ESTIMATE',
      timestamp: new Date().toISOString(),
      stationOrModelInfo: 'Local spatial interpolation unavailable: zero ground monitoring stations found in area.',
    };
  }

  // Calculate distances to all available stations
  const stationsWithDistance = stationReadings.map(item => ({
    ...item,
    distanceKm: calculateHaversineDistanceKm(
      lat,
      lon,
      item.station.coordinates.lat,
      item.station.coordinates.lon
    ),
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  const nearestDistance = stationsWithDistance[0].distanceKm;
  const stationsWithinRadius = stationsWithDistance.filter(s => s.distanceKm <= MAX_IDW_RADIUS_KM);

  // Defensible criterion: At least 2 active stations within 50 km are required for spatial interpolation.
  // Using 1 station or stations > 50 km away is physically misleading and produces false street-level precision.
  if (stationsWithinRadius.length < 2) {
    return {
      aqi: null,
      category: 'Insufficient Data',
      dominantPollutant: null,
      subIndices: {},
      isSufficientData: false,
      missingPollutants: ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'],
      provenance: 'MODELLED_ESTIMATE',
      timestamp: new Date().toISOString(),
      stationOrModelInfo: `Local spatial interpolation unavailable (insufficient monitoring density: found ${stationsWithinRadius.length} station within 50 km; nearest is ${nearestDistance.toFixed(1)} km). Rely on nearest ground station observation directly.`,
      uncertaintyRadiusKm: Math.round(nearestDistance * 10) / 10,
    };
  }

  // Inverse Distance Weighting (IDW) interpolation across eligible stations
  let totalWeight = 0;
  const interpolated: PollutantValues = { pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0 };

  for (const item of stationsWithinRadius) {
    const weight = 1 / Math.max(1, item.distanceKm * item.distanceKm);
    totalWeight += weight;

    if (item.values.pm25 !== undefined) (interpolated.pm25 as number) += item.values.pm25 * weight;
    if (item.values.pm10 !== undefined) (interpolated.pm10 as number) += item.values.pm10 * weight;
    if (item.values.no2 !== undefined) (interpolated.no2 as number) += item.values.no2 * weight;
    if (item.values.so2 !== undefined) (interpolated.so2 as number) += item.values.so2 * weight;
    if (item.values.co !== undefined) (interpolated.co as number) += item.values.co * weight;
    if (item.values.o3 !== undefined) (interpolated.o3 as number) += item.values.o3 * weight;
  }

  if (totalWeight > 0) {
    if (interpolated.pm25) interpolated.pm25 /= totalWeight;
    if (interpolated.pm10) interpolated.pm10 /= totalWeight;
    if (interpolated.no2) interpolated.no2 /= totalWeight;
    if (interpolated.so2) interpolated.so2 /= totalWeight;
    if (interpolated.co) interpolated.co /= totalWeight;
    if (interpolated.o3) interpolated.o3 /= totalWeight;
  }

  const result = calculateCPCBNaqi(
    interpolated,
    'MODELLED_ESTIMATE',
    `Inverse Distance Weighted (IDW) Interpolation (k=${stationsWithinRadius.length} stations, nearest: ${nearestDistance.toFixed(1)} km)`,
    new Date().toISOString(),
    '1h_indicative'
  );

  result.uncertaintyRadiusKm = Math.round(nearestDistance * 0.3 * 10) / 10;
  return result;
}
