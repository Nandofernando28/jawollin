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
  Activity,
  SlidersHorizontal,
} from 'lucide-react';

interface HeaderProps {
  loading: boolean;
  reportLoading: boolean;
  hasResult: boolean;
  backendHealthy: boolean | null;
  onRun: () => void;
  onReset: () => void;
  onReport: () => void;
  onOpenSetup?: () => void;
}

export function Header({
  loading,
  reportLoading,
  hasResult,
  backendHealthy,
  onRun,
  onReset,
  onReport,
  onOpenSetup,
}: HeaderProps) {
  const healthDot =
    backendHealthy === null ? 'bg-[#c6c9cf]' : backendHealthy ? 'bg-[#167e6c] animate-pulse' : 'bg-[#ec652b]';
  const healthLabel = backendHealthy === null ? 'Verificando' : backendHealthy ? 'Conectado' : 'Sin conexión';

  return (
    <header className="sticky top-0 z-40 border-b border-[#e3e4e8] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[62px] max-w-[1200px] items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dfe6ea] bg-[#f6f6f8] text-[#111a4a]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <h1 className="whitespace-nowrap text-[13px] font-semibold tracking-tight text-[#111a4a] leading-tight">
              OPERACIÓN CORTAFUEGOS MANTA
            </h1>
            <p className="text-[11px] leading-tight text-[#7c7f88]">
              Centro de Comando Epidemiológico · SpookyThon 2026
            </p>
          </div>
        </div>

        {/* Estado del motor de simulación: AWS y, si no responde, el servidor local en silencio */}
        <div className="hidden items-center gap-2 rounded-full border border-[#e3e4e8] bg-[#f6f6f8] px-3 py-1.5 md:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${healthDot}`} />
          <span className="whitespace-nowrap text-[11px] text-[#7c7f88]">{healthLabel}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onOpenSetup && (
            <button
              onClick={onOpenSetup}
              className="flex items-center gap-1.5 rounded-lg border border-[#e3e4e8] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b3e47] transition-colors hover:bg-[#f6f6f8]"
              title="Ajustar parámetros y Brotes Sorpresa"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#ec652b]" />
              <span className="hidden sm:inline">Parámetros</span>
            </button>
          )}

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
