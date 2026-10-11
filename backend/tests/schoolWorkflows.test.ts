import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/index';
import { createTestJwt } from '../src/middleware/auth';
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

describe('School Air Safety Planner Workflows & Multi-Tenant Authorization (Prompt 7)', () => {
  const kvSchoolToken = createTestJwt({
    sub: 'PRINCIPAL_KV',
    email: 'kvkailashahar@gmail.com',
    role: 'SCHOOL_ADMIN',
    schoolId: 'KV_KAILASHAHAR',
  });

  const otherSchoolToken = createTestJwt({
    sub: 'PRINCIPAL_OTHER',
    email: 'other@delhischool.edu',
    role: 'SCHOOL_ADMIN',
    schoolId: 'KV_OTHER_SCHOOL',
  });

  const personalUserToken = createTestJwt({
    sub: 'USER_PARAS',
    email: 'parasnath@gmail.com',
    role: 'PERSONAL_USER',
  });

  const farmerToken = createTestJwt({
    sub: 'FARMER_SUNIL',
    email: 'sunilnagrale@gmail.com',
    role: 'FARMER',
  });

  // 1. School Profile & Campuses
  it('GET /schools/profile returns institution profile and campuses for authorized school admin', async () => {
    const event = makeEvent({
      method: 'GET',
      path: '/schools/profile',
      token: kvSchoolToken,
    });

    const res = await handler(event);
    assert.equal(res.statusCode, 200);

    const data = JSON.parse(res.body);
    assert.ok(data.profile);
    assert.equal(data.profile.schoolId, 'KV_KAILASHAHAR');
    assert.ok(Array.isArray(data.campuses));
    assert.ok(data.campuses.length >= 2, 'Should have at least 2 seeded campuses');
  });

  it('PUT /schools/profile updates institution name and notification preferences', async () => {
    const event = makeEvent({
      method: 'PUT',
      path: '/schools/profile',
      token: kvSchoolToken,
      body: {
        institutionName: 'Kendriya Vidyalaya Kailashahar - Premier Campus',
        notificationPreferences: {
          parentBroadcastEnabled: true,
          staffAlertsEnabled: true,
          aqiAlertThreshold: 140,
          preferredChannel: 'EMAIL',
        },
      },
    });

    const res = await handler(event);
    assert.equal(res.statusCode, 200);

    const data = JSON.parse(res.body);
    assert.equal(data.profile.institutionName, 'Kendriya Vidyalaya Kailashahar - Premier Campus');
    assert.equal(data.profile.notificationPreferences.aqiAlertThreshold, 140);
  });

  it('GET and POST /schools/campuses manages multi-campus facilities', async () => {
    // List existing campuses
    const listEvent = makeEvent({
      method: 'GET',
      path: '/schools/campuses',
      token: kvSchoolToken,
    });
    const listRes = await handler(listEvent);
    assert.equal(listRes.statusCode, 200);
    const listData = JSON.parse(listRes.body);
    assert.ok(listData.campuses.length >= 2);

    // Create a new campus wing
    const createEvent = makeEvent({
      method: 'POST',
      path: '/schools/campuses',
      token: kvSchoolToken,
      body: {
        campusName: 'East Sports & Aquatic Complex',
        district: 'East Delhi',
        state: 'Delhi-NCR',
        coordinates: { lat: 28.64, lon: 77.24 },
        nearestStationId: 'DEL_03',
        totalStudents: 600,
        contactPhone: '+91 11-2384-9005',
      },
    });
    const createRes = await handler(createEvent);
    assert.equal(createRes.statusCode, 201);
    const createData = JSON.parse(createRes.body);
    assert.equal(createData.campus.campusName, 'East Sports & Aquatic Complex');
    assert.equal(createData.campus.schoolId, 'KV_KAILASHAHAR');
  });

  // 2. Policy Thresholds & Non-Statutory Disclaimer
  it('GET /schools/policy retrieves configured policies and PUT /schools/policy updates threshold', async () => {
    const getEvent = makeEvent({
      method: 'GET',
      path: '/schools/policy',
      token: kvSchoolToken,
    });
    const getRes = await handler(getEvent);
    assert.equal(getRes.statusCode, 200);
    const getData = JSON.parse(getRes.body);
    assert.ok(Array.isArray(getData.policies));

    // Update primary cohort policy
    const putEvent = makeEvent({
      method: 'PUT',
      path: '/schools/policy',
      token: kvSchoolToken,
      body: {
        ageGroup: 'primary',
        maxOutdoorAQI: 110,
        mandatoryIndoorAQI: 150,
      },
    });
    const putRes = await handler(putEvent);
    assert.equal(putRes.statusCode, 200);
    const putData = JSON.parse(putRes.body);
    assert.equal(putData.policy.maxOutdoorAQI, 110);
    assert.equal(putData.policy.mandatoryIndoorAQI, 150);
    assert.ok(
      putData.policy.governanceDisclaimer.includes('NOT statutory national regulatory standards'),
      'Must contain explicit non-statutory disclaimer'
    );
  });

  // 3. Activity Scheduling & Evaluations
  it('POST /schools/activities/evaluate enforces mandatory indoor migration on policy breach', async () => {
    const event = makeEvent({
      method: 'POST',
      path: '/schools/activities/evaluate',
      token: kvSchoolToken,
      body: {
        activityName: 'Annual Junior Sprint Championships',
        activityType: 'pe_sprint',
        ageGroup: 'primary',
        campusAQI: 218,
        dominantPollutant: 'PM2.5',
        scheduledDate: '2026-10-18',
        startTime: '08:30',
        endTime: '10:00',
        indoorAlternativeVenue: 'Multipurpose Indoor Badminton Hall',
        isTelemetryAvailable: true,
      },
    });

    const res = await handler(event);
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);

    assert.equal(data.evaluation.status, 'MANDATORY_INDOOR');
    assert.equal(data.evaluation.isBreached, true);
    assert.equal(data.evaluation.requiresAdminSignOff, true);
    assert.equal(data.activity.evaluationStatus, 'MANDATORY_INDOOR_REQUIRED');
    assert.ok(data.activity.systemRecommendation.indoorAlternativeSuggested);
  });

  it('POST /schools/activities/evaluate permits precautionary outdoor activity within thresholds', async () => {
    const event = makeEvent({
      method: 'POST',
      path: '/schools/activities/evaluate',
      token: kvSchoolToken,
      body: {
        activityName: 'Senior Physics Fieldwork',
        activityType: 'academic_outdoor',
        ageGroup: 'senior',
        campusAQI: 140,
        dominantPollutant: 'PM10',
        scheduledDate: '2026-10-19',
        startTime: '13:00',
        endTime: '14:00',
        isTelemetryAvailable: true,
      },
    });

    const res = await handler(event);
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);

    assert.equal(data.evaluation.status, 'PRECAUTIONARY_OUTDOOR_PERMITTED');
    assert.equal(data.evaluation.isBreached, false);
    assert.equal(data.activity.evaluationStatus, 'PRECAUTIONARY_OUTDOOR_PERMITTED');
  });

  it('POST /schools/activities/evaluate triggers manual review state when telemetry is offline', async () => {
    const event = makeEvent({
      method: 'POST',
      path: '/schools/activities/evaluate',
      token: kvSchoolToken,
      body: {
        activityName: 'Middle School Recess',
        activityType: 'recess',
        ageGroup: 'middle',
        isTelemetryAvailable: false,
      },
    });

    const res = await handler(event);
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);

    assert.equal(data.evaluation.status, 'DATA_INSUFFICIENT_MANUAL_REVIEW');
    assert.equal(data.evaluation.requiresAdminSignOff, true);
    assert.equal(data.activity.evaluationStatus, 'DATA_INSUFFICIENT_MANUAL_REVIEW');
  });

  // 4. Administrator Decision Sign-Off
  it('POST /schools/activities/decide records official administrative decision and directive notes', async () => {
    // First create an activity
    const createRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/schools/activities',
        token: kvSchoolToken,
        body: {
          activityName: 'Class 4 Relay Races',
          ageGroup: 'primary',
          scheduledDate: '2026-10-20',
          predictedAQI: 215,
          evaluationStatus: 'MANDATORY_INDOOR_REQUIRED',
        },
      })
    );
    assert.equal(createRes.statusCode, 201);
    const createdAct = JSON.parse(createRes.body).activity;

    // Administrator records directive
    const decideRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/schools/activities/decide',
        token: kvSchoolToken,
        body: {
          activityId: createdAct.activityId,
          decision: 'MANDATORY_INDOOR',
          notes: 'Relocated relay races to indoor badminton court by Principal directive.',
        },
      })
    );
    assert.equal(decideRes.statusCode, 200);
    const decideData = JSON.parse(decideRes.body);
    assert.equal(decideData.activity.administratorDecision.decision, 'MANDATORY_INDOOR');
    assert.equal(
      decideData.activity.administratorDecision.notes,
      'Relocated relay races to indoor badminton court by Principal directive.'
    );
    assert.ok(decideData.activity.adminSignOff.isSignedOff);
  });

  // 5. Calendar, Reports & Audit Log
  it('GET /schools/calendar and GET /schools/reports return aggregated activities and audit events', async () => {
    const calRes = await handler(
      makeEvent({
        method: 'GET',
        path: '/schools/calendar',
        token: kvSchoolToken,
      })
    );
    assert.equal(calRes.statusCode, 200);
    const calData = JSON.parse(calRes.body);
    assert.ok(Array.isArray(calData.calendarEvents));

    const repRes = await handler(
      makeEvent({
        method: 'GET',
        path: '/schools/reports',
        token: kvSchoolToken,
      })
    );
    assert.equal(repRes.statusCode, 200);
    const repData = JSON.parse(repRes.body);
    assert.ok(repData.summary);
    assert.ok(typeof repData.summary.totalEvaluatedActivities === 'number');
    assert.ok(Array.isArray(repData.activities));
    assert.ok(Array.isArray(repData.auditEvents));
  });

  // 6. Grounded Assistant
  it('POST /schools/assistant returns grounded explanation without invoking Bedrock cloud charges', async () => {
    const res = await handler(
      makeEvent({
        method: 'POST',
        path: '/schools/assistant',
        token: kvSchoolToken,
        body: {
          question: 'Should primary students have outdoor sports this morning?',
          campusName: 'Main Campus - Kailashahar',
          campusAQI: 218,
          ageGroup: 'primary',
          dominantPollutant: 'PM2.5',
        },
      })
    );
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);

    assert.ok(data.assistantResponse);
    assert.equal(data.cloudBedrockConfigured, false, 'Bedrock cloud models must remain uninvoked');
    assert.ok(data.disclaimer.includes('discretionary school policies'));
  });

  // 7. Multi-Tenant Isolation & Role Authorization Safeguards
  it('Enforces 401 Unauthenticated when Authorization header is missing', async () => {
    const res = await handler(
      makeEvent({
        method: 'GET',
        path: '/schools/profile',
      })
    );
    assert.equal(res.statusCode, 401);
  });

  it('Enforces 403 Forbidden when PERSONAL_USER or FARMER accesses school endpoints', async () => {
    const personalRes = await handler(
      makeEvent({
        method: 'GET',
        path: '/schools/profile',
        token: personalUserToken,
      })
    );
    assert.equal(personalRes.statusCode, 403);

    const farmerRes = await handler(
      makeEvent({
        method: 'GET',
        path: '/schools/activities',
        token: farmerToken,
      })
    );
    assert.equal(farmerRes.statusCode, 403);
  });

  it('Enforces 403 Tenant Isolation when school admin targets a different school ID', async () => {
    const res = await handler(
      makeEvent({
        method: 'POST',
        path: '/schools/activities/evaluate',
        token: otherSchoolToken,
        body: {
          schoolId: 'KV_KAILASHAHAR', // Mismatched target school
          activityName: 'Unauthorized Infiltration Test',
          ageGroup: 'primary',
        },
      })
    );
    assert.equal(res.statusCode, 403);
    const data = JSON.parse(res.body);
    assert.ok(data.message.includes('Tenant isolation mismatch'));
  });
});
