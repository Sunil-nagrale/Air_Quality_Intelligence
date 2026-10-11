import React, { useState } from 'react';
import {
  ArrowLeft,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Info,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FormField,
  Input,
  AlertBanner,
  Badge,
} from '../components/ui';
import { AppRoute, UserSession } from '../types';
import { cognitoAuth } from '../services/cognitoAuth';

interface SignInPageProps {
  onNavigate: (route: AppRoute) => void;
  onSignInSuccess?: (session: UserSession) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onNavigate, onSignInSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Unconfirmed user state
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Forgot password workflow state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'CONFIRM'>('REQUEST');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const isConfigured = cognitoAuth.isConfigured();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your account email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    if (!isConfigured) {
      setTimeout(() => {
        setIsLoading(false);
        setError(
          'Amazon Cognito User Pool is not yet provisioned in this environment. Live sign-in requires an authorized cloud Cognito deployment. Zero fake authentication is permitted. To test the decision engines, please launch the Interactive Demo Portal.'
        );
      }, 400);
      return;
    }

    try {
      const session = await cognitoAuth.signIn(email, password);
      setIsLoading(false);
      setSuccessMsg('Authenticated successfully. Redirecting...');
      if (onSignInSuccess) {
        onSignInSuccess(session);
      }
      const targetRoute =
        session.role === 'personal'
          ? '/personal'
          : session.role === 'school'
          ? '/school'
          : '/marketplace';
      setTimeout(() => onNavigate(targetRoute as AppRoute), 400);
    } catch (err: any) {
      setIsLoading(false);
      if (err.code === 'UserNotConfirmedException') {
        setIsUnconfirmed(true);
        setError('Your account is registered but unverified. Please enter the verification code sent to your email.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await cognitoAuth.confirmSignUp(email, verificationCode);
      setIsLoading(false);
      setIsUnconfirmed(false);
      setSuccessMsg('Email verified successfully! You can now sign in.');
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to verify account.');
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your account email address.');
      return;
    }

    setIsLoading(true);
    setError('');

    if (!isConfigured) {
      setTimeout(() => {
        setIsLoading(false);
        setError('Amazon Cognito User Pool is not yet provisioned. Password reset is disabled.');
      }, 400);
      return;
    }

    try {
      await cognitoAuth.forgotPassword(email);
      setIsLoading(false);
      setForgotStep('CONFIRM');
      setSuccessMsg('Password reset code sent to your email.');
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to initiate password reset.');
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotCode || !newPassword) {
      setError('Verification code and new password are required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await cognitoAuth.confirmForgotPassword(email, forgotCode, newPassword);
      setIsLoading(false);
      setIsForgotPassword(false);
      setForgotStep('REQUEST');
      setSuccessMsg('Password reset successfully. Please sign in with your new password.');
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="py-8 max-w-md mx-auto space-y-6">
      <button
        onClick={() => onNavigate('/')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-forest-900 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Overview</span>
      </button>

      <Card variant="default">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Identity &amp; Access
            </span>
            <Badge variant="outline" size="sm">Amazon Cognito SRP</Badge>
          </div>
          <CardTitle className="text-xl">
            {isForgotPassword
              ? 'Reset Password'
              : isUnconfirmed
              ? 'Confirm Email'
              : 'Sign In to AirIntel'}
          </CardTitle>
          <CardDescription>
            {isForgotPassword
              ? 'Enter the code sent to your email to establish a new password.'
              : isUnconfirmed
              ? 'Enter the verification code sent to your email address.'
              : 'Enter your registered citizen, school, farmer, or buyer credentials.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isConfigured && !error && (
            <div className="mb-4">
              <AlertBanner type="info" title="Cognito Provisioning Boundary">
                Amazon Cognito User Pool is currently awaiting cloud deployment authorization. Live sign-in requires cloud-provisioned credentials. Zero fake logins or synthetic JWT bypasses are permitted.
              </AlertBanner>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <AlertBanner type="warning" title="Authentication Notice">
                {error}
              </AlertBanner>
            </div>
          )}

          {successMsg && (
            <div className="mb-4">
              <AlertBanner type="success" title="Success">
                {successMsg}
              </AlertBanner>
            </div>
          )}

          {/* Regular Sign In Form */}
          {!isForgotPassword && !isUnconfirmed && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <FormField label="Email Address" htmlFor="signin-email" required>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                />
              </FormField>

              <FormField label="Password" htmlFor="signin-password" required>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                />
              </FormField>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                  }}
                  className="text-xs font-semibold text-forest hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Sign In with Cognito
              </Button>
            </form>
          )}

          {/* Unconfirmed Account Verification Form */}
          {isUnconfirmed && (
            <form onSubmit={handleConfirmSignUp} className="space-y-4">
              <FormField label="Verification Code (6-digit)" htmlFor="confirm-code" required>
                <Input
                  id="confirm-code"
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
              </FormField>
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Verify &amp; Activate Account
              </Button>
              <button
                type="button"
                onClick={() => setIsUnconfirmed(false)}
                className="w-full text-xs font-bold text-gray-500 hover:text-forest text-center"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Forgot Password Flow */}
          {isForgotPassword && (
            <div className="space-y-4">
              {forgotStep === 'REQUEST' ? (
                <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                  <FormField label="Account Email Address" htmlFor="forgot-email" required>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </FormField>
                  <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                    Send Reset Code
                  </Button>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full text-xs font-bold text-gray-500 hover:text-forest text-center"
                  >
                    Back to Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
                  <FormField label="Verification Code" htmlFor="forgot-code" required>
                    <Input
                      id="forgot-code"
                      type="text"
                      placeholder="123456"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value)}
                    />
                  </FormField>
                  <FormField label="New Password (min. 8 characters)" htmlFor="forgot-newpass" required>
                    <Input
                      id="forgot-newpass"
                      type="password"
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </FormField>
                  <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                    Update Password
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotStep('REQUEST');
                    }}
                    className="w-full text-xs font-bold text-gray-500 hover:text-forest text-center"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Demonstration portal gateway */}
          <div className="mt-6 pt-5 border-t border-ivory-200 text-center space-y-3">
            <div className="text-xs text-gray-500">
              Evaluating platform workflows without live production credentials?
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onNavigate('/demo')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Launch Interactive Demo Portal (/demo)
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between text-xs text-gray-500">
          <span>Need an account?</span>
          <button
            onClick={() => onNavigate('/sign-up')}
            className="font-bold text-forest hover:underline"
          >
            Register Here (/sign-up)
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};
