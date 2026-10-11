import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  cpcbOfficialProvider,
  openMeteoCamsProvider,
  openMeteoWeatherProvider,
} from '../src/services/airQualityProviders';
import {
  computeModelledLocalEstimate,
  StationMetadata,
} from '../src/services/airQualityService';
import { airRepository } from '../src/repositories/airRepository';
import { PollutantValues } from '../src/types';

describe('Air-Quality Data Pipeline, Providers & Spatial Normalization', () => {
  it('CPCB provider safely handles unconfigured credentials without fabricating data', async () => {
    const status = cpcbOfficialProvider.getStatus();
    assert.strictEqual(status.providerName, 'Central Pollution Control Board (CPCB) / data.gov.in');
    assert.strictEqual(status.sourceType, 'OFFICIAL_GOVERNMENT_CAAQMS');

    // Without key, fetchStationObservation returns truthful unavailable state
    const obs = await cpcbOfficialProvider.fetchStationObservation(
      'DEL_01',
      'Anand Vihar',
      'East Delhi',
      'Delhi-NCR',
      { lat: 28.6469, lon: 77.3160 },
      'DPCC'
    );
    assert.strictEqual(obs.isTelemetryAvailable, false);
    assert.strictEqual(obs.aqi, null);
    assert.strictEqual(obs.provenance, 'MEASURED_OBSERVATION');
    assert.ok(obs.unavailableReason?.includes('DATA_GOV_IN_API_KEY'));
  });

  it('Open-Meteo CAMS provider status documents forecast provenance', () => {
    const status = openMeteoCamsProvider.getStatus();
    assert.strictEqual(status.sourceType, 'NUMERICAL_ATMOSPHERIC_MODEL');
    assert.strictEqual(status.status, 'OPERATIONAL');
    assert.ok(status.termsAndLimitations.includes('NEVER represent as measured ground-truth'));
  });

  it('Defensible IDW Spatial Estimation: refuses interpolation when fewer than 2 stations within 50 km', () => {
    const station1: StationMetadata = {
      stationId: 'STATION_1',
      name: 'Test Station 1',
      district: 'Delhi',
      state: 'Delhi-NCR',
      coordinates: { lat: 28.6000, lon: 77.2000 },
      agency: 'DPCC',
      isOnline: true,
    };
    const values1: PollutantValues = { pm25: 100, pm10: 200, no2: 40 };

    // Pass only 1 station
    const estimateSingle = computeModelledLocalEstimate(
      28.6100,
      77.2100,
      [{ station: station1, values: values1 }]
    );

    // Defensible guard: MUST refuse interpolation from a single station
    assert.strictEqual(estimateSingle.isSufficientData, false);
    assert.strictEqual(estimateSingle.aqi, null);
    assert.strictEqual(estimateSingle.provenance, 'MODELLED_ESTIMATE');
    assert.ok(estimateSingle.stationOrModelInfo.includes('insufficient monitoring density'));
  });

  it('Defensible IDW Spatial Estimation: computes inverse-distance weighted average when >= 2 stations within 50 km', () => {
    const station1: StationMetadata = {
      stationId: 'STATION_1',
      name: 'Delhi Central',
      district: 'Central Delhi',
      state: 'Delhi-NCR',
      coordinates: { lat: 28.6139, lon: 77.2090 }, // ~2 km away
      agency: 'DPCC',
      isOnline: true,
    };
    const station2: StationMetadata = {
      stationId: 'STATION_2',
      name: 'Delhi East',
      district: 'East Delhi',
      state: 'Delhi-NCR',
      coordinates: { lat: 28.6300, lon: 77.2500 }, // ~5 km away
      agency: 'DPCC',
      isOnline: true,
    };

    const estimate = computeModelledLocalEstimate(
      28.6100,
      77.2100,
      [
        { station: station1, values: { pm25: 60, pm10: 120, no2: 30 } },
        { station: station2, values: { pm25: 100, pm10: 200, no2: 50 } },
      ]
    );

    assert.strictEqual(estimate.isSufficientData, true);
    assert.ok(estimate.aqi !== null && estimate.aqi > 0);
    assert.strictEqual(estimate.provenance, 'MODELLED_ESTIMATE');
    assert.ok(estimate.stationOrModelInfo.includes('k=2 stations'));
    assert.ok((estimate.uncertaintyRadiusKm || 0) > 0);
  });

  it('Air Repository: retrieves historical observations and preserves missing data intervals', async () => {
    const history = await airRepository.getObservationHistory('DEL_ANAND_VIHAR', 24);
    assert.ok(history.length > 0);
    assert.strictEqual(history[0].stationId, 'DEL_ANAND_VIHAR');
    assert.strictEqual(history[0].provenance, 'DEMO_DATA'); // Seeded benchmark records truthfully tagged as DEMO_DATA

    // Verify real observation retains MEASURED_OBSERVATION
    const realObs = await airRepository.saveObservation({
      ...history[0],
      observationTimestamp: new Date().toISOString(),
      provenance: 'MEASURED_OBSERVATION',
    });
    assert.strictEqual(realObs.provenance, 'MEASURED_OBSERVATION');

    // Test range query with bounds
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const future = new Date(now.getTime() + 3600 * 1000).toISOString();

    const rangeResults = await airRepository.getObservationsByStationAndRange(
      'DEL_ANAND_VIHAR',
      past24h,
      future,
      'pm25'
    );
    assert.ok(rangeResults.length > 0);
  });
});
