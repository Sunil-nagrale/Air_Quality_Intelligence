import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AirQualityExplorerPage } from './pages/AirQualityExplorerPage';
import { MarketplacePreviewPage } from './pages/MarketplacePreviewPage';
import { AboutDataPage } from './pages/AboutDataPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { DemoPortalPage } from './pages/DemoPortalPage';
import { PersonalCopilotView } from './components/personal/PersonalCopilotView';
import { SchoolPlannerView } from './components/school/SchoolPlannerView';
import { AppRoute, UserRole, UserSession } from './types';
import { cognitoAuth } from './services/cognitoAuth';

const VALID_ROUTES: AppRoute[] = [
  '/',
  '/how-it-works',
  '/air-quality',
  '/marketplace',
  '/about-data',
  '/sign-in',
  '/sign-up',
  '/privacy',
  '/demo',
  '/personal',
  '/school',
];

const ROUTE_ALIASES: Record<string, AppRoute> = {
  '/air-quality-map': '/air-quality',
  '/school-safety-system': '/school',
  '/parali-marketplace': '/marketplace',
  '/about-governance': '/about-data',
  '/data-provenance-methodology': '/about-data',
  '/impact-accounting': '/marketplace',
  '/health-sensitivity-framework': '/personal',
  '/developer-api-docs': '/how-it-works',
};

export const App: React.FC = () => {
  // Resolve initial route from window.location.pathname or hash
  const resolveCurrentRoute = (): AppRoute => {
    // Check hash first (e.g. #/how-it-works or #how-it-works)
    if (window.location.hash) {
      const hashClean = window.location.hash.replace(/^#\/?/, '/');
      if (VALID_ROUTES.includes(hashClean as AppRoute)) {
        return hashClean as AppRoute;
      }
      if (ROUTE_ALIASES[hashClean]) {
        return ROUTE_ALIASES[hashClean];
      }
    }
    // Check pathname
    const path = window.location.pathname;
    if (VALID_ROUTES.includes(path as AppRoute)) {
      return path as AppRoute;
    }
    if (ROUTE_ALIASES[path]) {
      return ROUTE_ALIASES[path];
    }
    return '/';
  };

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(resolveCurrentRoute);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string; isDemo?: boolean } | null>(() => {
    const session = cognitoAuth.getCurrentSession();
    if (session) {
      return { email: session.email, role: session.role, isDemo: session.isDemo };
    }
    return null;
  });

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentRoute(resolveCurrentRoute());
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const navigateTo = (route: AppRoute) => {
    setCurrentRoute(route);
    // Sync with browser history and hash for deployment compatibility
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    window.location.hash = route;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDemoPersona = (_role: UserRole, targetRoute: AppRoute) => {
    // Demo persona exploration is strictly read-only preview. Zero counterfeit Cognito sessions created.
    navigateTo(targetRoute);
  };

  const handleSignInSuccess = (session: UserSession) => {
    setCurrentUser({ email: session.email, role: session.role, isDemo: false });
  };

  const handleSignOut = () => {
    cognitoAuth.signOut();
    setCurrentUser(null);
  };

  const handleQuickSwitchRole = (role: UserRole) => {
    handleSelectDemoPersona(role, role === 'personal' ? '/personal' : role === 'school' ? '/school' : '/marketplace');
  };

  return (
    <div className="min-h-screen bg-ivory text-forest flex flex-col font-sans">
      <Header
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onQuickSwitchRole={handleQuickSwitchRole}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRoute === '/' && <LandingPage onNavigate={navigateTo} />}
        {currentRoute === '/how-it-works' && <HowItWorksPage onNavigate={navigateTo} />}
        {currentRoute === '/air-quality' && <AirQualityExplorerPage onNavigate={navigateTo} />}
        {currentRoute === '/marketplace' && <MarketplacePreviewPage onNavigate={navigateTo} />}
        {currentRoute === '/about-data' && <AboutDataPage onNavigate={navigateTo} />}
        {currentRoute === '/sign-in' && (
          <SignInPage onNavigate={navigateTo} onSignInSuccess={handleSignInSuccess} />
        )}
        {currentRoute === '/sign-up' && <SignUpPage onNavigate={navigateTo} />}
        {currentRoute === '/privacy' && <PrivacyPage onNavigate={navigateTo} />}
        {currentRoute === '/demo' && (
          <DemoPortalPage
            onNavigate={navigateTo}
            onSelectDemoPersona={handleSelectDemoPersona}
          />
        )}
        {currentRoute === '/personal' && <PersonalCopilotView />}
        {currentRoute === '/school' && <SchoolPlannerView />}
      </main>

      <Footer onNavigate={navigateTo} />
    </div>
  );
};

export default App;
