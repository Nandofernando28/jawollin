/**
 * Centro de Comando Epidemiológico Cantonal — Operación Cortafuegos Manta
 * Layout: 3 columnas ejecutivas (Control | Mapa + KPIs | Analítica)
 * SpookyThon 2026 · Track B · Integrante 3
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Header }           from './components/Header';
import { ControlPanel }     from './components/ControlPanel';
import { KpiCards }         from './components/KpiCards';
import { MantaMap }         from './components/MantaMap';
import { EpidemicCharts }   from './components/EpidemicCharts';
import { MayorReportModal } from './components/MayorReportModal';
import { KpiSkeleton, ChartSkeleton, MapSkeleton } from './components/SkeletonLoader';
import { useSimulation } from './hooks/useSimulation';

export default function App() {
  const sim = useSimulation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      <Header
        loading={sim.loading}
        reportLoading={sim.reportLoading}
        hasResult={!!sim.result}
        backendMode={sim.backendMode}
        backendHealthy={sim.backendHealthy}
        onRun={() => sim.execute()}
        onReset={sim.resetAll}
        onReport={sim.openReport}
        onModeChange={sim.setBackendMode}
      />

      {/* Error banner */}
      {sim.error && (
        <div className="max-w-[1700px] mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-sm text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            Backend no disponible — simulación determinista local activa.
          </div>
        </div>
      )}

      {/* Grid 3 columnas */}
      <main className="max-w-[1700px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_380px] gap-4 items-start">

        {/* Columna 1 — Control + Brote Sorpresa */}
        <ControlPanel
          params={sim.params}
          setParams={sim.setParams}
          loading={sim.loading}
          onRun={() => sim.execute()}
          onPreset={sim.applyPreset}
        />

        {/* Columna 2 — KPIs + Mapa */}
        <section className="min-w-0 space-y-4">
          {sim.loading && !sim.result ? (
            <><KpiSkeleton /><MapSkeleton /></>
          ) : sim.result ? (
            <>
              <KpiCards result={sim.result} />
              <MantaMap
                result={sim.result}
                currentDay={sim.currentDay}
                playing={sim.playing}
                playbackSpeed={sim.playbackSpeed}
                onDayChange={sim.setCurrentDay}
                onTogglePlay={sim.togglePlay}
                onResetDay={sim.resetDay}
                onSpeedChange={sim.setPlaybackSpeed}
              />
            </>
          ) : (
            <><KpiSkeleton /><MapSkeleton /></>
          )}
        </section>

        {/* Columna 3 — Analítica + Boletín */}
        <section className="min-w-0 space-y-4">
          {sim.loading && !sim.result ? (
            <><ChartSkeleton height={280} /><ChartSkeleton height={200} /></>
          ) : sim.result ? (
            <EpidemicCharts result={sim.result} />
          ) : (
            <><ChartSkeleton height={280} /><ChartSkeleton height={200} /></>
          )}
        </section>

      </main>

      {/* Modal boletín */}
      {sim.showReport && sim.report && (
        <MayorReportModal report={sim.report} onClose={sim.closeReport} />
      )}
    </div>
  );
}
