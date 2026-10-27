/**
 * Header — Design tokens from Rules/DESIGN.md
 * radius-buttons: 8px · font: Inter 500 · element-gap: 8px
 */
import React from 'react';
import {
  ShieldCheck,
  RotateCcw,
  FileText,
  Loader2,
  Server,
  Cloud,
  Activity,
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
  loading,
  reportLoading,
  hasResult,
  backendMode,
  backendHealthy,
  onRun,
  onReset,
  onReport,
  onModeChange,
}: HeaderProps) {
  const healthDot =
    backendHealthy === null ? 'bg-[#c6c9cf]' : backendHealthy ? 'bg-[#167e6c] animate-pulse' : 'bg-[#ec652b]';
  const healthLabel = backendHealthy === null ? 'Verificando' : backendHealthy ? 'Conectado' : 'Modo local';

  return (
    <header className="sticky top-0 z-40 border-b border-[#e3e4e8] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[62px] max-w-[1200px] items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dfe6ea] bg-[#f6f6f8] text-[#111a4a]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <h1 className="text-[13px] font-semibold tracking-tight text-[#111a4a] leading-tight">
              OPERACIÓN CORTAFUEGOS MANTA
            </h1>
            <p className="text-[11px] leading-tight text-[#7c7f88]">
              Centro de Comando Epidemiológico · SpookyThon 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-[#e3e4e8] bg-[#f6f6f8] px-3 py-1.5 md:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${healthDot}`} />
            <span className="font-mono text-[11px] text-[#7c7f88]">
              {backendMode === 'aws' ? 'AWS us-east-1' : 'Local :8000'} · {healthLabel}
            </span>
          </div>

          <div className="flex overflow-hidden rounded-lg border border-[#e3e4e8] bg-[#f6f6f8]">
            {(['aws', 'local'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  backendMode === m
                    ? 'bg-[#111a4a] text-white'
                    : 'bg-transparent text-[#7c7f88] hover:text-[#3b3e47]'
                }`}
              >
                {m === 'aws' ? <Cloud className="h-3.5 w-3.5" /> : <Server className="h-3.5 w-3.5" />}
                {m === 'aws' ? 'AWS' : 'Local'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-[#e3e4e8] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b3e47] transition-colors hover:bg-[#f6f6f8]"
            title="Restaurar parámetros base"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          <button
            onClick={onReport}
            disabled={reportLoading || !hasResult}
            className="flex items-center gap-1.5 rounded-lg border border-[#e3e4e8] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b3e47] transition-colors hover:bg-[#f6f6f8] disabled:cursor-not-allowed disabled:opacity-40"
            title="Boletín Oficial para el Alcalde"
          >
            {reportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            <span className="hidden lg:inline">Boletín COE</span>
          </button>

          <button
            onClick={onRun}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-[#ec652b] px-4 py-1.5 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#d75a23] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
            {loading ? 'Simulando' : 'Simular'}
          </button>
        </div>
      </div>
    </header>
  );
}
