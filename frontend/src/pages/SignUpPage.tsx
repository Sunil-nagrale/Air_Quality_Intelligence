import React, { useState } from 'react';
import {
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  School,
  Sprout,
  Factory,
  User,
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
  Select,
  AlertBanner,
  Badge,
} from '../components/ui';
import { AppRoute, UserRole } from '../types';
import { cognitoAuth } from '../services/cognitoAuth';

interface SignUpPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate }) => {
  const [role, setRole] = useState<UserRole>('personal');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [district, setDistrict] = useState('Sangrur');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 2 verification code state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const isConfigured = cognitoAuth.isConfigured();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setNotice('Email address is required.');
      return;
    }
    if (password.length < 8) {
      setNotice('Password must be at least 8 characters long.');
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
      const customAttributes: Record<string, string> = {};
      if (orgName) customAttributes['custom:orgName'] = orgName;
      if (district && role === 'farmer') customAttributes['custom:district'] = district;

      const result = await cognitoAuth.signUp(email, password, role, customAttributes);
      setIsLoading(false);

      if (!result.userConfirmed) {
        setIsVerifying(true);
        setSuccessMsg(
          'Account created! A 6-digit verification code has been sent to your email. Enter it below to activate your account.'
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
              : 'Select your operational persona to establish institutional policies, list residue, or track air quality.'}
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
              <FormField label="Operational Persona" htmlFor="signup-role" required>
                <Select
                  id="signup-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="personal">Individual Citizen / Family (Personal Air Copilot)</option>
                  <option value="school">School Administrator (Air Safety Planner)</option>
                  <option value="farmer">Stubble Farmer / Supplier (Parali Marketplace)</option>
                  <option value="buyer">Industrial Off-Taker / Bio-Processor (Feedstock Buyer)</option>
                </Select>
              </FormField>

              {(role === 'school' || role === 'buyer') && (
                <FormField
                  label={role === 'school' ? 'School / Institution Name' : 'Company / Processing Plant Name'}
                  htmlFor="signup-org"
                  required
                >
                  <Input
                    id="signup-org"
                    type="text"
                    placeholder={role === 'school' ? 'e.g. Kendriya Vidyalaya Kailashahar' : 'e.g. Verbio India Bio-CNG Unit'}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </FormField>
              )}

              {role === 'farmer' && (
                <FormField label="Agricultural District" htmlFor="signup-district" required>
                  <Select
                    id="signup-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  >
                    <option value="Sangrur">Sangrur, Punjab</option>
                    <option value="Ludhiana">Ludhiana, Punjab</option>
                    <option value="Bathinda">Bathinda, Punjab</option>
                    <option value="Patiala">Patiala, Punjab</option>
                    <option value="Karnal">Karnal, Haryana</option>
                    <option value="Kurukshetra">Kurukshetra, Haryana</option>
                    <option value="Ambala">Ambala, Haryana</option>
                  </Select>
                </FormField>
              )}

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
                <strong>Password Policy:</strong> Minimum 8 characters with at least one uppercase letter, one lowercase letter, and one number. Roles are mapped server-side to verified Cognito RBAC groups.
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
              <button
                type="button"
                onClick={() => setIsVerifying(false)}
                className="w-full text-xs font-bold text-gray-500 hover:text-forest text-center"
              >
                Back to Registration Form
              </button>
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
