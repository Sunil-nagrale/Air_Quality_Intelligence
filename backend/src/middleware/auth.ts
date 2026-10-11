import { AuthPrincipal, UserRole } from '../types';

export interface TokenValidationResult {
  isValid: boolean;
  principal?: AuthPrincipal;
  errorCode?: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'INVALID_ISSUER';
  errorMessage?: string;
}

/**
 * Validates a Cognito ID / Access JWT token.
 * Extracts user identity, email, and mapped RBAC role from `cognito:groups`.
 */
export function validateCognitoToken(
  authHeader: string | undefined,
  expectedConfig?: { userPoolId?: string; region?: string; clientId?: string }
): TokenValidationResult {
  if (!authHeader || !authHeader.trim()) {
    return {
      isValid: false,
      errorCode: 'MISSING_TOKEN',
      errorMessage: 'Missing Authorization header. Bearer token required.',
    };
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      isValid: false,
      errorCode: 'INVALID_TOKEN',
      errorMessage: 'Invalid Authorization format. Expected: Bearer <token>',
    };
  }

  const token = parts[1];
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3 || !tokenParts[2]) {
    return {
      isValid: false,
      errorCode: 'INVALID_TOKEN',
      errorMessage: 'Malformed JWT token structure or missing signature.',
    };
  }

  try {
    const headerJson = Buffer.from(tokenParts[0], 'base64url').toString('utf-8');
    const header = JSON.parse(headerJson);
    if (!header.alg || header.alg.toLowerCase() === 'none') {
      return {
        isValid: false,
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Forbidden: Insecure or missing JWT algorithm.',
      };
    }

    const payloadJson = Buffer.from(tokenParts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    // Expiration check (exp is in epoch seconds)
    const nowEpoch = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowEpoch) {
      return {
        isValid: false,
        errorCode: 'EXPIRED_TOKEN',
        errorMessage: `Cognito token expired at ${new Date(payload.exp * 1000).toISOString()}`,
      };
    }

    // Issuer check if userPoolId and region configured
    const expectedRegion = expectedConfig?.region || process.env.AWS_REGION || 'ap-south-1';
    const expectedPoolId = expectedConfig?.userPoolId || process.env.USER_POOL_ID;
    if (expectedPoolId && payload.iss) {
      const expectedIss = `https://cognito-idp.${expectedRegion}.amazonaws.com/${expectedPoolId}`;
      if (payload.iss !== expectedIss) {
        return {
          isValid: false,
          errorCode: 'INVALID_ISSUER',
          errorMessage: `Token issuer mismatch. Expected: ${expectedIss}`,
        };
      }
    }

    // Map Cognito groups to authoritative UserRole
    const groups: string[] = payload['cognito:groups'] || [];
    let role: UserRole = 'PERSONAL_USER'; // Default role if no group

    if (groups.includes('Role_Admin') || groups.includes('PLATFORM_ADMIN')) {
      role = 'PLATFORM_ADMIN';
    } else if (groups.includes('Role_School') || groups.includes('SCHOOL_ADMIN')) {
      role = 'SCHOOL_ADMIN';
    } else if (groups.includes('Role_Farmer') || groups.includes('FARMER')) {
      role = 'FARMER';
    } else if (groups.includes('Role_Buyer') || groups.includes('BUYER')) {
      role = 'BUYER';
    } else if (groups.includes('Role_Personal') || groups.includes('PERSONAL_USER')) {
      role = 'PERSONAL_USER';
    } else if (payload['custom:role']) {
      role = payload['custom:role'] as UserRole;
    }

    const principal: AuthPrincipal = {
      userId: payload.sub || payload.userId || 'anonymous-user',
      email: payload.email || '',
      role,
      schoolId: payload['custom:schoolId'] || payload.schoolId,
      farmerId: payload['custom:farmerId'] || payload.farmerId,
      buyerId: payload['custom:buyerId'] || payload.buyerId,
      isDemo: payload.isDemo === true,
    };

    return {
      isValid: true,
      principal,
    };
  } catch (err: any) {
    return {
      isValid: false,
      errorCode: 'INVALID_TOKEN',
      errorMessage: `Failed to decode JWT payload: ${err.message}`,
    };
  }
}

/**
 * Enforces role authorization. PLATFORM_ADMIN always has super-user override.
 */
export function checkRoleAuthorization(
  principal: AuthPrincipal,
  allowedRoles: UserRole[]
): { isAuthorized: boolean; errorMessage?: string } {
  if (principal.role === 'PLATFORM_ADMIN') {
    return { isAuthorized: true };
  }

  if (!allowedRoles.includes(principal.role)) {
    return {
      isAuthorized: false,
      errorMessage: `Forbidden: User role ${principal.role} is not authorized. Required: [${allowedRoles.join(', ')}]`,
    };
  }

  return { isAuthorized: true };
}

/**
 * Enforces record ownership (user can only access/modify their own personal records).
 */
export function checkOwnership(
  principal: AuthPrincipal,
  resourceOwnerId: string
): { isAuthorized: boolean; errorMessage?: string } {
  if (principal.role === 'PLATFORM_ADMIN') {
    return { isAuthorized: true };
  }

  if (principal.userId !== resourceOwnerId) {
    return {
      isAuthorized: false,
      errorMessage: `Forbidden: Access denied to record owned by ${resourceOwnerId}`,
    };
  }

  return { isAuthorized: true };
}

/**
 * Enforces institutional multi-tenant isolation for schools.
 */
export function checkSchoolTenantIsolation(
  principal: AuthPrincipal,
  targetSchoolId: string
): { isAuthorized: boolean; errorMessage?: string } {
  if (principal.role === 'PLATFORM_ADMIN') {
    return { isAuthorized: true };
  }

  if (principal.role !== 'SCHOOL_ADMIN') {
    return {
      isAuthorized: false,
      errorMessage: 'Forbidden: Only school administrators can access school institution records.',
    };
  }

  if (principal.schoolId && principal.schoolId !== targetSchoolId) {
    return {
      isAuthorized: false,
      errorMessage: `Forbidden: Tenant isolation mismatch. School ${principal.schoolId} cannot access ${targetSchoolId}`,
    };
  }

  return { isAuthorized: true };
}

/**
 * Utility helper for unit tests to generate a validly structured Cognito JWT
 */
export function createTestJwt(claims: {
  sub: string;
  email: string;
  role?: UserRole;
  groups?: string[];
  expSecondsFromNow?: number;
  schoolId?: string;
  userPoolId?: string;
  region?: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');

  const exp = Math.floor(Date.now() / 1000) + (claims.expSecondsFromNow ?? 3600);
  const region = claims.region || 'ap-south-1';
  const poolId = claims.userPoolId || 'ap-south-1_testPool';

  const groupMapping: Record<UserRole, string> = {
    PERSONAL_USER: 'Role_Personal',
    SCHOOL_ADMIN: 'Role_School',
    FARMER: 'Role_Farmer',
    BUYER: 'Role_Buyer',
    PLATFORM_ADMIN: 'Role_Admin',
  };

  const groups = claims.groups || (claims.role ? [groupMapping[claims.role]] : ['Role_Personal']);

  const payload = Buffer.from(
    JSON.stringify({
      sub: claims.sub,
      email: claims.email,
      'cognito:groups': groups,
      'custom:role': claims.role,
      'custom:schoolId': claims.schoolId,
      iss: `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
      exp,
    })
  ).toString('base64url');

  const dummySignature = Buffer.from('test-signature-for-unit-testing').toString('base64url');
  return `${header}.${payload}.${dummySignature}`;
}
