import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/index';
import { createTestJwt } from '../src/middleware/auth';
import { userRepository } from '../src/repositories/userRepository';
import { auditRepository } from '../src/repositories/auditRepository';
import { APIGatewayProxyEvent } from 'aws-lambda';

function makeEvent(options: {
  method: string;
  path: string;
  body?: any;
  queryStringParameters?: Record<string, string>;
  token?: string;
}): APIGatewayProxyEvent {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  return {
    httpMethod: options.method,
    path: options.path,
    headers,
    queryStringParameters: options.queryStringParameters || null,
    body: options.body ? JSON.stringify(options.body) : null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  };
}

describe('Personal Air Copilot Workflows & Role Safeguards (Prompt 6)', () => {
  const user1Token = createTestJwt({
    sub: 'USER_AMIT',
    email: 'amit.sharma@example.com',
    role: 'PERSONAL_USER',
  });

  const user2Token = createTestJwt({
    sub: 'USER_PRIYA',
    email: 'priya.patel@example.com',
    role: 'PERSONAL_USER',
  });

  const farmerToken = createTestJwt({
    sub: 'FARMER_GURDEEP',
    email: 'gurdeep@punjabfarms.com',
    role: 'FARMER',
  });

  const schoolToken = createTestJwt({
    sub: 'PRINCIPAL_DELHI',
    email: 'principal@delhischool.edu.in',
    role: 'SCHOOL_ADMIN',
  });

  beforeEach(() => {
    userRepository.clear();
    auditRepository.clear();
  });

  // 1. Role Authorization and 401 / 403 Enforcement
  it('enforces authentication and PERSONAL_USER role authorization on all personal endpoints', async () => {
    const endpoints = [
      { method: 'GET', path: '/api/personal/activity-plans' },
      { method: 'POST', path: '/api/personal/activity-plan', body: { activityType: 'walking', targetDate: '2026-10-18' } },
      { method: 'DELETE', path: '/api/personal/activity-plan', queryStringParameters: { planId: 'PLAN_01' } },
      { method: 'GET', path: '/api/personal/alerts/preferences' },
      { method: 'POST', path: '/api/personal/alerts/preferences', body: { aqiThresholdAlert: 250 } },
      { method: 'GET', path: '/api/personal/health-preferences' },
      { method: 'POST', path: '/api/personal/health-preferences', body: { hasAsthma: true } },
      { method: 'GET', path: '/api/personal/caregiver-consent' },
      { method: 'POST', path: '/api/personal/caregiver-consent', body: { consentGiven: true, caregiverEmail: 'cg@example.com' } },
    ];

    for (const ep of endpoints) {
      // 1. Unauthenticated -> 401
      const unauth = await handler(makeEvent({ method: ep.method, path: ep.path, body: ep.body, queryStringParameters: ep.queryStringParameters }));
      assert.strictEqual(unauth.statusCode, 401, `Expected 401 for unauth ${ep.method} ${ep.path}`);

      // 2. Unauthorized role (FARMER) -> 403
      const forbiddenFarmer = await handler(makeEvent({
        method: ep.method,
        path: ep.path,
        token: farmerToken,
        body: ep.body,
        queryStringParameters: ep.queryStringParameters,
      }));
      assert.strictEqual(forbiddenFarmer.statusCode, 403, `Expected 403 for FARMER on ${ep.method} ${ep.path}`);

      // 3. Unauthorized role (SCHOOL_ADMIN) -> 403
      const forbiddenSchool = await handler(makeEvent({
        method: ep.method,
        path: ep.path,
        token: schoolToken,
        body: ep.body,
        queryStringParameters: ep.queryStringParameters,
      }));
      assert.strictEqual(forbiddenSchool.statusCode, 403, `Expected 403 for SCHOOL_ADMIN on ${ep.method} ${ep.path}`);
    }
  });

  // 2. Activity Plans Lifecycle: Create, List, and Delete with Ownership Isolation
  it('manages activity plan lifecycle with strict multi-user ownership isolation', async () => {
    // User 1 creates Plan A
    const resCreate1 = await handler(makeEvent({
      method: 'POST',
      path: '/api/personal/activity-plan',
      token: user1Token,
      body: {
        planId: 'PLAN_AMIT_01',
        activityType: 'running',
        durationMinutes: 45,
        intensity: 'moderate',
        targetDate: '2026-10-18',
        locationName: 'Lodhi Garden, New Delhi',
        coordinates: { lat: 28.5933, lon: 77.2197 },
      },
    }));
    assert.strictEqual(resCreate1.statusCode, 201);
    const bodyCreate1 = JSON.parse(resCreate1.body);
    assert.strictEqual(bodyCreate1.plan.userId, 'USER_AMIT');
    assert.strictEqual(bodyCreate1.plan.activityType, 'running');

    // User 2 creates Plan B
    const resCreate2 = await handler(makeEvent({
      method: 'POST',
      path: '/api/personal/activity-plan',
      token: user2Token,
      body: {
        planId: 'PLAN_PRIYA_01',
        activityType: 'cycling',
        durationMinutes: 60,
        intensity: 'vigorous',
        targetDate: '2026-10-19',
        locationName: 'Sanjay Van, New Delhi',
        coordinates: { lat: 28.5300, lon: 77.1700 },
      },
    }));
    assert.strictEqual(resCreate2.statusCode, 201);

    // User 1 lists plans -> Sees ONLY Plan A
    const resList1 = await handler(makeEvent({
      method: 'GET',
      path: '/api/personal/activity-plans',
      token: user1Token,
    }));
    assert.strictEqual(resList1.statusCode, 200);
    const bodyList1 = JSON.parse(resList1.body);
    assert.strictEqual(bodyList1.plans.length, 1);
    assert.strictEqual(bodyList1.plans[0].planId, 'PLAN_AMIT_01');

    // User 2 lists plans -> Sees ONLY Plan B
    const resList2 = await handler(makeEvent({
      method: 'GET',
      path: '/api/personal/activity-plans',
      token: user2Token,
    }));
    assert.strictEqual(resList2.statusCode, 200);
    const bodyList2 = JSON.parse(resList2.body);
    assert.strictEqual(bodyList2.plans.length, 1);
    assert.strictEqual(bodyList2.plans[0].planId, 'PLAN_PRIYA_01');

    // User 2 attempts to delete User 1's plan -> Must be rejected (404 / unauthorized)
    const resTamperDelete = await handler(makeEvent({
      method: 'DELETE',
      path: '/api/personal/activity-plan',
      token: user2Token,
      queryStringParameters: { planId: 'PLAN_AMIT_01' },
    }));
    assert.strictEqual(resTamperDelete.statusCode, 404);

    // User 1 deletes their own plan -> 200 OK
    const resDelete1 = await handler(makeEvent({
      method: 'DELETE',
      path: '/api/personal/activity-plan',
      token: user1Token,
      queryStringParameters: { planId: 'PLAN_AMIT_01' },
    }));
    assert.strictEqual(resDelete1.statusCode, 200);

    // Verify User 1 now has 0 plans
    const resListAfter = await handler(makeEvent({
      method: 'GET',
      path: '/api/personal/activity-plans',
      token: user1Token,
    }));
    const bodyListAfter = JSON.parse(resListAfter.body);
    assert.strictEqual(bodyListAfter.plans.length, 0);
  });

  // 3. Health Sensitivities & Deterministic Multiplier Calculation
  it('saves non-clinical health sensitivities and calculates accurate sensitivity multiplier', async () => {
    // Save sensitivities: Asthma (+0.20) and Elderly (+0.15) -> 1.35x
    const resSave = await handler(makeEvent({
      method: 'POST',
      path: '/api/personal/health-preferences',
      token: user1Token,
      body: {
        hasAsthma: true,
        hasCardiovascularCondition: false,
        isElderly: true,
        isChild: false,
        pregnancy: false,
        isOptionalConsentGiven: true,
      },
    }));
    assert.strictEqual(resSave.statusCode, 200);
    const bodySave = JSON.parse(resSave.body);
    assert.strictEqual(bodySave.healthPreferences.userId, 'USER_AMIT');
    assert.strictEqual(bodySave.healthPreferences.hasAsthma, true);
    assert.strictEqual(bodySave.healthPreferences.isElderly, true);
    assert.strictEqual(bodySave.healthPreferences.nonClinicalSensitivityWeight, 1.35);

    // Retrieve preferences
    const resGet = await handler(makeEvent({
      method: 'GET',
      path: '/api/personal/health-preferences',
      token: user1Token,
    }));
    assert.strictEqual(resGet.statusCode, 200);
    const bodyGet = JSON.parse(resGet.body);
    assert.strictEqual(bodyGet.healthPreferences.nonClinicalSensitivityWeight, 1.35);

    // User 2 has no preferences configured yet
    const resGet2 = await handler(makeEvent({
      method: 'GET',
      path: '/api/personal/health-preferences',
      token: user2Token,
    }));
    assert.strictEqual(resGet2.statusCode, 200);
    const bodyGet2 = JSON.parse(resGet2.body);
    assert.strictEqual(bodyGet2.healthPreferences, null);
  });

  // 4. Caregiver Consent & Delegation with Audit Logging
  it('manages explicit caregiver consent with immutable audit records', async () => {
    // Grant caregiver consent
    const resGrant = await handler(makeEvent({
      method: 'POST',
      path: '/api/personal/caregiver-consent',
      token: user1Token,
      body: {
        caregiverEmail: 'daughter@example.com',
        caregiverPhone: '+91 98765 43210',
        consentGiven: true,
        shareLocation: true,
        shareSensitivities: false,
      },
    }));
    assert.strictEqual(resGrant.statusCode, 200);
    const bodyGrant = JSON.parse(resGrant.body);
    assert.strictEqual(bodyGrant.caregiverConsent.consentGiven, true);
    assert.strictEqual(bodyGrant.caregiverConsent.caregiverEmail, 'daughter@example.com');

    // Verify audit repository recorded CAREGIVER_CONSENT_GRANTED
    const events = auditRepository.getAllEvents();
    const grantEvent = events.find((e: any) => e.action === 'CAREGIVER_CONSENT_GRANTED' && e.actorId === 'USER_AMIT');
    assert.ok(grantEvent, 'Must record CAREGIVER_CONSENT_GRANTED audit event');
    assert.strictEqual(grantEvent.actorRole, 'PERSONAL_USER');

    // Revoke caregiver consent
    const resRevoke = await handler(makeEvent({
      method: 'POST',
      path: '/api/personal/caregiver-consent',
      token: user1Token,
      body: {
        caregiverEmail: 'daughter@example.com',
        consentGiven: false,
        shareLocation: false,
        shareSensitivities: false,
      },
    }));
    assert.strictEqual(resRevoke.statusCode, 200);

    const revokeEvent = auditRepository.getAllEvents().find((e: any) => e.action === 'CAREGIVER_CONSENT_REVOKED' && e.actorId === 'USER_AMIT');
    assert.ok(revokeEvent, 'Must record CAREGIVER_CONSENT_REVOKED audit event');
  });

  // 5. Alert Preferences Persistence
  it('persists alert preferences across channels with custom threshold', async () => {
    const resSave = await handler(makeEvent({
      method: 'POST',
      path: '/api/personal/alerts/preferences',
      token: user1Token,
      body: {
        emailAlertsEnabled: true,
        aqiThresholdAlert: 220,
        preferredNotificationChannel: 'BROWSER_AND_EMAIL',
        caregiverRecipientEmail: 'caregiver@family.org',
        caregiverConsentVerified: true,
      },
    }));
    assert.strictEqual(resSave.statusCode, 200);

    const resGet = await handler(makeEvent({
      method: 'GET',
      path: '/api/personal/alerts/preferences',
      token: user1Token,
    }));
    assert.strictEqual(resGet.statusCode, 200);
    const bodyGet = JSON.parse(resGet.body);
    assert.strictEqual(bodyGet.preferences.aqiThresholdAlert, 220);
    assert.strictEqual(bodyGet.preferences.preferredNotificationChannel, 'BROWSER_AND_EMAIL');
  });

  // 6. Personal Window Evaluation via Deterministic Decision Engine
  it('evaluates activity windows with non-clinical health adjustments and diurnal model explanations', async () => {
    const resEval = await handler(makeEvent({
      method: 'POST',
      path: '/api/personal/evaluate-windows',
      body: {
        locationName: 'Lodhi Garden, New Delhi',
        lat: 28.5933,
        lon: 77.2197,
        activityType: 'running',
        durationMinutes: 45,
        intensity: 'vigorous',
        healthSensitivities: {
          hasAsthma: true,
        },
      },
    }));
    assert.strictEqual(resEval.statusCode, 200);
    const body = JSON.parse(resEval.body);
    assert.strictEqual(body.provenance, 'FORECAST');
    assert.strictEqual(body.activityType, 'running');
    assert.strictEqual(body.intensity, 'vigorous');
    assert.ok(Array.isArray(body.candidateWindows));
    assert.ok(body.candidateWindows.length > 0);

    // Verify disclaimers are present
    assert.ok(body.disclaimers.exposureRelativism, 'Must include exposure relativism disclaimer');
    assert.ok(body.disclaimers.nonClinicalNotice, 'Must include non-clinical notice');

    // Verify explanation references diurnal atmospheric dispersion
    const hasDiurnalOrModelExplanation = body.candidateWindows.some((w: any) =>
      typeof w.explanation === 'string' && (w.explanation.includes('Diurnal atmospheric model:') || w.explanation.includes('Numerical weather model'))
    );
    assert.ok(hasDiurnalOrModelExplanation, 'Candidate windows must explain atmospheric physics');
  });
});
