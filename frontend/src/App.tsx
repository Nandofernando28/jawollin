import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { useSound } from './audio/SoundProvider';
import { IntroScreen } from './components/IntroScreen';
import { BlockTransition } from './components/BlockTransition';
import { LiveSimulation } from './components/LiveSimulation';
import { ResultsScroll } from './components/ResultsScroll';
import { SURPRISE_PRESETS } from './data/surprisePresets';
import { Header } from './components/Header';
import { SetupScreen } from './components/SetupScreen';
import { KpiCards } from './components/KpiCards';
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

  // Flujo de pantallas (solo interfaz): presentación → parámetros → simulación y resultados
  type Stage = 'intro' | 'setup' | 'live';
  const [stage, setStage] = useState<Stage>('intro');
  const [pendingStage, setPendingStage] = useState<Stage | null>(null);
  const { play, stopAmbient, muted, toggleMuted } = useSound();
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('shield');
  // El mapa debe reproducirse solo desde el día 0 (al lanzar o al pulsar "Ver de nuevo")
  const [autoPlay, setAutoPlay] = useState(false);
  // Los resultados aparecen debajo del mapa al terminar la simulación (o al saltar a ellos)
  const [resultsShown, setResultsShown] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Cambio de pantalla con la transición de bloques
  const goTo = useCallback((next: Stage) => setPendingStage(next), []);
  const onTransitionCovered = useCallback(() => {
    if (pendingStage) setStage(pendingStage);
    window.scrollTo({ top: 0 });
  }, [pendingStage]);
  const onTransitionDone = useCallback(() => setPendingStage(null), []);

  // Paso 2: cuando el resultado está listo, el mapa se reproduce solo desde el día 0
  useEffect(() => {
    // Si el motor falló, no se reproduce un resultado anterior: se muestra el error
    if (stage !== 'live' || !autoPlay || loading || !result || error) return;
    setAutoPlay(false);
    setCurrentDay(0);
    if (!playing) togglePlay();
  }, [stage, autoPlay, loading, result, error, playing, setCurrentDay, togglePlay]);

  // Al llegar al último día, los resultados aparecen solos debajo del mapa
  useEffect(() => {
    if (stage !== 'live' || resultsShown || autoPlay || playing || !result) return;
    if (currentDay < result.params.days) return;
    const t = window.setTimeout(() => setResultsShown(true), 1400);
    return () => window.clearTimeout(t);
  }, [stage, resultsShown, autoPlay, playing, currentDay, result]);

  // Baja hasta los resultados sin que la cabecera fija (su alto cambia con la pantalla) los tape
  const scrollToResults = useCallback(() => {
    const el = resultsRef.current;
    if (!el) return;
    const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headerHeight - 16, behavior: 'smooth' });
  }, []);

  // Al aparecer los resultados, la página baja hasta ellos
  useEffect(() => {
    if (resultsShown) scrollToResults();
  }, [resultsShown, scrollToResults]);

  const showResults = useCallback(() => {
    if (resultsShown) scrollToResults();
    else setResultsShown(true);
  }, [resultsShown, scrollToResults]);

  // La presentación termina sola (o con "Saltar") y lleva a los parámetros
  const startFromIntro = useCallback(() => {
    stopAmbient();
    goTo('setup');
  }, [stopAmbient, goTo]);

  const launchSimulation = useCallback(async () => {
    play('chime');
    resetDay();
    setResultsShown(false);
    setAutoPlay(true);
    goTo('live');
    await execute();
  }, [play, resetDay, goTo, execute]);

  // "Ver de nuevo": se ocultan los resultados y el mapa vuelve a empezar arriba
  const replaySimulation = useCallback(() => {
    resetDay();
    setResultsShown(false);
    setAutoPlay(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetDay]);

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
          onBack={() => goTo('live')}
        />
        {overlays}
      </>
    );
  }

  // Paso 2: simulación en vivo y, al terminar, los resultados debajo en la misma pantalla
  return (
    <div className="min-h-screen text-white">
      {/* Header institucional conectado con AWS / Local */}
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
        onShowResults={showResults}
      >
        {result && resultsShown && (
          <div ref={resultsRef} className="mc-reveal space-y-6">
            {/* Banner de alerta de error si ocurre */}
            {error && (
              <div className="mc-panel flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <PixelIcon name="warning" size={24} title="Error" />
                  <span className="text-[15px] leading-tight text-mc-ink">{error}</span>
                </div>
                <button
                  onClick={() => execute()}
                  className="mc-button mc-button-danger mc-button-sm"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Pergamino con la comparativa frente a las dos líneas base y el informe del alcalde */}
            <ResultsScroll
              result={result}
              reportLoading={reportLoading}
              onOpenReport={openReport}
              onReplay={replaySimulation}
              onNewSetup={() => goTo('setup')}
            />

            {/* Tarjetas de KPIs calculadas con el motor SEIR */}
            <KpiCards result={result} />

            {/* Barra de metadatos de la ejecución */}
            <div className="mc-panel-dark flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[14px] text-[#ede5e2]">
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

              <span className="mc-chip bg-mc-grass text-white">
                <PixelIcon name="check" size={8} />
                Datos reales del motor SEIR
              </span>
            </div>

            {/* Botones de Brotes Sorpresa para evaluación rápida */}
            <div className="mc-panel flex flex-wrap items-center gap-2 p-3">
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

            {/* Hubs y recursos del día (izq) y curvas epidemiológicas con bandas P10-P90 (der) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <TerritoryPanel
                  result={result}
                  currentDay={currentDay}
                  strategy={selectedStrategy}
                />
              </div>
              <div className="space-y-6 lg:col-span-5">
                <EpidemicCharts result={result} currentDay={currentDay} />
              </div>
            </div>
          </div>
        )}
      </LiveSimulation>

      {overlays}
    </div>
  );
}
