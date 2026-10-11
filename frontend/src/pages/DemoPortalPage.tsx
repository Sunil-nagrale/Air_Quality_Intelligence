import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  User,
  School,
  Sprout,
  Factory,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
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
  AlertBanner,
} from '../components/ui';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { AppRoute, UserRole } from '../types';

interface DemoPortalPageProps {
  onNavigate: (route: AppRoute) => void;
  onSelectDemoPersona: (role: UserRole, targetRoute: AppRoute) => void;
}

export const DemoPortalPage: React.FC<DemoPortalPageProps> = ({
  onNavigate,
  onSelectDemoPersona,
}) => {
  const [selectedPersona, setSelectedPersona] = useState<UserRole>('personal');

  // The 3 official provisioned demonstration accounts per frozen specification
  const provisionedPersonas = [
    {
      role: 'personal' as UserRole,
      title: 'Individual Citizen',
      name: 'Paras Nath',
      email: 'parasnath@gmail.com',
      icon: User,
      targetRoute: '/personal' as AppRoute,
      badge: 'Personal Copilot Demo',
      accountType: 'Provisioned Demonstration Account',
      description: 'Citizen in New Delhi with asthma sensitivity exploring 72h forecast and morning outdoor exercise ranking.',
      scenario: 'Evaluates 06:00 vs 16:00 running slot. Inversion dynamics penalize early morning running; afternoon window is recommended.',
    },
    {
      role: 'school' as UserRole,
      title: 'School Principal',
      name: 'Principal Sharma',
      email: 'kvkailashahar@gmail.com',
      icon: School,
      targetRoute: '/school' as AppRoute,
      badge: 'School Planner Demo',
      accountType: 'Provisioned Demonstration Account',
      description: 'School administrator evaluating Primary (5-10) outdoor athletic event during elevated campus AQI.',
      scenario: 'Campus monitor reads AQI 218. Configured policy limit of 160 is breached; system recommends auditorium migration with administrative sign-off.',
    },
    {
      role: 'farmer' as UserRole,
      title: 'Stubble Farmer',
      name: 'Sardar Sunil Singh',
      email: 'sunilnagrale@gmail.com',
      icon: Sprout,
      targetRoute: '/marketplace' as AppRoute,
      badge: 'Marketplace Seller Demo',
      accountType: 'Provisioned Demonstration Account',
      description: 'Progressive farmer in Sangrur with 350 tons of baled non-basmati straw seeking commercial off-take.',
      scenario: 'Lists ex-field round baled straw at ₹1,850/t. System calculates 16T truck freight and matches with Bio-CNG off-taker.',
    },
  ];

  // Unauthenticated Workflow Preview (No fake Cognito account or session generated)
  const buyerPreview = {
    role: 'buyer' as UserRole,
    title: 'Industrial Feedstock Off-Taker',
    name: 'Commercial Bio-Processor',
    accountType: 'Unauthenticated Public Workflow Preview',
    icon: Factory,
    targetRoute: '/marketplace' as AppRoute,
    badge: 'Unauthenticated Off-Taker Preview',
    description: 'Feedstock procurement manager evaluating Sangrur and Ludhiana stubble batches against moisture specifications without signing in.',
    scenario: 'Requires 2,500 tons/month below 18% moisture. Tests multi-variable filtering, hauling distance, and delivered price calculations.',
  };

  const allPersonas = [...provisionedPersonas, buyerPreview];
  const currentPersona = allPersonas.find((p) => p.role === selectedPersona) || provisionedPersonas[0];

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
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
          <Badge variant="sage" size="md">Evaluation Environment</Badge>
          <ProvenanceBadge provenance="DEMO_DATA" detail="Synthetic Simulation" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-forest tracking-tight">
          Interactive Demonstration Portal
        </h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-3xl">
          Evaluate platform capabilities across citizen, institutional, and agricultural workflows. Select an authoritative test identity or launch the unauthenticated buyer preview.
        </p>
      </div>

      <AlertBanner type="info" title="Strict Demonstration Identity Architecture">
        <strong>Three Authoritative Demo Personas:</strong> The platform provisions exactly three verified demonstration identities (Citizen, School Administrator, and Stubble Farmer). The Industrial Off-Taker workflow operates as an <strong>unauthenticated public preview</strong>. Neither workflow generates counterfeit JWT tokens or bypasses Amazon Cognito SRP authentication.
      </AlertBanner>

      {/* Section 1: Provisioned Accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-forest uppercase tracking-wider">
            1. Provisioned Demonstration Identities (3 Accounts)
          </h2>
          <span className="text-xs text-gray-500 font-medium">Pre-seeded test profiles</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {provisionedPersonas.map((p) => {
            const Icon = p.icon;
            const isSelected = p.role === selectedPersona;
            return (
              <button
                key={p.role}
                onClick={() => setSelectedPersona(p.role)}
                className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between h-48 ${
                  isSelected
                    ? 'bg-forest text-white border-forest shadow-md'
                    : 'bg-white text-forest border-ivory-300 hover:bg-ivory-100'
                }`}
              >
                <div className="space-y-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-forest-700 text-white' : 'bg-sage-100 text-forest'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">{p.title}</h4>
                    <div className={`text-xs ${isSelected ? 'text-sage-200' : 'text-gray-500'}`}>
                      {p.name}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono truncate opacity-80 pt-2 border-t border-current/10">
                  {p.email}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Unauthenticated Buyer Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-forest uppercase tracking-wider">
            2. Unauthenticated Off-Taker Workflow Preview
          </h2>
          <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            No Account Required
          </span>
        </div>

        <button
          onClick={() => setSelectedPersona('buyer')}
          className={`w-full p-5 rounded-2xl border text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            selectedPersona === 'buyer'
              ? 'bg-forest text-white border-forest shadow-md'
              : 'bg-white text-forest border-ivory-300 hover:bg-ivory-100'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                selectedPersona === 'buyer' ? 'bg-forest-700 text-white' : 'bg-sage-100 text-forest'
              }`}
            >
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-tight">{buyerPreview.title}</h4>
              <p className={`text-xs ${selectedPersona === 'buyer' ? 'text-sage-200' : 'text-gray-500'}`}>
                Commercial Bio-CNG / Bio-Refinery Feedstock Buyer (Illustrative Exploration)
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-medium opacity-90 shrink-0">
            Public / Unauthenticated Session
          </div>
        </button>
      </div>

      {/* Selected Scenario Card */}
      <Card variant="default">
        <CardHeader className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                {currentPersona.accountType}
              </span>
              <CardTitle className="text-xl mt-0.5">{currentPersona.title}: {currentPersona.name}</CardTitle>
            </div>
            <ProvenanceBadge provenance="DEMO_DATA" detail={currentPersona.badge} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 text-xs sm:text-sm text-gray-700">
          <p className="leading-relaxed">{currentPersona.description}</p>

          <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300 space-y-1.5">
            <span className="font-bold text-forest block text-xs uppercase tracking-wider">
              Simulation Test Case:
            </span>
            <p className="text-xs text-gray-600 leading-relaxed">{currentPersona.scenario}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {selectedPersona === 'buyer'
                ? 'Unauthenticated preview mode active. Zero session credentials injected.'
                : 'Pre-seeded demonstration identity active. Zero impact on production telemetry.'}
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onNavigate('/')}>
            Back to Home
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onSelectDemoPersona(currentPersona.role, currentPersona.targetRoute)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {selectedPersona === 'buyer' ? 'Launch Buyer Workflow Preview' : `Launch ${currentPersona.title} Workflow`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
