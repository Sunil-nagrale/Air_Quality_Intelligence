import {
  AirObservation,
  AirForecast,
  LocalAirEstimate,
  EnvironmentalContext,
  PollutantValues,
} from '../types';
import { IAirRepository } from './dynamoDbAirRepository';

export class AirRepository implements IAirRepository {
  private observations = new Map<string, AirObservation>(); // Key: `${stationId}#${timestamp}`
  private latestObservations = new Map<string, AirObservation>(); // Key: stationId
  private forecasts = new Map<string, AirForecast>(); // Key: `${lat.toFixed(4)}#${lon.toFixed(4)}`
  private estimates = new Map<string, LocalAirEstimate>();
  private weatherContexts = new Map<string, EnvironmentalContext>();

  constructor() {
    this.seedDefaultHistoricalObservations();
  }

  private seedDefaultHistoricalObservations(): void {
    // Seed initial 24h realistic observation history for benchmark stations with deliberate missing intervals
    const stations = [
      { id: 'DEL_ANAND_VIHAR', name: 'Anand Vihar, Delhi', district: 'East Delhi', state: 'Delhi-NCR', agency: 'DPCC', lat: 28.6469, lon: 77.3160, baseAqi: 284 },
      { id: 'DEL_MANDIR_MARG', name: 'Mandir Marg, Central Delhi', district: 'New Delhi', state: 'Delhi-NCR', agency: 'DPCC', lat: 28.6258, lon: 77.2014, baseAqi: 177 },
      { id: 'HR_GURUGRAM_SEC51', name: 'Sector 51, Gurugram', district: 'Gurugram', state: 'Haryana', agency: 'HSPCB', lat: 28.4282, lon: 77.0722, baseAqi: 192 },
      { id: 'PB_LUDHIANA_PAU', name: 'PAU, Ludhiana', district: 'Ludhiana', state: 'Punjab', agency: 'PPCB', lat: 30.9010, lon: 75.8073, baseAqi: 225 },
      { id: 'DEL_01', name: 'Anand Vihar Reference', district: 'East Delhi', state: 'Delhi-NCR', agency: 'DPCC', lat: 28.6469, lon: 77.3160, baseAqi: 280 },
    ];

    const now = Date.now();
    for (const st of stations) {
      for (let h = 0; h < 24; h++) {
        // Deliberate missing data interval between hours 14 and 16 to verify gap handling
        if (h === 14 || h === 15) continue;

        const ts = new Date(now - h * 3600 * 1000).toISOString();
        const diurnalShift = (h % 24 >= 6 && h % 24 <= 18) ? -15 : 25;
        const aqi = Math.max(50, st.baseAqi + diurnalShift - (h % 5) * 4);

        const obs: AirObservation = {
          stationId: st.id,
          stationName: st.name,
          district: st.district,
          state: st.state,
          coordinates: { lat: st.lat, lon: st.lon },
          agency: st.agency,
          aqi,
          category: aqi > 300 ? 'Very Poor' : aqi > 200 ? 'Poor' : aqi > 100 ? 'Moderate' : 'Satisfactory',
          dominantPollutant: 'PM2.5',
          pollutants: {
            pm25: Math.round(aqi * 0.42 * 10) / 10,
            pm10: Math.round(aqi * 0.95 * 10) / 10,
            no2: 24.5,
            so2: 18.2,
            co: 0.9,
            o3: 65.0,
          },
          observationTimestamp: ts,
          sourceTimezone: 'Asia/Kolkata',
          ingestionTimestamp: ts,
          provenance: 'DEMO_DATA',
          isTelemetryAvailable: true,
        };

        const key = `${st.id}#${ts}`;
        this.observations.set(key, obs);
        if (h === 0) {
          this.latestObservations.set(st.id, obs);
        }
      }
    }
  }

  async saveObservation(obs: AirObservation): Promise<AirObservation> {
    const key = `${obs.stationId}#${obs.observationTimestamp}`;
    this.observations.set(key, obs);
    this.latestObservations.set(obs.stationId, obs);
    return obs;
  }

  async getLatestObservation(stationId: string): Promise<AirObservation | null> {
    return this.latestObservations.get(stationId) || null;
  }

  async getObservationHistory(stationId: string, hours = 24): Promise<AirObservation[]> {
    const results: AirObservation[] = [];
    for (const obs of this.observations.values()) {
      if (obs.stationId === stationId) {
        results.push(obs);
      }
    }
    results.sort((a, b) => b.observationTimestamp.localeCompare(a.observationTimestamp));
    return results.slice(0, hours);
  }

  async getObservationsByStationAndRange(
    stationId: string,
    startIso: string,
    endIso: string,
    pollutant?: keyof PollutantValues
  ): Promise<AirObservation[]> {
    const results: AirObservation[] = [];
    for (const obs of this.observations.values()) {
      if (
        obs.stationId === stationId &&
        obs.observationTimestamp >= startIso &&
        obs.observationTimestamp <= endIso
      ) {
        if (!pollutant || (obs.pollutants && obs.pollutants[pollutant] !== undefined)) {
          results.push(obs);
        }
      }
    }
    results.sort((a, b) => a.observationTimestamp.localeCompare(b.observationTimestamp));
    return results;
  }

  async saveForecast(forecast: AirForecast): Promise<AirForecast> {
    const key = `${forecast.coordinates.lat.toFixed(4)}#${forecast.coordinates.lon.toFixed(4)}`;
    this.forecasts.set(key, forecast);
    return forecast;
  }

  async getLatestForecast(lat: number, lon: number): Promise<AirForecast | null> {
    const key = `${lat.toFixed(4)}#${lon.toFixed(4)}`;
    return this.forecasts.get(key) || null;
  }

  async getForecast(lat: number, lon: number): Promise<AirForecast | null> {
    return this.getLatestForecast(lat, lon);
  }

  async saveLocalEstimate(estimate: LocalAirEstimate): Promise<LocalAirEstimate> {
    const key = `${estimate.coordinates.lat.toFixed(4)}#${estimate.coordinates.lon.toFixed(4)}`;
    this.estimates.set(key, estimate);
    return estimate;
  }

  async saveEstimate(estimate: LocalAirEstimate): Promise<LocalAirEstimate> {
    return this.saveLocalEstimate(estimate);
  }

  async getEstimate(lat: number, lon: number): Promise<LocalAirEstimate | null> {
    const key = `${lat.toFixed(4)}#${lon.toFixed(4)}`;
    return this.estimates.get(key) || null;
  }

  async saveWeatherContext(arg1: any, arg2: any, arg3?: any): Promise<any> {
    let lat: number;
    let lon: number;
    let ctx: EnvironmentalContext;
    if (typeof arg1 === 'number') {
      lat = arg1;
      lon = arg2;
      ctx = arg3;
    } else {
      ctx = arg1;
      lat = arg2;
      lon = arg3;
    }
    const key = `${lat.toFixed(4)}#${lon.toFixed(4)}`;
    this.weatherContexts.set(key, ctx);
    return ctx;
  }

  async getLatestWeatherContext(lat: number, lon: number): Promise<EnvironmentalContext | null> {
    const key = `${lat.toFixed(4)}#${lon.toFixed(4)}`;
    return this.weatherContexts.get(key) || null;
  }

  async getWeatherContext(lat: number, lon: number): Promise<EnvironmentalContext | null> {
    return this.getLatestWeatherContext(lat, lon);
  }

  getAllLatestObservations(): AirObservation[] {
    return Array.from(this.latestObservations.values());
  }

  clear(): void {
    this.observations.clear();
    this.latestObservations.clear();
    this.forecasts.clear();
    this.estimates.clear();
    this.weatherContexts.clear();
  }
}

export const inMemoryAirRepository = new AirRepository();

let _activeAirRepo: IAirRepository | null = null;
export function getAirRepository(): IAirRepository {
  if (!_activeAirRepo) {
    const { isDynamoDbConfigured } = require('./config');
    if (isDynamoDbConfigured()) {
      const { DynamoDbAirRepository } = require('./dynamoDbAirRepository');
      _activeAirRepo = new DynamoDbAirRepository();
    } else {
      _activeAirRepo = inMemoryAirRepository;
    }
  }
  return _activeAirRepo!;
}

export const airRepository: IAirRepository = new Proxy({} as IAirRepository, {
  get(_target, prop) {
    const instance = getAirRepository() as any;
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

