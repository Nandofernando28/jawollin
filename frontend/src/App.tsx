import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { useSound } from './audio/SoundProvider';
import { IntroScreen } from './components/IntroScreen';
import { BlockTransition } from './components/BlockTransition';
import { LiveSimulation } from './components/LiveSimulation';
import { ResultsScroll } from './components/ResultsScroll';
import { ExpansionDetector } from './components/ExpansionDetector';
import { SURPRISE_PRESETS } from './data/surprisePresets';
import { Header } from './components/Header';
import { SetupScreen } from './components/SetupScreen';
import { KpiCards } from './components/KpiCards';
import { MantaMap } from './components/MantaMap';
import { TerritoryPanel } from './components/TerritoryPanel';
import { EpidemicCharts } from './components/EpidemicCharts';
import { MayorReportModal } from './components/MayorReportModal';
import { PixelIcon } from './components/PixelIcon';
import type { HubId, ParishId, StrategyType } from './types/simulation';

export default function App() {
  const {
    params,
    setParams,
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

  // Flujo de pantallas (solo interfaz): presentación → parámetros → simulación en vivo → resultados
  type Stage = 'intro' | 'setup' | 'live' | 'results';
  const [stage, setStage] = useState<Stage>('intro');
  const [pendingStage, setPendingStage] = useState<Stage | null>(null);
  const { play, stopAmbient, muted, toggleMuted } = useSound();
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('shield');

  // Cambio de pantalla con la transición de bloques
  const goTo = useCallback((next: Stage) => setPendingStage(next), []);
  const onTransitionCovered = useCallback(() => {
    if (pendingStage) setStage(pendingStage);
    window.scrollTo({ top: 0 });
  }, [pendingStage]);
  const onTransitionDone = useCallback(() => setPendingStage(null), []);

  // Paso 2: al entrar en la simulación en vivo, el mapa se reproduce solo desde el día 0
  const liveStarted = useRef(false);
  useEffect(() => {
    if (stage !== 'live') {
      liveStarted.current = false;
      return;
    }
    // Si el motor falló, no se reproduce un resultado anterior: se muestra el error
    if (!loading && result && !error && !liveStarted.current) {
      liveStarted.current = true;
      setCurrentDay(0);
      if (!playing) togglePlay();
    }
  }, [stage, loading, result, error, playing, setCurrentDay, togglePlay]);

  // Al llegar al último día, se pasa solo a los resultados
  useEffect(() => {
    if (stage !== 'live' || !liveStarted.current || playing || !result || pendingStage) return;
    if (currentDay < result.params.days) return;
    const t = window.setTimeout(() => goTo('results'), 1400);
    return () => window.clearTimeout(t);
  }, [stage, playing, currentDay, result, pendingStage, goTo]);

  // La presentación termina sola (o con "Saltar") y lleva a los parámetros
  const startFromIntro = useCallback(() => {
    stopAmbient();
    goTo('setup');
  }, [stopAmbient, goTo]);

  const launchSimulation = useCallback(async () => {
    play('chime');
    resetDay();
    goTo('live');
    await execute();
  }, [play, resetDay, goTo, execute]);

  const replaySimulation = useCallback(() => {
    resetDay();
    goTo('live');
  }, [resetDay, goTo]);

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

  // Capas comunes a todas las pantallas: transición de bloques y decreto del alcalde
  const overlays = (
    <>
      {pendingStage && <BlockTransition onCovered={onTransitionCovered} onDone={onTransitionDone} />}
      {/* Modal del Decreto Oficial del Alcalde generado con Amazon Bedrock */}
      {showReport && report && (
        <MayorReportModal report={report} onClose={closeReport} />
      )}
    </>
  );

  const header = (
    <Header
      loading={loading}
      reportLoading={reportLoading}
      hasResult={result !== null}
      backendHealthy={backendHealthy}
      onRun={() => execute()}
      onReset={resetAll}
      onReport={openReport}
      onOpenSetup={() => goTo('setup')}
      soundMuted={muted}
      onToggleSound={toggleMuted}
    />
  );

  // Fase de presentación
  if (stage === 'intro') {
    return (
      <>
        <IntroScreen onStart={startFromIntro} />
        {overlays}
      </>
    );
  }

  // Paso 1: configuración de parámetros
  if (stage === 'setup') {
    return (
      <>
        <SetupScreen
          params={params}
          setParams={setParams}
          loading={loading}
          error={error}
          hasResult={result !== null}
          onLaunch={launchSimulation}
          onBack={() => goTo('results')}
        />
        {overlays}
      </>
    );
  }

  // Paso 2: simulación en vivo
  if (stage === 'live') {
    return (
      <div className="min-h-screen text-white">
        {header}
        <LiveSimulation
          result={result}
          loading={loading}
          error={error}
          snap={snap}
          strategy={selectedStrategy}
          onStrategyChange={setSelectedStrategy}
          currentDay={currentDay}
          playing={playing}
          playbackSpeed={playbackSpeed}
          prevalenceByParish={prevalenceByParish}
          hubsToday={hubsToday}
          onDayChange={setCurrentDay}
          onTogglePlay={togglePlay}
          onResetDay={resetDay}
          onSpeedChange={setPlaybackSpeed}
          onRetry={() => execute()}
          onBackToSetup={() => goTo('setup')}
          onShowResults={() => goTo('results')}
        />
        {overlays}
      </div>
    );
  }

  // Paso 3: resultados y comparativa
  return (
    <div className="min-h-screen text-white">
      {/* Header institucional conectado con AWS / Local */}
      {header}

      <main className="mx-auto max-w-[1280px] space-x-0 space-y-6 px-4 py-6 sm:px-6">
        {/* Banner de alerta de error si ocurre */}
        {error && (
          <div className="mc-panel flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3">
              <PixelIcon name="warning" size={24} title="Error" />
              <span className="text-[20px] leading-tight text-mc-ink">{error}</span>
            </div>
            <button
              onClick={() => execute()}
              className="mc-button mc-button-danger mc-button-sm"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Barra de metadatos de ejecución en vivo */}
        {result && (
          <div className="mc-panel-dark flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[18px] text-[#d8d8d8]">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="flex items-center gap-2 text-white">
                <PixelIcon name="database" size={16} />
                Simulación: <code className="text-mc-gold">{result.sim_hash}</code>
                <span
                  className={`mc-chip ${
                    result.cache_hit ? 'bg-mc-lapis text-white' : 'bg-mc-stone-light text-white'
                  }`}
                  title={result.cache_hit
                    ? 'Misma configuración y semilla que una simulación anterior: se devuelve el resultado guardado, idéntico.'
                    : 'Resultado recién calculado por el motor Monte Carlo.'}
                >
                  {result.cache_hit ? 'Desde caché' : 'Calculado'}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <PixelIcon name="hourglass" size={16} />
                Cómputo: <strong className="font-normal text-white">{result.execution_time_ms} ms</strong>
              </span>
              <span>
                Población: <strong className="font-normal text-white">{result.params.n_nodes.toLocaleString()}</strong> hab.
              </span>
              <span>
                Monte Carlo: <strong className="font-normal text-white">{result.params.monte_carlo_runs}</strong> corridas
              </span>
              <span>
                Semilla: <strong className="font-normal text-mc-gold">{result.params.seed}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="mc-chip bg-mc-grass text-white">
                <PixelIcon name="check" size={8} />
                Datos reales del motor SEIR
              </span>
            </div>
          </div>
        )}

        {/* Pergamino con la comparativa frente a las dos líneas base y el informe del alcalde */}
        {result && (
          <ResultsScroll
            result={result}
            reportLoading={reportLoading}
            onOpenReport={openReport}
            onReplay={replaySimulation}
            onNewSetup={() => goTo('setup')}
          />
        )}

        {/* Forma matemática de la expansión con los días completos */}
        {result && (
          <ExpansionDetector
            result={result}
            upToDay={result.params.days}
            strategy={selectedStrategy}
            onStrategyChange={setSelectedStrategy}
            showStatus
          />
        )}

        {/* Tarjetas de KPIs calculadas con el motor SEIR */}
        {result ? (
          <KpiCards result={result} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="mc-slot-dark mc-loading h-32 p-4" />
            ))}
          </div>
        )}

        {/* Barra de control rápido: Selector de estrategia territorial + Presets de brotes */}
        {result && (
          <div className="mc-panel flex flex-wrap items-center justify-between gap-4 p-3">
            {/* Selector de estrategia para el visor territorial: barra rápida de casillas */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="mc-label text-mc-ink">
                Estrategia en visor:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStrategy('shield')}
                  className={`mc-button mc-button-sm ${selectedStrategy === 'shield' ? 'is-active' : ''}`}
                >
                  <PixelIcon name="shield" size={16} />
                  Cortafuegos Manta
                </button>
                <button
                  onClick={() => setSelectedStrategy('random')}
                  className={`mc-button mc-button-sm ${selectedStrategy === 'random' ? 'is-active' : ''}`}
                >
                  <PixelIcon name="dice" size={16} />
                  Al Azar
                </button>
                <button
                  onClick={() => setSelectedStrategy('none')}
                  className={`mc-button mc-button-sm ${selectedStrategy === 'none' ? 'is-active' : ''}`}
                >
                  <PixelIcon name="barrier" size={16} />
                  Sin Intervención
                </button>
              </div>
            </div>

            {/* Botones de Brotes Sorpresa para evaluación rápida */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mc-label text-mc-ink">
                Brotes Sorpresa:
              </span>
              {SURPRISE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  title={p.description}
                  className="mc-button mc-button-sm mc-button-danger"
                >
                  <p.icon className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout principal: Mapa + Panel Territorial (izq) y Analítica SEIR (der) */}
        {result && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Columna Izquierda: Mapa Cartográfico con Scrubber Temporal + Detalle de Hubs */}
            <div className="space-y-6 lg:col-span-7">
              <div className="mc-panel p-3">
                <div className="mc-panel-dark mb-3 flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <PixelIcon name="map" size={24} />
                    <div>
                      <h2 className="mc-title text-[18px]">
                        Mapa Operativo de Contención · Manta
                      </h2>
                      <p className="mt-1 text-[18px] leading-tight text-[#d8d8d8]">
                        Visualización territorial de casos activos, cortafuegos y vacunación perimetral por parroquia.
                      </p>
                    </div>
                  </div>
                  <span className="mc-chip bg-mc-stone text-mc-gold">
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
            <div className="space-y-6 lg:col-span-5">
              <EpidemicCharts result={result} currentDay={currentDay} />
            </div>
          </div>
        )}
      </main>

      {overlays}
    </div>
  );
}
