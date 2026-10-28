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

// Mismos colores que el selector de estrategia de la consola
const STRATEGIES: { id: StrategyType; label: string; color: string; dash?: string }[] = [
  { id: 'none', label: 'Sin Intervención', color: '#ec652b', dash: '6 4' },
  { id: 'random', label: 'Al Azar', color: '#1e4199', dash: '3 3' },
  { id: 'shield', label: 'Cortafuegos Manta', color: '#167e6c' },
];

// Colores oficiales de los estados (Notas de la Fase 6)
const STATES = [
  { key: 'sano', label: 'Sanos', color: '#10b981' },
  { key: 'mordido', label: 'Mordidos', color: '#f59e0b' },
  { key: 'zombie', label: 'Zombies', color: '#ef4444' },
  { key: 'aislado', label: 'Aislados', color: '#a855f7' },
  { key: 'inmune', label: 'Inmunes', color: '#06b6d4' },
] as const;

const DEFENSES = [
  { key: 'vacunas', label: 'Vacunas', color: '#167e6c' },
  { key: 'brigadas', label: 'Brigadas', color: '#1e4199' },
  { key: 'cierres', label: 'Cierres de hubs', color: '#ec652b' },
] as const;

type Metric = 'zombie' | 'ever_infected';

const METRICS: { id: Metric; label: string; title: string }[] = [
  { id: 'zombie', label: 'Zombies activos', title: 'Zombies activos por día' },
  { id: 'ever_infected', label: 'Acumulado', title: 'Contagiados acumulados' },
];

const AXIS = { tick: { fill: '#7c7f88', fontSize: 11 } };

interface CurveRow {
  day: number;
  [key: string]: number;
}

/** Tooltip de las curvas: media y rango P10–P90 de cada estrategia en el día. */
function CurveTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: CurveRow }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#e3e4e8] bg-white px-3 py-2.5 text-xs shadow-lg">
      <div className="mb-1.5 font-semibold text-[#111a4a]">Día {label}</div>
      {STRATEGIES.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
          <span className="text-[#7c7f88]">{s.label}:</span>
          <span className="font-mono font-bold text-[#111a4a]">{Math.round(row[`${s.id}_mean`])}</span>
          <span className="font-mono text-[#7c7f88]">
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
    <div className="rounded-lg border border-[#e3e4e8] bg-white px-3 py-2.5 text-xs shadow-lg">
      <div className="mb-1.5 font-semibold text-[#111a4a]">Día {label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="text-[#7c7f88]">{p.name}:</span>
          <span className="font-mono font-bold text-[#111a4a]">{unit}{Math.round(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function Card({ kicker, title, subtitle, children, action }: {
  kicker?: string; title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {kicker && <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">{kicker}</p>}
          <h3 className="mt-1 text-xl font-semibold text-[#111a4a]">{title}</h3>
          {subtitle && <p className="mt-1 text-[11px] text-[#7c7f88]">{subtitle}</p>}
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

  const dayLine = <ReferenceLine x={currentDay} stroke="#111a4a" strokeDasharray="4 3" label={{ value: `Día ${currentDay}`, position: 'top', fill: '#111a4a', fontSize: 10 }} />;
  const current = METRICS.find((m) => m.id === metric)!;

  return (
    <div className="space-y-4">
      <Card
        kicker="Curvas"
        title={current.title}
        subtitle={`Media y rango P10–P90 de ${params.monte_carlo_runs} simulaciones · semilla ${params.seed}`}
        action={
          <div className="flex rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-0.5" role="group" aria-label="Métrica de las curvas">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                aria-pressed={metric === m.id}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  metric === m.id ? 'bg-[#111a4a] text-white' : 'text-[#7c7f88] hover:text-[#111a4a]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex flex-wrap gap-3 text-[11px] text-[#3b3e47]">
          {STRATEGIES.map(({ id, color, label, dash }) => (
            <span key={id} className="flex items-center gap-1.5">
              <svg width="22" height="8" aria-hidden>
                <line x1="0" y1="4" x2="22" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} />
              </svg>
              {label}
            </span>
          ))}
          <span className="text-[#7c7f88]">· Zona sombreada: rango P10–P90</span>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={curveData} margin={{ top: 14, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e4e8" />
            <XAxis dataKey="day" {...AXIS} />
            <YAxis {...AXIS} width={40} />
            <RCTooltip content={<CurveTooltip />} />
            {STRATEGIES.map((st) => (
              <React.Fragment key={`band-${st.id}`}>
                <Area dataKey={`${st.id}_bandBase`} stackId={`band-${st.id}`} stroke="none" fill="transparent" isAnimationActive={false} legendType="none" />
                <Area dataKey={`${st.id}_bandWidth`} stackId={`band-${st.id}`} stroke="none" fill={st.color} fillOpacity={0.14} isAnimationActive={false} legendType="none" />
              </React.Fragment>
            ))}
            {STRATEGIES.map((st) => (
              <Line
                key={`line-${st.id}`}
                type="monotone"
                dataKey={`${st.id}_mean`}
                name={st.label}
                stroke={st.color}
                strokeWidth={st.id === 'shield' ? 2.5 : 2}
                strokeDasharray={st.dash}
                dot={false}
              />
            ))}
            {dayLine}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card
        kicker="Cortafuegos Manta"
        title="Estados de la población por día"
        subtitle="Media de las simulaciones: cómo se reparte la población entre los 5 estados."
      >
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={stateData} margin={{ top: 14, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e4e8" />
            <XAxis dataKey="day" {...AXIS} />
            <YAxis {...AXIS} width={40} domain={[0, params.n_nodes]} allowDataOverflow />
            <RCTooltip content={<SimpleTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {STATES.map((st) => (
              <Area key={st.key} type="monotone" dataKey={st.key} name={st.label} stackId="states" stroke={st.color} fill={st.color} fillOpacity={0.55} />
            ))}
            {dayLine}
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card
        kicker="Cortafuegos Manta"
        title="Gasto diario por defensa"
        subtitle={`USD por día (promedio). El presupuesto llega a razón de $${params.daily_budget.toLocaleString()} por día.`}
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={spendData} margin={{ top: 14, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e4e8" />
            <XAxis dataKey="day" {...AXIS} />
            <YAxis {...AXIS} width={44} />
            <RCTooltip content={<SimpleTooltip unit="$" />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {DEFENSES.map((d) => (
              <Bar key={d.key} dataKey={d.key} name={d.label} stackId="spend" fill={d.color} />
            ))}
            {dayLine}
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
