/**
 * Header.tsx — Barra de menú institucional de piedra.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §4.2 Cabecera global fija de 80px (--mc-globalHeaderHeight) y contenedor 1280px
 * - §5.1 Botones en mayúsculas con tracking .03em y bisel inferior duro
 * - §5.4 Navegación institucional sobre fondo oscuro
 */
import React from 'react';
import { PixelIcon } from './PixelIcon';

interface HeaderProps {
  loading: boolean;
  reportLoading: boolean;
  hasResult: boolean;
  backendHealthy: boolean | null;
  onRun: () => void;
  onReset: () => void;
  onReport: () => void;
  onOpenSetup?: () => void;
  /** Botón de sonido de la interfaz (efectos y ambiente) */
  soundMuted?: boolean;
  onToggleSound?: () => void;
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
  soundMuted,
  onToggleSound,
}: HeaderProps) {
  // Luz de estado pixel: gris verificando, verde conectado (parpadea), roja sin conexión
  const healthDot =
    backendHealthy === null ? 'bg-mc-slot' : backendHealthy ? 'bg-mc-grass-light mc-loading' : 'bg-mc-redstone';
  const healthLabel = backendHealthy === null ? 'Verificando' : backendHealthy ? 'Conectado' : 'Sin conexión';

  return (
    <header className="sticky top-0 z-40 h-[80px] border-b-2 border-black bg-mc-stone-mid shadow-[0_4px_0_0_#171615]">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="mc-slot-dark flex h-11 w-11 shrink-0 items-center justify-center">
            <PixelIcon name="shield" size={24} />
          </div>
          <div className="hidden min-w-0 lg:block">
            <h1 className="mc-title whitespace-nowrap text-[15px]">
              OPERACIÓN CORTAFUEGOS MANTA
            </h1>
            <p className="text-[14px] leading-tight text-[#d0c5c0]">
              Centro de Comando Epidemiológico · SpookyThon 2026
            </p>
          </div>
        </div>

        {/* Estado del motor de simulación: AWS o servidor local */}
        <div className="mc-slot-dark hidden items-center gap-2 px-3 py-1 md:flex">
          <span className={`h-3 w-3 border-2 border-black ${healthDot}`} />
          <span className="whitespace-nowrap text-[14px] text-white">{healthLabel}</span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="mc-button mc-button-icon"
              aria-pressed={!soundMuted}
              aria-label={soundMuted ? 'Activar sonido' : 'Silenciar sonido'}
              title={soundMuted ? 'Activar sonido' : 'Silenciar sonido'}
            >
              <PixelIcon name={soundMuted ? 'barrier' : 'heart'} size={16} />
            </button>
          )}
          {onOpenSetup && (
            <button
              onClick={onOpenSetup}
              className="mc-button"
              title="Ajustar parámetros y Brotes Sorpresa"
            >
              <PixelIcon name="gear" size={16} />
              <span className="hidden sm:inline">Parámetros</span>
            </button>
          )}

          <button
            onClick={onReset}
            className="mc-button"
            title="Restaurar parámetros base"
          >
            <PixelIcon name="reset" size={16} />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          <button
            onClick={onReport}
            disabled={reportLoading || !hasResult}
            className="mc-button"
            title="Boletín Oficial para el Alcalde"
          >
            {reportLoading ? <PixelIcon name="hourglass" size={16} className="mc-loading" /> : <PixelIcon name="book" size={16} />}
            <span className="hidden lg:inline">Boletín COE</span>
          </button>

          <button
            onClick={onRun}
            disabled={loading}
            className="mc-button mc-button-primary"
          >
            {loading ? <PixelIcon name="hourglass" size={16} className="mc-loading" /> : <PixelIcon name="pickaxe" size={16} />}
            {loading ? 'Simulando' : 'Simular'}
          </button>
        </div>
      </div>
    </header>
  );
}
