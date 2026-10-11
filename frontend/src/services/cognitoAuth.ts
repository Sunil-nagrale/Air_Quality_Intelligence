import { OfficialRole, UserRole, UserSession } from '../types';
import { config } from '../config';

export interface CognitoAuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface CognitoAuthError {
  code: string;
  message: string;
}

export class CognitoAuthService {
  private userPoolId: string;
  private clientId: string;
  private region: string;
  private storageKey = 'air_intel_cognito_session';

  constructor() {
    this.userPoolId = config.cognito.userPoolId;
    this.clientId = config.cognito.clientId;
    this.region = config.cognito.region;
  }

  /**
   * Checks if a live Amazon Cognito User Pool is configured.
   */
  isConfigured(): boolean {
    return (
      Boolean(this.userPoolId) &&
      Boolean(this.clientId) &&
      !this.userPoolId.includes('XXXXXXXXX') &&
      !this.clientId.includes('XXXXXXXXX')
    );
  }

  getEndpoint(): string {
    return `https://cognito-idp.${this.region}.amazonaws.com/`;
  }

  /**
   * Dispatches a raw request to AWS Cognito Identity Provider endpoint.
   */
  private async cognitoRequest<T = any>(target: string, payload: Record<string, any>): Promise<T> {
    if (!this.isConfigured()) {
      throw {
        code: 'CONFIG_UNAVAILABLE',
        message:
          'Amazon Cognito User Pool is not yet provisioned in this environment. Live sign-in requires a deployed Cognito User Pool.',
      };
    }

    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorType = (data.__type || data.code || 'CognitoError').split('#').pop();
      const message = this.mapErrorMessage(errorType, data.message || 'Authentication error');
      throw { code: errorType, message };
    }

    return data;
  }

  private mapErrorMessage(code: string, originalMessage: string): string {
    switch (code) {
      case 'UserNotFoundException':
        return 'No registered account found with this email address.';
      case 'NotAuthorizedException':
        return 'Incorrect username or password. Please verify your credentials.';
      case 'UserNotConfirmedException':
        return 'Your account is not yet verified. Please enter the verification code sent to your email.';
      case 'CodeMismatchException':
        return 'Invalid verification code. Please check your email and try again.';
      case 'ExpiredCodeException':
        return 'The verification code has expired. Please request a new code.';
      case 'InvalidPasswordException':
        return 'Password must be at least 8 characters with lowercase, uppercase, and numeric digits.';
      case 'UsernameExistsException':
        return 'An account with this email address already exists. Please sign in instead.';
      case 'LimitExceededException':
      case 'TooManyRequestsException':
        return 'Too many attempts. Please wait a few moments before trying again.';
      case 'InvalidParameterException':
        return 'Invalid registration parameters. Please ensure email format and password meet requirements.';
      case 'UserLambdaValidationException':
        return 'Registration validation failed. Please check your details.';
      default:
        // Do not expose sensitive internal exception details to the user
        if (originalMessage && !originalMessage.includes('arn:') && !originalMessage.includes('AWS')) {
          return originalMessage;
        }
        return 'An error occurred during authentication. Please check your details and try again.';
    }
  }

  /**
   * Decodes JWT payload without external libraries.
   */
  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  /**
   * Signs in a user using Cognito USER_PASSWORD_AUTH flow.
   */
  async signIn(email: string, password: string): Promise<UserSession> {
    const data = await this.cognitoRequest('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const result = data.AuthenticationResult;
    if (!result) {
      throw { code: 'CHALLENGE_REQUIRED', message: 'Additional authentication challenge required.' };
    }

    const payload = this.parseJwt(result.IdToken);
    const groups: string[] = payload?.['cognito:groups'] || [];
    let officialRole: OfficialRole = 'PERSONAL_USER';

    // Authoritative role assignment derived strictly from Cognito RBAC groups
    if (groups.includes('Role_Admin') || groups.includes('PLATFORM_ADMIN')) {
      officialRole = 'PLATFORM_ADMIN';
    } else if (groups.includes('Role_School') || groups.includes('SCHOOL_ADMIN')) {
      officialRole = 'SCHOOL_ADMIN';
    } else if (groups.includes('Role_Farmer') || groups.includes('FARMER')) {
      officialRole = 'FARMER';
    } else if (groups.includes('Role_Buyer') || groups.includes('BUYER')) {
      officialRole = 'BUYER';
    } else {
      officialRole = 'PERSONAL_USER';
    }

    const roleMapping: Record<OfficialRole, UserRole> = {
      PERSONAL_USER: 'personal',
      SCHOOL_ADMIN: 'school',
      FARMER: 'farmer',
      BUYER: 'buyer',
      PLATFORM_ADMIN: 'admin',
    };

    const session: UserSession = {
      userId: payload?.sub || email,
      email: payload?.email || email,
      role: roleMapping[officialRole] || 'personal',
      officialRole,
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
      expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000,
      isDemo: false,
    };

    // Store in browser sessionStorage (only tokens, NEVER password!)
    sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    return session;
  }

  /**
   * Registers a new user account with default least-privilege role (PERSONAL_USER).
   * Submits only schema-compliant attributes (email). Institutional attributes are managed via backend profile workflows.
   */
  async signUp(
    email: string,
    password: string,
    _role: UserRole = 'personal',
    _customAttributes?: Record<string, string>
  ): Promise<{ userConfirmed: boolean; userSub: string }> {
    // Only standard attributes defined in the Cognito User Pool schema are passed
    const userAttributes = [
      { Name: 'email', Value: email },
    ];

    const data = await this.cognitoRequest('SignUp', {
      ClientId: this.clientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    });

    return {
      userConfirmed: data.UserConfirmed ?? false,
      userSub: data.UserSub,
    };
  }

  /**
   * Confirms email address with 6-digit verification code.
   */
  async confirmSignUp(email: string, confirmationCode: string): Promise<boolean> {
    await this.cognitoRequest('ConfirmSignUp', {
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: confirmationCode,
    });
    return true;
  }

  /**
   * Resends verification code.
   */
  async resendConfirmationCode(email: string): Promise<boolean> {
    await this.cognitoRequest('ResendConfirmationCode', {
      ClientId: this.clientId,
      Username: email,
    });
    return true;
  }

  /**
   * Initiates forgot-password workflow.
   */
  async forgotPassword(email: string): Promise<boolean> {
    await this.cognitoRequest('ForgotPassword', {
      ClientId: this.clientId,
      Username: email,
    });
    return true;
  }

  /**
   * Confirms new password using email verification code.
   */
  async confirmForgotPassword(
    email: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<boolean> {
    await this.cognitoRequest('ConfirmForgotPassword', {
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });
    return true;
  }

  /**
   * Restores existing active session from sessionStorage.
   */
  getCurrentSession(): UserSession | null {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      if (!stored) return null;
      const session: UserSession = JSON.parse(stored);

      // Check if session has expired
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.signOut();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Signs out the user and clears all credentials from browser storage.
   */
  signOut(): void {
    sessionStorage.removeItem(this.storageKey);
  }
}

export const cognitoAuth = new CognitoAuthService();
