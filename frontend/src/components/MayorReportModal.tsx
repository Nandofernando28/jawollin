import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  X,
  Copy,
  Check,
  FileDown,
  Loader2,
  ShieldCheck,
  Zap,
  AlertTriangle,
  DollarSign,
  MapPin,
  Cpu,
  Scale,
  Gavel,
  FileText,
} from 'lucide-react';
import type { MayorReportResponse } from '../types/simulation';
import {
  ENGINE_LABEL,
  PRIORITY_LABEL,
  decreeMarkdown,
  decreeSections,
  fmtOrDash as fmt,
  formatDate,
  toManta,
} from '../utils/decree';

interface MayorReportModalProps {
  report: MayorReportResponse;
  onClose: () => void;
}

// Prioridad → color del badge (las mismas tres que envía el backend)
const PRIORITY_STYLE: Record<string, { pill: string; dot: string }> = {
  CRITICA: { pill: 'bg-[#fdecec] text-[#b42318] border-[#f5b8b3]', dot: 'bg-[#d92d20]' },
  ALTA:    { pill: 'bg-[#fff3ef] text-[#c0390d] border-[#f9c5a8]', dot: 'bg-[#ec652b]' },
  MEDIA:   { pill: 'bg-[#fffaf2] text-[#7c5a1a] border-[#f0d7a8]', dot: 'bg-[#f0b42a]' },
};

// Icono y color de cada sección del decreto (Considerando, Decreta, Anexo)
const SECTION_STYLE = [
  { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-[#ec652b]', bg: 'bg-[#fff3ef]' },
  { icon: <Gavel className="h-3.5 w-3.5" />, color: 'text-[#167e6c]', bg: 'bg-[#ecfdf7]' },
  { icon: <Scale className="h-3.5 w-3.5" />, color: 'text-[#1e4199]', bg: 'bg-[#eef2fb]' },
];

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function MayorReportModal({ report, onClose }: MayorReportModalProps) {
  const [copied, setCopied] = useState(false);
  const [pdfState, setPdfState] = useState<'idle' | 'working' | 'error'>('idle');
  const panelRef = useRef<HTMLDivElement>(null);
  const engine = ENGINE_LABEL[report.generated_by] ?? report.generated_by;
  const m = report.metrics_snapshot;
  const sections = decreeSections(report);

  // Foco dentro del diálogo: entra al abrir, Escape cierra, Tab no se escapa y al cerrar vuelve al botón de origen
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(decreeMarkdown(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // La librería de PDF pesa: se descarga solo la primera vez que se pide el documento
  const handlePdf = async () => {
    setPdfState('working');
    try {
      const { downloadDecreePdf } = await import('./DecreePdf');
      await downloadDecreePdf(report);
      setPdfState('idle');
    } catch (err) {
      console.error('No se pudo generar el PDF del decreto', err);
      setPdfState('error');
    }
  };

  const stats = [
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      bg: 'bg-[#ecfdf7] text-[#167e6c]',
      label: 'Evitados vs. azar',
      value: fmt(m.lives_saved_vs_random),
      unit: m.scale_factor
        ? `contagios · unos ${fmt(toManta(m.lives_saved_vs_random, m.scale_factor))} hab.`
        : 'contagios en la muestra',
    },
    {
      icon: <Zap className="h-4 w-4" />,
      bg: 'bg-[#fff3ef] text-[#ec652b]',
      label: 'Reducción del pico',
      value: `${fmt(m.peak_reduction_pct, 1)}%`,
      unit: 'zombies activos',
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      bg: 'bg-[#fffaf2] text-[#7c5a1a]',
      label: 'Costo por contagio',
      value: `$${fmt(m.cost_per_infection_avoided_usd, 2)}`,
      unit: 'evitado frente a no actuar',
    },
    {
      icon: <MapPin className="h-4 w-4" />,
      bg: 'bg-[#eef2fb] text-[#1e4199]',
      label: 'Zona más crítica',
      value: m.most_critical_parish,
      unit: 'más contagios sin actuar',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(17,26,74,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel principal — alineado con el design system de la consola */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decree-title"
        aria-describedby="decree-headline"
        tabIndex={-1}
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white outline-none sm:rounded-2xl"
        style={{
          maxHeight: '92vh',
          boxShadow: '0 24px 64px -12px rgba(17,26,74,0.22), 0 8px 24px -8px rgba(17,26,74,0.12)',
        }}
      >
        {/* ── Franja superior institucional ───────────────────────────── */}
        <div className="shrink-0 border-b border-[#e3e4e8] bg-[#f6f6f8] px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            {/* Identidad */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dfe6ea] bg-white">
                <ShieldCheck className="h-5 w-5 text-[#111a4a]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c7f88]">
                  COE Cantonal · Alcaldía de San Pablo de Manta
                </p>
                <h2 id="decree-title" className="mt-0.5 text-[15px] font-semibold leading-tight text-[#111a4a]">
                  Propuesta de Decreto de Emergencia
                </h2>
                <p className="mt-0.5 text-[11px] text-[#7c7f88]">
                  SpookyThon 2026 · Track B ·{' '}
                  <span className="text-[#167e6c]">{engine}</span>
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? 'Texto copiado' : 'Copiar el decreto como texto'}
                title="Copiar texto"
                className="flex items-center gap-1.5 rounded-lg border border-[#e3e4e8] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#3b3e47] transition-colors duration-150 hover:bg-[#f6f6f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e4199]"
              >
                {copied
                  ? <><Check className="h-3.5 w-3.5 text-[#167e6c]" aria-hidden="true" /><span>Copiado</span></>
                  : <><Copy className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">Copiar</span></>
                }
              </button>
              <button
                type="button"
                onClick={handlePdf}
                disabled={pdfState === 'working'}
                aria-label="Descargar el decreto en PDF"
                title="Descargar PDF"
                className="flex min-w-[2.25rem] items-center justify-center gap-1.5 rounded-lg border border-[#1e4199] bg-[#1e4199] px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-[#17318a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e4199] disabled:cursor-wait disabled:opacity-80"
              >
                {pdfState === 'working'
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  : <FileDown className="h-3.5 w-3.5" aria-hidden="true" />}
                <span className="hidden sm:inline">{pdfState === 'working' ? 'Generando…' : 'Descargar PDF'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar la propuesta de decreto"
                title="Cerrar (Esc)"
                className="rounded-lg border border-[#e3e4e8] bg-white p-1.5 text-[#7c7f88] transition-colors duration-150 hover:bg-[#f6f6f8] hover:text-[#111a4a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e4199]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          {pdfState === 'error' && (
            <p role="alert" className="mt-3 rounded-md border border-[#f5b8b3] bg-[#fdecec] px-3 py-2 text-[11px] text-[#b42318]">
              No se pudo generar el PDF. Puedes copiar el texto o volver a intentarlo.
            </p>
          )}
        </div>

        {/* ── Cuerpo desplazable ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Titular del decreto */}
          <div className="border-b border-[#e3e4e8] px-6 py-5">
            <h3 id="decree-headline" className="text-[17px] font-bold leading-snug text-[#111a4a]">
              {report.headline}
            </h3>
            <p className="mt-1 text-[11px] text-[#7c7f88]">
              Generado el {formatDate(report.created_at)}
            </p>
          </div>

          {/* Métricas de impacto en cards compactas */}
          <div className="grid grid-cols-2 gap-3 border-b border-[#e3e4e8] px-6 py-5 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-3">
                <div className="flex items-center gap-1.5">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md ${stat.bg}`} aria-hidden="true">
                    {stat.icon}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#7c7f88]">
                    {stat.label}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[15px] font-semibold leading-none text-[#111a4a]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] text-[#7c7f88]">{stat.unit}</p>
              </div>
            ))}
          </div>

          {/* Secciones del decreto: Considerando, Decreta y Anexo */}
          <div className="space-y-0 divide-y divide-[#e3e4e8]">
            {sections.map((section, i) => (
              <section key={section.title} className="px-6 py-5">
                <SectionHeader {...SECTION_STYLE[i]}>{section.title}</SectionHeader>
                <MarkdownBody>{section.body}</MarkdownBody>
              </section>
            ))}

            {/* Acciones prioritarias del COE */}
            {report.action_items.length > 0 && (
              <section className="px-6 py-5">
                <SectionHeader icon={<Cpu className="h-3.5 w-3.5" />} color="text-[#111a4a]" bg="bg-[#f6f6f8]">
                  Acciones prioritarias del COE
                </SectionHeader>
                <ol className="mt-3 space-y-2">
                  {report.action_items.map((action, idx) => {
                    const style = PRIORITY_STYLE[action.priority] ?? PRIORITY_STYLE.MEDIA;
                    return (
                      <li
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] px-4 py-3"
                      >
                        {/* Número de orden */}
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111a4a] text-[10px] font-bold text-white"
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-semibold text-[#111a4a]">
                              {action.title}
                            </span>
                            {/* Badge de prioridad */}
                            <span
                              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.pill}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                              Prioridad {PRIORITY_LABEL[action.priority]?.toLowerCase() ?? action.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#3b3e47]">
                            {action.description}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-[#7c7f88]">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {action.parish_or_hub}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-[#e3e4e8] bg-[#f6f6f8] px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-[10px] text-[#7c7f88]">
              <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Código de reproducibilidad:{' '}
                <code className="font-mono text-[#167e6c]">{report.sim_hash}</code>
              </span>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#e3e4e8] bg-white px-4 py-1.5 text-[12px] font-medium text-[#3b3e47] transition-colors duration-150 hover:text-[#111a4a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e4199]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Subcomponentes de apoyo ─────────────────────────────────────────────── */

function SectionHeader({
  icon,
  color,
  bg,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${bg} ${color}`} aria-hidden="true">
        {icon}
      </span>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c7f88]">
        {children}
      </h4>
    </div>
  );
}

function MarkdownBody({ children }: { children: string }) {
  return (
    <div className="mt-3 text-[13px] leading-relaxed text-[#3b3e47]">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[#111a4a]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-[#7c7f88]">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-4 marker:text-[#c6c9cf]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[12px] leading-relaxed text-[#3b3e47]">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-[#ec652b] pl-3 text-[12px] italic text-[#7c7f88]">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-[#f6f6f8] px-1 font-mono text-[11px] text-[#167e6c]">
              {children}
            </code>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 mt-3 text-[13px] font-semibold text-[#111a4a]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-2 text-[12px] font-semibold text-[#111a4a]">{children}</h3>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
