import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Layers,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAppContext } from '../../hooks/useAuthTenant';
import {
  subscribePublishedDevelopments,
  subscribePublishedProperties,
  subscribePublishedTestimonials,
  trackPublicEvent,
} from '../../firebase/firestoreService';
import { Development, Property, Testimonial } from '../../types/realestate';
import { PropertyCard } from '../../components/properties/PropertyCard';
import { LeadCaptureForm } from '../../components/leads/LeadCaptureForm';
import { ArchitecturalPavilionCanvas } from '../../components/three/ArchitecturalPavilionCanvas';
import { MagneticAction } from '../../components/motion/EditorialMotion';
import { buildWhatsAppUrl, formatCurrencyBRL } from '../../utils/formatters';
import { applySeoMetadata } from '../../utils/seo';

gsap.registerPlugin(ScrollTrigger);

interface HomePageProps {
  onNavigate: (to: string) => void;
}

const REGION_PROFILES: Record<string, { subtitle: string; focus: string; image: string }> = {
  'Zona Sul': {
    subtitle: 'Tradição arquitetônica entre o oceano e a Mata Atlântica.',
    focus: 'Apartamentos de planta generosa, vistas panorâmicas e ruas arborizadas.',
    image: '/src/assets/images/hero_rio_architecture_1795532252718.jpg',
  },
  Leblon: {
    subtitle: 'Exclusividade costeira, gastronomia autoral e alta liquidez patrimonial.',
    focus: 'Coberturas duplex, edifícios boutique e quadra da praia.',
    image: '/src/assets/images/hero_penthouse_living_1795532252931.jpg',
  },
  Ipanema: {
    subtitle: 'Ícone modernista com vida cultural vibrante e luz atlântica.',
    focus: 'Residências assinadas com varanda integrada e arquitetura atemporal.',
    image: '/src/assets/images/editorial_development_1795532253234.jpg',
  },
  Lagoa: {
    subtitle: 'Silêncio contemplativo com vista frontal para o espelho d’água e Cristo Redentor.',
    focus: 'Plantas amplas, iluminação natural abundante e ventilação cruzada.',
    image: '/src/assets/images/editorial_advisory_studio_1795532253992.jpg',
  },
  'São Conrado': {
    subtitle: 'Privacidade entre a Pedra da Gávea e o mar aberto.',
    focus: 'Casas suspensas, terrenos reservados e condomínios com segurança 24h.',
    image: '/src/assets/images/hero_rio_architecture_1795532252718.jpg',
  },
  'Barra da Tijuca': {
    subtitle: 'Condomínios contemporâneos, amplas áreas de lazer e novos lançamentos.',
    focus: 'Casas contemporâneas de grande metragem e residenciais de frente para o mar.',
    image: '/src/assets/images/editorial_development_1795532253234.jpg',
  },
};

export function HomePage({ onNavigate }: HomePageProps) {
  const { tenant } = useAppContext();
  const [properties, setProperties] = useState<Property[]>([]);
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroSlide, setHeroSlide] = useState(0);

  // Quick search state
  const [qTx, setQTx] = useState('');
  const [qType, setQType] = useState('');
  const [qRegion, setQRegion] = useState('');

  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    applySeoMetadata({
      title: tenant.seoTitle || `${tenant.brandName} — Imóveis em ${tenant.city}`,
      description: tenant.seoDescription || tenant.heroSubtitle,
      image: tenant.heroImages?.[0],
    });
    trackPublicEvent({
      tenantId: tenant.id,
      ownerUid: tenant.ownerUid,
      eventType: 'page_view',
      targetId: 'home',
      path: '/',
      source: document.referrer || 'direct',
      utmSource: new URLSearchParams(window.location.search).get('utm_source') || '',
      utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
    });
  }, [tenant]);

  useEffect(() => {
    const unsubProps = subscribePublishedProperties(tenant.id, (items) => {
      setProperties(items);
      setLoading(false);
    });
    const unsubDevs = subscribePublishedDevelopments(tenant.id, setDevelopments);
    const unsubTests = subscribePublishedTestimonials(tenant.id, setTestimonials);
    return () => {
      unsubProps();
      unsubDevs();
      unsubTests();
    };
  }, [tenant.id]);

  // Hero slideshow interval
  const heroSlides = tenant.heroImages?.length
    ? tenant.heroImages
    : ['/src/assets/images/hero_rio_architecture_1795532252718.jpg'];

  useEffect(() => {
    setHeroSlide((prev) => (heroSlides.length > 0 ? prev % heroSlides.length : 0));
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6800);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  // Lenis + Multi-Layer GSAP ScrollTrigger orchestration respecting prefers-reduced-motion
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.12,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    lenis.on('scroll', ScrollTrigger.update);

    const ctx = gsap.context(() => {
      // 1. Choreographed Hero Entrance Timeline
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTl
        .from('.hero-eyebrow', { y: 18, opacity: 0, duration: 0.7 })
        .from('.hero-headline', { y: 36, opacity: 0, duration: 0.95 }, '-=0.45')
        .from('.hero-subtitle', { y: 22, opacity: 0, duration: 0.75 }, '-=0.55')
        .from('.hero-actions', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
        .from('.hero-meta-rail', { opacity: 0, y: 14, duration: 0.65 }, '-=0.45');

      // 2. Multi-Layer Hero Depth Parallax (background + foreground text plane)
      gsap.to('.hero-parallax-bg', {
        yPercent: 16,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      gsap.to('.hero-foreground-plane', {
        yPercent: -10,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // 3. Editorial Clip-Path Image Curtain Reveals
      gsap.utils.toArray<HTMLElement>('.curtain-reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: 'inset(10% 0% 0% 0%)', opacity: 0.4 },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            opacity: 1,
            duration: 1.0,
            ease: 'power3.out',
            clearProps: 'clipPath,opacity',
            scrollTrigger: {
              trigger: el,
              start: 'top 86%',
              once: true,
            },
          }
        );
      });

      // 4. Staggered Section Reveals
      gsap.utils.toArray<HTMLElement>('.reveal-section').forEach((sec) => {
        gsap.from(sec, {
          y: 28,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: sec,
            start: 'top 86%',
            once: true,
          },
        });
      });

      // 5. Staggered Card Reveal for Regions Grid (contained cleanly inside viewport)
      gsap.from('.region-grid-card', {
        y: 22,
        opacity: 0,
        duration: 0.7,
        stagger: 0.07,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.regions-story-section',
          start: 'top 82%',
          once: true,
        },
      });

      // 6. Dual-Plane About Broker Portrait Parallax
      gsap.fromTo(
        '.about-parallax-front',
        { y: 24 },
        {
          y: -20,
          ease: 'none',
          scrollTrigger: {
            trigger: '.about-section',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );

      gsap.fromTo(
        '.about-parallax-back',
        { y: -16 },
        {
          y: 26,
          ease: 'none',
          scrollTrigger: {
            trigger: '.about-section',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    }, pageRef);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [properties.length, developments.length, testimonials.length]);

  const featuredProperties = useMemo(() => {
    const featured = properties.filter((p) => p.featured);
    return (featured.length > 0 ? featured : properties).slice(0, 6);
  }, [properties]);

  const curatedRegions = useMemo(() => {
    const fallbackImages = [
      '/src/assets/images/hero_rio_architecture_1795532252718.jpg',
      '/src/assets/images/hero_penthouse_living_1795532252931.jpg',
      '/src/assets/images/editorial_development_1795532253234.jpg',
      '/src/assets/images/editorial_advisory_studio_1795532253992.jpg',
    ];
    const source = tenant.regions?.length ? tenant.regions : ['Zona Sul', 'Leblon', 'Ipanema', 'Barra da Tijuca'];
    return source.slice(0, 6).map((regionName, idx) => {
      const profile = REGION_PROFILES[regionName];
      const count = properties.filter((p) =>
        `${p.neighborhood} ${p.city} ${p.address}`.toLowerCase().includes(regionName.toLowerCase())
      ).length;
      return {
        name: regionName,
        subtitle:
          profile?.subtitle || `Curadoria residencial e oportunidades exclusivas em ${regionName}.`,
        focus: profile?.focus || 'Seleção técnica de plantas, localização e potencial patrimonial.',
        image: profile?.image || fallbackImages[idx % fallbackImages.length],
        count,
      };
    });
  }, [tenant.regions, properties]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (qTx) params.set('tx', qTx);
    if (qType) params.set('type', qType);
    if (qRegion.trim()) params.set('q', qRegion.trim());
    const qs = params.toString();
    onNavigate(`/imoveis${qs ? `?${qs}` : ''}`);
  };

  const whatsappUrl = buildWhatsAppUrl(
    tenant.whatsapp,
    `Olá! Visitei o site ${tenant.brandName} e gostaria de conversar sobre imóveis em ${tenant.city}.`
  );

  return (
    <div ref={pageRef} className="overflow-x-clip">
      {/* 1. Cinematic Multi-Layer Architectural Hero */}
      <section className="hero-section relative min-h-[88vh] flex items-end overflow-hidden bg-neutral-950 text-white">
        {/* Background Layer with Smooth Crossfade & Scroll Parallax */}
        <div className="absolute inset-0">
          {heroSlides.map((src, idx) => (
            <img
              key={src + idx}
              src={src}
              alt={`${tenant.brandName} — ${tenant.city}`}
              referrerPolicy="no-referrer"
              className={`hero-parallax-bg absolute inset-0 w-full h-[118%] -top-[9%] object-cover transition-opacity duration-[1800ms] ease-out will-change-transform ${
                idx === heroSlide ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          {/* Layered Architectural Contrast Scrim (>= 4.5:1 text legibility) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/48 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent" />
        </div>

        {/* Subtle Architectural Framing Lines (desktop only) */}
        <div
          aria-hidden="true"
          className="pointer-events-none hidden lg:block absolute inset-x-10 top-10 bottom-10 border border-white/12"
        />

        {/* Foreground Editorial Content Plane */}
        <div className="hero-foreground-plane relative z-10 max-w-7xl mx-auto w-full px-6 pb-20 lg:pb-24 pt-32 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8 space-y-6">
            <p className="hero-eyebrow text-xs font-mono uppercase tracking-[0.2em] text-white/80">
              {tenant.city}
              {tenant.state ? ` · ${tenant.state}` : ''}
              {tenant.creci ? ` · ${tenant.creci}` : ''}
              {tenant.aboutExperienceYears ? ` · ${tenant.aboutExperienceYears}` : ''}
            </p>

            <h1 className="hero-headline font-editorial text-[clamp(2.45rem,5.2vw,4.7rem)] font-semibold leading-[1.03] tracking-[-0.015em] text-balance">
              {tenant.heroTitle}
            </h1>

            <p className="hero-subtitle text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed font-normal">
              {tenant.heroSubtitle}
            </p>

            <div className="hero-actions flex flex-wrap items-center gap-4 pt-3">
              <MagneticAction>
                <button
                  type="button"
                  onClick={() => onNavigate('/imoveis')}
                  className="inline-flex items-center gap-2.5 px-7 py-4 text-sm font-medium bg-white text-neutral-950 rounded-[var(--site-radius)] hover:bg-[var(--site-accent)] hover:text-white transition-colors duration-300 cursor-pointer"
                >
                  <span>{tenant.heroCtaText || 'Explorar Acervo'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </MagneticAction>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackPublicEvent({
                      tenantId: tenant.id,
                      ownerUid: tenant.ownerUid,
                      eventType: 'whatsapp_click',
                      targetId: 'hero',
                      path: '/',
                      source: 'hero',
                      utmSource: '',
                      utmCampaign: '',
                    });
                  }}
                  className="inline-flex items-center gap-2.5 px-6 py-4 text-sm font-medium border border-white/40 text-white rounded-[var(--site-radius)] hover:bg-white/12 hover:border-white/70 transition-colors duration-300"
                >
                  <MessageCircle className="w-4 h-4" />
                  Falar no WhatsApp
                </a>
              ) : (
                <a
                  href="#contato"
                  className="inline-flex items-center gap-2.5 px-6 py-4 text-sm font-medium border border-white/40 text-white rounded-[var(--site-radius)] hover:bg-white/12 hover:border-white/70 transition-colors duration-300"
                >
                  Solicitar Atendimento
                </a>
              )}
            </div>
          </div>

          {/* Right Editorial Slide Index & Scroll Continuity Cue */}
          <div className="hero-meta-rail lg:col-span-4 flex lg:flex-col items-center lg:items-end justify-between gap-6">
            {heroSlides.length > 1 && (
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs tabular-nums text-white/75">
                  0{heroSlide + 1} / 0{heroSlides.length}
                </span>
                <div className="flex items-center gap-2">
                  {heroSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Visualizar cena ${idx + 1}`}
                      onClick={() => setHeroSlide(idx)}
                      className={`h-1 rounded-full transition-all duration-500 cursor-pointer ${
                        idx === heroSlide ? 'w-10 bg-white' : 'w-4 bg-white/35 hover:bg-white/65'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <a
              href="#busca-rapida"
              className="hidden lg:inline-flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors"
            >
              <span>Rolar</span>
              <span className="relative h-9 w-[1px] overflow-hidden bg-white/25">
                <span className="animate-scroll-cue absolute inset-x-0 top-0 h-5 bg-white" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* 2. Architectural Quick Search Console */}
      <section
        id="busca-rapida"
        className="relative z-20 max-w-7xl mx-auto px-6 -mt-8 sm:-mt-10"
      >
        <form
          onSubmit={handleQuickSearch}
          className="p-5 sm:p-7 bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] shadow-[0_24px_60px_-24px_rgba(20,20,19,0.18)] grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
        >
          <label className="md:col-span-3 block space-y-1.5 text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
            <span>Negociação</span>
            <select
              value={qTx}
              onChange={(e) => setQTx(e.target.value)}
              className="w-full px-3.5 py-3 text-sm font-sans normal-case tracking-normal bg-[var(--site-bg)] text-[var(--site-text)] border border-[var(--site-border)] rounded-[var(--site-radius)] focus:outline-none focus:border-[var(--site-accent)] transition-colors"
            >
              <option value="">Todas as modalidades</option>
              <option value="venda">Venda</option>
              <option value="aluguel">Aluguel</option>
              <option value="lancamento">Lançamento</option>
            </select>
          </label>

          <label className="md:col-span-3 block space-y-1.5 text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
            <span>Tipologia</span>
            <select
              value={qType}
              onChange={(e) => setQType(e.target.value)}
              className="w-full px-3.5 py-3 text-sm font-sans normal-case tracking-normal bg-[var(--site-bg)] text-[var(--site-text)] border border-[var(--site-border)] rounded-[var(--site-radius)] focus:outline-none focus:border-[var(--site-accent)] transition-colors"
            >
              <option value="">Todos os tipos</option>
              <option value="apartamento">Apartamento</option>
              <option value="cobertura">Cobertura</option>
              <option value="casa">Casa</option>
              <option value="terreno">Terreno</option>
              <option value="comercial">Comercial</option>
            </select>
          </label>

          <label className="md:col-span-4 block space-y-1.5 text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
            <span>Bairro, região ou código</span>
            <input
              type="text"
              value={qRegion}
              onChange={(e) => setQRegion(e.target.value)}
              placeholder="Ex.: Leblon, Barra da Tijuca, Ipanema..."
              className="w-full px-3.5 py-3 text-sm font-sans normal-case tracking-normal bg-[var(--site-bg)] text-[var(--site-text)] border border-[var(--site-border)] rounded-[var(--site-radius)] focus:outline-none focus:border-[var(--site-accent)] transition-colors"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] hover:bg-[var(--site-accent)] hover:text-white transition-colors duration-300 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </form>
      </section>

      {/* 3. Featured Properties Catalog (01 · Acervo Selecionado) */}
      <section className="reveal-section max-w-7xl mx-auto px-6 py-24 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[var(--site-border)] pb-8">
          <div className="space-y-2.5">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
              01 · Acervo Selecionado
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
              Imóveis em Destaque
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/imoveis')}
            className="editorial-link inline-flex items-center gap-2 text-sm font-medium text-[var(--site-text)] hover:text-[var(--site-accent)] transition-colors cursor-pointer self-start sm:self-end"
          >
            <span>Explorar catálogo completo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[430px] bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] animate-pulse"
              />
            ))}
          </div>
        ) : featuredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProperties.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                onOpen={(slug) => onNavigate(`/imovel/${slug}`)}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 sm:p-12 bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-2.5 max-w-xl">
              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--site-accent)]">
                Catálogo Conectado
              </p>
              <h3 className="font-editorial text-3xl font-semibold">
                Portfólio em atualização em tempo real
              </h3>
              <p className="text-sm text-[var(--site-text-muted)] leading-relaxed">
                Nenhum imóvel foi publicado ainda neste acervo. Novos imóveis cadastrados e publicados no Painel Admin aparecem automaticamente aqui sem necessidade de alterações no código.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="#contato"
                className="px-5 py-3 text-xs font-medium bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] hover:bg-[var(--site-accent)] hover:text-white transition-colors"
              >
                Solicitar imóveis sob demanda
              </a>
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="px-5 py-3 text-xs font-medium border border-[var(--site-border)] rounded-[var(--site-radius)] hover:border-[var(--site-accent)] transition-colors cursor-pointer"
              >
                Acessar Painel Admin
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Curated Rio Regions Grid (02 · Geografia Arquitetônica) */}
      <section className="regions-story-section border-y border-[var(--site-border)] bg-[var(--site-surface)] editorial-grain">
        <div className="max-w-7xl mx-auto px-6 py-16 sm:py-20 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--site-border)] pb-8">
            <div className="space-y-2.5 max-w-2xl">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
                02 · Geografia de Atuação
              </p>
              <h2 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
                Bairros emblemáticos de {tenant.city}
              </h2>
            </div>
            <p className="text-sm text-[var(--site-text-muted)] max-w-md leading-relaxed">
              Selecione uma região para filtrar instantaneamente as oportunidades disponíveis ou solicitar busca reservada fora de portais.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {curatedRegions.map((region, idx) => (
              <button
                key={region.name}
                type="button"
                onClick={() => onNavigate(`/imoveis?q=${encodeURIComponent(region.name)}`)}
                className="region-grid-card group w-full text-left bg-[var(--site-bg)] border border-[var(--site-border)] rounded-[var(--site-radius)] overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-[var(--site-accent)]/60 hover:shadow-[0_20px_40px_-24px_rgba(20,20,19,0.2)] cursor-pointer flex flex-col"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-900">
                  <img
                    src={region.image}
                    alt={`${region.name}, ${tenant.city}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute top-3.5 left-4 font-mono text-[11px] tracking-[0.18em] text-white/85">
                    0{idx + 1}
                  </div>
                  <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between text-white">
                    <h3 className="font-editorial text-2xl font-semibold leading-none">
                      {region.name}
                    </h3>
                    <ArrowUpRight className="w-4 h-4 opacity-80 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <p className="text-xs text-[var(--site-text-muted)] leading-relaxed">
                    {region.subtitle}
                  </p>
                  <div className="pt-3 border-t border-[var(--site-border)] flex items-center justify-between text-[11px] text-[var(--site-text-muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-[var(--site-accent)]" />
                      {tenant.city}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--site-text)]">
                      {region.count > 0
                        ? `${region.count} ${region.count === 1 ? 'imóvel' : 'imóveis'}`
                        : 'Explorar região'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Real Three.js 3D Interactive Architectural Study (03 · Experiência Espacial 3D) */}
      <section className="reveal-section max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
              03 · Estudo Espacial & Insolação
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl font-semibold leading-[1.08] tracking-tight text-balance">
              Leitura arquitetônica em três dimensões
            </h2>
            <p className="text-sm sm:text-base text-[var(--site-text-muted)] leading-relaxed">
              Cada residência selecionada por nossa assessoria passa por avaliação de insolação, ventilação cruzada, proporção de planta e integração entre interior e paisagem carioca.
            </p>

            <div className="space-y-4 pt-3 border-t border-[var(--site-border)]">
              <div className="flex items-start gap-3.5">
                <Layers className="w-4 h-4 text-[var(--site-accent)] mt-1 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--site-text)]">
                    Volumetria e orientação solar
                  </h3>
                  <p className="text-xs text-[var(--site-text-muted)] leading-relaxed mt-0.5">
                    Interaja com o modelo 3D ao lado para alternar entre sol da manhã, tarde dourada e iluminação noturna de galeria.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Sparkles className="w-4 h-4 text-[var(--site-accent)] mt-1 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--site-text)]">
                    Tour Virtual 360° nos imóveis do acervo
                  </h3>
                  <p className="text-xs text-[var(--site-text-muted)] leading-relaxed mt-0.5">
                    Percorra ambientes em alta definição antes mesmo da visita presencial, com dossiê técnico completo.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <MagneticAction>
                <button
                  type="button"
                  onClick={() => onNavigate('/imoveis')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-xs font-medium tracking-wide bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] hover:bg-[var(--site-accent)] hover:text-white transition-colors duration-300 cursor-pointer"
                >
                  <span>Explorar imóveis com visita virtual</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </MagneticAction>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ArchitecturalPavilionCanvas />
          </div>
        </div>
      </section>

      {/* 6. Developments / Launches Showcase (04 · Incorporações & Lançamentos) */}
      <section className="reveal-section border-y border-[var(--site-border)] bg-[var(--site-surface)]">
        <div className="max-w-7xl mx-auto px-6 py-24 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[var(--site-border)] pb-8">
            <div className="space-y-2.5">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
                04 · Incorporações & Lançamentos
              </p>
              <h2 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
                Empreendimentos
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/empreendimentos')}
              className="editorial-link inline-flex items-center gap-2 text-sm font-medium text-[var(--site-text)] hover:text-[var(--site-accent)] transition-colors cursor-pointer self-start sm:self-end"
            >
              <span>Ver todos os empreendimentos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {developments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {developments.slice(0, 2).map((dev) => (
                <article
                  key={dev.id}
                  onClick={() => onNavigate(`/empreendimento/${dev.slug}`)}
                  className="group cursor-pointer border border-[var(--site-border)] rounded-[var(--site-radius)] overflow-hidden bg-[var(--site-bg)] grid grid-cols-1 sm:grid-cols-12 items-stretch transition-all duration-500 hover:-translate-y-1 hover:border-[var(--site-accent)]/60 hover:shadow-[0_24px_48px_-24px_rgba(20,20,19,0.2)]"
                >
                  <div className="curtain-reveal sm:col-span-5 relative min-h-[240px] overflow-hidden">
                    <img
                      src={
                        dev.coverImage ||
                        '/src/assets/images/editorial_development_1795532253234.jpg'
                      }
                      alt={dev.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="sm:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-5">
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
                        {dev.neighborhood} · {dev.city}
                        {dev.deliveryDate ? ` · Entrega ${dev.deliveryDate}` : ''}
                      </p>
                      <h3 className="font-editorial text-2xl sm:text-3xl font-semibold leading-tight group-hover:text-[var(--site-accent)] transition-colors">
                        {dev.name}
                      </h3>
                      <p className="text-sm text-[var(--site-text-muted)] line-clamp-3 leading-relaxed">
                        {dev.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--site-border)]">
                      <span className="font-mono text-sm tabular-nums font-medium text-[var(--site-text)]">
                        {dev.priceFrom > 0
                          ? `A partir de ${formatCurrencyBRL(dev.priceFrom)}`
                          : 'Sob consulta'}
                      </span>
                      <span className="text-xs font-medium inline-flex items-center gap-1 group-hover:text-[var(--site-accent)] transition-colors">
                        Ver projeto <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch border border-[var(--site-border)] rounded-[var(--site-radius)] overflow-hidden bg-[var(--site-bg)]">
              <div className="curtain-reveal lg:col-span-6 relative min-h-[340px] overflow-hidden">
                <img
                  src="/src/assets/images/editorial_development_1795532253234.jpg"
                  alt="Empreendimentos residenciais no Rio de Janeiro"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:col-span-6 p-8 sm:p-14 flex flex-col justify-center space-y-6">
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
                  Acesso Antecipado
                </p>
                <h3 className="font-editorial text-3xl sm:text-4xl font-semibold leading-tight text-balance">
                  Lançamentos residenciais e comerciais com tabela direta de incorporadora
                </h3>
                <p className="text-sm sm:text-base text-[var(--site-text-muted)] leading-relaxed">
                  Receba plantas, memorial descritivo e condições exclusivas de lançamento nas regiões mais valorizadas do Rio de Janeiro.
                </p>
                <div className="pt-2">
                  <MagneticAction>
                    <a
                      href="#contato"
                      className="inline-flex items-center gap-2.5 px-6 py-3.5 text-xs font-medium bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] hover:bg-[var(--site-accent)] hover:text-white transition-colors duration-300"
                    >
                      Solicitar portfólio de lançamentos
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </MagneticAction>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 7. About Broker Editorial Spread (Dual-Plane Portrait Parallax) */}
      <section className="about-section reveal-section max-w-7xl mx-auto px-6 py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[440px]">
              {/* Architectural hairline backdrop plane moving at secondary parallax speed */}
              <div
                aria-hidden="true"
                className="about-parallax-back absolute -inset-4 translate-x-4 translate-y-4 rounded-t-full rounded-b-[2.25rem] border border-[var(--site-accent)]/30 pointer-events-none"
              />
              <div className="about-parallax-front relative rounded-t-full rounded-b-[2rem] overflow-hidden shadow-[0_28px_70px_-24px_rgba(20,20,19,0.28)] bg-[var(--site-surface-alt)]">
                <img
                  src={tenant.aboutPhotoUrl || '/src/assets/images/ivy_oliveira_corretora.png'}
                  alt={tenant.brokerName}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto block object-contain"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="space-y-2.5">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
                05 · {tenant.brokerName}
                {tenant.creci ? ` · ${tenant.creci}` : ''}
                {tenant.aboutExperienceYears ? ` · ${tenant.aboutExperienceYears}` : ''}
              </p>
              <h2 className="font-editorial text-4xl sm:text-5xl font-semibold leading-[1.08] tracking-tight text-balance">
                {tenant.aboutHeadline}
              </h2>
            </div>

            <p className="text-base text-[var(--site-text-muted)] leading-relaxed max-w-2xl">
              {tenant.aboutBio}
            </p>

            {tenant.specialties?.length > 0 && (
              <div className="pt-6 border-t border-[var(--site-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {tenant.specialties.map((spec, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 text-[var(--site-text)]"
                  >
                    <Compass className="w-4 h-4 text-[var(--site-accent)] shrink-0" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3">
              <button
                type="button"
                onClick={() => onNavigate('/sobre')}
                className="editorial-link inline-flex items-center gap-2 text-sm font-medium text-[var(--site-text)] hover:text-[var(--site-accent)] transition-colors cursor-pointer"
              >
                <span>Conhecer trajetória e atuação</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Differentials & Methodology (06 · Padrão de Assessoria) */}
      <section className="reveal-section border-y border-[var(--site-border)] bg-[var(--site-surface)]">
        <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-12 gap-14">
          <div className="lg:col-span-4 space-y-5">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
              06 · Atuação & Padrão
            </p>
            <h2 className="font-editorial text-4xl font-semibold leading-tight text-balance">
              Diferenciais da nossa assessoria
            </h2>
            <div className="pt-5 border-t border-[var(--site-border)] space-y-2.5">
              <p className="text-xs font-semibold text-[var(--site-text)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--site-accent)]" />
                Regiões atendidas em {tenant.city}
              </p>
              <p className="text-sm text-[var(--site-text-muted)] leading-relaxed">
                {tenant.regions.join(' · ')}
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
            {(tenant.differentials || []).map((diff, idx) => (
              <div
                key={idx}
                className="group pt-6 border-t border-[var(--site-border)] hover:border-[var(--site-accent)] transition-colors duration-300 space-y-3"
              >
                <span className="font-mono text-xs text-[var(--site-accent)]">
                  0{idx + 1}.
                </span>
                <h3 className="font-editorial text-2xl font-semibold text-[var(--site-text)]">
                  {diff.title}
                </h3>
                <p className="text-sm text-[var(--site-text-muted)] leading-relaxed">
                  {diff.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Verified Real Client Testimonials (Rendered only when published in Firestore) */}
      {testimonials.length > 0 && (
        <section className="reveal-section max-w-7xl mx-auto px-6 py-24 space-y-12">
          <div className="space-y-2.5 border-b border-[var(--site-border)] pb-8">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
              Experiências Reais
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl font-semibold">
              Depoimentos de Clientes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <blockquote
                key={t.id}
                className="p-8 bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] flex flex-col justify-between gap-8"
              >
                <p className="font-editorial text-xl text-[var(--site-text)] leading-relaxed italic">
                  “{t.quote}”
                </p>
                <footer className="pt-4 border-t border-[var(--site-border)] text-xs space-y-0.5">
                  <p className="font-semibold text-[var(--site-text)]">{t.clientName}</p>
                  {(t.clientRole || t.propertyReference) && (
                    <p className="text-[var(--site-text-muted)]">
                      {[t.clientRole, t.propertyReference].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* 10. Lead Capture & Concierge Call-to-Action */}
      <section id="contato" className="reveal-section max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-start">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
              Atendimento Direto
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl font-semibold leading-[1.08] text-balance">
              Converse diretamente com {tenant.brokerName}
            </h2>
            <p className="text-sm sm:text-base text-[var(--site-text-muted)] leading-relaxed">
              Seja para adquirir, investir, alugar ou avaliar seu imóvel no Rio de Janeiro, nossa consultoria oferece estudo personalizado e sigilo absoluto.
            </p>
            {whatsappUrl && (
              <div className="pt-2">
                <MagneticAction>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      trackPublicEvent({
                        tenantId: tenant.id,
                        ownerUid: tenant.ownerUid,
                        eventType: 'whatsapp_click',
                        targetId: 'home_contact',
                        path: '/',
                        source: 'home_contact',
                        utmSource: '',
                        utmCampaign: '',
                      });
                    }}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 text-xs font-medium border border-[var(--site-border)] bg-[var(--site-surface)] rounded-[var(--site-radius)] hover:border-[var(--site-accent)] hover:text-[var(--site-accent)] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-[var(--site-accent)]" />
                    Iniciar conversa no WhatsApp
                  </a>
                </MagneticAction>
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            <LeadCaptureForm source="home_page" />
          </div>
        </div>
      </section>
    </div>
  );
}
