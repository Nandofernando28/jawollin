import React from 'react';
import {
  ComposedChart, BarChart,
  Line, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RCTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { SimulationResponse } from '../types/simulation';

// ── Custom tooltip ────────────────────────────────────────────────────────────

interface TCPayload { name: string; value: number; color: string; }

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: TCPayload[]; label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
      <div className="font-semibold text-slate-300 mb-1.5">Día {label}</div>
      {payload
        .filter((p) => p.name && !p.name.startsWith('_'))
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-mono font-bold">{Math.round(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EpidemicChartsProps { result: SimulationResponse; }

export function EpidemicCharts({ result }: EpidemicChartsProps) {
  const { strategies: s, params, summary_kpis: k } = result;
  const days = params.days;

  const curveData = Array.from({ length: days + 1 }, (_, i) => ({
    day: i,
    'Sin Intervención':  s.none.zombie.mean[i]   ?? 0,
    'Al Azar':           s.random.zombie.mean[i] ?? 0,
    'Cortafuegos Manta': s.shield.zombie.mean[i] ?? 0,
    _noneLo:   s.none.zombie.p10[i]   ?? 0,
    _noneBand: (s.none.zombie.p90[i] ?? 0) - (s.none.zombie.p10[i] ?? 0),
    _shLo:     s.shield.zombie.p10[i] ?? 0,
    _shBand:   (s.shield.zombie.p90[i] ?? 0) - (s.shield.zombie.p10[i] ?? 0),
  }));

  const barData = [
    { name: 'Sin Interv.', total: k.total_infected_none,   fill: '#f43f5e' },
    { name: 'Al Azar',     total: k.total_infected_random, fill: '#f59e0b' },
    { name: 'Cortafuegos', total: k.total_infected_shield, fill: '#10b981' },
  ];

  return (
    <div className="space-y-4">

      {/* ── Curvas epidemiológicas ─────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Infectados Activos por Día</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Semilla #{params.seed} · {params.monte_carlo_runs} MC · {result.execution_time_ms}ms
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px]">
            {[
              { color: '#f43f5e', label: 'Sin Intervención', dash: '6 4' },
              { color: '#f59e0b', label: 'Al Azar',          dash: '3 3' },
              { color: '#10b981', label: 'Cortafuegos Manta' },
            ].map(({ color, label, dash }) => (
              <span key={label} className="flex items-center gap-1.5 text-slate-300">
                <svg width="22" height="8" aria-hidden>
                  <line x1="0" y1="4" x2="22" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} />
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={curveData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gNone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gShield" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fill: '#475569', fontSize: 11 }} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} width={40} />
            <RCTooltip content={<ChartTooltip />} />

            {/* Bandas P10-P90 */}
            <Area dataKey="_noneLo"   stroke="none" fill="none"           name="_noneLo"   legendType="none" />
            <Area dataKey="_noneBand" stroke="none" fill="url(#gNone)"    name="_noneBand" legendType="none" stackId="a" />
            <Area dataKey="_shLo"     stroke="none" fill="none"           name="_shLo"     legendType="none" />
            <Area dataKey="_shBand"   stroke="none" fill="url(#gShield)"  name="_shBand"   legendType="none" stackId="b" />

            <Line type="monotone" dataKey="Sin Intervención"  stroke="#f43f5e" strokeWidth={2}   dot={false} strokeDasharray="6 4" />
            <Line type="monotone" dataKey="Al Azar"           stroke="#f59e0b" strokeWidth={2}   dot={false} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="Cortafuegos Manta" stroke="#10b981" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Barras comparativas ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Total Infectados Acumulados</h3>
        <p className="text-[11px] text-slate-500">Al día {days}</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} width={38} />
            <RCTooltip content={<ChartTooltip />} />
            <Bar dataKey="total" name="Infectados" radius={[5, 5, 0, 0]}>
              {barData.map((e) => <Cell key={e.name} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tarjeta vacunas ───────────────────────────────────── */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4">
        <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          Vacunas Desperdiciadas
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono text-emerald-300">
            {k.zero_wasted_vaccines_verified ? '0%' : `${k.wasted_vaccines_count}`}
          </span>
          <span className="text-xs text-emerald-600">en Cortafuegos Manta</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Filtro estricto — solo se vacunan nodos <strong className="text-slate-300">SANOS</strong>.
          Línea azar: ~24% en infectados.
        </p>
      </div>
    </div>
  );
}
