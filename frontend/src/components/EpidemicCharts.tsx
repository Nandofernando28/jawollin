import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RCTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PercentileBand, SimulationResponse, StrategyType } from '../types/simulation';
import { PixelIcon, type PixelIconName } from './PixelIcon';
import {
  AXIS_LINE,
  AXIS_TICK,
  FONT_PIXEL,
  FONT_RETRO,
  GRID_STROKE,
  MATERIAL,
  STATE_COLOR,
  STATE_LABEL,
  STRATEGY_COLOR,
} from '../theme/pixelTheme';

// Colores de materiales del tema pixel: Escudo diamante, azar oro, sin intervención redstone
const STRATEGIES: { id: StrategyType; label: string; color: string; dash?: string }[] = [
  { id: 'none', label: 'Sin Intervención', color: STRATEGY_COLOR.none, dash: '8 4' },
  { id: 'random', label: 'Al Azar', color: STRATEGY_COLOR.random, dash: '4 4' },
  { id: 'shield', label: 'Cortafuegos Manta', color: STRATEGY_COLOR.shield },
];

// Estados con los mismos colores que el mapa y los KPI
const STATES = [
  { key: 'sano', label: STATE_LABEL.sano, color: STATE_COLOR.sano },
  { key: 'mordido', label: STATE_LABEL.mordido, color: STATE_COLOR.mordido },
  { key: 'zombie', label: STATE_LABEL.zombie, color: STATE_COLOR.zombie },
  { key: 'aislado', label: STATE_LABEL.aislado, color: STATE_COLOR.aislado },
  { key: 'inmune', label: STATE_LABEL.inmune, color: STATE_COLOR.inmune },
] as const;

// Cada defensa se dibuja como un pilar de bloques de un material
const DEFENSES = [
  { key: 'vacunas', label: 'Vacunas', color: MATERIAL.diamond, light: '#b9f3f8', dark: '#0f6f78' },
  { key: 'brigadas', label: 'Brigadas', color: MATERIAL.dirt, light: '#b9824e', dark: '#4a2e14' },
  { key: 'cierres', label: 'Cierres de hubs', color: MATERIAL.stone, light: '#c6c6c6', dark: '#4a4a4a' },
] as const;

type Metric = 'zombie' | 'ever_infected';

const METRICS: { id: Metric; label: string; title: string }[] = [
  { id: 'zombie', label: 'Zombies activos', title: 'Zombies activos por día' },
  { id: 'ever_infected', label: 'Acumulado', title: 'Contagiados acumulados' },
];

const AXIS = { tick: AXIS_TICK, axisLine: AXIS_LINE, tickLine: AXIS_LINE };

// Leyendas de Recharts en texto pixel, con muestras cuadradas
const LEGEND_PROPS = {
  iconType: 'square' as const,
  iconSize: 12,
  wrapperStyle: { fontFamily: FONT_RETRO, fontSize: 18, color: '#ffffff', paddingTop: 6 },
};

interface CurveRow {
  day: number;
  [key: string]: number;
}

/** Tooltip de las curvas: media y rango P10–P90 de cada estrategia en el día. */
function CurveTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: CurveRow }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="mc-tooltip px-3 py-2">
      <div className="mc-label mb-2 text-mc-gold">Día {label}</div>
      {STRATEGIES.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 border-2 border-black" style={{ background: s.color }} />
          <span className="text-[#d8d8d8]">{s.label}:</span>
          <span className="text-white">{Math.round(row[`${s.id}_mean`])}</span>
          <span className="text-[#a8a8a8]">
            (P10–P90: {Math.round(row[`${s.id}_p10`])}–{Math.round(row[`${s.id}_p90`])})
          </span>
        </div>
      ))}
    </div>
  );
}

/** Tooltip simple para las gráficas de estados y gasto. */
function SimpleTooltip({ active, payload, label, unit = '' }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number; unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="mc-tooltip px-3 py-2">
      <div className="mc-label mb-2 text-mc-gold">Día {label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 border-2 border-black" style={{ background: p.color }} />
          <span className="text-[#d8d8d8]">{p.name}:</span>
          <span className="text-white">{unit}{Math.round(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/** Tarjeta con marco de cofre: franja de título oscura y la gráfica en una casilla hundida */
function Card({ kicker, title, subtitle, children, action, icon }: {
  kicker?: string; title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; icon: PixelIconName;
}) {
  return (
    <div className="mc-panel space-y-3 p-3">
      <div className="mc-panel-dark flex flex-wrap items-start justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 items-start gap-3">
          <PixelIcon name={icon} size={24} />
          <div className="min-w-0">
            {kicker && <p className="mc-label text-[#d8d8d8]">{kicker}</p>}
            <h3 className="mc-title mt-1 text-[16px]">{title}</h3>
            {subtitle && <p className="mt-1 text-[18px] leading-tight text-[#d8d8d8]">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface EpidemicChartsProps {
  result: SimulationResponse;
  /** Día mostrado en el mapa: se marca con una línea vertical en todas las gráficas */
  currentDay: number;
}

export function EpidemicCharts({ result, currentDay }: EpidemicChartsProps) {
  const [metric, setMetric] = useState<Metric>('zombie');
  const { strategies: s, params } = result;
  const days = Array.from({ length: params.days + 1 }, (_, i) => i);

  // Cada banda P10–P90 es un Area apilado: base = p10 (invisible) + grosor = p90 − p10.
  const curveData: CurveRow[] = days.map((day) => {
    const row: CurveRow = { day };
    for (const st of STRATEGIES) {
      const band: PercentileBand = s[st.id][metric];
      row[`${st.id}_mean`] = band.mean[day] ?? 0;
      row[`${st.id}_p10`] = band.p10[day] ?? 0;
      row[`${st.id}_p90`] = band.p90[day] ?? 0;
      row[`${st.id}_bandBase`] = band.p10[day] ?? 0;
      row[`${st.id}_bandWidth`] = (band.p90[day] ?? 0) - (band.p10[day] ?? 0);
    }
    return row;
  });

  const stateData = days.map((day) => {
    const row: Record<string, number> = { day };
    for (const st of STATES) row[st.key] = s.shield[st.key].mean[day] ?? 0;
    return row;
  });

  const spendData = days.map((day) => ({
    day,
    vacunas: (s.shield.vaccines_applied[day] ?? 0) * params.vaccine_cost,
    brigadas: (s.shield.brigades_deployed[day] ?? 0) * params.brigade_cost,
    cierres: (s.shield.hubs_closed[day] ?? 0) * params.hub_closure_cost,
  }));

  // Línea del día: sólida y amarilla, con la etiqueta en letra pixel
  const dayLine = (
    <ReferenceLine
      x={currentDay}
      stroke={MATERIAL.titleGold}
      strokeWidth={2}
      label={{ value: `Día ${currentDay}`, position: 'top', fill: MATERIAL.titleGold, fontSize: 8, fontFamily: FONT_PIXEL }}
    />
  );
  const current = METRICS.find((m) => m.id === metric)!;
  // Cursor de las gráficas: franja sólida, sin transparencias difuminadas
  const lineCursor = { stroke: '#ffffff', strokeWidth: 2 };
  const barCursor = { fill: '#3a3a3a' };

  return (
    <div className="space-y-6">
      <Card
        icon="zombie"
        kicker="Curvas"
        title={current.title}
        subtitle={`Media y rango P10–P90 de ${params.monte_carlo_runs} simulaciones · semilla ${params.seed}`}
        action={
          <div className="flex gap-2" role="group" aria-label="Métrica de las curvas">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                aria-pressed={metric === m.id}
                className={`mc-button mc-button-sm ${metric === m.id ? 'is-active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="mc-slot-dark p-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-2 text-[18px] text-white">
            {STRATEGIES.map(({ id, color, label, dash }) => (
              <span key={id} className="flex items-center gap-2">
                <svg width="24" height="8" aria-hidden shapeRendering="crispEdges">
                  <line x1="0" y1="4" x2="24" y2="4" stroke={color} strokeWidth="4" strokeDasharray={dash} />
                </svg>
                {label}
              </span>
            ))}
            <span className="text-[#a8a8a8]">· Zona sombreada: rango P10–P90</span>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={curveData} margin={{ top: 18, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis {...AXIS} width={44} />
              <RCTooltip content={<CurveTooltip />} cursor={lineCursor} />
              {STRATEGIES.map((st) => (
                <React.Fragment key={`band-${st.id}`}>
                  <Area type="stepAfter" dataKey={`${st.id}_bandBase`} stackId={`band-${st.id}`} stroke="none" fill="transparent" isAnimationActive={false} legendType="none" />
                  <Area type="stepAfter" dataKey={`${st.id}_bandWidth`} stackId={`band-${st.id}`} stroke="none" fill={st.color} fillOpacity={0.22} isAnimationActive={false} legendType="none" />
                </React.Fragment>
              ))}
              {STRATEGIES.map((st) => (
                <Line
                  key={`line-${st.id}`}
                  type="stepAfter"
                  dataKey={`${st.id}_mean`}
                  name={st.label}
                  stroke={st.color}
                  strokeWidth={st.id === 'shield' ? 4 : 3}
                  strokeDasharray={st.dash}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#000000', fill: st.color }}
                  isAnimationActive={false}
                />
              ))}
              {dayLine}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        icon="heart"
        kicker="Cortafuegos Manta"
        title="Estados de la población por día"
        subtitle="Avance día a día (media de las simulaciones): cómo se reparte la población entre los estados."
      >
        <div className="mc-slot-dark p-2">
          {/* Leyenda fija de los estados, con su color */}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-2 text-[18px] text-white" aria-label="Colores de los estados">
            {STATES.map((st) => (
              <li key={st.key} className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-black" style={{ background: st.color }} aria-hidden="true" />
                {st.label}
              </li>
            ))}
          </ul>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stateData} margin={{ top: 18, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis {...AXIS} width={44} domain={[0, params.n_nodes]} allowDataOverflow />
              <RCTooltip content={<SimpleTooltip />} cursor={lineCursor} />
              {STATES.map((st) => (
                <Area
                  key={st.key}
                  type="stepAfter"
                  dataKey={st.key}
                  name={st.label}
                  stackId="states"
                  stroke={st.color}
                  strokeWidth={2}
                  fill={st.color}
                  fillOpacity={0.85}
                  isAnimationActive={false}
                />
              ))}
              {dayLine}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        icon="coin"
        kicker="Cortafuegos Manta"
        title="Gasto diario por defensa"
        subtitle={`USD por día (promedio). El presupuesto llega a razón de $${params.daily_budget.toLocaleString()} por día.`}
      >
        <div className="mc-slot-dark p-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendData} margin={{ top: 18, right: 8, left: -4, bottom: 0 }} barCategoryGap={1}>
              {/* Textura de bloque de cada material: se repite en vertical y la barra parece un pilar de bloques apilados */}
              <defs>
                {DEFENSES.map((d) => (
                  <pattern key={d.key} id={`mc-block-${d.key}`} width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill={d.color} />
                    <rect width="8" height="1" fill={d.light} />
                    <rect width="1" height="8" fill={d.light} />
                    <rect y="7" width="8" height="1" fill={d.dark} />
                    <rect x="7" width="1" height="8" fill={d.dark} />
                  </pattern>
                ))}
              </defs>
              <CartesianGrid stroke={GRID_STROKE} />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis {...AXIS} width={48} />
              <RCTooltip content={<SimpleTooltip unit="$" />} cursor={barCursor} />
              <Legend {...LEGEND_PROPS} />
              {DEFENSES.map((d) => (
                <Bar
                  key={d.key}
                  dataKey={d.key}
                  name={d.label}
                  stackId="spend"
                  fill={`url(#mc-block-${d.key})`}
                  stroke="#000000"
                  strokeWidth={1}
                  radius={0}
                  isAnimationActive={false}
                />
              ))}
              {dayLine}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
