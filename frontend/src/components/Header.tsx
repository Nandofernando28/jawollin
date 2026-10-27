import React from 'react';
import {
  Shield, RotateCcw, FileText, Loader2,
  Server, Cloud, Activity,
} from 'lucide-react';
import type { BackendMode } from '../types/simulation';

interface HeaderProps {
  loading: boolean;
  reportLoading: boolean;
  hasResult: boolean;
  backendMode: BackendMode;
  backendHealthy: boolean | null;
  onRun: () => void;
  onReset: () => void;
  onReport: () => void;
  onModeChange: (m: BackendMode) => void;
}

export function Header({
  loading, reportLoading, hasResult,
  backendMode, backendHealthy,
  onRun, onReset, onReport, onModeChange,
}: HeaderProps) {
  const healthDot =
    backendHealthy === null ? 'bg-slate-500' :
    backendHealthy           ? 'bg-emerald-400 animate-pulse' :
                               'bg-amber-400';
  const healthLabel =
    backendHealthy === null ? 'Verificando…' :
    backendHealthy           ? 'Conectado' : 'Fallback Mock';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div className="hidden sm:block min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-white leading-tight">
              OPERACIÓN CORTAFUEGOS MANTA
            </h1>
            <p className="text-[11px] text-slate-500 leading-tight">
              Centro de Comando Epidemiológico · SpookyThon 2026 · Track B
            </p>
          </div>
        </div>

        {/* Backend switch */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className={`w-1.5 h-1.5 rounded-full ${healthDot}`} />
            <span className="text-[11px] text-slate-400 font-mono">
              {backendMode === 'aws' ? 'AWS us-east-1' : 'Local :8000'} · {healthLabel}
            </span>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {(['aws', 'local'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold cursor-pointer transition-colors ${
                  backendMode === m ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'aws' ? <Cloud className="w-3 h-3" /> : <Server className="w-3 h-3" />}
                {m === 'aws' ? 'AWS' : 'Local'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            title="Restaurar parámetros base"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          <button
            onClick={onReport}
            disabled={reportLoading || !hasResult}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed border border-indigo-500/50 text-xs font-semibold text-white transition-colors cursor-pointer"
            title="Boletín Oficial para el Alcalde (Amazon Bedrock)"
          >
            {reportLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FileText className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">Boletín COE</span>
            <span className="lg:hidden">Boletín</span>
          </button>

          <button
            onClick={onRun}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Activity className="w-4 h-4" />}
            {loading ? 'Simulando…' : 'Simular'}
          </button>
        </div>
      </div>
    </header>
  );
}
