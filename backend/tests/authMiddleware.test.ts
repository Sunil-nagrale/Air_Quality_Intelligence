import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateCognitoToken,
  checkRoleAuthorization,
  checkOwnership,
  checkSchoolTenantIsolation,
  createTestJwt,
} from '../src/middleware/auth';

describe('Cognito Authentication & Role Authorization Middleware', () => {
  it('rejects missing or empty Authorization header with 401 MISSING_TOKEN', () => {
    const res1 = validateCognitoToken(undefined);
    assert.strictEqual(res1.isValid, false);
    assert.strictEqual(res1.errorCode, 'MISSING_TOKEN');

    const res2 = validateCognitoToken('');
    assert.strictEqual(res2.isValid, false);
    assert.strictEqual(res2.errorCode, 'MISSING_TOKEN');
  });

  it('rejects malformed Authorization headers with 401 INVALID_TOKEN', () => {
    const res1 = validateCognitoToken('Basic 123456');
    assert.strictEqual(res1.isValid, false);
    assert.strictEqual(res1.errorCode, 'INVALID_TOKEN');

    const res2 = validateCognitoToken('Bearer not-a-jwt');
    assert.strictEqual(res2.isValid, false);
    assert.strictEqual(res2.errorCode, 'INVALID_TOKEN');
  });

  it('rejects expired Cognito JWT tokens with 401 EXPIRED_TOKEN', () => {
    const expiredToken = createTestJwt({
      sub: 'user_123',
      email: 'test@example.com',
      role: 'PERSONAL_USER',
      expSecondsFromNow: -100, // Expired 100 seconds ago
    });

    const res = validateCognitoToken(`Bearer ${expiredToken}`);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errorCode, 'EXPIRED_TOKEN');
  });

  it('validates and resolves principal with correct role mapping from Cognito groups', () => {
    // 1. Citizen / Personal User
    const personalJwt = createTestJwt({
      sub: 'USER_PARAS',
      email: 'parasnath@gmail.com',
      role: 'PERSONAL_USER',
    });
    const resPersonal = validateCognitoToken(`Bearer ${personalJwt}`);
    assert.strictEqual(resPersonal.isValid, true);
    assert.strictEqual(resPersonal.principal?.userId, 'USER_PARAS');
    assert.strictEqual(resPersonal.principal?.email, 'parasnath@gmail.com');
    assert.strictEqual(resPersonal.principal?.role, 'PERSONAL_USER');

    // 2. School Admin
    const schoolJwt = createTestJwt({
      sub: 'USER_PRINCIPAL',
      email: 'kvkailashahar@gmail.com',
      role: 'SCHOOL_ADMIN',
      schoolId: 'KV_KAILASHAHAR',
    });
    const resSchool = validateCognitoToken(`Bearer ${schoolJwt}`);
    assert.strictEqual(resSchool.isValid, true);
    assert.strictEqual(resSchool.principal?.role, 'SCHOOL_ADMIN');
    assert.strictEqual(resSchool.principal?.schoolId, 'KV_KAILASHAHAR');

    // 3. Stubble Farmer
    const farmerJwt = createTestJwt({
      sub: 'USER_FARMER_SUNIL',
      email: 'sunilnagrale@gmail.com',
      role: 'FARMER',
    });
    const resFarmer = validateCognitoToken(`Bearer ${farmerJwt}`);
    assert.strictEqual(resFarmer.isValid, true);
    assert.strictEqual(resFarmer.principal?.role, 'FARMER');

    // 4. Industrial Buyer
    const buyerJwt = createTestJwt({
      sub: 'USER_BUYER_01',
      email: 'procurement@biocng.com',
      role: 'BUYER',
    });
    const resBuyer = validateCognitoToken(`Bearer ${buyerJwt}`);
    assert.strictEqual(resBuyer.isValid, true);
    assert.strictEqual(resBuyer.principal?.role, 'BUYER');

    // 5. Platform Admin
    const adminJwt = createTestJwt({
      sub: 'USER_SUPERADMIN',
      email: 'admin@airintel.org',
      role: 'PLATFORM_ADMIN',
    });
    const resAdmin = validateCognitoToken(`Bearer ${adminJwt}`);
    assert.strictEqual(resAdmin.isValid, true);
    assert.strictEqual(resAdmin.principal?.role, 'PLATFORM_ADMIN');
  });

  it('enforces role authorization and rejects unauthorized roles with 403', () => {
    const personalPrincipal = {
      userId: 'user_1',
      email: 'user1@test.com',
      role: 'PERSONAL_USER' as const,
    };

    // Personal user trying to access school admin endpoint
    const check1 = checkRoleAuthorization(personalPrincipal, ['SCHOOL_ADMIN']);
    assert.strictEqual(check1.isAuthorized, false);
    assert.ok(check1.errorMessage?.includes('Forbidden'));

    // Personal user accessing personal endpoint
    const check2 = checkRoleAuthorization(personalPrincipal, ['PERSONAL_USER']);
    assert.strictEqual(check2.isAuthorized, true);

    // Platform admin accessing school endpoint (super-user override)
    const adminPrincipal = {
      userId: 'admin_1',
      email: 'admin@test.com',
      role: 'PLATFORM_ADMIN' as const,
    };
    const check3 = checkRoleAuthorization(adminPrincipal, ['SCHOOL_ADMIN']);
    assert.strictEqual(check3.isAuthorized, true);
  });

  it('enforces personal record ownership preventing cross-user tampering', () => {
    const userA = { userId: 'USER_A', email: 'a@test.com', role: 'PERSONAL_USER' as const };

    // User A accessing User A's plan
    assert.strictEqual(checkOwnership(userA, 'USER_A').isAuthorized, true);

    // User A attempting to access User B's plan
    const crossCheck = checkOwnership(userA, 'USER_B');
    assert.strictEqual(crossCheck.isAuthorized, false);
    assert.ok(crossCheck.errorMessage?.includes('Access denied'));

    // Admin can access any record
    const admin = { userId: 'ADMIN', email: 'admin@test.com', role: 'PLATFORM_ADMIN' as const };
    assert.strictEqual(checkOwnership(admin, 'USER_B').isAuthorized, true);
  });

  it('enforces school multi-tenant isolation preventing cross-school access', () => {
    const kvSchoolAdmin = {
      userId: 'PRINCIPAL_KV',
      email: 'kv@test.com',
      role: 'SCHOOL_ADMIN' as const,
      schoolId: 'KV_KAILASHAHAR',
    };

    // Same school passes
    assert.strictEqual(
      checkSchoolTenantIsolation(kvSchoolAdmin, 'KV_KAILASHAHAR').isAuthorized,
      true
    );

    // Cross-school access rejected
    const crossSchool = checkSchoolTenantIsolation(kvSchoolAdmin, 'DPS_DELHI_01');
    assert.strictEqual(crossSchool.isAuthorized, false);
    assert.ok(crossSchool.errorMessage?.includes('Tenant isolation mismatch'));

    // Non-school admin rejected
    const farmer = { userId: 'FARMER_1', email: 'f@test.com', role: 'FARMER' as const };
    assert.strictEqual(
      checkSchoolTenantIsolation(farmer, 'KV_KAILASHAHAR').isAuthorized,
      false
    );
  });
});
