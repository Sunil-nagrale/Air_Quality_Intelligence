import React, { useState } from 'react';
import {
  Wind,
  School,
  Sprout,
  User,
  ShieldCheck,
  MapPin,
  Home,
  FileText,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  LogIn,
  Radio,
} from 'lucide-react';
import { AppRoute, UserRole } from '../../types';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  currentUser: { email: string; role: string; isDemo?: boolean } | null;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  currentUser,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const publicNavItems = [
    { route: '/' as AppRoute, label: 'Overview', icon: Home },
    { route: '/how-it-works' as AppRoute, label: 'How It Works', icon: Layers },
    { route: '/air-quality' as AppRoute, label: 'Air Quality', icon: Wind },
    { route: '/marketplace' as AppRoute, label: 'Marketplace', icon: Sprout },
    { route: '/about-data' as AppRoute, label: 'About Data', icon: ShieldCheck },
    { route: '/demo' as AppRoute, label: 'Demo Portal', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-forest-900/10 shadow-[0_2px_12px_rgba(10,28,23,0.04)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand & Regional Scope */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => onNavigate('/')}
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-forest-900 via-forest to-forest-800 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(26,58,42,0.28)] border border-emerald/20 transition-transform duration-200 group-hover:scale-105">
              <Wind className="w-5 h-5 text-emerald-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-forest-950 text-lg sm:text-xl tracking-tight">
                  AirIntel
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-forest-800 font-bold border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Airshed
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">Delhi-NCR • Punjab • Haryana</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center bg-ivory-200/70 p-1.5 rounded-2xl border border-ivory-300/80 shadow-xs">
            {publicNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => onNavigate(item.route)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-forest text-white shadow-sm'
                      : 'text-forest-900/70 hover:text-forest hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-forest-700/60'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Controls & Navigation */}
          <div className="flex items-center gap-2.5">
            <NotificationCenter currentUser={currentUser} />

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-ivory-50 border border-ivory-300 shadow-sm transition text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-forest text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {currentUser.role[0]}
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-bold text-forest truncate max-w-[130px]">
                      {currentUser.email}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-forest-700">
                      {currentUser.isDemo ? 'Demo ' : ''}Role: {currentUser.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                </button>

                {/* Role / Account Menu */}
                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-ivory-300 p-2 z-50 text-xs animate-fadeInUp">
                    <div className="p-2 border-b border-ivory-200">
                      <div className="font-bold text-forest truncate">{currentUser.email}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-semibold">
                        {currentUser.isDemo ? 'Simulated ' : ''}Active Role: {currentUser.role}
                      </div>
                    </div>

                    {/* Direct module shortcuts */}
                    <div className="py-2 border-b border-ivory-200 space-y-1">
                      <div className="text-[10px] text-gray-400 uppercase font-bold px-2">
                        Product Modules:
                      </div>
                      <button
                        onClick={() => {
                          onNavigate('/personal');
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-bold text-forest flex items-center gap-2 transition"
                      >
                        <Wind className="w-3.5 h-3.5 text-forest" /> Personal Air Copilot
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('/school');
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-bold text-forest flex items-center gap-2 transition"
                      >
                        <School className="w-3.5 h-3.5 text-forest" /> School Safety Planner
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('/marketplace');
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-bold text-forest flex items-center gap-2 transition"
                      >
                        <Sprout className="w-3.5 h-3.5 text-forest" /> Parali Marketplace
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-2 py-1.5 mt-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/sign-in')}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-forest border border-ivory-300 hover:bg-ivory-100 shadow-sm transition active:scale-[0.98]"
                >
                  <LogIn className="w-3.5 h-3.5 text-forest" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onNavigate('/demo')}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-forest via-forest-900 to-forest text-white hover:shadow-[0_4px_14px_rgba(26,58,42,0.3)] border border-emerald-400/30 transition active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Demo Portal</span>
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-forest hover:bg-ivory-200 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-ivory-200/80 py-3 space-y-1 bg-white/95 backdrop-blur-md rounded-b-2xl shadow-lg px-2 mb-2 animate-fadeInUp">
            {publicNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => {
                    onNavigate(item.route);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-forest text-white shadow-sm'
                      : 'text-gray-700 hover:bg-ivory-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2 border-t border-ivory-200 space-y-1">
              <button
                onClick={() => {
                  onNavigate('/personal');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-forest hover:bg-ivory-100 transition"
              >
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Personal Copilot Module</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('/school');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-forest hover:bg-ivory-100 transition"
              >
                <School className="w-4 h-4 text-emerald-600" />
                <span>School Safety Module</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('/demo');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-forest text-white shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Demo Portal (Instant Access)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
