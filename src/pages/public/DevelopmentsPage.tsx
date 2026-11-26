import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Building2, Check } from 'lucide-react';
import { useAppContext } from '../../hooks/useAuthTenant';
import { subscribePublishedDevelopments } from '../../firebase/firestoreService';
import { Development } from '../../types/realestate';
import { ProGallery } from '../../components/properties/ProGallery';
import { LeadCaptureForm } from '../../components/leads/LeadCaptureForm';
import { EditorialImageCurtain, EditorialReveal } from '../../components/motion/EditorialMotion';
import { formatCurrencyBRL } from '../../utils/formatters';
import { applySeoMetadata } from '../../utils/seo';

interface DevelopmentsPageProps {
  slug?: string;
  onNavigate: (to: string) => void;
}

export function DevelopmentsPage({ slug, onNavigate }: DevelopmentsPageProps) {
  const { tenant } = useAppContext();
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribePublishedDevelopments(tenant.id, (items) => {
      setDevelopments(items);
      setLoading(false);
    });
    return () => unsub();
  }, [tenant.id]);

  const activeDev = useMemo(
    () => (slug ? developments.find((d) => d.slug === slug || d.id === slug) : undefined),
    [developments, slug]
  );

  useEffect(() => {
    if (activeDev) {
      applySeoMetadata({
        title: activeDev.seoTitle || `${activeDev.name} — ${tenant.brandName}`,
        description: activeDev.seoDescription || activeDev.description.slice(0, 155),
        image: activeDev.coverImage,
      });
    } else {
      applySeoMetadata({
        title: `Empreendimentos & Lançamentos — ${tenant.brandName}`,
        description: `Lançamentos, condomínios e projetos residenciais e comerciais em ${tenant.city}.`,
      });
    }
  }, [activeDev, tenant]);

  if (slug && !loading && !activeDev) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-28 text-center space-y-5">
        <h1 className="font-editorial text-4xl font-semibold">Empreendimento não encontrado</h1>
        <button
          type="button"
          onClick={() => onNavigate('/empreendimentos')}
          className="px-6 py-3 text-sm font-medium bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] cursor-pointer"
        >
          Ver todos os empreendimentos
        </button>
      </div>
    );
  }

  if (activeDev) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-14">
        <button
          type="button"
          onClick={() => onNavigate('/empreendimentos')}
          className="editorial-link inline-flex items-center gap-2 text-xs font-medium text-[var(--site-text-muted)] hover:text-[var(--site-text)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para empreendimentos
        </button>

        <EditorialReveal className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end border-b border-[var(--site-border)] pb-10">
          <div className="lg:col-span-8 space-y-3">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--site-text-muted)]">
              <span className="text-[var(--site-accent)]">{activeDev.category}</span> ·{' '}
              {activeDev.neighborhood}, {activeDev.city}
              {activeDev.developer ? ` · ${activeDev.developer}` : ''}
            </p>
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.06]">
              {activeDev.name}
            </h1>
          </div>
          <div className="lg:col-span-4 lg:text-right space-y-1">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--site-text-muted)]">
              Unidades a partir de
            </p>
            <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums">
              {activeDev.priceFrom > 0 ? formatCurrencyBRL(activeDev.priceFrom) : 'Sob consulta'}
            </p>
            {activeDev.deliveryDate && (
              <p className="text-xs text-[var(--site-text-muted)]">
                Previsão: {activeDev.deliveryDate}
              </p>
            )}
          </div>
        </EditorialReveal>

        <ProGallery images={activeDev.images} title={activeDev.name} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7 space-y-12">
            <EditorialReveal className="space-y-4">
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold">O Projeto</h2>
              <p className="text-sm sm:text-base text-[var(--site-text-muted)] leading-relaxed whitespace-pre-line max-w-prose">
                {activeDev.description}
              </p>
            </EditorialReveal>

            {activeDev.technicalSpecs?.length > 0 && (
              <EditorialReveal className="space-y-5 pt-8 border-t border-[var(--site-border)]">
                <h2 className="font-editorial text-3xl font-semibold">Ficha Técnica</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                  {activeDev.technicalSpecs.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[var(--site-accent)] shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </EditorialReveal>
            )}

            {activeDev.floorPlans?.length > 0 && (
              <EditorialReveal className="space-y-5 pt-8 border-t border-[var(--site-border)]">
                <h2 className="font-editorial text-3xl font-semibold">Plantas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {activeDev.floorPlans.map((fp, idx) => (
                    <div
                      key={fp.id || idx}
                      className="border border-[var(--site-border)] rounded-[var(--site-radius)] overflow-hidden bg-[var(--site-surface)]"
                    >
                      <img
                        src={fp.url}
                        alt={fp.caption || `Planta ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-56 object-contain bg-white p-3"
                      />
                      {fp.caption && (
                        <p className="p-3.5 text-xs text-[var(--site-text-muted)] border-t border-[var(--site-border)]">
                          {fp.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </EditorialReveal>
            )}
          </div>

          <aside className="lg:col-span-5 lg:sticky lg:top-28">
            <LeadCaptureForm
              defaultInterest="empreendimento"
              developmentId={activeDev.id}
              propertyTitle={activeDev.name}
              source="development_detail"
              title="Receber book e tabela de valores"
              subtitle={`Solicite as plantas e disponibilidades atualizadas de ${activeDev.name}.`}
            />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-14">
      <EditorialReveal className="space-y-3 border-b border-[var(--site-border)] pb-10">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--site-accent)]">
          Lançamentos & Condomínios
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
            Empreendimentos
          </h1>
          <p className="text-sm text-[var(--site-text-muted)] max-w-md leading-relaxed">
            Projetos residenciais e comerciais selecionados com acesso direto a plantas e tabelas no Rio de Janeiro.
          </p>
        </div>
      </EditorialReveal>

      {loading ? (
        <div className="h-80 bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] animate-pulse" />
      ) : developments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {developments.map((dev, idx) => (
            <EditorialReveal key={dev.id} delay={idx * 0.06}>
              <article
                onClick={() => onNavigate(`/empreendimento/${dev.slug}`)}
                className="group cursor-pointer bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1 hover:border-[var(--site-accent)]/60 hover:shadow-[0_24px_48px_-24px_rgba(20,20,19,0.2)]"
              >
                <EditorialImageCurtain className="aspect-[16/10] overflow-hidden bg-[var(--site-surface-alt)]">
                  {dev.coverImage ? (
                    <img
                      src={dev.coverImage}
                      alt={dev.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-10 h-10 opacity-30" />
                    </div>
                  )}
                </EditorialImageCurtain>
                <div className="p-6 sm:p-7 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
                      {dev.neighborhood} · {dev.city}
                      {dev.deliveryDate ? ` · ${dev.deliveryDate}` : ''}
                    </p>
                    <h2 className="font-editorial text-2xl sm:text-3xl font-semibold group-hover:text-[var(--site-accent)] transition-colors">
                      {dev.name}
                    </h2>
                    <p className="text-sm text-[var(--site-text-muted)] line-clamp-3 leading-relaxed">
                      {dev.description}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-[var(--site-border)] flex items-center justify-between text-xs font-medium">
                    <span className="font-mono text-sm tabular-nums">
                      {dev.priceFrom > 0 ? `Desde ${formatCurrencyBRL(dev.priceFrom)}` : 'Sob consulta'}
                    </span>
                    <span className="inline-flex items-center gap-1 group-hover:text-[var(--site-accent)] transition-colors">
                      Ver detalhes <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            </EditorialReveal>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <EditorialReveal className="lg:col-span-6 space-y-6">
            <EditorialImageCurtain className="rounded-[var(--site-radius)] overflow-hidden border border-[var(--site-border)] aspect-[16/10]">
              <img
                src="/src/assets/images/editorial_development_1795532253234.jpg"
                alt="Lançamentos residenciais no Rio de Janeiro"
                className="w-full h-full object-cover"
              />
            </EditorialImageCurtain>
            <div className="p-7 bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] space-y-3">
              <h2 className="font-editorial text-3xl font-semibold">
                Lançamentos sob consulta direta
              </h2>
              <p className="text-sm text-[var(--site-text-muted)] leading-relaxed">
                Assim que novos empreendimentos forem publicados no painel administrativo, suas galerias, plantas e fichas técnicas ficarão disponíveis aqui em tempo real.
              </p>
            </div>
          </EditorialReveal>
          <EditorialReveal delay={0.08} className="lg:col-span-6">
            <LeadCaptureForm
              defaultInterest="empreendimento"
              source="developments_empty"
              title="Consultar lançamentos disponíveis"
              subtitle="Informe a região desejada para receber opções atualizadas e tabelas de lançamento."
            />
          </EditorialReveal>
        </div>
      )}
    </div>
  );
}
