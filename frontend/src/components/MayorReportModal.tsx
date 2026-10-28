/**
 * MayorReportModal.tsx — Diálogo modal del informe/decreto oficial del alcalde.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §2.1 Núcleo: fondo cálido de pergamino (--mc-paper) y franjas en core-grey-6
 * - §5.1 Paneles modales biselados y botones de acción
 * - §8 Accesibilidad: trampa de foco para teclado, escape con tecla Esc y atributos ARIA
 */
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
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
import { PixelIcon, type PixelIconName } from './PixelIcon';

interface MayorReportModalProps {
  report: MayorReportResponse;
  onClose: () => void;
}

// Prioridad → bloque de color sólido (las mismas tres que envía el backend)
const PRIORITY_STYLE: Record<string, string> = {
  CRITICA: 'bg-mc-redstone text-white',
  ALTA: 'bg-[#c96a14] text-white',
  MEDIA: 'bg-mc-ore-gold text-mc-ink',
};

// Icono de cada sección del decreto (Considerando, Decreta, Anexo)
const SECTION_ICON: PixelIconName[] = ['warning', 'book', 'coin'];

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
      icon: <PixelIcon name="shield" size={24} />,
      valueClass: 'text-mc-grass-light',
      label: 'Evitados vs. azar',
      value: fmt(m.lives_saved_vs_random),
      unit: m.scale_factor
        ? `contagios · unos ${fmt(toManta(m.lives_saved_vs_random, m.scale_factor))} hab.`
        : 'contagios en la muestra',
    },
    {
      icon: <PixelIcon name="zombie" size={24} />,
      valueClass: 'text-[#ff605e]',
      label: 'Reducción del pico',
      value: `${fmt(m.peak_reduction_pct, 1)}%`,
      unit: 'zombies activos',
    },
    {
      icon: <PixelIcon name="coin" size={24} />,
      valueClass: 'text-mc-gold',
      label: 'Costo por contagio',
      value: `$${fmt(m.cost_per_infection_avoided_usd, 2)}`,
      unit: 'evitado frente a no actuar',
    },
    {
      icon: <PixelIcon name="pin" size={24} />,
      valueClass: 'text-mc-diamond',
      label: 'Zona más crítica',
      value: m.most_critical_parish,
      unit: 'más contagios sin actuar',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Libro del decreto: marco de madera e interior de pergamino */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decree-title"
        aria-describedby="decree-headline"
        tabIndex={-1}
        className="mc-frame-wood mc-paper relative flex w-full max-w-2xl flex-col overflow-hidden outline-none"
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Franja superior institucional ───────────────────────────── */}
        <div className="shrink-0 border-b-4 border-black bg-mc-stone-mid px-4 py-3 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Identidad */}
            <div className="flex items-center gap-3">
              <div className="mc-slot flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden="true">
                <PixelIcon name="book" size={24} />
              </div>
              <div>
                <p className="mc-label text-[#ede5e2]">
                  COE Cantonal · Alcaldía de San Pablo de Manta
                </p>
                <h2 id="decree-title" className="mc-title mt-1 text-[14px]">
                  Propuesta de Decreto de Emergencia
                </h2>
                <p className="mt-1 text-[14px] leading-tight text-[#ede5e2]">
                  SpookyThon 2026 · Track B ·{' '}
                  <span className="text-mc-grass-light">{engine}</span>
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? 'Texto copiado' : 'Copiar el decreto como texto'}
                title="Copiar texto"
                className="mc-button mc-button-sm"
              >
                {copied
                  ? <><PixelIcon name="check" size={16} /><span>Copiado</span></>
                  : <><PixelIcon name="copy" size={16} /><span className="hidden sm:inline">Copiar</span></>
                }
              </button>
              <button
                type="button"
                onClick={handlePdf}
                disabled={pdfState === 'working'}
                aria-label="Descargar el decreto en PDF"
                title="Descargar PDF"
                className="mc-button mc-button-sm mc-button-primary"
              >
                {pdfState === 'working'
                  ? <PixelIcon name="hourglass" size={16} className="mc-loading" />
                  : <PixelIcon name="download" size={16} />}
                <span className="hidden sm:inline">{pdfState === 'working' ? 'Generando…' : 'Descargar PDF'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar la propuesta de decreto"
                title="Cerrar (Esc)"
                className="mc-button mc-button-sm mc-button-icon"
              >
                <PixelIcon name="close" size={16} />
              </button>
            </div>
          </div>
          {pdfState === 'error' && (
            <p role="alert" className="mt-3 flex items-center gap-2 border-2 border-black bg-mc-redstone px-3 py-2 text-[14px] leading-tight text-white">
              <PixelIcon name="warning" size={16} />
              No se pudo generar el PDF. Puedes copiar el texto o volver a intentarlo.
            </p>
          )}
        </div>

        {/* ── Cuerpo desplazable ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Titular del decreto */}
          <div className="border-b-2 border-dashed border-[#8b5a2b] px-5 py-4">
            <h3 id="decree-headline" className="font-display text-[14px] leading-snug text-[#3a2a14]">
              {report.headline}
            </h3>
            <p className="mt-1 text-[14px] text-[#6b4a2b]">
              Generado el {formatDate(report.created_at)}
            </p>
          </div>

          {/* Métricas de impacto como casillas de inventario */}
          <div className="grid grid-cols-2 gap-3 border-b-2 border-dashed border-[#8b5a2b] px-5 py-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="mc-slot-dark p-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{stat.icon}</span>
                  <span className="mc-label text-[#ede5e2]">
                    {stat.label}
                  </span>
                </div>
                <p className={`mt-2 font-pixel text-[13px] leading-snug ${stat.valueClass}`} style={{ textShadow: '2px 2px 0 #000' }}>
                  {stat.value}
                </p>
                <p className="mt-1 text-[14px] leading-tight text-[#ede5e2]">{stat.unit}</p>
              </div>
            ))}
          </div>

          {/* Secciones del decreto: Considerando, Decreta y Anexo */}
          <div>
            {sections.map((section, i) => (
              <section key={section.title} className="border-b-2 border-dashed border-[#8b5a2b] px-5 py-4">
                <SectionHeader icon={SECTION_ICON[i] ?? 'book'}>{section.title}</SectionHeader>
                <MarkdownBody>{section.body}</MarkdownBody>
              </section>
            ))}

            {/* Acciones prioritarias del COE */}
            {report.action_items.length > 0 && (
              <section className="px-5 py-4">
                <SectionHeader icon="pickaxe">
                  Acciones prioritarias del COE
                </SectionHeader>
                <ol className="mt-3 space-y-2">
                  {report.action_items.map((action, idx) => {
                    const style = PRIORITY_STYLE[action.priority] ?? PRIORITY_STYLE.MEDIA;
                    return (
                      <li
                        key={idx}
                        className="flex items-start gap-3 border-2 border-[#3a2a14] bg-[#f3ead0] px-3 py-2"
                      >
                        {/* Número de orden */}
                        <span
                          className="mc-slot-dark flex h-8 w-8 shrink-0 items-center justify-center font-pixel text-[11px] text-mc-gold"
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-[14px] leading-tight text-[#3a2a14]">
                              {action.title}
                            </span>
                            {/* Insignia de prioridad: bloque sólido */}
                            <span className={`mc-chip ${style}`}>
                              Prioridad {PRIORITY_LABEL[action.priority]?.toLowerCase() ?? action.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-[14px] leading-tight text-[#3a2a14]">
                            {action.description}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-[14px] text-[#6b4a2b]">
                            <PixelIcon name="pin" size={16} />
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
        <div className="shrink-0 border-t-4 border-black bg-mc-stone-mid px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-[14px] text-[#ede5e2]">
              <PixelIcon name="database" size={16} />
              <span className="truncate">
                Código de reproducibilidad:{' '}
                <code className="text-mc-gold">{report.sim_hash}</code>
              </span>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mc-button mc-button-sm"
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
  children,
}: {
  icon: PixelIconName;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="mc-slot flex h-8 w-8 items-center justify-center" aria-hidden="true">
        <PixelIcon name={icon} size={16} />
      </span>
      <h4 className="mc-label text-[#3a2a14]">
        {children}
      </h4>
    </div>
  );
}

function MarkdownBody({ children }: { children: string }) {
  return (
    <div className="mt-3 text-[15px] leading-tight text-[#3a2a14]">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-normal text-[#171615] underline decoration-2 decoration-[#c96a14] underline-offset-2">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-[#6b4a2b]">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-2 list-[square] space-y-1 pl-5 marker:text-[#8b5a2b]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[15px] leading-tight text-[#3a2a14]">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-4 border-[#c96a14] pl-3 text-[14px] italic text-[#6b4a2b]">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-[#3a2a14] px-1 text-[14px] text-mc-gold">
              {children}
            </code>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 mt-3 font-display text-[14px] text-[#3a2a14]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-2 font-display text-[14px] text-[#3a2a14]">{children}</h3>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
