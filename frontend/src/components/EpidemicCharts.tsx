import React from 'react';
import {
  ComposedChart, LineChart, BarChart,
  Line, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RCTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { SimulationResponse } from '../types/simulation';

// ── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
      <div className="font-bold text-slate-300 mb-1.5">Día {label}</div>
      {payload
        .filter((p) => p.name && !p.name.includes('Band'))
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-mono font-bold">{Math.round(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface EpidemicChartsProps {
  result: SimulationResponse;
}

// ── Component ────────────────────────────────────────────────────────────────

export function EpidemicCharts({ result }: EpidemicChartsProps) {
  const { strategies: s, params } = result;
  const days = params.days;

  // Gráfico A — curvas diarias de zombies activos
  const curveData = Array.from({ length: days + 1 }, (_, i) => ({
    day: i,
    'Sin Intervención': s.none.zombie.mean[i] ?? 0,
    'Al Azar':          s.random.zombie.mean[i] ?? 0,
    'Cortafuegos Manta':s.shield.zombie.mean[i] ?? 0,
    // Bandas P10-P90
    noneHi:    s.none.zombie.p90[i] ?? 0,
    noneLo:    s.none.zombie.p10[i] ?? 0,
    shieldHi:  s.shield.zombie.p90[i] ?? 0,
    shieldLo:  s.shield.zombie.p10[i] ?? 0,
    // Diferencia para área sombreada (Recharts Area necesita base + size)
    noneBand:  (s.none.zombie.p90[i] ?? 0) - (s.none.zombie.p10[i] ?? 0),
    shieldBand:(s.shield.zombie.p90[i] ?? 0) - (s.shield.zombie.p10[i] ?? 0),
  }));

  // Gráfico B — barras de totales acumulados
  const k = result.summary_kpis;
  const barData = [
    { name: 'Sin Intervención', total: k.total_infected_none,   fill: '#EF4444' },
    { name: 'Al Azar',          total: k.total_infected_random, fill: '#F59E0B' },
    { name: 'Cortafuegos Manta',total: k.total_infected_shield, fill: '#10B981' },
  ];

  const savedData = [
    { name: 'vs. Sin Interv.',  saved: k.lives_saved_vs_none,   fill: '#10B981' },
    { name: 'vs. Al Azar',      saved: k.lives_saved_vs_random, fill: '#3B82F6' },
  ];

  return (
    <div className="space-y-4">

      {/* ── Gráfico A — Curvas Epidemiológicas ─────────────────────────── */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              Zombies Activos por Día — Comparativa 3 Estrategias
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Semilla #{params.seed} · {params.monte_carlo_runs} corridas MC
              · Sombreado P10–P90 · {result.execution_time_ms}ms
              {result.cache_hit ? ' · ✓ cache' : ''}
            </p>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[11px]">
            {[
              { color: '#EF4444', label: 'Sin Intervención',  dash: '5 3' },
              { color: '#F59E0B', label: 'Al Azar',           dash: '3 3' },
              { color: '#10B981', label: 'Cortafuegos Manta', dash: undefined },
            ].map(({ color, label, dash }) => (
              <span key={label} className="flex items-center gap-1.5 text-slate-300">
                <svg width="22" height="8" aria-hidden="true">
                  <line x1="0" y1="4" x2="22" y2="4"
                    stroke={color} strokeWidth="2"
                    strokeDasharray={dash}
                  />
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={curveData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#64748b', fontSize: 11 }}
              label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} width={40} />
            <RCTooltip content={<CustomTooltip />} />

            {/* P10–P90 banda Sin Intervención (p90 - p10 stacked desde p10) */}
            <Area
              dataKey="noneLo" stroke="none" fill="none"
              name="noneBandLo" legendType="none"
            />
            <Area
              dataKey="noneBand" stroke="none" fill="#EF4444" fillOpacity={0.07}
              name="noneBandHi" legendType="none" stackId="none"
            />
            {/* P10–P90 banda Cortafuegos */}
            <Area
              dataKey="shieldLo" stroke="none" fill="none"
              name="shieldBandLo" legendType="none"
            />
            <Area
              dataKey="shieldBand" stroke="none" fill="#10B981" fillOpacity={0.10}
              name="shieldBandHi" legendType="none" stackId="shield"
            />

            {/* Líneas principales */}
            <Line
              type="monotone" dataKey="Sin Intervención"
              stroke="#EF4444" strokeWidth={2} dot={false} strokeDasharray="6 4"
            />
            <Line
              type="monotone" dataKey="Al Azar"
              stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="3 3"
            />
            <Line
              type="monotone" dataKey="Cortafuegos Manta"
              stroke="#10B981" strokeWidth={2.5} dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Gráfico B — Barras comparativas ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Total infectados */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Total Infectados Acumulados</h3>
          <p className="text-[11px] text-slate-500">Al final del día {days}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} width={38} />
              <RCTooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Total infectados" radius={[5, 5, 0, 0]}>
                {barData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vidas salvadas + tarjeta vacunas */}
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Vidas Salvadas por Cortafuegos Manta</h3>
            <p className="text-[11px] text-slate-500">Nodos que no se infectaron gracias a la estrategia</p>
            <ResponsiveContainer width="100%" height={105}>
              <BarChart data={savedData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} width={38} />
                <RCTooltip content={<CustomTooltip />} />
                <Bar dataKey="saved" name="Vidas salvadas" radius={[5, 5, 0, 0]}>
                  {savedData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tarjeta vacunas */}
          <div className="rounded-xl bg-emerald-950/25 border border-emerald-500/25 p-4">
            <div className="text-xs font-bold text-emerald-300 mb-1">
              Vacunas Desperdiciadas
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-emerald-300">
                {k.zero_wasted_vaccines_verified ? '0%' : `${k.wasted_vaccines_count}`}
              </span>
              <span className="text-xs text-emerald-500">en Cortafuegos Manta</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              ✓ Filtro estricto — solo se vacunan nodos <strong className="text-white">SANOS</strong>
              <br />
              Línea azar: ~24% aplicadas en nodos infectados
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
