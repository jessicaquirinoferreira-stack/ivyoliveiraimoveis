import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAuthTenant';
import { buildWhatsAppUrl } from '../../utils/formatters';
import { trackPublicEvent } from '../../firebase/firestoreService';
import { FloatingSocialButtons } from './FloatingSocialButtons';
import { VirtualAssistantWidget } from './VirtualAssistantWidget';
import { MagneticAction, ScrollProgressLine } from '../motion/EditorialMotion';

interface SiteLayoutProps {
  currentPath: string;
  onNavigate: (to: string) => void;
  children: React.ReactNode;
}

export function SiteLayout({ currentPath, onNavigate, children }: SiteLayoutProps) {
  const { tenant } = useAppContext();
  const prefersReduced = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [tenant.logoUrl]);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 24;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [lgpdAccepted, setLgpdAccepted] = useState(() => {
    try {
      return localStorage.getItem('lgpd_notice_ack') === '1';
    } catch {
      return false;
    }
  });

  const whatsappUrl = buildWhatsAppUrl(
    tenant.whatsapp,
    `Olá! Gostaria de receber informações sobre os imóveis selecionados em ${tenant.brandName}.`
  );

  const handlePrimaryCta = () => {
    if (whatsappUrl) {
      trackPublicEvent({
        tenantId: tenant.id,
        ownerUid: tenant.ownerUid,
        eventType: 'whatsapp_click',
        targetId: 'header_cta',
        path: currentPath,
        source: 'header',
        utmSource: '',
        utmCampaign: '',
      });
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } else {
      const contactEl = document.getElementById('contato');
      if (contactEl) {
        contactEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        onNavigate('/#contato');
      }
    }
  };

  const navItems = [
    { label: 'Início', path: '/' },
    { label: 'Imóveis', path: '/imoveis' },
    { label: 'Empreendimentos', path: '/empreendimentos' },
    { label: 'Sobre', path: '/sobre' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--site-bg)] text-[var(--site-text)]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header
        className={`sticky top-0 z-40 border-b border-[var(--site-border)] transition-all duration-300 ${
          scrolled
            ? 'bg-[var(--site-bg)]/95 backdrop-blur-md shadow-[0_8px_30px_-18px_rgba(20,20,19,0.18)]'
            : 'bg-[var(--site-bg)]/90 backdrop-blur-sm'
        }`}
      >
        <div
          className={`max-w-7xl mx-auto px-6 flex items-center justify-between gap-8 transition-[height] duration-300 ${
            scrolled ? 'h-[72px]' : 'h-20'
          }`}
        >
          {/* Zone 1: Transparent Brand Lockup / Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="flex items-center whitespace-nowrap shrink-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--site-accent)]"
          >
            {tenant.logoUrl && !logoError ? (
              <>
                <img
                  src={tenant.logoUrl}
                  alt={tenant.brandName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className={`w-auto max-w-[180px] object-contain bg-transparent select-none py-0.5 transition-[height] duration-300 ${
                    scrolled ? 'h-12 sm:h-14' : 'h-14 sm:h-[68px]'
                  }`}
                />
                <span className="sr-only">{tenant.brandName}</span>
              </>
            ) : (
              <span className="font-editorial text-2xl font-semibold tracking-tight text-[var(--site-text)] whitespace-nowrap">
                {tenant.brandName}
              </span>
            )}
          </a>

          {/* Zone 2: 4 Clean Single-Line Text Navigation Links */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-9 text-sm font-medium text-[var(--site-text-muted)]"
          >
            {navItems.map((item) => {
              const active =
                item.path === '/'
                  ? currentPath === '/'
                  : currentPath === item.path || currentPath.startsWith(`${item.path}/`);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.path);
                  }}
                  className={`relative whitespace-nowrap shrink-0 py-1.5 transition-colors duration-200 ${
                    active ? 'text-[var(--site-text)]' : 'hover:text-[var(--site-text)]'
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active-underline"
                      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                      className="absolute left-0 right-0 bottom-0 h-[1.5px] bg-[var(--site-accent)]"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA Action */}
          <div className="flex items-center gap-3 shrink-0">
            <MagneticAction className="hidden sm:inline-block">
              <button
                type="button"
                onClick={handlePrimaryCta}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-medium tracking-wide bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] hover:bg-[var(--site-accent)] hover:text-white transition-colors duration-300 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Atendimento</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </MagneticAction>
            <button
              type="button"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden p-2.5 text-[var(--site-text)] border border-[var(--site-border)] rounded-[var(--site-radius)]"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Discreet 2px scroll-progress hairline */}
        <ScrollProgressLine />

        {/* Animated Mobile Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden border-t border-[var(--site-border)] bg-[var(--site-surface)] px-6 py-6 space-y-2 shadow-lg"
            >
              {navItems.map((item) => {
                const active = currentPath === item.path;
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileOpen(false);
                      onNavigate(item.path);
                    }}
                    className={`flex items-center justify-between py-2.5 text-base font-medium border-b border-[var(--site-border)]/60 ${
                      active ? 'text-[var(--site-accent)]' : 'text-[var(--site-text)]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-50" />
                  </a>
                );
              })}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handlePrimaryCta();
                  }}
                  className="w-full py-3.5 text-sm font-medium bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)]"
                >
                  Atendimento Personalizado
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Smooth Editorial Route Canvas */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPath}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Complete Architectural Footer */}
      <footer className="border-t border-[var(--site-border)] bg-[var(--site-surface)] text-[var(--site-text)]">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5 space-y-5">
            {tenant.logoUrl && !logoError ? (
              <div>
                <img
                  src={tenant.logoUrl}
                  alt={tenant.brandName}
                  referrerPolicy="no-referrer"
                  className="h-20 sm:h-24 w-auto object-contain bg-transparent select-none"
                />
                <h3 className="sr-only">{tenant.brandName}</h3>
              </div>
            ) : (
              <h3 className="font-editorial text-3xl font-semibold tracking-tight">
                {tenant.brandName}
              </h3>
            )}
            <p className="text-sm text-[var(--site-text-muted)] leading-relaxed max-w-md">
              {tenant.seoDescription || tenant.heroSubtitle}
            </p>
            <div className="pt-2 border-t border-[var(--site-border)] text-xs text-[var(--site-text-muted)] space-y-1.5 max-w-sm">
              <p className="font-medium text-[var(--site-text)]">
                {tenant.city}
                {tenant.state ? `, ${tenant.state}` : ''}
                {tenant.creci ? ` · ${tenant.creci}` : ''}
              </p>
              {tenant.email && <p>{tenant.email}</p>}
              {tenant.phone && <p className="font-mono tabular-nums">{tenant.phone}</p>}
            </div>
          </div>

          <div className="md:col-span-3 space-y-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--site-accent)]">
              Navegação
            </p>
            <ul className="space-y-3 text-sm">
              {navItems.map((item) => (
                <li key={item.path}>
                  <a
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(item.path);
                    }}
                    className="editorial-link text-[var(--site-text-muted)] hover:text-[var(--site-text)] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/privacidade"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/privacidade');
                  }}
                  className="editorial-link text-[var(--site-text-muted)] hover:text-[var(--site-text)] transition-colors"
                >
                  Privacidade & LGPD
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--site-accent)]">
              Regiões & Canais
            </p>
            <p className="text-sm text-[var(--site-text-muted)] leading-relaxed">
              {tenant.regions.join(' · ')}
            </p>
            <div className="pt-3 flex flex-wrap gap-5 text-sm">
              {tenant.instagramUrl && (
                <a
                  href={tenant.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="editorial-link font-medium text-[var(--site-text)] hover:text-[var(--site-accent)] transition-colors"
                >
                  {tenant.instagramHandle || 'Instagram'}
                </a>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="editorial-link font-medium text-[var(--site-text)] hover:text-[var(--site-accent)] transition-colors"
                >
                  WhatsApp Comercial
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--site-border)] bg-[var(--site-bg)]/60">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--site-text-muted)]">
            <p>
              © {new Date().getFullYear()} {tenant.brandName}. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="/privacidade"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/privacidade');
                }}
                className="hover:text-[var(--site-text)] transition-colors"
              >
                Política de Privacidade
              </a>
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/admin');
                }}
                className="hover:text-[var(--site-text)] transition-colors"
              >
                Painel Admin
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Discreet LGPD Cookie Notice (centered bottom so left/right floating widgets remain unobstructed) */}
      {!lgpdAccepted && (
        <div className="fixed bottom-20 left-4 right-4 sm:bottom-5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-30 sm:w-full sm:max-w-md p-3.5 bg-[var(--site-surface)] border border-[var(--site-border)] shadow-lg rounded-[var(--site-radius)] text-xs space-y-2.5">
          <p className="text-[var(--site-text-muted)] leading-relaxed">
            Utilizamos cookies essenciais e métricas anônimas para aprimorar sua experiência imobiliária, em conformidade com a LGPD.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/privacidade')}
              className="text-[var(--site-text-muted)] underline underline-offset-2"
            >
              Saiba mais
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem('lgpd_notice_ack', '1');
                } catch {
                  // ignore storage errors
                }
                setLgpdAccepted(true);
              }}
              className="px-3.5 py-1.5 bg-[var(--site-text)] text-[var(--site-surface)] font-medium rounded-[var(--site-radius)]"
            >
              Concordar
            </button>
          </div>
        </div>
      )}

      {/* Left: Humanized Virtual Assistant */}
      <VirtualAssistantWidget
        tenant={tenant}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />

      {/* Right: Official Floating Instagram & WhatsApp Buttons */}
      <FloatingSocialButtons
        tenant={tenant}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
    </div>
  );
}
