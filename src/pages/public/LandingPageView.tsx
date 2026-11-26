import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, MessageCircle } from 'lucide-react';
import { useAppContext } from '../../hooks/useAuthTenant';
import {
  subscribePublishedLandingPages,
  subscribePublishedProperties,
  trackPublicEvent,
} from '../../firebase/firestoreService';
import { LandingPage, Property } from '../../types/realestate';
import { LeadCaptureForm } from '../../components/leads/LeadCaptureForm';
import { EditorialReveal, MagneticAction } from '../../components/motion/EditorialMotion';
import { buildWhatsAppUrl, formatCurrencyBRL } from '../../utils/formatters';
import { applySeoMetadata } from '../../utils/seo';

interface LandingPageViewProps {
  slug: string;
  onNavigate: (to: string) => void;
}

export function LandingPageView({ slug, onNavigate }: LandingPageViewProps) {
  const { tenant } = useAppContext();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u1 = subscribePublishedLandingPages(tenant.id, (items) => {
      setPages(items);
      setLoading(false);
    });
    const u2 = subscribePublishedProperties(tenant.id, setProperties);
    return () => {
      u1();
      u2();
    };
  }, [tenant.id]);

  const page = useMemo(() => pages.find((p) => p.slug === slug || p.id === slug), [pages, slug]);
  const linkedProperty = useMemo(
    () => (page?.propertyId ? properties.find((p) => p.id === page.propertyId) : undefined),
    [page, properties]
  );

  useEffect(() => {
    if (!page) return;
    applySeoMetadata({
      title: page.seoTitle || `${page.title} — ${tenant.brandName}`,
      description: page.seoDescription || page.subtitle || page.description.slice(0, 155),
      image: page.heroImage || linkedProperty?.coverImage,
    });
    trackPublicEvent({
      tenantId: tenant.id,
      ownerUid: tenant.ownerUid,
      eventType: 'page_view',
      targetId: page.id,
      path: `/oferta/${page.slug}`,
      source: 'landing_page',
      utmSource: new URLSearchParams(window.location.search).get('utm_source') || '',
      utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
    });
  }, [page, linkedProperty, tenant]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="h-96 bg-[var(--site-surface)] rounded-[var(--site-radius)] animate-pulse" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-28 text-center space-y-5">
        <h1 className="font-editorial text-4xl font-semibold">Página não encontrada</h1>
        <p className="text-sm text-[var(--site-text-muted)]">
          Esta página de oferta não está publicada ou foi encerrada.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/imoveis')}
          className="px-6 py-3 text-sm font-medium bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] cursor-pointer"
        >
          Ver catálogo de imóveis
        </button>
      </div>
    );
  }

  const heroImg =
    page.heroImage ||
    linkedProperty?.coverImage ||
    '/src/assets/images/hero_rio_architecture_1795532252718.jpg';

  const whatsappUrl = buildWhatsAppUrl(
    tenant.whatsapp,
    `Olá! Vi a página "${page.title}" e gostaria de receber mais detalhes.`
  );

  return (
    <div className="pb-24">
      {/* Commercial Editorial Hero */}
      <section className="relative min-h-[74vh] flex items-end bg-neutral-950 text-white overflow-hidden">
        <img
          src={heroImg}
          alt={page.title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/48 to-black/28" />

        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-20 space-y-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/80">
            {tenant.brandName} · Apresentação Exclusiva
          </p>
          <h1 className="font-editorial text-[clamp(2.35rem,5vw,4.5rem)] font-semibold leading-[1.05] max-w-4xl text-balance">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
              {page.subtitle}
            </p>
          )}
          <div className="pt-3 flex flex-wrap gap-4">
            <MagneticAction>
              <a
                href="#lp-formulario"
                style={{ backgroundColor: page.accentColor || 'var(--site-accent)' }}
                className="inline-flex items-center gap-2 px-7 py-4 text-sm font-medium text-white rounded-[var(--site-radius)] hover:opacity-90 transition-opacity"
              >
                <span>{page.ctaText || 'Solicitar Apresentação Completa'}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </MagneticAction>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-4 text-sm font-medium border border-white/40 text-white rounded-[var(--site-radius)] hover:bg-white/12 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Atendimento via WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Content & Conversion */}
      <section className="max-w-6xl mx-auto px-6 pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-10">
          {linkedProperty && (
            <EditorialReveal>
              <dl className="p-6 sm:p-7 bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] grid grid-cols-2 sm:grid-cols-4 gap-5">
                <div className="space-y-1">
                  <dt className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
                    Valor
                  </dt>
                  <dd className="font-mono font-semibold tabular-nums">
                    {formatCurrencyBRL(linkedProperty.price)}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
                    Área
                  </dt>
                  <dd className="font-mono font-semibold tabular-nums">
                    {linkedProperty.builtArea} m²
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
                    Quartos
                  </dt>
                  <dd className="font-mono font-semibold tabular-nums">
                    {linkedProperty.bedrooms}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
                    Vagas
                  </dt>
                  <dd className="font-mono font-semibold tabular-nums">
                    {linkedProperty.parkingSpaces}
                  </dd>
                </div>
              </dl>
            </EditorialReveal>
          )}

          <EditorialReveal className="space-y-4">
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold">
              Detalhes da Oportunidade
            </h2>
            <p className="text-sm sm:text-base text-[var(--site-text-muted)] leading-relaxed whitespace-pre-line max-w-prose">
              {page.description}
            </p>
          </EditorialReveal>

          {page.highlights?.length > 0 && (
            <EditorialReveal className="space-y-4 pt-6 border-t border-[var(--site-border)]">
              <h3 className="font-editorial text-2xl sm:text-3xl font-semibold">Destaques</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                {page.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[var(--site-accent)] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </EditorialReveal>
          )}
        </div>

        <div id="lp-formulario" className="lg:col-span-5 lg:sticky lg:top-28">
          <LeadCaptureForm
            defaultInterest="informacoes"
            propertyId={page.propertyId}
            propertyTitle={page.title}
            landingPageId={page.id}
            source={`landing_${page.slug}`}
            title={page.ctaText || 'Receber material completo'}
            subtitle="Atendimento consultivo direto e confidencial."
          />
        </div>
      </section>
    </div>
  );
}
