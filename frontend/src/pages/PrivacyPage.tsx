import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  FileText,
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
  Badge,
} from '../components/ui';
import { AppRoute } from '../types';

interface PrivacyPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-forest-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="sage" size="md">Data Governance</Badge>
          <Badge variant="outline" size="sm">Privacy Policy</Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-forest tracking-tight">
          Privacy Policy &amp; Data Ethics
        </h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-2xl">
          We treat environmental and personal health intelligence with strict data minimization principles. Below are our commitments to user privacy, institutional isolation, and security.
        </p>
      </div>

      <div className="space-y-6">
        {/* Policy Section 1 */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-forest" />
              <CardTitle className="text-base">1. Location Data &amp; Zero Continuous Tracking</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <p>
              When you permit location access in the Personal Air Copilot, your latitude and longitude coordinates are processed strictly in your local browser session to resolve the nearest physical CAAQMS monitoring station and local atmospheric forecasts.
            </p>
            <p>
              We do <strong>not</strong> log continuous user GPS trails, track movements, or build location profiling databases. You may choose manual district selection at any time without enabling device location permissions.
            </p>
          </CardContent>
        </Card>

        {/* Policy Section 2 */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-forest" />
              <CardTitle className="text-base">2. School Institutional Data Isolation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <p>
              Student health sensitivity records and internal school scheduling decisions are strictly isolated to the authenticated school administrator account.
            </p>
            <p>
              Activity evaluations and compliance audit logs are stored securely in isolated DynamoDB partitions (`AQ_SchoolPlanner`) with strict tenant boundaries, ensuring no cross-school access.
            </p>
          </CardContent>
        </Card>

        {/* Policy Section 3 */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-forest" />
              <CardTitle className="text-base">3. Farmer Residue Privacy &amp; Masked Listings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <p>
              Public marketplace listings display crop type, tonnage, moisture, and district only. Exact farm plot coordinates, phone numbers, and land parcel identifiers are masked from public view.
            </p>
            <p>
              Direct contact information is only revealed to an off-taker once a binding mutual commercial offer has been submitted and confirmed by the farmer.
            </p>
          </CardContent>
        </Card>

        {/* Policy Section 4 */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-forest" />
              <CardTitle className="text-base">4. Regional Cloud Infrastructure &amp; Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <p>
              All platform data resides in the AWS Asia Pacific (Mumbai) region (`ap-south-1`), complying with Indian data sovereignty standards.
            </p>
            <p>
              All data in transit is encrypted using TLS 1.3, and all data at rest is encrypted with AWS Key Management Service (KMS) 256-bit AES encryption.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate('/')}>
          Return to Overview
        </Button>
      </div>
    </div>
  );
};
