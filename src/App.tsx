/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProvider, useAppContext } from './hooks/useAuthTenant';
import { useRouter } from './hooks/useRouter';
import { SiteLayout } from './components/layout/SiteLayout';
import { HomePage } from './pages/public/HomePage';
import { CinematicArchitecturalIntro } from './components/motion/CinematicArchitecturalIntro';

// Route-level code splitting so public home loads instantaneously without admin/chart/detail bundles
const CatalogPage = lazy(() =>
  import('./pages/public/CatalogPage').then((m) => ({ default: m.CatalogPage }))
);
const PropertyDetailPage = lazy(() =>
  import('./pages/public/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage }))
);
const DevelopmentsPage = lazy(() =>
  import('./pages/public/DevelopmentsPage').then((m) => ({ default: m.DevelopmentsPage }))
);
const LandingPageView = lazy(() =>
  import('./pages/public/LandingPageView').then((m) => ({ default: m.LandingPageView }))
);
const AboutBrokerPage = lazy(() =>
  import('./pages/public/AboutBrokerPage').then((m) => ({ default: m.AboutBrokerPage }))
);
const PrivacyPage = lazy(() =>
  import('./pages/public/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const AdminLogin = lazy(() =>
  import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin }))
);
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

function RouteLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[var(--site-bg)] text-[var(--site-text)]">
      <div className="w-7 h-7 border-2 border-[var(--site-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const { pathname, search, navigate } = useRouter();
  const { user, authReady, tenant } = useAppContext();

  const normalized = pathname.replace(/\/+$/, '') || '/';
  const isAdminRoute =
    normalized === '/admin' || normalized.startsWith('/admin/') || normalized === '/login';

  // Play the 6-second realistic cinematic architectural intro on initial public site entry
  const [showIntro, setShowIntro] = useState<boolean>(() => !isAdminRoute);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  const introPreloadUrls = useMemo(() => {
    const heroList = tenant.heroImages?.length
      ? tenant.heroImages
      : ['/src/assets/images/hero_rio_architecture_1795532252718.jpg'];
    return [
      ...heroList,
      tenant.logoUrl || '/logo-ivy-oliveira.png',
      tenant.aboutPhotoUrl || '/src/assets/images/ivy_oliveira_corretora.png',
      '/assets/regions/meier.jpg',
      '/assets/regions/copacabana.jpg',
      '/assets/regions/ipanema.jpg',
      '/assets/regions/barra-da-tijuca.jpg',
    ];
  }, [tenant.heroImages, tenant.logoUrl, tenant.aboutPhotoUrl]);

  useEffect(() => {
    if (authReady && user && normalized === '/login') {
      navigate('/admin');
    }
  }, [authReady, user, normalized, navigate]);

  // Protected Admin & Login Routes (strictly separated from public site navigation)
  if (isAdminRoute) {
    if (!authReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--site-bg)] text-[var(--site-text)]">
          <div className="w-8 h-8 border-2 border-[var(--site-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        {!user ? <AdminLogin onNavigate={navigate} /> : <AdminDashboard onNavigate={navigate} />}
      </Suspense>
    );
  }

  // Public Routes inside SiteLayout
  let pageNode: React.ReactNode;

  if (normalized === '/imoveis') {
    pageNode = <CatalogPage search={search} onNavigate={navigate} />;
  } else if (normalized.startsWith('/imovel/')) {
    const slug = decodeURIComponent(normalized.slice('/imovel/'.length));
    pageNode = <PropertyDetailPage slug={slug} onNavigate={navigate} />;
  } else if (normalized === '/empreendimentos') {
    pageNode = <DevelopmentsPage onNavigate={navigate} />;
  } else if (normalized.startsWith('/empreendimento/')) {
    const slug = decodeURIComponent(normalized.slice('/empreendimento/'.length));
    pageNode = <DevelopmentsPage slug={slug} onNavigate={navigate} />;
  } else if (normalized.startsWith('/oferta/')) {
    const slug = decodeURIComponent(normalized.slice('/oferta/'.length));
    pageNode = <LandingPageView slug={slug} onNavigate={navigate} />;
  } else if (normalized === '/sobre') {
    pageNode = <AboutBrokerPage />;
  } else if (normalized === '/privacidade') {
    pageNode = <PrivacyPage />;
  } else {
    pageNode = <HomePage onNavigate={navigate} />;
  }

  return (
    <>
      {showIntro && (
        <CinematicArchitecturalIntro
          brandName={tenant.brandName}
          city={tenant.city}
          preloadUrls={introPreloadUrls}
          onComplete={handleIntroComplete}
        />
      )}
      <SiteLayout currentPath={normalized} onNavigate={navigate}>
        <Suspense fallback={<RouteLoadingFallback />}>{pageNode}</Suspense>
      </SiteLayout>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ErrorBoundary>
  );
}
