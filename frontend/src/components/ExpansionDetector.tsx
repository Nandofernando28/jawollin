/**
 * ExpansionDetector.tsx — Detector analítico del modelo de expansión de la plaga.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §2 Colores temáticos para modelos (exponencial redstone, logística oro, logarítmica hierba)
 * - §3.1 Tipografía pixel para ejes y leyendas
 * - §5.1 Botones de estrategia con bisel y estado activo
 * - §5.3 Tarjetas con cabecera oscura mc-panel-dark
 */
import React, { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RCTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationResponse, StrategyType } from '../types/simulation';
import { analyzeExpansion, doublingTime, type FitResult, type ModelKind } from '../analysis/expansionFit';
import { PixelIcon, type PixelIconName } from './PixelIcon';
import { VirusStatusBadge } from './VirusStatusBadge';
import { fmt } from '../utils/format';
import { AXIS_LINE, AXIS_TICK, FONT_PIXEL, GRID_STROKE, MATERIAL } from '../theme/pixelTheme';

interface ExpansionDetectorProps {
  result: SimulationResponse;
  /** Último día que se usa para ajustar (en vivo, el día actual; en resultados, el último) */
  upToDay: number;
  strategy: StrategyType;
  onStrategyChange?: (s: StrategyType) => void;
  /** Muestra el estado del virus en el día analizado (en vivo ya se ve en la cabecera) */
  showStatus?: boolean;
}

const MODEL_INFO: Record<ModelKind, { name: string; formula: string; color: string }> = {
  exponential: { name: 'Exponencial', formula: 'C(t) = a · e^(b·t)', color: MATERIAL.redstone },
  logistic: { name: 'Logística', formula: 'C(t) = K / (1 + e^(−r·(t − t0)))', color: MATERIAL.gold },
  logarithmic: { name: 'Logarítmica', formula: 'C(t) = a + b · ln(t + 1)', color: MATERIAL.grassLight },
};

const MODEL_ORDER: ModelKind[] = ['exponential', 'logistic', 'logarithmic'];

const STRATEGY_OPTIONS: { id: StrategyType; label: string; icon: PixelIconName }[] = [
  { id: 'shield', label: 'Cortafuegos Manta', icon: 'shield' },
  { id: 'random', label: 'Al Azar', icon: 'dice' },
  { id: 'none', label: 'Sin Intervención', icon: 'barrier' },
];

/** Fórmula con los números del ajuste */
function fittedFormula(fit: FitResult): string {
  const p = fit.params;
  if (fit.kind === 'exponential') return `C(t) = ${fmt(p.a, 2)} · e^(${fmt(p.b, 3)}·t)`;
  if (fit.kind === 'logistic') return `C(t) = ${fmt(p.K)} / (1 + e^(−${fmt(p.r, 3)}·(t − ${fmt(p.t0, 1)})))`;
  return `C(t) = ${fmt(p.a, 2)} + ${fmt(p.b, 2)} · ln(t + 1)`;
}

/** Explicación en lenguaje simple del modelo detectado */
function interpretation(fit: FitResult, upToDay: number): string {
  const p = fit.params;
  if (fit.kind === 'exponential') {
    const d = doublingTime(p.b);
    return d === null
      ? 'Los contagios no crecen de forma exponencial en este tramo.'
      : `Crecimiento exponencial: sin freno a la vista, los contagios acumulados se duplican cada ${fmt(d, 1)} días.`;
  }
  if (fit.kind === 'logistic') {
    const inflection =
      p.t0 <= upToDay
        ? `La expansión fue más rápida hacia el día ${fmt(p.t0, 1)} y desde entonces se frena`
        : `Aún no llega el día de máxima velocidad (se estima hacia el día ${fmt(p.t0, 1)})`;
    return `Crecimiento logístico (curva en S): ${inflection}. Techo estimado: unas ${fmt(p.K)} personas.`;
  }
  return 'Crecimiento logarítmico: crece rápido al principio y se frena pronto; cada día se suman menos contagios.';
}

export function ExpansionDetector({ result, upToDay, strategy, onStrategyChange, showStatus = false }: ExpansionDetectorProps) {
  const series = result.strategies[strategy].ever_infected.mean;
  const day = Math.min(upToDay, series.length - 1);
  const analysis = useMemo(
    () => analyzeExpansion(series, day, result.params.n_nodes),
    [series, day, result.params.n_nodes],
  );

  // Datos observados y curvas ajustadas en los días analizados
  const chartData = useMemo(
    () =>
      Array.from({ length: day + 1 }, (_, t) => {
        const row: Record<string, number> = { day: t, observed: series[t] ?? 0 };
        for (const f of analysis.fits) row[f.kind] = Math.max(0, f.predict(t));
        return row;
      }),
    [series, day, analysis],
  );

  const best = analysis.best;
  const fitsByKind = Object.fromEntries(analysis.fits.map((f) => [f.kind, f])) as Partial<Record<ModelKind, FitResult>>;

  return (
    <section className="mc-panel space-y-3 p-3" aria-labelledby="expansion-title">
      <div className="mc-panel-dark flex flex-wrap items-start justify-between gap-3 px-3 py-2">
        <div className="flex items-start gap-3">
          <PixelIcon name="book" size={24} />
          <div>
            <p className="mc-label text-[#ede5e2]">Contagios acumulados · días 0 a {day}</p>
            <h3 id="expansion-title" className="mc-title mt-1 text-[14px]">Detector del modelo de expansión</h3>
            <p className="mt-1 max-w-2xl text-[14px] leading-tight text-[#ede5e2]">
              La simulación es un modelo SEIR sobre una red de contactos. Aquí se ajustan tres funciones matemáticas a su curva de contagios para describir qué forma tiene la expansión.
            </p>
          </div>
        </div>
        {onStrategyChange && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Estrategia analizada">
            {STRATEGY_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onStrategyChange(o.id)}
                aria-pressed={strategy === o.id}
                className={`mc-button mc-button-sm ${strategy === o.id ? 'is-active' : ''}`}
              >
                <PixelIcon name={o.icon} size={16} />
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showStatus && <VirusStatusBadge cumulative={series} day={day} />}

      <div className="grid gap-3 lg:grid-cols-5">
        {/* Modelo detectado y su fórmula */}
        <div className="space-y-3 lg:col-span-2">
          <div className="mc-slot-dark p-3" aria-live="polite">
            <p className="mc-label text-[#ede5e2]">Modelo detectado</p>
            {best ? (
              <>
                <p className="mt-2 font-pixel text-[14px]" style={{ color: MODEL_INFO[best.kind].color, textShadow: '2px 2px 0 #000' }}>
                  {MODEL_INFO[best.kind].name}
                </p>
                <p className="mt-2 break-words bg-black px-2 py-1 font-ui text-[15px] text-mc-gold">{fittedFormula(best)}</p>
                <p className="mt-2 text-[14px] leading-tight text-white">{interpretation(best, day)}</p>
                <p className="mt-1 text-[14px] text-[#aba09c]">
                  t = día · C(t) = contagiados acumulados · R² = {fmt(best.r2, 3)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[14px] leading-tight text-white">
                Aún no hay expansión suficiente para ajustar una función (hacen falta al menos 4 días y que los contagios crezcan).
              </p>
            )}
          </div>

          {/* Comparación de los tres modelos */}
          <ul className="space-y-2">
            {MODEL_ORDER.map((kind) => {
              const f = fitsByKind[kind];
              const r2 = f ? Math.max(0, f.r2) : 0;
              const isBest = best?.kind === kind;
              return (
                <li key={kind} className={`${isBest ? 'mc-slot-dark' : 'mc-slot-light'} p-2`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex items-center gap-2 text-[14px] ${isBest ? 'text-white' : 'text-mc-ink'}`}>
                      <span className="h-3.5 w-3.5 border-2 border-black" style={{ background: MODEL_INFO[kind].color }} aria-hidden="true" />
                      {MODEL_INFO[kind].name}
                      {isBest && <span className="mc-chip bg-mc-grass text-white">Mejor ajuste</span>}
                    </span>
                    <span className={`font-pixel text-[10px] ${isBest ? 'text-mc-gold' : 'text-mc-ink'}`}>
                      R² {f ? fmt(f.r2, 3) : '—'}
                    </span>
                  </div>
                  <p className={`mt-1 text-[14px] ${isBest ? 'text-[#ede5e2]' : 'text-mc-muted'}`}>{MODEL_INFO[kind].formula}</p>
                  {/* Barra de bloques con el R² (0 a 1) */}
                  <div className="mt-1 h-2.5 bg-[#262423]">
                    <div
                      className="h-full"
                      style={{
                        width: `${r2 * 100}%`,
                        background: MODEL_INFO[kind].color,
                        backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.35) 2px, transparent 2px)',
                        backgroundSize: '8px 100%',
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Datos de la simulación frente a las curvas ajustadas */}
        <div className="mc-slot-dark p-2 lg:col-span-3">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-2 text-[14px] text-white" aria-label="Leyenda del ajuste">
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 border-2 border-black bg-white" aria-hidden="true" />
              Simulación (datos)
            </li>
            {MODEL_ORDER.filter((k) => fitsByKind[k]).map((k) => (
              <li key={k} className="flex items-center gap-2">
                <svg width="24" height="8" aria-hidden shapeRendering="crispEdges">
                  <line x1="0" y1="4" x2="24" y2="4" stroke={MODEL_INFO[k].color} strokeWidth="4" strokeDasharray={best?.kind === k ? undefined : '4 4'} />
                </svg>
                {MODEL_INFO[k].name}
              </li>
            ))}
          </ul>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 14, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} />
              <XAxis dataKey="day" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
              <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} width={44} />
              <RCTooltip
                cursor={{ stroke: '#ffffff', strokeWidth: 2 }}
                contentStyle={{ background: '#170d19', border: '2px solid #643acb', borderRadius: 0, fontFamily: '"Noto Sans", sans-serif', fontSize: 13, color: '#fff' }}
                labelFormatter={(l) => `Día ${l}`}
                formatter={(v: number, name: string) => [fmt(v, 1), name === 'observed' ? 'Simulación' : MODEL_INFO[name as ModelKind]?.name ?? name]}
              />
              {MODEL_ORDER.filter((k) => fitsByKind[k]).map((k) => (
                <Line
                  key={k}
                  type="linear"
                  dataKey={k}
                  stroke={MODEL_INFO[k].color}
                  strokeWidth={best?.kind === k ? 4 : 2}
                  strokeDasharray={best?.kind === k ? undefined : '4 4'}
                  strokeLinecap="square"
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
              {/* Puntos de la simulación como bloques cuadrados */}
              <Line
                type="linear"
                dataKey="observed"
                stroke="transparent"
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; index?: number }) => (
                  <rect key={`p-${props.index}`} x={(props.cx ?? 0) - 3} y={(props.cy ?? 0) - 3} width={6} height={6} fill="#ffffff" stroke="#000000" strokeWidth={1} />
                )}
                activeDot={{ r: 4, fill: '#ffffff', stroke: '#000000' }}
              />
              {best?.kind === 'logistic' && best.params.t0 <= day && (
                <ReferenceLine
                  x={Math.round(best.params.t0)}
                  stroke={MATERIAL.gold}
                  strokeDasharray="4 4"
                  label={{ value: 'inflexión', position: 'top', fill: MATERIAL.gold, fontSize: 8, fontFamily: FONT_PIXEL }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
