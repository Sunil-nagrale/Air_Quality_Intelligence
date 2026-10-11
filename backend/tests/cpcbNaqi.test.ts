import test from 'node:test';
import assert from 'node:assert';
import { calculateCPCBNaqi, calculateSubIndex, getCategoryFromAQI } from '../src/services/cpcbNaqi';

test('calculateSubIndex correctly calculates sub-indices across breakpoints', () => {
  // PM2.5 = 15 -> Good (0-30 -> 0-50): 15/30 * 50 = 25
  assert.strictEqual(calculateSubIndex('pm25', 15), 25);

  // PM2.5 = 60 -> Satisfactory upper boundary (31-60 -> 51-100) -> 100
  assert.strictEqual(calculateSubIndex('pm25', 60), 100);

  // PM10 = 215.6 -> Moderate (101-250 -> 101-200)
  const pm10Sub = calculateSubIndex('pm10', 215.6);
  assert.ok(pm10Sub !== null && pm10Sub >= 170 && pm10Sub <= 180);
});

test('calculateCPCBNaqi computes overall AQI as max sub-index for valid pollutants', () => {
  const result = calculateCPCBNaqi(
    {
      pm25: 62.9,
      pm10: 215.6,
      no2: 14,
      so2: 30.7,
      co: 0.568,
      o3: 132,
    },
    'MEASURED_OBSERVATION',
    'Delhi CAAQMS Test Station'
  );

  assert.strictEqual(result.isSufficientData, true);
  assert.strictEqual(result.dominantPollutant, 'PM10');
  assert.strictEqual(result.category, 'Moderate');
  assert.ok(result.aqi !== null && result.aqi >= 170 && result.aqi <= 180);
});

test('calculateCPCBNaqi returns Insufficient Data when fewer than 3 pollutants are monitored', () => {
  const result = calculateCPCBNaqi(
    {
      pm25: 45,
      pm10: 80,
    },
    'MEASURED_OBSERVATION',
    'Incomplete Station'
  );

  assert.strictEqual(result.isSufficientData, false);
  assert.strictEqual(result.aqi, null);
  assert.strictEqual(result.category, 'Insufficient Data');
  assert.strictEqual(result.dominantPollutant, null);
});

test('calculateCPCBNaqi returns Insufficient Data when neither PM2.5 nor PM10 is monitored', () => {
  const result = calculateCPCBNaqi(
    {
      no2: 45,
      so2: 30,
      co: 1.2,
      o3: 80,
    },
    'MEASURED_OBSERVATION',
    'Station Without Particulate Sensors'
  );

  assert.strictEqual(result.isSufficientData, false);
  assert.strictEqual(result.aqi, null);
  assert.strictEqual(result.category, 'Insufficient Data');
});

test('getCategoryFromAQI accurately maps Indian NAQI categories', () => {
  assert.strictEqual(getCategoryFromAQI(35), 'Good');
  assert.strictEqual(getCategoryFromAQI(85), 'Satisfactory');
  assert.strictEqual(getCategoryFromAQI(160), 'Moderate');
  assert.strictEqual(getCategoryFromAQI(250), 'Poor');
  assert.strictEqual(getCategoryFromAQI(350), 'Very Poor');
  assert.strictEqual(getCategoryFromAQI(450), 'Severe');
});
