/**
 * Paso 2: la simulación en vivo. El mapa avanza solo día a día y un marcador
 * muestra cuántas personas hay en cada estado ese día. Solo presenta los datos
 * que ya calculó el backend (serie espacial de la estrategia elegida).
 */
import React from 'react';
import type { HubId, ParishId, SimulationResponse, SpatialDaySnapshot, StrategyType } from '../types/simulation';
import { MantaMap } from './MantaMap';
import { ExpansionDetector } from './ExpansionDetector';
import { PixelIcon } from './PixelIcon';
import { STATE_COLOR, STATE_LABEL } from '../theme/pixelTheme';

interface LiveSimulationProps {
  result: SimulationResponse | null;
  loading: boolean;
  error: string | null;
  snap: SpatialDaySnapshot | undefined;
  strategy: StrategyType;
  onStrategyChange: (s: StrategyType) => void;
  currentDay: number;
  playing: boolean;
  playbackSpeed: 1 | 2 | 5;
  prevalenceByParish: Partial<Record<ParishId, number>>;
  hubsToday: { firewall: HubId[]; ringVaccination: HubId[]; cases: Partial<Record<HubId, number>> };
  onDayChange: (d: number) => void;
  onTogglePlay: () => void;
  onResetDay: () => void;
  onSpeedChange: (s: 1 | 2 | 5) => void;
  onRetry: () => void;
  onBackToSetup: () => void;
  onShowResults: () => void;
}

const STATES = [
  { key: 'sanos', label: STATE_LABEL.sano, color: STATE_COLOR.sano },
  { key: 'mordidos', label: STATE_LABEL.mordido, color: STATE_COLOR.mordido },
  { key: 'zombies', label: STATE_LABEL.zombie, color: STATE_COLOR.zombie },
  { key: 'aislados', label: STATE_LABEL.aislado, color: STATE_COLOR.aislado },
  { key: 'inmunes', label: STATE_LABEL.inmune, color: STATE_COLOR.inmune },
] as const;

const STRATEGY_OPTIONS: { id: StrategyType; label: string; icon: 'shield' | 'dice' | 'barrier' }[] = [
  { id: 'shield', label: 'Cortafuegos Manta', icon: 'shield' },
  { id: 'random', label: 'Al Azar', icon: 'dice' },
  { id: 'none', label: 'Sin Intervención', icon: 'barrier' },
];

export function LiveSimulation(props: LiveSimulationProps) {
  const { result, loading, error, snap, currentDay, playing } = props;

  // Mientras el motor calcula, o si falló antes de empezar: pantalla de carga o de error
  const notStarted = currentDay === 0 && !playing;
  if (!result || (notStarted && (loading || error))) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
        {error ? (
          <div className="mc-panel w-full p-5">
            <div className="flex items-center justify-center gap-3">
              <PixelIcon name="warning" size={24} title="Error" />
              <p className="text-[20px] leading-tight text-mc-ink">{error}</p>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={props.onRetry} className="mc-button mc-button-danger">Reintentar</button>
              <button type="button" onClick={props.onBackToSetup} className="mc-button">Volver a parámetros</button>
            </div>
          </div>
        ) : (
          <>
            <PixelIcon name="hourglass" size={48} className="mc-loading" />
            <p className="mc-title text-[22px]">Generando el mundo de Manta…</p>
            <p className="text-[20px] text-[#d8d8d8]">El motor Monte Carlo está simulando las tres estrategias.</p>
            <div className="mc-slot-dark h-6 w-full max-w-sm p-0.5">
              <div className="mc-loading h-full w-2/3 bg-mc-grass" />
            </div>
          </>
        )}
      </div>
    );
  }

  const days = result.params.days;
  const parishes = Object.values(snap?.parishes ?? {});
  const totals = STATES.map((st) => ({
    ...st,
    value: parishes.reduce((sum, p) => sum + p[st.key], 0),
  }));
  const population = totals.reduce((sum, t) => sum + t.value, 0) || result.params.n_nodes;
  const finished = currentDay >= days && !playing;

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6">
      {/* Cabecera del paso con el progreso de días */}
      <div className="mc-panel-dark px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PixelIcon name="zombie" size={32} />
            <div>
              <p className="mc-label text-[#d8d8d8]">Paso 2 · Simulación en vivo</p>
              <h2 className="mc-title text-[20px]">Día {currentDay} de {days}</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {STRATEGY_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => props.onStrategyChange(o.id)}
                aria-pressed={props.strategy === o.id}
                className={`mc-button mc-button-sm ${props.strategy === o.id ? 'is-active' : ''}`}
              >
                <PixelIcon name={o.icon} size={16} />
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {/* Barra de días hecha de bloques: cada bloque es un día */}
        <div className="mt-3 flex gap-[2px]" aria-hidden="true">
          {Array.from({ length: days }, (_, i) => (
            <span
              key={i}
              className="h-3 flex-1 border border-black"
              style={{ background: i < currentDay ? '#4f8f2f' : '#1e1e1e' }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <MantaMap
            result={result}
            currentDay={currentDay}
            playing={playing}
            playbackSpeed={props.playbackSpeed}
            firewallHubs={props.hubsToday.firewall}
            ringVaccinationHubs={props.hubsToday.ringVaccination}
            hubCases={props.hubsToday.cases}
            prevalenceByParish={props.prevalenceByParish}
            onDayChange={props.onDayChange}
            onTogglePlay={props.onTogglePlay}
            onResetDay={props.onResetDay}
            onSpeedChange={props.onSpeedChange}
          />
        </div>

        {/* Marcador de estados del día */}
        <aside className="mc-panel space-y-3 p-3 lg:col-span-4" aria-live="off">
          <div className="mc-panel-dark px-3 py-2">
            <p className="mc-label text-[#d8d8d8]">Población · día {currentDay}</p>
            <h3 className="mc-title mt-1 text-[16px]">Estados de la plaga</h3>
          </div>
          {totals.map((t) => (
            <div key={t.key} className="mc-slot-dark p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[20px]">
                  <span className="h-4 w-4 border-2 border-black" style={{ background: t.color }} />
                  {t.label}
                </span>
                <span className="font-pixel text-[13px]" style={{ color: t.color === STATE_COLOR.sano ? '#7cc24a' : t.color, textShadow: '2px 2px 0 #000' }}>
                  {t.value.toLocaleString()}
                </span>
              </div>
              {/* Barra proporcional en bloques */}
              <div className="mt-2 h-3 bg-[#2b2b2b]">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, (t.value / population) * 100)}%`,
                    background: t.color,
                    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.35) 2px, transparent 2px)',
                    backgroundSize: '8px 100%',
                  }}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={props.onShowResults}
            className={`mc-button w-full ${finished ? 'mc-button-primary' : ''}`}
          >
            <PixelIcon name="book" size={16} />
            {finished ? 'Ver resultados' : 'Saltar a resultados'}
          </button>
        </aside>
      </div>

      {/* El modelo de expansión se detecta en vivo con los días que van pasando */}
      <ExpansionDetector
        result={result}
        upToDay={currentDay}
        strategy={props.strategy}
        onStrategyChange={props.onStrategyChange}
      />
    </main>
  );
}
