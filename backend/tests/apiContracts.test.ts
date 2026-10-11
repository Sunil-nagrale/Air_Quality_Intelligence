import { describe, it, beforeEach } from 'node:test';
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

describe('Mandatory API Contracts & Permission Enforcement (Prompt 4)', () => {
  const personalToken = createTestJwt({
    sub: 'USER_PARAS',
    email: 'parasnath@gmail.com',
    role: 'PERSONAL_USER',
  });

  const schoolToken = createTestJwt({
    sub: 'PRINCIPAL_KV',
    email: 'kvkailashahar@gmail.com',
    role: 'SCHOOL_ADMIN',
    schoolId: 'KV_KAILASHAHAR',
  });

  const farmerToken = createTestJwt({
    sub: 'FARMER_SUNIL',
    email: 'sunilnagrale@gmail.com',
    role: 'FARMER',
  });

  const buyerToken = createTestJwt({
    sub: 'BUYER_PUNJAB',
    email: 'buyer@biocng.com',
    role: 'BUYER',
  });

  // 1. Air Quality APIs (Public)
  it('GET /api/air/current returns 200 with station observation and local estimate', async () => {
    const event = makeEvent({ method: 'GET', path: '/api/air/current', queryStringParameters: { lat: '28.6139', lon: '77.2090' } });
    const res = await handler(event);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.nearestStation);
    assert.ok(body.modelledEstimate);
  });

  it('GET /api/air/forecast returns 200 with CAMS numerical model predictions', async () => {
    const event = makeEvent({ method: 'GET', path: '/api/air/forecast', queryStringParameters: { lat: '28.6139', lon: '77.2090', hours: '48' } });
    const res = await handler(event);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.provenance, 'FORECAST');
    assert.ok(Array.isArray(body.forecast));
  });

  // 2. Personal Air Copilot APIs (Protected)
  it('POST /api/personal/activity-plan enforces authentication and personal role', async () => {
    // Unauthenticated -> 401
    const unauthEvent = makeEvent({ method: 'POST', path: '/api/personal/activity-plan', body: { activityType: 'running', targetDate: '2026-10-15' } });
    const unauthRes = await handler(unauthEvent);
    assert.strictEqual(unauthRes.statusCode, 401);

    // Wrong role (FARMER) -> 403
    const wrongRoleEvent = makeEvent({
      method: 'POST',
      path: '/api/personal/activity-plan',
      token: farmerToken,
      body: { activityType: 'running', targetDate: '2026-10-15' },
    });
    const wrongRoleRes = await handler(wrongRoleEvent);
    assert.strictEqual(wrongRoleRes.statusCode, 403);

    // Valid PERSONAL_USER -> 201 Created
    const validEvent = makeEvent({
      method: 'POST',
      path: '/api/personal/activity-plan',
      token: personalToken,
      body: { activityType: 'running', targetDate: '2026-10-15', durationMinutes: 45 },
    });
    const validRes = await handler(validEvent);
    assert.strictEqual(validRes.statusCode, 201);
    const body = JSON.parse(validRes.body);
    assert.strictEqual(body.plan.userId, 'USER_PARAS');
    assert.strictEqual(body.plan.activityType, 'running');
  });

  // 3. School Air Safety Planner APIs (Protected)
  it('POST /api/schools/activities/evaluate enforces SCHOOL_ADMIN role and tenant check', async () => {
    // PERSONAL_USER -> 403
    const wrongRoleEvent = makeEvent({
      method: 'POST',
      path: '/api/schools/activities/evaluate',
      token: personalToken,
      body: { schoolId: 'KV_KAILASHAHAR', ageGroup: 'primary', campusAQI: 218 },
    });
    const wrongRoleRes = await handler(wrongRoleEvent);
    assert.strictEqual(wrongRoleRes.statusCode, 403);

    // Valid SCHOOL_ADMIN -> 200
    const validEvent = makeEvent({
      method: 'POST',
      path: '/api/schools/activities/evaluate',
      token: schoolToken,
      body: {
        schoolId: 'KV_KAILASHAHAR',
        activityName: 'Outdoor Sprint',
        ageGroup: 'primary',
        campusAQI: 218,
      },
    });
    const validRes = await handler(validEvent);
    assert.strictEqual(validRes.statusCode, 200);
    const body = JSON.parse(validRes.body);
    assert.strictEqual(body.evaluation.status, 'MANDATORY_INDOOR');
    assert.strictEqual(body.activity.requiresAdminSignOff, true);
  });

  // 4. Parali-to-Value Marketplace APIs
  it('POST /api/marketplace/listings allows only FARMER role', async () => {
    // BUYER -> 403
    const buyerEvent = makeEvent({
      method: 'POST',
      path: '/api/marketplace/listings',
      token: buyerToken,
      body: { cropType: 'Paddy Straw (Non-Basmati)', quantityTons: 100 },
    });
    const buyerRes = await handler(buyerEvent);
    assert.strictEqual(buyerRes.statusCode, 403);

    // FARMER -> 201 Created
    const farmerEvent = makeEvent({
      method: 'POST',
      path: '/api/marketplace/listings',
      token: farmerToken,
      body: {
        cropType: 'Paddy Straw (Non-Basmati)',
        quantityTons: 250,
        moisturePercent: 14.5,
        askingPricePerTonInr: 1850,
        district: 'Sangrur',
      },
    });
    const farmerRes = await handler(farmerEvent);
    assert.strictEqual(farmerRes.statusCode, 201);
    const body = JSON.parse(farmerRes.body);
    assert.strictEqual(body.listing.quantityTons, 250);
  });

  it('POST /api/marketplace/offers allows only BUYER role', async () => {
    // FARMER -> 403
    const farmerEvent = makeEvent({
      method: 'POST',
      path: '/api/marketplace/offers',
      token: farmerToken,
      body: { listingId: 'LIST_SANGRUR_01', offeredPricePerTonInr: 1900 },
    });
    const farmerRes = await handler(farmerEvent);
    assert.strictEqual(farmerRes.statusCode, 403);

    // BUYER -> 201 Created
    const buyerEvent = makeEvent({
      method: 'POST',
      path: '/api/marketplace/offers',
      token: buyerToken,
      body: {
        listingId: 'LIST_SANGRUR_02',
        offeredPricePerTonInr: 2100,
        quantityTons: 200,
      },
    });
    const buyerRes = await handler(buyerEvent);
    assert.strictEqual(buyerRes.statusCode, 201);
  });

  it('GET /api/marketplace/impact returns verified environmental accounting', async () => {
    const event = makeEvent({ method: 'GET', path: '/api/marketplace/impact' });
    const res = await handler(event);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.impact);
    assert.strictEqual(typeof body.impact.totalQuantityListedTons, 'number');
    assert.strictEqual(typeof body.impact.totalQuantityVerifiedTons, 'number');
  });
});
