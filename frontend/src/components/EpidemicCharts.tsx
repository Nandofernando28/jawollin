import React from 'react';
import { ComposedChart, BarChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RCTooltip, ResponsiveContainer, Cell } from 'recharts';
import type { SimulationResponse } from '../types/simulation';

interface TCPayload { name: string; value: number; color: string; }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TCPayload[]; label?: string | number; }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#e3e4e8] bg-white px-3 py-2.5 text-xs shadow-lg">
      <div className="mb-1.5 font-semibold text-[#111a4a]">Día {label}</div>
      {payload
        .filter((p) => p.name && !p.name.startsWith('_'))
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="text-[#7c7f88]">{p.name}:</span>
            <span className="font-mono font-bold text-[#111a4a]">{Math.round(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

interface EpidemicChartsProps { result: SimulationResponse; }

export function EpidemicCharts({ result }: EpidemicChartsProps) {
  const { strategies: s, params, summary_kpis: k } = result;
  const days = params.days;

  const curveData = Array.from({ length: days + 1 }, (_, i) => ({
    day: i,
    'Sin Intervención': s.none.zombie.mean[i] ?? 0,
    'Al Azar': s.random.zombie.mean[i] ?? 0,
    'Cortafuegos Manta': s.shield.zombie.mean[i] ?? 0,
    _noneLo: s.none.zombie.p10[i] ?? 0,
    _noneBand: (s.none.zombie.p90[i] ?? 0) - (s.none.zombie.p10[i] ?? 0),
    _shLo: s.shield.zombie.p10[i] ?? 0,
    _shBand: (s.shield.zombie.p90[i] ?? 0) - (s.shield.zombie.p10[i] ?? 0),
  }));

  const barData = [
    { name: 'Sin Interv.', total: k.total_infected_none, fill: '#ec652b' },
    { name: 'Al Azar', total: k.total_infected_random, fill: '#1e4199' },
    { name: 'Cortafuegos', total: k.total_infected_shield, fill: '#167e6c' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Curvas</p>
            <h3 className="mt-2 text-xl font-semibold text-[#111a4a]">Infectados activos por día</h3>
            <p className="mt-1 font-mono text-[11px] text-[#7c7f88]">
              Semilla #{params.seed} · {params.monte_carlo_runs} MC · {result.execution_time_ms}ms
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-[#3b3e47]">
            {[
              { color: '#ec652b', label: 'Sin Intervención', dash: '6 4' },
              { color: '#1e4199', label: 'Al Azar', dash: '3 3' },
              { color: '#167e6c', label: 'Cortafuegos Manta' },
            ].map(({ color, label, dash }) => (
              <span key={label} className="flex items-center gap-1.5">
                <svg width="22" height="8" aria-hidden>
                  <line x1="0" y1="4" x2="22" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} />
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={curveData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gNone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec652b" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#ec652b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gShield" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#167e6c" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#167e6c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e4e8" />
            <XAxis dataKey="day" tick={{ fill: '#7c7f88', fontSize: 11 }} label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fill: '#7c7f88', fontSize: 11 }} />
            <YAxis tick={{ fill: '#7c7f88', fontSize: 11 }} width={40} />
            <RCTooltip content={<ChartTooltip />} />
            <Area dataKey="_noneLo" stroke="none" fill="none" name="_noneLo" legendType="none" />
            <Area dataKey="_noneBand" stroke="none" fill="url(#gNone)" name="_noneBand" legendType="none" stackId="a" />
            <Area dataKey="_shLo" stroke="none" fill="none" name="_shLo" legendType="none" />
            <Area dataKey="_shBand" stroke="none" fill="url(#gShield)" name="_shBand" legendType="none" stackId="b" />
            <Line type="monotone" dataKey="Sin Intervención" stroke="#ec652b" strokeWidth={2} dot={false} strokeDasharray="6 4" />
            <Line type="monotone" dataKey="Al Azar" stroke="#1e4199" strokeWidth={2} dot={false} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="Cortafuegos Manta" stroke="#167e6c" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3 rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-[#111a4a]">Total infectados acumulados</h3>
        <p className="text-[11px] text-[#7c7f88]">Al día {days}</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e4e8" />
            <XAxis dataKey="name" tick={{ fill: '#7c7f88', fontSize: 10 }} />
            <YAxis tick={{ fill: '#7c7f88', fontSize: 11 }} width={38} />
            <RCTooltip content={<ChartTooltip />} />
            <Bar dataKey="total" name="Infectados" radius={[5, 5, 0, 0]}>
              {barData.map((e) => <Cell key={e.name} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-[#d9f5ec] bg-[#f3faf8] p-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#167e6c]">Vacunas desperdiciadas</p>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold text-[#167e6c]">
            {k.zero_wasted_vaccines_verified ? '0%' : `${k.wasted_vaccines_count}`}
          </span>
          <span className="text-xs text-[#7c7f88]">en Cortafuegos Manta</span>
        </div>
        <p className="mt-1 text-[11px] text-[#3b3e47]">
          Filtro estricto — solo se vacunan nodos SANOS. Línea azar: ~24% en infectados.
        </p>
      </div>
    </div>
  );
}
