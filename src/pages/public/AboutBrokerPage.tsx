import { useEffect } from 'react';
import { Compass, MapPin, MessageCircle } from 'lucide-react';
import { useAppContext } from '../../hooks/useAuthTenant';
import { LeadCaptureForm } from '../../components/leads/LeadCaptureForm';
import { EditorialReveal, MagneticAction } from '../../components/motion/EditorialMotion';
import { buildWhatsAppUrl } from '../../utils/formatters';
import { applySeoMetadata } from '../../utils/seo';

export function AboutBrokerPage() {
  const { tenant } = useAppContext();

  useEffect(() => {
    applySeoMetadata({
      title: `Sobre ${tenant.brokerName} — ${tenant.brandName}`,
      description: tenant.aboutBio.slice(0, 155),
      image: tenant.aboutPhotoUrl,
    });
  }, [tenant]);

  const whatsappUrl = buildWhatsAppUrl(
    tenant.whatsapp,
    `Olá ${tenant.brokerName}! Gostaria de agendar uma conversa sobre consultoria imobiliária.`
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 sm:py-20 space-y-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
        <EditorialReveal className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-[450px]">
            <div
              aria-hidden="true"
              className="absolute -inset-4 translate-x-4 translate-y-4 rounded-t-full rounded-b-[2.25rem] border border-[var(--site-accent)]/30 pointer-events-none"
            />
            <div className="relative rounded-t-full rounded-b-[2rem] overflow-hidden shadow-[0_28px_70px_-24px_rgba(20,20,19,0.28)] bg-[var(--site-surface-alt)]">
              <img
                src={tenant.aboutPhotoUrl || '/src/assets/images/ivy_oliveira_corretora.png'}
                alt={tenant.brokerName}
                referrerPolicy="no-referrer"
                className="w-full h-auto block object-contain"
              />
            </div>
          </div>
        </EditorialReveal>

        <EditorialReveal delay={0.08} className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
              {tenant.brandName}
              {tenant.creci ? ` · ${tenant.creci}` : ''}
              {tenant.aboutExperienceYears ? ` · ${tenant.aboutExperienceYears}` : ''}
            </p>
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.06] tracking-tight text-balance">
              {tenant.brokerName}
            </h1>
            <p className="text-base sm:text-lg font-medium text-[var(--site-text)]">
              {tenant.aboutHeadline}
            </p>
          </div>

          <p className="text-sm sm:text-base text-[var(--site-text-muted)] leading-relaxed whitespace-pre-line max-w-prose">
            {tenant.aboutBio}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[var(--site-border)]">
            <div className="space-y-2.5">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--site-text-muted)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--site-accent)]" />
                Regiões de Atuação
              </h2>
              <p className="text-sm text-[var(--site-text)] leading-relaxed">
                {tenant.regions.join(' · ')}
              </p>
            </div>
            <div className="space-y-2.5">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--site-text-muted)] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[var(--site-accent)]" />
                Especialidades
              </h2>
              <ul className="text-sm space-y-1.5">
                {tenant.specialties.map((s, idx) => (
                  <li key={idx} className="text-[var(--site-text)]">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-3">
            {whatsappUrl && (
              <MagneticAction>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-xs font-medium bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] hover:bg-[var(--site-accent)] hover:text-white transition-colors duration-300"
                >
                  <MessageCircle className="w-4 h-4" />
                  Conversar no WhatsApp
                </a>
              </MagneticAction>
            )}
            {tenant.instagramUrl && (
              <a
                href={tenant.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-medium border border-[var(--site-border)] rounded-[var(--site-radius)] hover:border-[var(--site-accent)] hover:text-[var(--site-accent)] transition-colors"
              >
                {tenant.instagramHandle || 'Instagram'}
              </a>
            )}
          </div>
        </EditorialReveal>
      </div>

      {/* Editorial Advisory Differentials */}
      {tenant.differentials?.length > 0 && (
        <EditorialReveal className="pt-14 border-t border-[var(--site-border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {tenant.differentials.map((diff, idx) => (
            <div key={idx} className="space-y-2.5">
              <span className="font-mono text-xs text-[var(--site-accent)]">0{idx + 1}.</span>
              <h3 className="font-editorial text-2xl font-semibold">{diff.title}</h3>
              <p className="text-sm text-[var(--site-text-muted)] leading-relaxed">
                {diff.description}
              </p>
            </div>
          ))}
        </EditorialReveal>
      )}

      <EditorialReveal className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pt-14 border-t border-[var(--site-border)]">
        <div className="lg:col-span-5 space-y-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
            Consultoria Reservada
          </p>
          <h2 className="font-editorial text-4xl font-semibold">Contato Direto</h2>
          <p className="text-sm sm:text-base text-[var(--site-text-muted)] leading-relaxed">
            Agende uma consultoria para compra, venda ou avaliação do seu patrimônio imobiliário.
          </p>
          <div className="pt-2 text-sm space-y-1.5 text-[var(--site-text-muted)]">
            <p className="font-medium text-[var(--site-text)]">
              {tenant.city}
              {tenant.state ? `, ${tenant.state}` : ''}
            </p>
            {tenant.email && <p>{tenant.email}</p>}
            {tenant.phone && <p className="font-mono tabular-nums">{tenant.phone}</p>}
          </div>
        </div>
        <div className="lg:col-span-7">
          <LeadCaptureForm source="about_page" />
        </div>
      </EditorialReveal>
    </div>
  );
}
