import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  X,
  Copy,
  Check,
  Printer,
  FileDown,
  ShieldCheck,
  Zap,
  AlertTriangle,
  DollarSign,
  MapPin,
  Cpu,
  ChevronRight,
} from 'lucide-react';
import type { MayorReportResponse } from '../types/simulation';
import { fmt } from '../utils/format';

interface MayorReportModalProps {
  report: MayorReportResponse;
  onClose: () => void;
}

const ENGINE_LABEL: Record<MayorReportResponse['generated_by'], string> = {
  'heuristic-coe-fallback': 'Motor analítico del COE',
  'amazon-bedrock-nova-micro': 'Amazon Bedrock · Nova Micro',
  'amazon-bedrock-claude-haiku': 'Amazon Bedrock · Claude Haiku',
};

// Prioridad → color del badge
const PRIORITY_STYLE: Record<string, { pill: string; dot: string }> = {
  ALTA:   { pill: 'bg-[#fff3ef] text-[#c0390d] border-[#f9c5a8]',  dot: 'bg-[#ec652b]' },
  MEDIA:  { pill: 'bg-[#fffaf2] text-[#7c5a1a] border-[#f0d7a8]',  dot: 'bg-[#f0b42a]' },
  BAJA:   { pill: 'bg-[#f0f4ff] text-[#1e4199] border-[#c2d0f8]',  dot: 'bg-[#1e4199]' },
};

export function MayorReportModal({ report, onClose }: MayorReportModalProps) {
  const [copied, setCopied] = useState(false);
  const engine = ENGINE_LABEL[report.generated_by] ?? report.generated_by;
  const m = report.metrics_snapshot;

  // Texto plano para copiar / descargar
  const fullMarkdown = [
    `# ${report.headline}`,
    '',
    `> Generado por: ${engine} · ${new Date(report.created_at).toLocaleString('es-EC')}`,
    '',
    report.situacion_critica,
    '',
    report.directivas_operativas,
    '',
    report.balance_recursos,
    '',
    '## Indicadores clave',
    '',
    `- **Contagios evitados frente al azar:** ${fmt(m.lives_saved_vs_random)} personas`,
    `- **Reducción del pico de zombies:** ${fmt(m.peak_reduction_pct, 1)}%`,
    `- **Presupuesto ejecutado:** $${fmt(m.budget_spent_usd)}`,
    `- **Costo por contagio evitado:** $${fmt(m.cost_per_life_saved_usd)} por persona`,
    `- **Parroquia más crítica:** ${m.most_critical_parish}`,
    '',
    '## Acciones Prioritarias del COE',
    '',
    ...report.action_items.map(
      (a) => `- **[${a.priority}] ${a.title}** — ${a.description} _(${a.parish_or_hub})_`,
    ),
  ].join('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Propuesta_Decreto_COE_Manta_${report.sim_hash}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(17,26,74,0.45)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Propuesta de decreto para el alcalde"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel principal — alineado con el design system de la consola */}
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
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
                <ShieldCheck className="h-5 w-5 text-[#111a4a]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c7f88]">
                  COE Cantonal · Alcaldía de San Pablo de Manta
                </p>
                <h2 className="mt-0.5 text-[15px] font-semibold leading-tight text-[#111a4a]">
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
                onClick={handleCopy}
                title="Copiar texto"
                className="flex items-center gap-1.5 rounded-lg border border-[#e3e4e8] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#3b3e47] transition hover:bg-[#f6f6f8]"
              >
                {copied
                  ? <><Check className="h-3.5 w-3.5 text-[#167e6c]" /><span>Copiado</span></>
                  : <><Copy className="h-3.5 w-3.5" /><span className="hidden sm:inline">Copiar</span></>
                }
              </button>
              <button
                onClick={handleDownload}
                title="Descargar .md"
                className="flex items-center gap-1.5 rounded-lg border border-[#1e4199] bg-[#1e4199] px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#17318a]"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Descargar</span>
              </button>
              <button
                onClick={handlePrint}
                title="Imprimir"
                className="rounded-lg border border-[#e3e4e8] bg-white p-1.5 text-[#7c7f88] transition hover:bg-[#f6f6f8] hover:text-[#111a4a]"
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                title="Cerrar"
                className="rounded-lg border border-[#e3e4e8] bg-white p-1.5 text-[#7c7f88] transition hover:bg-[#f6f6f8] hover:text-[#111a4a]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Cuerpo desplazable ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Titular del decreto */}
          <div className="border-b border-[#e3e4e8] px-6 py-5">
            <h3 className="text-[17px] font-bold leading-snug text-[#111a4a]">
              {report.headline}
            </h3>
            <p className="mt-1 text-[11px] text-[#7c7f88]">
              Generado el {new Date(report.created_at).toLocaleString('es-EC')} · Hash:{' '}
              <code className="font-mono text-[#167e6c]">{report.sim_hash}</code>
            </p>
          </div>

          {/* Métricas de impacto en cards compactas */}
          <div className="grid grid-cols-2 gap-3 border-b border-[#e3e4e8] px-6 py-5 sm:grid-cols-4">
            {[
              {
                icon: <ShieldCheck className="h-4 w-4" />,
                bg: 'bg-[#ecfdf7] text-[#167e6c]',
                label: 'Evitados vs. azar',
                value: fmt(m.lives_saved_vs_random),
                unit: 'personas',
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
                label: 'Presupuesto usado',
                value: `$${fmt(m.budget_spent_usd)}`,
                unit: `$${fmt(m.cost_per_life_saved_usd)}/pers.`,
              },
              {
                icon: <MapPin className="h-4 w-4" />,
                bg: 'bg-[#eef2fb] text-[#1e4199]',
                label: 'Zona más crítica',
                value: m.most_critical_parish,
                unit: 'prioridad alta',
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-3">
                <div className="flex items-center gap-1.5">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md ${stat.bg}`}>
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

          {/* Secciones narrativas del decreto */}
          <div className="space-y-0 divide-y divide-[#e3e4e8]">
            {/* Situación crítica */}
            <section className="px-6 py-5">
              <SectionHeader icon={<AlertTriangle className="h-3.5 w-3.5" />} color="text-[#ec652b]" bg="bg-[#fff3ef]">
                Situación Crítica
              </SectionHeader>
              <MarkdownBody>{report.situacion_critica}</MarkdownBody>
            </section>

            {/* Directivas operativas */}
            <section className="px-6 py-5">
              <SectionHeader icon={<ShieldCheck className="h-3.5 w-3.5" />} color="text-[#167e6c]" bg="bg-[#ecfdf7]">
                Directivas Operativas
              </SectionHeader>
              <MarkdownBody>{report.directivas_operativas}</MarkdownBody>
            </section>

            {/* Balance de recursos */}
            <section className="px-6 py-5">
              <SectionHeader icon={<DollarSign className="h-3.5 w-3.5" />} color="text-[#1e4199]" bg="bg-[#eef2fb]">
                Balance de Recursos
              </SectionHeader>
              <MarkdownBody>{report.balance_recursos}</MarkdownBody>
            </section>

            {/* Acciones prioritarias del COE */}
            {report.action_items.length > 0 && (
              <section className="px-6 py-5">
                <SectionHeader icon={<Cpu className="h-3.5 w-3.5" />} color="text-[#111a4a]" bg="bg-[#f6f6f8]">
                  Acciones Prioritarias del COE
                </SectionHeader>
                <ol className="mt-3 space-y-2">
                  {report.action_items.map((action, idx) => {
                    const style = PRIORITY_STYLE[action.priority] ?? PRIORITY_STYLE['MEDIA'];
                    return (
                      <li
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] px-4 py-3"
                      >
                        {/* Número de orden */}
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111a4a] text-[10px] font-bold text-white">
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
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              {action.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#3b3e47]">
                            {action.description}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-[#7c7f88]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {action.parish_or_hub}
                          </p>
                        </div>

                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#c6c9cf]" />
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
            <p className="text-[10px] text-[#7c7f88]">
              Hash de reproducibilidad:{' '}
              <code className="font-mono text-[#167e6c]">{report.sim_hash}</code>
            </p>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#e3e4e8] bg-white px-4 py-1.5 text-[12px] font-medium text-[#3b3e47] transition hover:bg-white hover:text-[#111a4a]"
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
      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${bg} ${color}`}>
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
            <ul className="my-2 space-y-1 pl-4">{children}</ul>
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
