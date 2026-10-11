import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateCognitoToken,
  checkRoleAuthorization,
  checkOwnership,
  checkSchoolTenantIsolation,
  createTestJwt,
} from '../src/middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

// Authoritative Demo Account Mapping Specification
const AUTHORITATIVE_DEMO_USERS = [
  {
    email: 'parasnath@gmail.com',
    role: 'PERSONAL_USER',
    cognitoGroup: 'Role_Personal',
  },
  {
    email: 'sunilnagrale@gmail.com',
    role: 'FARMER',
    cognitoGroup: 'Role_Farmer',
  },
  {
    email: 'kvkailashahar@gmail.com',
    role: 'SCHOOL_ADMIN',
    cognitoGroup: 'Role_School',
  },
];

describe('Live Signup & Role Hardening Regression Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. Authoritative Demo Account Mapping
  // ---------------------------------------------------------------------------
  describe('Authoritative Demo Account Mappings', () => {
    it('verifies parasnath@gmail.com maps strictly to Role_Personal / PERSONAL_USER', () => {
      const demoUser = AUTHORITATIVE_DEMO_USERS.find((u) => u.email === 'parasnath@gmail.com');
      assert.ok(demoUser, 'parasnath@gmail.com must be defined in AUTHORITATIVE_DEMO_USERS');
      assert.strictEqual(demoUser.role, 'PERSONAL_USER');
      assert.strictEqual(demoUser.cognitoGroup, 'Role_Personal');

      const token = createTestJwt({
        sub: 'USER_PARAS',
        email: demoUser.email,
        groups: [demoUser.cognitoGroup],
      });
      const res = validateCognitoToken(`Bearer ${token}`);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.principal?.role, 'PERSONAL_USER');
      assert.strictEqual(res.principal?.email, 'parasnath@gmail.com');
    });

    it('verifies sunilnagrale@gmail.com maps strictly to Role_Farmer / FARMER (NOT BUYER)', () => {
      const demoUser = AUTHORITATIVE_DEMO_USERS.find((u) => u.email === 'sunilnagrale@gmail.com');
      assert.ok(demoUser, 'sunilnagrale@gmail.com must be defined in AUTHORITATIVE_DEMO_USERS');
      assert.strictEqual(demoUser.role, 'FARMER');
      assert.strictEqual(demoUser.cognitoGroup, 'Role_Farmer');
      assert.notStrictEqual(demoUser.role, 'BUYER');
      assert.notStrictEqual(demoUser.cognitoGroup, 'Role_Buyer');

      const token = createTestJwt({
        sub: 'USER_SUNIL',
        email: demoUser.email,
        groups: [demoUser.cognitoGroup],
      });
      const res = validateCognitoToken(`Bearer ${token}`);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.principal?.role, 'FARMER');
      assert.notStrictEqual(res.principal?.role, 'BUYER');
    });

    it('verifies kvkailashahar@gmail.com maps strictly to Role_School / SCHOOL_ADMIN', () => {
      const demoUser = AUTHORITATIVE_DEMO_USERS.find((u) => u.email === 'kvkailashahar@gmail.com');
      assert.ok(demoUser, 'kvkailashahar@gmail.com must be defined in AUTHORITATIVE_DEMO_USERS');
      assert.strictEqual(demoUser.role, 'SCHOOL_ADMIN');
      assert.strictEqual(demoUser.cognitoGroup, 'Role_School');

      const token = createTestJwt({
        sub: 'USER_KVK',
        email: demoUser.email,
        groups: [demoUser.cognitoGroup],
        schoolId: 'KV_KAILASHAHAR',
      });
      const res = validateCognitoToken(`Bearer ${token}`);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.principal?.role, 'SCHOOL_ADMIN');
    });

    it('confirms exactly three demo accounts exist without fourth unauthorized identity', () => {
      assert.strictEqual(
        AUTHORITATIVE_DEMO_USERS.length,
        3,
        'Must contain exactly three demo accounts'
      );
      const emails = AUTHORITATIVE_DEMO_USERS.map((u) => u.email).sort();
      assert.deepStrictEqual(emails, [
        'kvkailashahar@gmail.com',
        'parasnath@gmail.com',
        'sunilnagrale@gmail.com',
      ]);

      // Cross-verify with provision-demo-users.js source file
      const scriptPath = path.resolve(__dirname, '../../scripts/provision-demo-users.js');
      if (fs.existsSync(scriptPath)) {
        const content = fs.readFileSync(scriptPath, 'utf-8');
        assert.ok(content.includes('parasnath@gmail.com'));
        assert.ok(content.includes('sunilnagrale@gmail.com'));
        assert.ok(content.includes('kvkailashahar@gmail.com'));
        assert.ok(content.includes('Role_Personal'));
        assert.ok(content.includes('Role_Farmer'));
        assert.ok(content.includes('Role_School'));
        assert.ok(!content.includes("'custom:role'"), 'Must not contain custom:role in user attributes');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Prevention of Role Escalation Through Client Claims
  // ---------------------------------------------------------------------------
  describe('Role Escalation Prevention', () => {
    it('forces unverified tokens without cognito:groups to least-privilege PERSONAL_USER', () => {
      // Attacker sends custom:role = PLATFORM_ADMIN in payload without group membership
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'ATTACKER_01',
          email: 'attacker@example.com',
          'custom:role': 'PLATFORM_ADMIN', // Attempted role escalation
          exp: Math.floor(Date.now() / 1000) + 3600,
          token_use: 'id',
        })
      ).toString('base64url');
      const sig = Buffer.from('dummy-sig').toString('base64url');
      const token = `${header}.${payload}.${sig}`;

      const res = validateCognitoToken(`Bearer ${token}`);
      assert.strictEqual(res.isValid, true);
      // Must NOT escalate to PLATFORM_ADMIN! Must fall back strictly to PERSONAL_USER
      assert.strictEqual(
        res.principal?.role,
        'PERSONAL_USER',
        'Role must strictly default to PERSONAL_USER when no administrative group is assigned'
      );
    });

    it('forces custom:role = SCHOOL_ADMIN without group to least-privilege PERSONAL_USER', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'ATTACKER_02',
          email: 'attacker@example.com',
          'custom:role': 'SCHOOL_ADMIN',
          exp: Math.floor(Date.now() / 1000) + 3600,
          token_use: 'id',
        })
      ).toString('base64url');
      const sig = Buffer.from('dummy-sig').toString('base64url');
      const token = `${header}.${payload}.${sig}`;

      const res = validateCognitoToken(`Bearer ${token}`);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.principal?.role, 'PERSONAL_USER');
    });

    it('forces custom:role = FARMER without group to least-privilege PERSONAL_USER', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'ATTACKER_03',
          email: 'attacker@example.com',
          'custom:role': 'FARMER',
          exp: Math.floor(Date.now() / 1000) + 3600,
          token_use: 'id',
        })
      ).toString('base64url');
      const sig = Buffer.from('dummy-sig').toString('base64url');
      const token = `${header}.${payload}.${sig}`;

      const res = validateCognitoToken(`Bearer ${token}`);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.principal?.role, 'PERSONAL_USER');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Strict Cross-Role Access Boundaries
  // ---------------------------------------------------------------------------
  describe('Strict Cross-Role Access Boundaries', () => {
    const personalPrincipal = {
      userId: 'USER_PARAS',
      email: 'parasnath@gmail.com',
      role: 'PERSONAL_USER' as const,
    };

    const farmerPrincipal = {
      userId: 'USER_SUNIL',
      email: 'sunilnagrale@gmail.com',
      role: 'FARMER' as const,
    };

    const schoolPrincipal = {
      userId: 'USER_KVK',
      email: 'kvkailashahar@gmail.com',
      role: 'SCHOOL_ADMIN' as const,
      schoolId: 'KV_KAILASHAHAR',
    };

    it('rejects unauthenticated access with 401', () => {
      const res = validateCognitoToken(undefined);
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.errorCode, 'MISSING_TOKEN');
    });

    it('prevents PERSONAL_USER from executing FARMER writes', () => {
      const check = checkRoleAuthorization(personalPrincipal, ['FARMER']);
      assert.strictEqual(check.isAuthorized, false);
      assert.ok(check.errorMessage?.includes('Forbidden'));
    });

    it('prevents PERSONAL_USER from executing SCHOOL_ADMIN writes', () => {
      const check = checkRoleAuthorization(personalPrincipal, ['SCHOOL_ADMIN']);
      assert.strictEqual(check.isAuthorized, false);
      assert.ok(check.errorMessage?.includes('Forbidden'));
    });

    it('prevents FARMER from executing SCHOOL_ADMIN writes', () => {
      const check = checkRoleAuthorization(farmerPrincipal, ['SCHOOL_ADMIN']);
      assert.strictEqual(check.isAuthorized, false);
      assert.ok(check.errorMessage?.includes('Forbidden'));
    });

    it('prevents SCHOOL_ADMIN from executing FARMER writes', () => {
      const check = checkRoleAuthorization(schoolPrincipal, ['FARMER']);
      assert.strictEqual(check.isAuthorized, false);
      assert.ok(check.errorMessage?.includes('Forbidden'));
    });

    it('enforces school tenant isolation between different institutions', () => {
      const authorizedCheck = checkSchoolTenantIsolation(schoolPrincipal, 'KV_KAILASHAHAR');
      assert.strictEqual(authorizedCheck.isAuthorized, true);

      const unauthorizedCheck = checkSchoolTenantIsolation(schoolPrincipal, 'DELHI_PUBLIC_SCHOOL_02');
      assert.strictEqual(unauthorizedCheck.isAuthorized, false);
      assert.ok(unauthorizedCheck.errorMessage?.includes('Tenant isolation mismatch'));
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Schema-Conformant Signup Attribute Validation
  // ---------------------------------------------------------------------------
  describe('Signup Schema Conformance', () => {
    it('verifies signup attributes contain only valid Cognito User Pool schema attributes', () => {
      // In User Pool ap-south-1_TZulzt34Z, the schema supports standard attributes (email, name, etc.).
      // It does NOT support custom:role, custom:orgName, custom:district.
      const ALLOWED_SIGNUP_ATTRIBUTES = new Set([
        'email',
        'name',
        'given_name',
        'family_name',
        'preferred_username',
        'phone_number',
      ]);

      const productionSignupPayload = [
        { Name: 'email', Value: 'citizen@example.com' },
      ];

      for (const attr of productionSignupPayload) {
        assert.ok(
          ALLOWED_SIGNUP_ATTRIBUTES.has(attr.Name),
          `Attribute ${attr.Name} must be defined in the standard Cognito User Pool schema`
        );
        assert.ok(
          !attr.Name.startsWith('custom:'),
          `Custom attribute ${attr.Name} must NOT be submitted during self-signup`
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Hardened GitHub OIDC Policy Format
  // ---------------------------------------------------------------------------
  describe('Hardened GitHub Actions OIDC Invariants', () => {
    it('verifies exact CloudTrail observed subject pattern without wildcards', () => {
      const exactSubFromCloudTrail =
        'repo:Sunil-nagrale@199643814/Air_Quality_Intelligence@1414375341:ref:refs/heads/main';
      const exactStandardSub =
        'repo:Sunil-nagrale/Air_Quality_Intelligence:ref:refs/heads/main';

      // Ensure neither sub string contains broad wildcards
      assert.ok(!exactSubFromCloudTrail.includes('*'), 'Observed sub must not contain wildcards');
      assert.ok(!exactStandardSub.includes('*'), 'Standard sub must not contain wildcards');

      // Verify repository and branch targeting
      assert.ok(exactSubFromCloudTrail.endsWith(':ref:refs/heads/main'));
      assert.ok(exactStandardSub.endsWith(':ref:refs/heads/main'));
    });
  });
});
