import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as crypto from 'crypto';
import {
  validateCognitoToken,
  checkRoleAuthorization,
  checkOwnership,
  checkSchoolTenantIsolation,
  createTestJwt,
  verifyJwtSignature,
} from '../src/middleware/auth';

describe('Cognito Server-Side Auth Regression Safeguards', () => {
  it('enforces audience / client ID matching when configured', () => {
    const validToken = createTestJwt({
      sub: 'USER_1',
      email: 'user1@test.com',
      role: 'PERSONAL_USER',
      clientId: 'expected-client-app-123',
    });

    // Success with matching client ID
    const validRes = validateCognitoToken(`Bearer ${validToken}`, {
      clientId: 'expected-client-app-123',
    });
    assert.strictEqual(validRes.isValid, true);
    assert.strictEqual(validRes.principal?.userId, 'USER_1');

    // Rejection on client ID mismatch
    const mismatchRes = validateCognitoToken(`Bearer ${validToken}`, {
      clientId: 'different-client-456',
    });
    assert.strictEqual(mismatchRes.isValid, false);
    assert.strictEqual(mismatchRes.errorCode, 'INVALID_TOKEN');
    assert.ok(mismatchRes.errorMessage?.includes('mismatch'));
  });

  it('validates access token token_use and client_id claim', () => {
    const accessToken = createTestJwt({
      sub: 'USER_ACCESS',
      email: 'access@test.com',
      role: 'PLATFORM_ADMIN',
      clientId: 'app-client-xyz',
      tokenUse: 'access',
    });

    const res = validateCognitoToken(`Bearer ${accessToken}`, {
      clientId: 'app-client-xyz',
    });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.principal?.role, 'PLATFORM_ADMIN');
  });

  it('rejects invalid or forged token_use claims', () => {
    // Manually create JWT with forged token_use = 'refresh'
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'FORGED_USER',
        email: 'forged@test.com',
        token_use: 'refresh', // forbidden
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');
    const sig = Buffer.from('test-sig').toString('base64url');
    const forgedToken = `${header}.${payload}.${sig}`;

    const res = validateCognitoToken(`Bearer ${forgedToken}`);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errorCode, 'INVALID_TOKEN');
    assert.ok(res.errorMessage?.includes("Invalid token_use 'refresh'"));
  });

  it('strictly rejects missing signatures and none algorithm tokens', () => {
    // 1. Missing signature
    const headerNone = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'ATTACKER',
        email: 'attacker@evil.com',
        'cognito:groups': ['PLATFORM_ADMIN'],
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');
    const missingSigToken = `${headerNone}.${payload}.`;

    const res1 = validateCognitoToken(`Bearer ${missingSigToken}`);
    assert.strictEqual(res1.isValid, false);
    assert.strictEqual(res1.errorCode, 'INVALID_TOKEN');
    assert.ok(res1.errorMessage?.includes('missing signature'));

    // 2. Algorithm set to none
    const dummySig = Buffer.from('dummy-signature').toString('base64url');
    const noneAlgToken = `${headerNone}.${payload}.${dummySig}`;
    const res2 = validateCognitoToken(`Bearer ${noneAlgToken}`);
    assert.strictEqual(res2.isValid, false);
    assert.strictEqual(res2.errorCode, 'INVALID_TOKEN');
    assert.ok(res2.errorMessage?.includes('Forbidden: Insecure or missing JWT algorithm'));
  });

  it('verifies cryptographic RSA-SHA256 signatures and detects tampering', () => {
    // Generate ephemeral RSA keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'AUTHENTIC_USER',
        email: 'real@domain.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');

    const message = `${header}.${payload}`;
    const validSignature = crypto.sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64url');
    const signedJwt = `${message}.${validSignature}`;

    // Valid signature verification succeeds
    assert.strictEqual(verifyJwtSignature(signedJwt, publicKey), true);

    // Tampered payload fails cryptographic verification
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: 'AUTHENTIC_USER',
        email: 'admin@domain.com', // modified!
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');
    const tamperedJwt = `${header}.${tamperedPayload}.${validSignature}`;
    assert.strictEqual(verifyJwtSignature(tamperedJwt, publicKey), false);

    // Forged signature fails
    const badSignatureJwt = `${message}.${Buffer.from('forged-signature').toString('base64url')}`;
    assert.strictEqual(verifyJwtSignature(badSignatureJwt, publicKey), false);
  });
});
