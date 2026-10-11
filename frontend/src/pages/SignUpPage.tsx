import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  ArrowRight,
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
import { AppRoute } from '../types';
import { cognitoAuth } from '../services/cognitoAuth';

interface SignUpPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Step 2 verification code state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const isConfigured = cognitoAuth.isConfigured();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setNotice('Email address is required.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setNotice('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setNotice('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setNotice('Password must include at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setNotice('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setNotice('');
    setSuccessMsg('');

    if (!isConfigured) {
      setTimeout(() => {
        setIsLoading(false);
        setNotice(
          'Amazon Cognito User Pool is currently awaiting cloud deployment authorization. Live user registration requires a deployed Cognito User Pool. Zero fake accounts or synthetic authentication bypasses are permitted. Please explore role capabilities using the Demo Portal.'
        );
      }, 400);
      return;
    }

    try {
      // Public self-registration strictly assigns least-privilege personal role
      const result = await cognitoAuth.signUp(cleanEmail, password, 'personal');
      setIsLoading(false);

      if (!result.userConfirmed) {
        setIsVerifying(true);
        setSuccessMsg(
          'Account created! A 6-digit verification code has been dispatched to your email by Amazon Cognito. Enter it below to activate your account.'
        );
      } else {
        setSuccessMsg('Account registered and confirmed. You may now sign in.');
        setTimeout(() => onNavigate('/sign-in'), 1500);
      }
    } catch (err: any) {
      setIsLoading(false);
      setNotice(err.message || 'Registration failed.');
    }
  };

  const handleResendCode = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    setIsResending(true);
    setNotice('');
    try {
      await cognitoAuth.resendConfirmationCode(cleanEmail);
      setIsResending(false);
      setSuccessMsg('A new verification code has been dispatched to your email.');
    } catch (err: any) {
      setIsResending(false);
      setNotice(err.message || 'Failed to resend verification code.');
    }
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setNotice('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    setNotice('');

    try {
      await cognitoAuth.confirmSignUp(email, verificationCode);
      setIsLoading(false);
      setSuccessMsg('Email confirmed successfully! Redirecting to sign in...');
      setTimeout(() => onNavigate('/sign-in'), 1200);
    } catch (err: any) {
      setIsLoading(false);
      setNotice(err.message || 'Verification failed. Please check the code.');
    }
  };

  return (
    <div className="py-8 max-w-lg mx-auto space-y-6">
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
              {isVerifying ? 'Email Verification' : 'New Account Registration'}
            </span>
            <Badge variant="outline" size="sm">Amazon Cognito RBAC</Badge>
          </div>
          <CardTitle className="text-xl">
            {isVerifying ? 'Activate Your AirIntel Account' : 'Create Your AirIntel Account'}
          </CardTitle>
          <CardDescription>
            {isVerifying
              ? 'Enter the 6-digit confirmation code dispatched by Amazon Cognito.'
              : 'Create an Individual Citizen account to track localized air quality and plan exposure-safe activities.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isConfigured && !notice && (
            <div className="mb-4">
              <AlertBanner type="info" title="Cognito Provisioning Boundary">
                Amazon Cognito User Pool is currently awaiting cloud deployment authorization. Live registration requires cloud-provisioned resources. Zero synthetic authentication bypasses are permitted.
              </AlertBanner>
            </div>
          )}

          {notice && (
            <div className="mb-4">
              <AlertBanner type="warning" title="Notice">
                {notice}
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

          {!isVerifying ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="p-3 bg-forest-50 border border-forest-200 rounded-xl text-xs text-forest-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-forest" />
                  <span>Public Self-Registration: Individual Citizen Role</span>
                </div>
                <p className="text-forest-700 text-[11px] leading-relaxed">
                  Public accounts are provisioned with least-privilege personal access. Institutional roles (School Administrator, Stubble Farmer, Feedstock Buyer) are provisioned through administrative authorization or can be explored in the Demo Portal.
                </p>
              </div>

              <FormField label="Email Address" htmlFor="signup-email" required>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setNotice('');
                  }}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Password" htmlFor="signup-password" required>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setNotice('');
                    }}
                  />
                </FormField>

                <FormField label="Confirm Password" htmlFor="signup-confirm-password" required>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setNotice('');
                    }}
                  />
                </FormField>
              </div>

              <div className="text-[11px] text-gray-500 bg-ivory-100 p-3 rounded-xl border border-ivory-300">
                <strong>Password Policy:</strong> Minimum 8 characters with at least one uppercase letter, one lowercase letter, and one number.
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Register Account with Cognito
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmCode} className="space-y-4">
              <FormField label="Email Verification Code" htmlFor="signup-code" required>
                <Input
                  id="signup-code"
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
              </FormField>
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Confirm &amp; Complete Registration
              </Button>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-xs font-semibold text-forest hover:underline disabled:opacity-50"
                >
                  {isResending ? 'Resending code...' : 'Resend verification code'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVerifying(false)}
                  className="text-xs font-bold text-gray-500 hover:text-forest"
                >
                  Back to form
                </button>
              </div>
            </form>
          )}

          {/* Demonstration portal gateway */}
          <div className="mt-6 pt-5 border-t border-ivory-200 text-center space-y-3">
            <div className="text-xs text-gray-500">
              Prefer testing with pre-seeded demonstration workflows?
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
          <span>Already registered?</span>
          <button
            onClick={() => onNavigate('/sign-in')}
            className="font-bold text-forest hover:underline"
          >
            Sign In Here (/sign-in)
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};
