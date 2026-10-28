import React from 'react';
import { TrendingDown, Shuffle, Activity, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import type { SimulationResponse } from '../types/simulation';
import { Tooltip } from './Tooltip';
import { fmt } from '../utils/format';

// Población de Manta usada para escalar la muestra (mismo factor que el boletín del backend)
const MANTA_POPULATION = 271_000;


interface KpiCardsProps {
  result: SimulationResponse;
}

export function KpiCards({ result }: KpiCardsProps) {
  const k = result.summary_kpis;
  const p = result.params;
  const scale = MANTA_POPULATION / p.n_nodes;
  const people = (v: number) => fmt(v * scale);

  // Costo por contagio evitado frente al azar, en la escala de la MUESTRA: el presupuesto
  // es el de la muestra, así que dividirlo entre contagios escalados a Manta daría un
  // costo sin sentido (centavos). Es el mismo valor que usa el boletín del backend.
  const costPerAvoided = k.lives_saved_vs_random > 0 ? k.cost_per_life_saved_vs_random : null;

  const cards = [
    {
      icon: <TrendingDown className="h-4 w-4" />,
      iconBg: 'bg-[#ecfdf7] text-[#167e6c]',
      label: 'Contagios evitados',
      tooltip: `Personas que no se contagian con Cortafuegos Manta frente a no intervenir. La muestra de ${fmt(p.n_nodes)} personas se escala a los ${fmt(MANTA_POPULATION)} habitantes de Manta. El rango P10–P90 sale de las ${p.monte_carlo_runs} simulaciones.`,
      value: `+${people(k.lives_saved_vs_none)}`,
      unit: 'hab.',
      valueClass: 'text-[#167e6c]',
      sub: `${fmt(k.lives_saved_vs_none_pct, 1)}% menos que sin intervenir · ${fmt(k.lives_saved_vs_none)} en la muestra`,
      range: `Rango P10–P90: ${people(k.lives_saved_vs_none_p10)} a ${people(k.lives_saved_vs_none_p90)} hab.`,
    },
    {
      icon: <Shuffle className="h-4 w-4" />,
      iconBg: 'bg-[#eef2fb] text-[#1e4199]',
      label: 'Frente a actuar al azar',
      tooltip: 'Contagios evitados frente a gastar el mismo presupuesto, con la misma información, eligiendo acciones al azar. Es lo que aporta elegir bien.',
      value: `+${people(k.lives_saved_vs_random)}`,
      unit: 'hab.',
      valueClass: 'text-[#1e4199]',
      sub: `${fmt(k.lives_saved_vs_random_pct, 1)}% menos que el azar · ${fmt(k.lives_saved_vs_random)} en la muestra`,
      range: `Rango P10–P90: ${people(k.lives_saved_vs_random_p10)} a ${people(k.lives_saved_vs_random_p90)} hab.`,
    },
    {
      icon: <Activity className="h-4 w-4" />,
      iconBg: 'bg-[#fff3ef] text-[#ec652b]',
      label: 'Pico de zombies',
      tooltip: 'Máximo de zombies activos a la vez (media de las simulaciones). Un pico más bajo significa menos casos simultáneos que atender.',
      value: `−${fmt(k.peak_reduction_vs_none_pct, 1)}%`,
      unit: 'vs. sin intervenir',
      valueClass: 'text-[#111a4a]',
      sub: `Pico en la muestra: ${fmt(k.peak_zombies_shield, 1)} personas con el Escudo`,
      range: `Sin intervenir: ${fmt(k.peak_zombies_none, 1)} · Al azar: ${fmt(k.peak_zombies_random, 1)}`,
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      iconBg: 'bg-[#fffaf2] text-[#ec652b]',
      label: 'Gasto ejecutado',
      tooltip: `Gasto total del Escudo en vacunas, brigadas y cierres de hubs durante ${p.days} días. El costo por contagio evitado divide ese gasto entre los contagios evitados frente al azar en la muestra de ${fmt(p.n_nodes)} personas (el presupuesto es el de la muestra).`,
      value: `$${fmt(k.total_budget_spent)}`,
      unit: `de $${fmt(p.total_budget)}`,
      valueClass: 'text-[#111a4a]',
      sub: `${fmt(k.total_vaccines_used)} dosis · ${fmt(k.total_brigades_used)} brigadas · ${fmt(k.total_hub_days_closed, 1)} días-hub`,
      range: costPerAvoided === null
        ? 'No evita contagios frente al azar con estas condiciones'
        : `$${fmt(costPerAvoided)} por contagio evitado frente al azar (en la muestra)`,
      badge: k.zero_wasted_vaccines_verified
        ? <span className="flex items-center gap-1 text-[10px] text-[#167e6c]"><CheckCircle className="h-3.5 w-3.5" />0 dosis desperdiciadas</span>
        : <span className="flex items-center gap-1 text-[10px] text-[#ec652b]"><AlertCircle className="h-3.5 w-3.5" />{fmt(k.wasted_vaccines_count)} dosis desperdiciadas</span>,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-[#e3e4e8] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}>{c.icon}</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">{c.label}</span>
            </div>
            <Tooltip text={c.tooltip} />
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-1.5">
            <span className={`font-mono text-[28px] font-semibold tracking-tight ${c.valueClass}`}>{c.value}</span>
            <span className="text-[11px] text-[#7c7f88]">{c.unit}</span>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-[#3b3e47]">{c.sub}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#7c7f88]">{c.range}</p>
          {c.badge && <div className="mt-2">{c.badge}</div>}
        </div>
      ))}
    </div>
  );
}
