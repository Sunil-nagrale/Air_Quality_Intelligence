import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateSubIndex,
  getCategoryFromAQI,
  calculateCPCBNaqi,
} from '../src/services/cpcbNaqi';
import { PollutantValues } from '../src/types';

describe('Authoritative CPCB NAQI Calculation & Breakpoint Verification', () => {
  it('correctly calculates sub-indices for all 8 official criteria pollutants', () => {
    // PM2.5: 0-30 -> 0-50, 60 -> 100, 90 -> 200, 120 -> 300, 250 -> 400
    assert.strictEqual(calculateSubIndex('pm25', 15), 25);
    assert.strictEqual(calculateSubIndex('pm25', 60), 100);
    assert.strictEqual(calculateSubIndex('pm25', 105), 249);

    // PM10: 0-50 -> 0-50, 100 -> 100, 250 -> 200, 350 -> 300, 430 -> 400
    assert.strictEqual(calculateSubIndex('pm10', 50), 50);
    assert.strictEqual(calculateSubIndex('pm10', 100), 100);
    assert.strictEqual(calculateSubIndex('pm10', 175), 150);

    // NO2: 0-40 -> 0-50, 80 -> 100, 180 -> 200
    assert.strictEqual(calculateSubIndex('no2', 40), 50);
    assert.strictEqual(calculateSubIndex('no2', 80), 100);

    // SO2: 0-40 -> 0-50, 80 -> 100, 380 -> 200
    assert.strictEqual(calculateSubIndex('so2', 40), 50);
    assert.strictEqual(calculateSubIndex('so2', 80), 100);

    // CO (mg/m3): 0-1.0 -> 0-50, 2.0 -> 100, 10.0 -> 200
    assert.strictEqual(calculateSubIndex('co', 1.0), 50);
    assert.strictEqual(calculateSubIndex('co', 2.0), 100);

    // O3: 0-50 -> 0-50, 100 -> 100
    assert.strictEqual(calculateSubIndex('o3', 50), 50);
    assert.strictEqual(calculateSubIndex('o3', 100), 100);

    // NH3 (Ammonia): 0-200 -> 0-50, 400 -> 100, 800 -> 200
    assert.strictEqual(calculateSubIndex('nh3', 200), 50);
    assert.strictEqual(calculateSubIndex('nh3', 400), 100);
    assert.strictEqual(calculateSubIndex('nh3', 600), 150);

    // Pb (Lead): 0-0.5 -> 0-50, 1.0 -> 100, 2.0 -> 200
    assert.strictEqual(calculateSubIndex('pb', 0.5), 50);
    assert.strictEqual(calculateSubIndex('pb', 1.0), 100);
    assert.strictEqual(calculateSubIndex('pb', 1.5), 145);
  });

  it('rejects negative and physically implausible corrupt concentrations', () => {
    // Negative values
    assert.strictEqual(calculateSubIndex('pm25', -10), null);
    assert.strictEqual(calculateSubIndex('co', -1.5), null);

    // Above physical sensor limits (e.g. PM2.5 > 1500 ug/m3)
    assert.strictEqual(calculateSubIndex('pm25', 1800), null);
    assert.strictEqual(calculateSubIndex('pm10', 3500), null);
    assert.strictEqual(calculateSubIndex('co', 250), null);
  });

  it('caps extreme valid concentrations at 500 (Severe max)', () => {
    assert.strictEqual(calculateSubIndex('pm25', 480), 492);
    assert.strictEqual(calculateSubIndex('pm25', 550), 500); // Exceeds 500 bp but below sensor failure
  });

  it('maps all 6 official Indian NAQI categories correctly', () => {
    assert.strictEqual(getCategoryFromAQI(35), 'Good');
    assert.strictEqual(getCategoryFromAQI(75), 'Satisfactory');
    assert.strictEqual(getCategoryFromAQI(150), 'Moderate');
    assert.strictEqual(getCategoryFromAQI(250), 'Poor');
    assert.strictEqual(getCategoryFromAQI(350), 'Very Poor');
    assert.strictEqual(getCategoryFromAQI(450), 'Severe');
  });

  it('enforces CPCB minimum 3 pollutants rule and returns Insufficient Data if fewer', () => {
    const onlyTwo: PollutantValues = {
      pm25: 55,
      no2: 30,
    };
    const res = calculateCPCBNaqi(onlyTwo, 'MEASURED_OBSERVATION', 'Station A');
    assert.strictEqual(res.isSufficientData, false);
    assert.strictEqual(res.aqi, null);
    assert.strictEqual(res.category, 'Insufficient Data');
    assert.strictEqual(res.dominantPollutant, null);
  });

  it('enforces CPCB particulate requirement: returns Insufficient Data when neither PM2.5 nor PM10 is monitored', () => {
    const nonParticulate: PollutantValues = {
      no2: 45,
      so2: 35,
      co: 1.2,
      o3: 60,
    };
    const res = calculateCPCBNaqi(nonParticulate, 'MEASURED_OBSERVATION', 'Station B');
    assert.strictEqual(res.isSufficientData, false);
    assert.strictEqual(res.aqi, null);
    assert.strictEqual(res.category, 'Insufficient Data');
  });

  it('computes valid NAQI with standard metadata and averaging period when criteria met', () => {
    const valid: PollutantValues = {
      pm25: 85,  // sub-index: ~183 (Moderate)
      pm10: 160, // sub-index: ~140 (Moderate)
      no2: 40,   // sub-index: 50
      co: 0.8,   // sub-index: 40
    };
    const res = calculateCPCBNaqi(valid, 'MEASURED_OBSERVATION', 'Station Anand Vihar', '2026-10-10T10:00:00Z', '24h_regulatory');
    assert.strictEqual(res.isSufficientData, true);
    assert.ok(res.aqi !== null && res.aqi >= 180);
    assert.strictEqual(res.category, 'Moderate');
    assert.strictEqual(res.dominantPollutant, 'PM25');
    assert.strictEqual(res.aqiStandard, 'CPCB_NAQI_2014');
    assert.strictEqual(res.averagingPeriod, '24h_regulatory');
    assert.ok(res.inputsUsed?.includes('pm25'));
    assert.ok(res.inputsUsed?.includes('no2'));
  });
});
