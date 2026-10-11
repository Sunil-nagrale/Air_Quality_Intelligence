import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/index';
import {
  validateCognitoToken,
  checkRoleAuthorization,
  checkOwnership,
  checkSchoolTenantIsolation,
  createTestJwt,
} from '../src/middleware/auth';
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

describe('Authentication Regression Safeguards & Zero-Bypass Verification', () => {
  const personalToken = createTestJwt({
    sub: 'USER_PARAS',
    email: 'parasnath@gmail.com',
    role: 'PERSONAL_USER',
  });

  const farmerToken = createTestJwt({
    sub: 'FARMER_SUNIL',
    email: 'sunilnagrale@gmail.com',
    role: 'FARMER',
  });

  const schoolToken = createTestJwt({
    sub: 'PRINCIPAL_KV',
    email: 'kvkailashahar@gmail.com',
    role: 'SCHOOL_ADMIN',
    schoolId: 'KV_KAILASHAHAR',
  });

  // 1. Rejection of counterfeit tokens and missing authentication
  it('strictly rejects counterfeit or arbitrary bearer strings as invalid tokens', () => {
    const fakeTokens = [
      'fake-token-12345',
      'demo-session-token',
      'bearer-dummy-bypass',
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.', // Alg none unsigned
      'mock.jwt',
    ];

    for (const fake of fakeTokens) {
      const res = validateCognitoToken(`Bearer ${fake}`);
      assert.strictEqual(res.isValid, false, `Should reject ${fake}`);
      assert.strictEqual(res.errorCode, 'INVALID_TOKEN');
    }
  });

  it('rejects protected endpoints when Authorization header is absent', async () => {
    const endpoints = [
      { method: 'POST', path: '/personal/activity-plan' },
      { method: 'POST', path: '/schools/activities/evaluate' },
      { method: 'POST', path: '/marketplace/listings' },
      { method: 'POST', path: '/marketplace/offers' },
      { method: 'POST', path: '/marketplace/collections' },
    ];

    for (const ep of endpoints) {
      const res = await handler(makeEvent({ method: ep.method, path: ep.path }));
      assert.strictEqual(res.statusCode, 401, `Expected 401 for ${ep.method} ${ep.path}`);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.error, 'UNAUTHORIZED');
    }
  });

  // 2. Strict RBAC: unauthorized roles receive 403 Forbidden
  it('enforces 403 Forbidden when a personal user attempts school or marketplace operations', async () => {
    // Personal user trying to create school activity
    const schoolRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/schools/activities/evaluate',
        token: personalToken,
        body: { activityName: 'Unauthorized Primary Run', ageGroup: 'primary' },
      })
    );
    assert.strictEqual(schoolRes.statusCode, 403);

    // Personal user trying to create farmer listing
    const listingRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/listings',
        token: personalToken,
        body: { cropType: 'PADDY_STRAW', quantityTons: 100 },
      })
    );
    assert.strictEqual(listingRes.statusCode, 403);
  });

  it('enforces 403 Forbidden when a farmer attempts school administration', async () => {
    const res = await handler(
      makeEvent({
        method: 'GET',
        path: '/schools/profile',
        token: farmerToken,
      })
    );
    assert.strictEqual(res.statusCode, 403);
  });

  // 3. Multi-Tenant isolation
  it('enforces institutional isolation for school administrators', async () => {
    const foreignSchoolToken = createTestJwt({
      sub: 'PRINCIPAL_FOREIGN',
      email: 'principal@other.edu.in',
      role: 'SCHOOL_ADMIN',
      schoolId: 'KV_DIFFERENT_CAMPUS',
    });

    const res = await handler(
      makeEvent({
        method: 'POST',
        path: '/schools/activities/evaluate',
        token: foreignSchoolToken,
        body: {
          schoolId: 'KV_KAILASHAHAR', // Attempting to evaluate target school
          activityName: 'Cross-Tenant Tamper Test',
          ageGroup: 'primary',
        },
      })
    );
    assert.strictEqual(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.ok(body.message.includes('Tenant isolation mismatch'));
  });

  // 4. Public demonstration browsing remains fully functional without credentials
  it('allows public anonymous access to read-only demonstration and exploratory routes', async () => {
    // Air current
    const airRes = await handler(makeEvent({ method: 'GET', path: '/air/current' }));
    assert.strictEqual(airRes.statusCode, 200);

    // Public marketplace listings
    const marketRes = await handler(makeEvent({ method: 'GET', path: '/marketplace/listings' }));
    assert.strictEqual(marketRes.statusCode, 200);
    const marketBody = JSON.parse(marketRes.body);
    assert.ok(Array.isArray(marketBody.listings));

    // Public environmental impact accounting
    const impactRes = await handler(makeEvent({ method: 'GET', path: '/marketplace/impact' }));
    assert.strictEqual(impactRes.statusCode, 200);
    const impactBody = JSON.parse(impactRes.body);
    assert.ok(impactBody.impact);
  });
});
