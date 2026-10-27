import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Copy, Check, Printer, FileDown } from 'lucide-react';
import type { MayorReportResponse } from '../types/simulation';

interface MayorReportModalProps {
  report: MayorReportResponse;
  onClose: () => void;
}

export function MayorReportModal({ report, onClose }: MayorReportModalProps) {
  const [copied, setCopied] = useState(false);

  // Armar el documento Markdown completo
  const fullMarkdown = [
    `# ${report.headline}`,
    '',
    `> Generado por: \`${report.generated_by}\` · ${new Date(report.created_at).toLocaleString('es-EC')}`,
    '',
    report.situacion_critica,
    '',
    report.directivas_operativas,
    '',
    report.balance_recursos,
    '',
    '## Indicadores Clave del Decreto',
    '',
    `| Métrica | Valor |`,
    `|---|---|`,
    `| Vidas salvadas vs. Al Azar | ${report.metrics_snapshot.lives_saved_vs_random} nodos |`,
    `| Reducción del pico (%) | ${report.metrics_snapshot.peak_reduction_pct}% |`,
    `| Presupuesto ejecutado | $${report.metrics_snapshot.budget_spent_usd.toLocaleString()} |`,
    `| Costo por nodo salvado | $${report.metrics_snapshot.cost_per_life_saved_usd} |`,
    `| Parroquia más crítica | ${report.metrics_snapshot.most_critical_parish} |`,
    '',
    '## Acciones Prioritarias del COE',
    '',
    ...report.action_items.map((a) =>
      `- **[${a.priority}] ${a.title}** — ${a.description} _(${a.parish_or_hub})_`
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
    a.download = `Decreto_COE_Manta_${report.sim_hash}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Boletín Oficial para el Alcalde"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/70 print:shadow-none">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-wide">
              📄 DECRETO DE CONTENCIÓN EPIDEMIOLÓGICA
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              COE Cantonal de Manta · SpookyThon 2026 ·{' '}
              <span className="font-mono text-slate-400">{report.generated_by}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              title="Copiar texto Markdown"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 cursor-pointer"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado</>
                : <><Copy className="w-3.5 h-3.5" /> Copiar</>
              }
            </button>
            <button
              onClick={handleDownload}
              title="Descargar como .md"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 border border-indigo-600 text-xs text-white cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" /> Descargar
            </button>
            <button
              onClick={handlePrint}
              title="Imprimir"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Cerrar"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body — Markdown renderizado */}
        <div className="overflow-y-auto flex-1 px-6 py-5 prose prose-sm prose-invert prose-slate max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg font-extrabold text-white mt-0 mb-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-bold text-slate-200 mt-5 mb-2 pb-1 border-b border-slate-800">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-bold text-slate-300 mt-4 mb-1.5">{children}</h3>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-indigo-500 pl-3 text-[11px] text-slate-400 my-2">{children}</blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3">
                  <table className="w-full text-xs border-collapse">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="text-left px-3 py-2 bg-slate-800 text-slate-300 font-semibold border border-slate-700">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-1.5 text-slate-300 border border-slate-800">{children}</td>
              ),
              strong: ({ children }) => (
                <strong className="text-white font-bold">{children}</strong>
              ),
              code: ({ children }) => (
                <code className="font-mono text-[11px] bg-slate-800 text-emerald-400 px-1 rounded">{children}</code>
              ),
              li: ({ children }) => (
                <li className="text-sm text-slate-300 leading-relaxed">{children}</li>
              ),
              p: ({ children }) => (
                <p className="text-sm text-slate-300 leading-relaxed my-1.5">{children}</p>
              ),
              hr: () => <hr className="border-slate-800 my-3" />,
            }}
          >
            {fullMarkdown}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-slate-600 font-mono">
            Hash: {report.sim_hash}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
