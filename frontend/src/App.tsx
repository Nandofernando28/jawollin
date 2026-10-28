import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Shield,
  Activity,
  Shuffle,
  Ban,
  Clock,
  Database,
} from 'lucide-react';
import { useSimulation } from './hooks/useSimulation';
import { SURPRISE_PRESETS } from './data/surprisePresets';
import { Header } from './components/Header';
import { SetupScreen } from './components/SetupScreen';
import { KpiCards } from './components/KpiCards';
import { MantaMap } from './components/MantaMap';
import { TerritoryPanel } from './components/TerritoryPanel';
import { EpidemicCharts } from './components/EpidemicCharts';
import { MayorReportModal } from './components/MayorReportModal';
import type { HubId, ParishId, StrategyType } from './types/simulation';

export default function App() {
  const {
    params,
    setParams,
    backendMode,
    setBackendMode,
    backendHealthy,
    result,
    loading,
    error,
    execute,
    applyPreset,
    resetAll,
    currentDay,
    setCurrentDay,
    playing,
    playbackSpeed,
    setPlaybackSpeed,
    togglePlay,
    resetDay,
    report,
    reportLoading,
    showReport,
    openReport,
    closeReport,
  } = useSimulation();

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('shield');

  // Ejecutar simulación inicial al cargar si no hay resultado
  useEffect(() => {
    execute();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Extraer datos territoriales sincronizados con el día actual
  const timeline = result?.spatial_timelines?.[selectedStrategy];
  const snap =
    timeline && timeline.length > 0
      ? timeline[Math.min(currentDay, timeline.length - 1)]
      : undefined;

  // % de la parroquia con infección activa (Mordidos + Zombies), calculado por el backend
  const prevalenceByParish = useMemo(() => {
    const map: Partial<Record<ParishId, number>> = {};
    Object.values(snap?.parishes ?? {}).forEach((p) => {
      map[p.parish_id] = p.prevalence_pct;
    });
    return map;
  }, [snap]);

  // Un hub está "intervenido" solo si el Escudo lo cerró ese día; la vacunación en
  // anillo alrededor del hub se muestra aparte.
  const hubsToday = useMemo(() => {
    const hubs = Object.values(snap?.hubs ?? {});
    return {
      firewall: hubs.filter((h) => h.firewall_active).map((h) => h.hub_id),
      ringVaccination: hubs.filter((h) => h.vaccines_in_ring_today > 0).map((h) => h.hub_id),
      cases: Object.fromEntries(hubs.map((h) => [h.hub_id, h.active_cases])) as Partial<Record<HubId, number>>,
    };
  }, [snap]);

  // Si el usuario abrió la pantalla de configuración libre / presets
  if (isSetupOpen) {
    return (
      <SetupScreen
        params={params}
        setParams={setParams}
        loading={loading}
        error={error}
        hasResult={result !== null}
        onLaunch={async () => {
          setIsSetupOpen(false);
          await execute();
        }}
        onBack={() => setIsSetupOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] text-[#111a4a] antialiased">
      {/* Header institucional conectado con AWS / Local */}
      <Header
        loading={loading}
        reportLoading={reportLoading}
        hasResult={result !== null}
        backendMode={backendMode}
        backendHealthy={backendHealthy}
        onRun={() => execute()}
        onReset={resetAll}
        onReport={openReport}
        onModeChange={setBackendMode}
        onOpenSetup={() => setIsSetupOpen(true)}
      />

      <main className="mx-auto max-w-[1280px] space-x-0 space-y-5 px-4 py-5 sm:px-6">
        {/* Banner de alerta de error si ocurre */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-[#f0d7a8] bg-[#fffaf2] p-4 text-[#7c5a1a]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[#ec652b]" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={() => execute()}
              className="rounded-lg bg-[#ec652b] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#d75a23]"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Barra de metadatos de ejecución en vivo */}
        {result && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e3e4e8] bg-white px-4 py-2.5 text-xs text-[#7c7f88] shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-[#111a4a]">
                <Database className="h-3.5 w-3.5 text-[#167e6c]" />
                Simulación: <code className="font-mono text-[#167e6c]">{result.sim_hash}</code>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    result.cache_hit ? 'bg-[#eef2fb] text-[#1e4199]' : 'bg-[#f6f6f8] text-[#3b3e47]'
                  }`}
                  title={result.cache_hit
                    ? 'Misma configuración y semilla que una simulación anterior: se devuelve el resultado guardado, idéntico.'
                    : 'Resultado recién calculado por el motor Monte Carlo.'}
                >
                  {result.cache_hit ? 'Desde caché' : 'Calculado'}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Cómputo: <strong className="font-mono text-[#111a4a]">{result.execution_time_ms} ms</strong>
              </span>
              <span>
                Población: <strong className="text-[#111a4a]">{result.params.n_nodes.toLocaleString()}</strong> hab.
              </span>
              <span>
                Monte Carlo: <strong className="text-[#111a4a]">{result.params.monte_carlo_runs}</strong> corridas
              </span>
              <span>
                Semilla: <strong className="font-mono text-[#111a4a]">{result.params.seed}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf7] px-2.5 py-0.5 text-[11px] font-medium text-[#167e6c]">
                <CheckCircle2 className="h-3 w-3" />
                Datos reales de {result.backend_mode === 'aws' ? 'AWS Lambda' : 'Servidor Local'}
              </span>
            </div>
          </div>
        )}

        {/* Tarjetas de KPIs calculadas con el motor SEIR */}
        {result ? (
          <KpiCards result={result} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-[#e3e4e8] bg-white p-4" />
            ))}
          </div>
        )}

        {/* Barra de control rápido: Selector de estrategia territorial + Presets de brotes */}
        {result && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e3e4e8] bg-white p-3 shadow-sm">
            {/* Selector de estrategia para el visor territorial */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7c7f88]">
                Estrategia en visor:
              </span>
              <div className="flex rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-0.5">
                <button
                  onClick={() => setSelectedStrategy('shield')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    selectedStrategy === 'shield'
                      ? 'bg-[#167e6c] text-white shadow-sm'
                      : 'text-[#7c7f88] hover:text-[#111a4a]'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Cortafuegos Manta
                </button>
                <button
                  onClick={() => setSelectedStrategy('random')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    selectedStrategy === 'random'
                      ? 'bg-[#1e4199] text-white shadow-sm'
                      : 'text-[#7c7f88] hover:text-[#111a4a]'
                  }`}
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Al Azar
                </button>
                <button
                  onClick={() => setSelectedStrategy('none')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    selectedStrategy === 'none'
                      ? 'bg-[#ec652b] text-white shadow-sm'
                      : 'text-[#7c7f88] hover:text-[#111a4a]'
                  }`}
                >
                  <Ban className="h-3.5 w-3.5" />
                  Sin Intervención
                </button>
              </div>
            </div>

            {/* Botones de Brotes Sorpresa para evaluación rápida */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7c7f88]">
                Brotes Sorpresa:
              </span>
              {SURPRISE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  title={p.description}
                  className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] px-2.5 py-1 text-xs font-medium text-[#3b3e47] transition hover:border-[#111a4a] hover:bg-white"
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout principal: Mapa + Panel Territorial (izq) y Analítica SEIR (der) */}
        {result && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Columna Izquierda: Mapa Cartográfico con Scrubber Temporal + Detalle de Hubs */}
            <div className="space-y-5 lg:col-span-7">
              <div className="rounded-lg border border-[#e3e4e8] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[#111a4a]">
                      Mapa Operativo de Contención · Manta
                    </h2>
                    <p className="text-xs text-[#7c7f88]">
                      Visualización territorial de casos activos, cortafuegos y vacunación perimetral por parroquia.
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#167e6c]">
                    Día {currentDay} de {result.params.days}
                  </span>
                </div>

                <MantaMap
                  result={result}
                  currentDay={currentDay}
                  playing={playing}
                  playbackSpeed={playbackSpeed}
                  firewallHubs={hubsToday.firewall}
                  ringVaccinationHubs={hubsToday.ringVaccination}
                  hubCases={hubsToday.cases}
                  prevalenceByParish={prevalenceByParish}
                  onDayChange={setCurrentDay}
                  onTogglePlay={togglePlay}
                  onResetDay={resetDay}
                  onSpeedChange={setPlaybackSpeed}
                />
              </div>

              {/* Panel de hubs y recursos por día */}
              <TerritoryPanel
                result={result}
                currentDay={currentDay}
                strategy={selectedStrategy}
              />
            </div>

            {/* Columna Derecha: Curvas Epidemiológicas Reales con bandas P10-P90 */}
            <div className="space-y-5 lg:col-span-5">
              <EpidemicCharts result={result} currentDay={currentDay} />
            </div>
          </div>
        )}
      </main>

      {/* Modal del Decreto Oficial del Alcalde generado con Amazon Bedrock */}
      {showReport && report && (
        <MayorReportModal report={report} onClose={closeReport} />
      )}
    </div>
  );
}
