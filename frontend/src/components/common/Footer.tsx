import React from 'react';
import { Wind, ShieldCheck, MapPin, ExternalLink, FileText, Lock } from 'lucide-react';
import { AppRoute } from '../../types';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-ivory-300 bg-ivory-100 text-xs text-gray-600 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-forest text-white flex items-center justify-center font-bold">
                <Wind className="w-4 h-4" />
              </div>
              <span className="font-black text-forest text-base tracking-tight">
                AirIntel Platform
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Actionable environmental intelligence for Northwest India. Unified personal exposure forecasting, school air safety policies, and circular stubble valorization.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium pt-1">
              <MapPin className="w-3.5 h-3.5 text-forest" />
              <span>Delhi-NCR • Punjab • Haryana</span>
            </div>
          </div>

          {/* Public Pages */}
          <div className="space-y-2">
            <div className="font-bold text-forest uppercase text-[11px] tracking-wider">
              Public Navigation
            </div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="hover:text-forest transition font-medium"
                >
                  Overview &amp; Headline
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/how-it-works')}
                  className="hover:text-forest transition font-medium"
                >
                  How It Works (/how-it-works)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/air-quality')}
                  className="hover:text-forest transition font-medium"
                >
                  Air Quality Explorer (/air-quality)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/marketplace')}
                  className="hover:text-forest transition font-medium"
                >
                  Marketplace Preview (/marketplace)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/about-data')}
                  className="hover:text-forest transition font-medium"
                >
                  About Our Data (/about-data)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/demo')}
                  className="hover:text-forest transition font-medium text-forest font-bold"
                >
                  Demo Portal (/demo)
                </button>
              </li>
            </ul>
          </div>

          {/* Platform Modules & Access */}
          <div className="space-y-2">
            <div className="font-bold text-forest uppercase text-[11px] tracking-wider">
              Modules &amp; Account
            </div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('/personal')}
                  className="hover:text-forest transition font-medium"
                >
                  Personal Air Copilot
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/school')}
                  className="hover:text-forest transition font-medium"
                >
                  School Safety Planner
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/sign-in')}
                  className="hover:text-forest transition font-medium"
                >
                  Sign In (/sign-in)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/sign-up')}
                  className="hover:text-forest transition font-medium"
                >
                  Sign Up (/sign-up)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/privacy')}
                  className="hover:text-forest transition font-medium"
                >
                  Privacy Policy (/privacy)
                </button>
              </li>
            </ul>
          </div>

          {/* Compliance & Standards */}
          <div className="space-y-2">
            <div className="font-bold text-forest uppercase text-[11px] tracking-wider">
              Standards &amp; Cloud Region
            </div>
            <ul className="space-y-1.5 text-xs text-gray-500">
              <li>CPCB NAQI Standards (MoEFCC 2014/15)</li>
              <li>Copernicus CAMS Numerical Models</li>
              <li>16T Truck Freight Economics (₹250/t + ₹4.5/t-km)</li>
              <li>AWS ap-south-1 (Mumbai) Serverless</li>
              <li>Zero Fabricated Data Guarantee</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-ivory-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
          <div>
            © 2026 Environmental Intelligence Platform. Built for Northwest Indian airsheds.
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/about-data')}
              className="hover:text-forest font-semibold"
            >
              Data Methodology
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/privacy')}
              className="hover:text-forest font-semibold"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <span>AWS Amplify Deployment</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
