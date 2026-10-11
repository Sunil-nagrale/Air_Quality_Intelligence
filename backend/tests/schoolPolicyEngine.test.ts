import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSchoolActivity,
  INSTITUTIONAL_GOVERNANCE_NOTICE,
} from '../src/services/schoolPolicyEngine.js';

test('School Policy Engine: Triggers mandatory indoor migration on threshold breach', () => {
  const result = evaluateSchoolActivity({
    cohort: 'primary',
    policy: { maxOutdoorAQI: 120, mandatoryIndoorAQI: 160 },
    campusAQI: 218,
    dominantPollutant: 'PM2.5',
    isTelemetryAvailable: true,
  });

  assert.equal(result.status, 'MANDATORY_INDOOR');
  assert.equal(result.isBreached, true);
  assert.equal(result.isStatutoryRegulation, false);
  assert.equal(result.requiresAdminSignOff, true);
  assert.ok(result.recommendation.includes('indoor auditorium migration'));
  assert.ok(result.governanceNotice.includes('NOT statutory national regulatory standards'));
});

test('School Policy Engine: Missing or insufficient telemetry enforces manual review state', () => {
  const result = evaluateSchoolActivity({
    cohort: 'primary',
    policy: { maxOutdoorAQI: 120, mandatoryIndoorAQI: 160 },
    campusAQI: null,
    dominantPollutant: null,
    isTelemetryAvailable: false,
  });

  assert.equal(result.status, 'DATA_INSUFFICIENT_MANUAL_REVIEW');
  assert.equal(result.isBreached, false);
  assert.equal(result.requiresAdminSignOff, true);
  assert.ok(result.recommendation.includes('Automated safety recommendations are suspended'));
});

test('School Policy Engine: Within threshold permits precautionary outdoor activity with disclaimer', () => {
  const result = evaluateSchoolActivity({
    cohort: 'senior',
    policy: { maxOutdoorAQI: 200, mandatoryIndoorAQI: 250 },
    campusAQI: 145,
    dominantPollutant: 'PM10',
    isTelemetryAvailable: true,
  });

  assert.equal(result.status, 'PRECAUTIONARY_OUTDOOR_PERMITTED');
  assert.equal(result.isBreached, false);
  assert.equal(result.isStatutoryRegulation, false);
  assert.ok(result.governanceNotice === INSTITUTIONAL_GOVERNANCE_NOTICE);
});
