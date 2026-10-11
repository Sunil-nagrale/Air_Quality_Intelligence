import {
  AirObservation,
  AirForecast,
  CPCBNaqiResult,
  DataProvenance,
  EnvironmentalContext,
  PollutantValues,
} from '../types';
import { calculateCPCBNaqi } from './cpcbNaqi';

export interface ProviderStatus {
  providerName: string;
  sourceType: 'OFFICIAL_GOVERNMENT_CAAQMS' | 'NUMERICAL_ATMOSPHERIC_MODEL' | 'WEATHER_DISPERSION_MODEL';
  isConfigured: boolean;
  status: 'OPERATIONAL' | 'CREDENTIAL_REQUIRED' | 'UNAVAILABLE' | 'RATE_LIMITED';
  endpoint: string;
  geographicCoverage: string;
  updateFrequency: string;
  pollutantsOrVariables: string[];
  termsAndLimitations: string;
  diagnosticMessage?: string;
}

// -----------------------------------------------------------------------------
// 1. CPCB Official Station Provider Adapter (data.gov.in / CAAQMS)
// -----------------------------------------------------------------------------
export class CpcbOfficialProvider {
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.DATA_GOV_IN_API_KEY || null;
  }

  getStatus(): ProviderStatus {
    const isKeySet = Boolean(this.apiKey && this.apiKey !== 'YOUR_DATA_GOV_IN_API_KEY');
    return {
      providerName: 'Central Pollution Control Board (CPCB) / data.gov.in',
      sourceType: 'OFFICIAL_GOVERNMENT_CAAQMS',
      isConfigured: isKeySet,
      status: isKeySet ? 'OPERATIONAL' : 'CREDENTIAL_REQUIRED',
      endpoint: 'https://api.data.gov.in/resource/3b0139f6-f7b9-4780-8237-b711045bcedc',
      geographicCoverage: 'Continuous Ambient Air Quality Monitoring Stations across Delhi-NCR, Punjab, Haryana & National Network',
      updateFrequency: 'Hourly to daily batch transmissions',
      pollutantsOrVariables: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3', 'Pb'],
      termsAndLimitations:
        'Official government data governed by National Data Sharing and Accessibility Policy (NDSAP). Requires individual registered API key. Machine streaming without credentials is not supported by CPCB.',
      diagnosticMessage: isKeySet
        ? 'DATA_GOV_IN_API_KEY is configured in backend environment.'
        : 'DATA_GOV_IN_API_KEY is not configured in backend environment. Live official station streaming is held in safe unavailable state.',
    };
  }

  async fetchStationObservation(
    stationId: string,
    stationName: string,
    district: string,
    state: string,
    coordinates: { lat: number; lon: number },
    agency: string
  ): Promise<AirObservation> {
    const ingestionTimestamp = new Date().toISOString();

    if (!this.apiKey || this.apiKey === 'YOUR_DATA_GOV_IN_API_KEY') {
      return {
        stationId,
        stationName,
        district,
        state,
        coordinates,
        agency,
        aqi: null,
        category: 'Insufficient Data',
        dominantPollutant: null,
        pollutants: {},
        observationTimestamp: ingestionTimestamp,
        sourceTimezone: 'Asia/Kolkata',
        ingestionTimestamp,
        provenance: 'MEASURED_OBSERVATION',
        isTelemetryAvailable: false,
        unavailableReason:
          'Official live CPCB/DPCC/PPCB telemetry is unavailable without a registered DATA_GOV_IN_API_KEY. Platform truthfully marks live station streaming as pending credential.',
      };
    }

    try {
      const url = `https://api.data.gov.in/resource/3b0139f6-f7b9-4780-8237-b711045bcedc?api-key=${encodeURIComponent(
        this.apiKey
      )}&format=json&filters[station]=${encodeURIComponent(stationName)}&limit=1`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`data.gov.in returned HTTP ${res.status}`);
      }

      const json = (await res.json()) as any;
      const records = json?.records;

      if (!records || records.length === 0) {
        return {
          stationId,
          stationName,
          district,
          state,
          coordinates,
          agency,
          aqi: null,
          category: 'Insufficient Data',
          dominantPollutant: null,
          pollutants: {},
          observationTimestamp: ingestionTimestamp,
          sourceTimezone: 'Asia/Kolkata',
          ingestionTimestamp,
          provenance: 'MEASURED_OBSERVATION',
          isTelemetryAvailable: false,
          unavailableReason: `No active records returned by data.gov.in for station '${stationName}'.`,
        };
      }

      const rec = records[0];
      const pollutants: PollutantValues = {
        pm25: rec.pollutant_id === 'PM2.5' ? parseFloat(rec.pollutant_avg) : undefined,
        pm10: rec.pollutant_id === 'PM10' ? parseFloat(rec.pollutant_avg) : undefined,
        no2: rec.pollutant_id === 'NO2' ? parseFloat(rec.pollutant_avg) : undefined,
        so2: rec.pollutant_id === 'SO2' ? parseFloat(rec.pollutant_avg) : undefined,
        co: rec.pollutant_id === 'CO' ? parseFloat(rec.pollutant_avg) : undefined,
        o3: rec.pollutant_id === 'OZONE' ? parseFloat(rec.pollutant_avg) : undefined,
        nh3: rec.pollutant_id === 'NH3' ? parseFloat(rec.pollutant_avg) : undefined,
      };

      const cpcbResult = calculateCPCBNaqi(
        pollutants,
        'MEASURED_OBSERVATION',
        `${agency} Station ${stationName}`,
        rec.last_update || ingestionTimestamp,
        '24h_regulatory'
      );

      return {
        stationId,
        stationName,
        district,
        state,
        coordinates,
        agency,
        aqi: cpcbResult.aqi,
        category: cpcbResult.category,
        dominantPollutant: cpcbResult.dominantPollutant,
        pollutants,
        observationTimestamp: rec.last_update ? new Date(rec.last_update).toISOString() : ingestionTimestamp,
        sourceTimezone: 'Asia/Kolkata',
        ingestionTimestamp,
        provenance: 'MEASURED_OBSERVATION',
        isTelemetryAvailable: cpcbResult.isSufficientData,
      };
    } catch (err: any) {
      return {
        stationId,
        stationName,
        district,
        state,
        coordinates,
        agency,
        aqi: null,
        category: 'Insufficient Data',
        dominantPollutant: null,
        pollutants: {},
        observationTimestamp: ingestionTimestamp,
        sourceTimezone: 'Asia/Kolkata',
        ingestionTimestamp,
        provenance: 'MEASURED_OBSERVATION',
        isTelemetryAvailable: false,
        unavailableReason: `CPCB provider fetch error: ${err.message}`,
      };
    }
  }
}

// -----------------------------------------------------------------------------
// 2. Open-Meteo Copernicus CAMS Atmospheric Model Forecast Provider
// -----------------------------------------------------------------------------
export class OpenMeteoCamsProvider {
  getStatus(): ProviderStatus {
    return {
      providerName: 'Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo Air Quality API',
      sourceType: 'NUMERICAL_ATMOSPHERIC_MODEL',
      isConfigured: true,
      status: 'OPERATIONAL',
      endpoint: 'https://air-quality-api.open-meteo.com/v1/air-quality',
      geographicCoverage: 'Global 0.25° / Regional 0.1° atmospheric chemistry model grid',
      updateFrequency: 'Twice daily model runs (00:00 & 12:00 UTC) with hourly forecast validity',
      pollutantsOrVariables: ['PM2.5', 'PM10', 'CO (ug/m3 -> mg/m3)', 'NO2', 'SO2', 'Ozone', 'Dust', 'AOD'],
      termsAndLimitations:
        'Free non-commercial tier (up to 10,000 calls/day). Numerical model predictions are indicative atmospheric simulations; NEVER represent as measured ground-truth station observations.',
    };
  }

  async fetchForecast(
    lat: number,
    lon: number,
    forecastHours: number = 72
  ): Promise<{
    forecast: AirForecast | null;
    naqiEvaluations: CPCBNaqiResult[];
    error?: string;
  }> {
    const issueTimestamp = new Date().toISOString();
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&forecast_hours=${forecastHours}&timezone=Asia%2FKolkata`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Open-Meteo CAMS API returned HTTP ${res.status}`);
      }

      const data = (await res.json()) as any;
      const hourly = data?.hourly;
      if (!hourly || !hourly.time || !Array.isArray(hourly.time)) {
        throw new Error('Malformed Open-Meteo hourly forecast response');
      }

      const hourlyPredictions: AirForecast['hourlyPredictions'] = [];
      const naqiEvaluations: CPCBNaqiResult[] = [];

      for (let i = 0; i < hourly.time.length; i++) {
        const rawTimeStr = hourly.time[i]; // E.g. '2026-10-10T14:00'
        // Treat as Asia/Kolkata timestamp and convert to UTC ISO
        const validTimestampUtc = new Date(rawTimeStr + '+05:30').toISOString();

        const coUgM3 = hourly.carbon_monoxide?.[i];
        // CPCB CO breakpoint is in mg/m3, Open-Meteo returns ug/m3
        const coMgM3 = coUgM3 !== undefined && coUgM3 !== null && !isNaN(coUgM3) ? coUgM3 / 1000 : undefined;

        const pollutants: PollutantValues = {
          pm25: hourly.pm2_5?.[i] !== undefined && !isNaN(hourly.pm2_5[i]) ? hourly.pm2_5[i] : undefined,
          pm10: hourly.pm10?.[i] !== undefined && !isNaN(hourly.pm10[i]) ? hourly.pm10[i] : undefined,
          no2: hourly.nitrogen_dioxide?.[i] !== undefined && !isNaN(hourly.nitrogen_dioxide[i]) ? hourly.nitrogen_dioxide[i] : undefined,
          so2: hourly.sulphur_dioxide?.[i] !== undefined && !isNaN(hourly.sulphur_dioxide[i]) ? hourly.sulphur_dioxide[i] : undefined,
          co: coMgM3,
          o3: hourly.ozone?.[i] !== undefined && !isNaN(hourly.ozone[i]) ? hourly.ozone[i] : undefined,
        };

        const naqi = calculateCPCBNaqi(
          pollutants,
          'FORECAST',
          'Copernicus CAMS European Regional Atmospheric Chemistry Ensemble',
          validTimestampUtc,
          '1h_indicative' // Numerical model values represent hourly indicative estimates
        );

        naqiEvaluations.push(naqi);

        hourlyPredictions.push({
          timestamp: validTimestampUtc,
          hourOffset: i,
          aqi: naqi.aqi !== null ? naqi.aqi : 0,
          category: naqi.category,
          dominantPollutant: naqi.dominantPollutant || 'PM2.5',
          pm25: pollutants.pm25 || 0,
          pm10: pollutants.pm10 || 0,
          no2: pollutants.no2,
          so2: pollutants.so2,
          co: pollutants.co,
          o3: pollutants.o3,
        });
      }

      const airForecast: AirForecast = {
        forecastId: `FCST_${lat.toFixed(4)}_${lon.toFixed(4)}_${Date.now()}`,
        coordinates: { lat, lon },
        modelName: 'Copernicus CAMS European Centre (via Open-Meteo)',
        issueTimestamp,
        hoursCount: hourlyPredictions.length,
        hourlyPredictions,
        provenance: 'FORECAST',
      };

      return {
        forecast: airForecast,
        naqiEvaluations,
      };
    } catch (err: any) {
      return {
        forecast: null,
        naqiEvaluations: [],
        error: `CAMS forecast unavailable: ${err.message}`,
      };
    }
  }
}

// -----------------------------------------------------------------------------
// 3. Open-Meteo Weather & Atmospheric Dispersion Context Provider
// -----------------------------------------------------------------------------
export class OpenMeteoWeatherProvider {
  getStatus(): ProviderStatus {
    return {
      providerName: 'Open-Meteo Weather & Dispersion Service',
      sourceType: 'WEATHER_DISPERSION_MODEL',
      isConfigured: true,
      status: 'OPERATIONAL',
      endpoint: 'https://api.open-meteo.com/v1/forecast',
      geographicCoverage: 'Global ECMWF / GFS meteorological numerical grids',
      updateFrequency: 'Hourly meteorological updates',
      pollutantsOrVariables: ['Temperature (°C)', 'Relative Humidity (%)', 'Wind Speed (km/h)', 'Wind Direction (deg)', 'Surface Pressure (hPa)'],
      termsAndLimitations:
        'Contextual meteorological parameters. Wind and temperature inform atmospheric ventilation and diurnal boundary layer behavior.',
    };
  }

  async fetchWeatherContext(
    lat: number,
    lon: number
  ): Promise<EnvironmentalContext | null> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure&timezone=Asia%2FKolkata`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Open-Meteo Weather returned HTTP ${res.status}`);
      }

      const data = (await res.json()) as any;
      const current = data?.current;
      if (!current) return null;

      const windSpeed = current.wind_speed_10m ?? 0;
      const currentHourIst = new Date().getUTCHours() + 5.5; // Approx IST hour
      const normHour = ((currentHourIst % 24) + 24) % 24;

      // Inversion risk assessment based on diurnal solar heating & wind
      let inversionRisk: EnvironmentalContext['inversionRisk'] = 'LOW';
      let dispersionFactor: EnvironmentalContext['dispersionFactor'] = 'FAVORABLE';

      if (normHour >= 5 && normHour <= 8.5) {
        // Morning transition: low wind traps nocturnal smoke/particulates
        inversionRisk = windSpeed < 7 ? 'HIGH' : 'MODERATE';
        dispersionFactor = 'POOR_STAGNANT';
      } else if (normHour >= 12 && normHour <= 16.5) {
        // Solar vertical convective mixing
        inversionRisk = 'LOW';
        dispersionFactor = 'FAVORABLE';
      } else if (normHour >= 20 || normHour <= 4) {
        // Nocturnal boundary layer collapse
        inversionRisk = windSpeed < 6 ? 'HIGH' : 'MODERATE';
        dispersionFactor = 'POOR_STAGNANT';
      } else {
        inversionRisk = 'MODERATE';
        dispersionFactor = 'MODERATE';
      }

      return {
        temperatureC: current.temperature_2m,
        relativeHumidityPercent: current.relative_humidity_2m,
        windSpeedKmH: windSpeed,
        windDirectionDegrees: current.wind_direction_10m,
        surfacePressureHPa: current.surface_pressure,
        inversionRisk,
        dispersionFactor,
        timestamp: new Date().toISOString(),
        source: 'ECMWF / Open-Meteo Numerical Meteorological Model',
      };
    } catch {
      return null;
    }
  }
}

export const cpcbOfficialProvider = new CpcbOfficialProvider();
export const openMeteoCamsProvider = new OpenMeteoCamsProvider();
export const openMeteoWeatherProvider = new OpenMeteoWeatherProvider();
