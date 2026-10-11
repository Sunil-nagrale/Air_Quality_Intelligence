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
} from 'lucide-react';
import { AppRoute, UserRole } from '../../types';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  currentUser: { email: string; role: string; isDemo?: boolean } | null;
  onSignOut: () => void;
  onQuickSwitchRole?: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  currentUser,
  onSignOut,
  onQuickSwitchRole,
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

  const moduleNavItems = [
    { route: '/personal' as AppRoute, label: 'Personal Copilot', icon: Activity },
    { route: '/school' as AppRoute, label: 'School Safety', icon: School },
  ];

  return (
    <header className="sticky top-0 z-40 bg-ivory-100/95 backdrop-blur border-b border-ivory-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Regional Scope */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => onNavigate('/')}
          >
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-white shadow-sm hover:bg-forest-900 transition">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-forest text-lg tracking-tight">
                  AirIntel
                </span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-sage-200 text-forest font-bold border border-sage-300">
                  Regional Platform
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                <MapPin className="w-3 h-3 text-forest" />
                <span>Delhi-NCR • Punjab • Haryana</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center bg-ivory-200/80 p-1 rounded-2xl border border-ivory-300">
            {publicNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => onNavigate(item.route)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white text-forest shadow-sm'
                      : 'text-gray-600 hover:text-forest hover:bg-white/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-forest' : 'text-gray-400'}`} />
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
                  <div className="w-7 h-7 rounded-lg bg-forest text-white flex items-center justify-center font-bold text-xs uppercase">
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
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-ivory-300 p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
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
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-bold text-forest flex items-center gap-2"
                      >
                        <Wind className="w-3.5 h-3.5 text-forest" /> Personal Air Copilot
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('/school');
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-bold text-forest flex items-center gap-2"
                      >
                        <School className="w-3.5 h-3.5 text-forest" /> School Safety Planner
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('/marketplace');
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-bold text-forest flex items-center gap-2"
                      >
                        <Sprout className="w-3.5 h-3.5 text-forest" /> Parali Marketplace
                      </button>
                    </div>

                    {onQuickSwitchRole && (
                      <div className="py-2 border-b border-ivory-200 space-y-1">
                        <div className="text-[10px] text-gray-400 uppercase font-bold px-2">
                          Switch Demo Persona:
                        </div>
                        <button
                          onClick={() => {
                            onQuickSwitchRole('personal');
                            setRoleDropdownOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-semibold text-gray-700 flex items-center gap-2"
                        >
                          <Activity className="w-3.5 h-3.5 text-forest" /> Citizen (Paras Nath)
                        </button>
                        <button
                          onClick={() => {
                            onQuickSwitchRole('school');
                            setRoleDropdownOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-semibold text-gray-700 flex items-center gap-2"
                        >
                          <School className="w-3.5 h-3.5 text-forest" /> Principal (KV Kailashahar)
                        </button>
                        <button
                          onClick={() => {
                            onQuickSwitchRole('farmer');
                            setRoleDropdownOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ivory-100 font-semibold text-gray-700 flex items-center gap-2"
                        >
                          <Sprout className="w-3.5 h-3.5 text-forest" /> Farmer (Sunil Singh)
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-2 py-1.5 mt-1 rounded-lg text-mutedRed hover:bg-red-50 font-bold flex items-center gap-2"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-forest border border-ivory-300 hover:bg-ivory-100 shadow-sm transition"
                >
                  <LogIn className="w-3.5 h-3.5 text-forest" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onNavigate('/demo')}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-forest text-white hover:bg-forest-900 shadow-sm transition"
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
          <div className="lg:hidden border-t border-ivory-200 py-3 space-y-1 bg-ivory-100">
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-forest text-white'
                      : 'text-gray-700 hover:bg-ivory-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
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
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-forest hover:bg-ivory-200"
              >
                <Activity className="w-4 h-4" />
                <span>Personal Copilot Module</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('/school');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-forest hover:bg-ivory-200"
              >
                <School className="w-4 h-4" />
                <span>School Safety Module</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
