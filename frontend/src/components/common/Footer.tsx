import React from 'react';
import { Wind, ShieldCheck, MapPin, ExternalLink, FileText, Lock, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { AppRoute } from '../../types';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-forest-900/10 bg-gradient-to-b from-white via-ivory to-ivory-200/60 text-xs text-gray-600 mt-20 relative overflow-hidden">
      {/* Subtle background ambient mesh */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand & Mission - 2 columns */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-forest-900 via-forest to-forest-800 text-white flex items-center justify-center font-bold shadow-md border border-emerald/20">
                <Wind className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <span className="font-black text-forest-950 text-base tracking-tight block">
                  AirIntel Regional Platform
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  Environmental Intelligence &amp; Circular Bio-Economy
                </span>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed max-w-sm">
              Empowering Northwest India with rigorous atmospheric chemistry forecasts, institutional child safety thresholds, and economic stubble valorization to systematically reduce seasonal crop residue combustion.
            </p>
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-900/5 border border-forest-900/10 text-[11px] text-forest-900 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Airshed Domain: Delhi-NCR • Punjab • Haryana</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <div className="font-black text-forest-950 uppercase text-[10px] tracking-wider">
              Public Platform
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Overview &amp; Radar
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/how-it-works')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Methodology &amp; Pipeline
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/air-quality')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Air Quality Explorer
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/marketplace')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Parali Marketplace
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/about-data')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Data Provenance Matrix
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/demo')}
                  className="hover:text-forest font-bold text-forest text-left flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Interactive Demo Portal</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Platform Modules & Access */}
          <div className="space-y-3">
            <div className="font-black text-forest-950 uppercase text-[10px] tracking-wider">
              Solutions &amp; Account
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('/personal')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Personal Air Copilot
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/school')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  School Safety Planner
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/sign-in')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Sign In to Account
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/sign-up')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Create Verified Account
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/privacy')}
                  className="hover:text-forest transition font-medium text-left"
                >
                  Privacy &amp; Data Rights
                </button>
              </li>
            </ul>
          </div>

          {/* Scientific Compliance */}
          <div className="space-y-3">
            <div className="font-black text-forest-950 uppercase text-[10px] tracking-wider">
              Scientific Standards
            </div>
            <ul className="space-y-2 text-[11px] text-gray-500">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>CPCB NAQI Standards (MoEFCC 2014/15)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Copernicus CAMS Numerical Models</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>16T Hauling Freight Matrix (₹250 + ₹4.5/km)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>AWS ap-south-1 (Mumbai) Region</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Zero Fabricated Data Guarantee</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-10 border-t border-forest-900/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <div>
            © 2026 AirIntel Environmental Intelligence Platform. Built for the Northwest Indian Airshed.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate('/about-data')}
              className="hover:text-forest font-semibold transition"
            >
              Data Methodology
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/privacy')}
              className="hover:text-forest font-semibold transition"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AWS Cloud Production
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
