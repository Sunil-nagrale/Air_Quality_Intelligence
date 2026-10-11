import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateActivityWindows,
  getVentilationMultiplier,
  getSensitivityMultiplier,
  EXPOSURE_RELATIVISM_DISCLAIMER,
  NON_CLINICAL_DISCLAIMER,
  MODEL_UNCERTAINTY_DISCLAIMER,
} from '../src/services/deterministicDecisionEngine';
import { AirForecast, DecisionEngineRequest } from '../src/types';

describe('Deterministic Activity-Window Decision Engine', () => {
  const sampleForecast: AirForecast = {
    forecastId: 'FCST_TEST_001',
    coordinates: { lat: 28.6139, lon: 77.2090 },
    modelName: 'Copernicus CAMS European Centre (via Open-Meteo)',
    issueTimestamp: '2026-10-10T00:00:00Z',
    hoursCount: 24,
    hourlyPredictions: [
      { timestamp: '2026-10-10T06:00:00Z', hourOffset: 0, aqi: 280, category: 'Poor', dominantPollutant: 'PM2.5', pm25: 110, pm10: 240 },
      { timestamp: '2026-10-10T07:00:00Z', hourOffset: 1, aqi: 260, category: 'Poor', dominantPollutant: 'PM2.5', pm25: 105, pm10: 230 },
      { timestamp: '2026-10-10T08:00:00Z', hourOffset: 2, aqi: 240, category: 'Poor', dominantPollutant: 'PM2.5', pm25: 98, pm10: 210 },
      { timestamp: '2026-10-10T09:00:00Z', hourOffset: 3, aqi: 220, category: 'Poor', dominantPollutant: 'PM2.5', pm25: 90, pm10: 195 },
      { timestamp: '2026-10-10T12:00:00Z', hourOffset: 6, aqi: 155, category: 'Moderate', dominantPollutant: 'PM2.5', pm25: 60, pm10: 140 },
      { timestamp: '2026-10-10T15:00:00Z', hourOffset: 9, aqi: 120, category: 'Moderate', dominantPollutant: 'PM2.5', pm25: 45, pm10: 110 },
      { timestamp: '2026-10-10T16:00:00Z', hourOffset: 10, aqi: 115, category: 'Moderate', dominantPollutant: 'PM2.5', pm25: 42, pm10: 105 },
      { timestamp: '2026-10-10T18:00:00Z', hourOffset: 12, aqi: 190, category: 'Moderate', dominantPollutant: 'PM2.5', pm25: 75, pm10: 160 },
      { timestamp: '2026-10-10T20:00:00Z', hourOffset: 14, aqi: 275, category: 'Poor', dominantPollutant: 'PM2.5', pm25: 112, pm10: 245 },
    ],
    provenance: 'FORECAST',
  };

  const baseRequest: DecisionEngineRequest = {
    locationName: 'Connaught Place, New Delhi',
    coordinates: { lat: 28.6139, lon: 77.2090 },
    targetDate: '2026-10-10',
    activityType: 'running',
    durationMinutes: 45,
    intensity: 'moderate',
    earliestStartTime: '06:00',
    latestStartTime: '20:00',
  };

  it('calculates deterministic ventilation and sensitivity multipliers', () => {
    assert.strictEqual(getVentilationMultiplier('low'), 1.0);
    assert.strictEqual(getVentilationMultiplier('moderate'), 1.3);
    assert.strictEqual(getVentilationMultiplier('vigorous'), 1.8);

    assert.strictEqual(getSensitivityMultiplier(undefined), 1.0);
    assert.strictEqual(getSensitivityMultiplier({ hasAsthma: true }), 1.20);
    assert.strictEqual(getSensitivityMultiplier({ isElderly: true }), 1.15);
    assert.strictEqual(getSensitivityMultiplier({ hasAsthma: true, isElderly: true }), 1.35);
  });

  it('evaluates and ranks candidate windows with physical dispersion reasons', () => {
    const result = evaluateActivityWindows(baseRequest, sampleForecast);

    assert.strictEqual(result.status, 'OPTIMAL_WINDOW_FOUND');
    assert.ok(result.candidateWindows.length > 0);
    assert.ok(result.bestWindow !== null);
    assert.strictEqual(result.bestWindow.rank, 1);

    // Best window should correspond to low AQI / afternoon dispersion
    assert.ok(result.bestWindow.suitabilityScore > 50);
    assert.ok(result.bestWindow.explanation.length > 0);

    // Suitability scores must be bounded between 0 and 100
    for (const w of result.candidateWindows) {
      assert.ok(w.suitabilityScore >= 0 && w.suitabilityScore <= 100);
      assert.strictEqual(w.provenance, 'FORECAST');
    }
  });

  it('guarantees deterministic repeatability: identical inputs yield identical rankings', () => {
    const res1 = evaluateActivityWindows(baseRequest, sampleForecast);
    const res2 = evaluateActivityWindows(baseRequest, sampleForecast);

    assert.deepStrictEqual(res1.candidateWindows, res2.candidateWindows);
    assert.deepStrictEqual(res1.bestWindow, res2.bestWindow);
    assert.strictEqual(res1.exertionVentilationMultiplier, res2.exertionVentilationMultiplier);
  });

  it('vigorous intensity applies higher ventilation penalty than low intensity', () => {
    const lowReq: DecisionEngineRequest = { ...baseRequest, intensity: 'low' };
    const vigReq: DecisionEngineRequest = { ...baseRequest, intensity: 'vigorous' };

    const lowRes = evaluateActivityWindows(lowReq, sampleForecast);
    const vigRes = evaluateActivityWindows(vigReq, sampleForecast);

    assert.ok(lowRes.bestWindow!.suitabilityScore > vigRes.bestWindow!.suitabilityScore);
    assert.ok(lowRes.exertionVentilationMultiplier < vigRes.exertionVentilationMultiplier);
  });

  it('non-clinical health sensitivity reduces suitability score without medical claim', () => {
    const normalReq: DecisionEngineRequest = { ...baseRequest, healthSensitivities: undefined };
    const sensitiveReq: DecisionEngineRequest = {
      ...baseRequest,
      healthSensitivities: { hasAsthma: true },
    };

    const normalRes = evaluateActivityWindows(normalReq, sampleForecast);
    const sensitiveRes = evaluateActivityWindows(sensitiveReq, sampleForecast);

    assert.ok(normalRes.bestWindow!.suitabilityScore >= sensitiveRes.bestWindow!.suitabilityScore);
    assert.strictEqual(sensitiveRes.disclaimers.nonClinicalNotice, NON_CLINICAL_DISCLAIMER);
  });

  it('triggers MANDATORY_INDOOR_RECOMMENDED when AQI breaches policy limit', () => {
    const severeForecast: AirForecast = {
      ...sampleForecast,
      hourlyPredictions: sampleForecast.hourlyPredictions.map(p => ({
        ...p,
        aqi: 380, // Severe
      })),
    };

    const res = evaluateActivityWindows(
      { ...baseRequest, policyThreshold: { mandatoryIndoorAQI: 300 } },
      severeForecast
    );

    assert.strictEqual(res.status, 'MANDATORY_INDOOR_RECOMMENDED');
    assert.ok(res.alternativeAction?.suggestIndoorAlternative);
    assert.ok(res.alternativeAction?.postponementRecommended);
  });

  it('returns INSUFFICIENT_DATA when forecast is missing or incomplete', () => {
    const res = evaluateActivityWindows(baseRequest, null);

    assert.strictEqual(res.status, 'INSUFFICIENT_DATA');
    assert.strictEqual(res.candidateWindows.length, 0);
    assert.strictEqual(res.bestWindow, null);
    assert.ok(res.alternativeAction?.reason.includes('incomplete or unavailable'));
  });

  it('attaches all mandatory disclaimers to response', () => {
    const res = evaluateActivityWindows(baseRequest, sampleForecast);

    assert.strictEqual(res.disclaimers.exposureRelativism, EXPOSURE_RELATIVISM_DISCLAIMER);
    assert.strictEqual(res.disclaimers.nonClinicalNotice, NON_CLINICAL_DISCLAIMER);
    assert.strictEqual(res.disclaimers.modelUncertainty, MODEL_UNCERTAINTY_DISCLAIMER);
  });
});
