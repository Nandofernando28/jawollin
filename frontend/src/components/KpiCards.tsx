/**
 * KpiCards.tsx — Tarjetas de indicadores de la simulación.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §4.1 Escala de espacio: múltiplos de 4/8 px (gap: 16px, 24px; padding .875rem)
 * - §4.2 Rejilla responsive: 1 col móvil, 2 col tablet, 4 col escritorio
 * - §5.1 Paneles biselados y casillas de inventario oscuras
 * - §5.3 Tarjetas: esquinas rectas y relieve sin sombras difusas
 */
import React from 'react';
import type { SimulationResponse } from '../types/simulation';
import { Tooltip } from './Tooltip';
import { PixelIcon } from './PixelIcon';
import { fmt } from '../utils/format';

interface KpiCardsProps {
  result: SimulationResponse;
}

export function KpiCards({ result }: KpiCardsProps) {
  const k = result.summary_kpis;
  const p = result.params;
  // Todas las cifras son de la población configurada al iniciar la simulación (p.n_nodes).
  // Costo por contagio evitado frente al azar: el mismo valor que usa el boletín del backend.
  const costPerAvoided = k.lives_saved_vs_random > 0 ? k.cost_per_life_saved_vs_random : null;

  const cards = [
    {
      icon: <PixelIcon name="grassBlock" size={24} />,
      label: 'Contagios evitados',
      tooltip: `Personas que no se contagian con Cortafuegos Manta frente a no intervenir, sobre la población simulada de ${fmt(p.n_nodes)} personas. El rango P10–P90 sale de las ${p.monte_carlo_runs} simulaciones.`,
      value: `+${fmt(k.lives_saved_vs_none)}`,
      unit: `de ${fmt(p.n_nodes)} personas`,
      valueClass: 'text-mc-grass-light',
      sub: `${fmt(k.lives_saved_vs_none_pct, 1)}% menos contagios que sin intervenir`,
      range: `Rango P10–P90: ${fmt(k.lives_saved_vs_none_p10)} a ${fmt(k.lives_saved_vs_none_p90)} personas`,
    },
    {
      icon: <PixelIcon name="diamondBlock" size={24} />,
      label: 'Frente a actuar al azar',
      tooltip: 'Contagios evitados frente a gastar el mismo presupuesto, con la misma información, eligiendo acciones al azar. Es lo que aporta elegir bien.',
      value: `+${fmt(k.lives_saved_vs_random)}`,
      unit: `de ${fmt(p.n_nodes)} personas`,
      valueClass: 'text-mc-diamond',
      sub: `${fmt(k.lives_saved_vs_random_pct, 1)}% menos contagios que el azar`,
      range: `Rango P10–P90: ${fmt(k.lives_saved_vs_random_p10)} a ${fmt(k.lives_saved_vs_random_p90)} personas`,
    },
    {
      icon: <PixelIcon name="zombie" size={24} />,
      label: 'Pico de zombies',
      tooltip: 'Máximo de zombies activos a la vez (media de las simulaciones). Un pico más bajo significa menos casos simultáneos que atender.',
      value: `−${fmt(k.peak_reduction_vs_none_pct, 1)}%`,
      unit: 'vs. sin intervenir',
      valueClass: 'text-mc-redstone',
      sub: `Pico: ${fmt(k.peak_zombies_shield, 1)} personas con el Escudo`,
      range: `Sin intervenir: ${fmt(k.peak_zombies_none, 1)} · Al azar: ${fmt(k.peak_zombies_random, 1)}`,
    },
    {
      icon: <PixelIcon name="coin" size={24} />,
      label: 'Gasto ejecutado',
      tooltip: `Gasto total del Escudo en vacunas, brigadas y cierres de hubs durante ${p.days} días. El costo por contagio evitado divide ese gasto entre los contagios evitados frente al azar, sobre la población simulada de ${fmt(p.n_nodes)} personas.`,
      value: `$${fmt(k.total_budget_spent)}`,
      unit: `de $${fmt(p.total_budget)}`,
      valueClass: 'text-mc-gold',
      sub: `${fmt(k.total_vaccines_used)} dosis · ${fmt(k.total_brigades_used)} brigadas · ${fmt(k.total_hub_days_closed, 1)} días-hub`,
      range: costPerAvoided === null
        ? 'No evita contagios frente al azar con estas condiciones'
        : `$${fmt(costPerAvoided)} por contagio evitado frente al azar`,
      badge: k.zero_wasted_vaccines_verified
        ? <span className="mc-chip bg-mc-grass text-white"><PixelIcon name="check" size={8} />0 dosis desperdiciadas</span>
        : <span className="mc-chip bg-mc-redstone text-white"><PixelIcon name="warning" size={8} />{fmt(k.wasted_vaccines_count)} dosis desperdiciadas</span>,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="mc-panel flex flex-col p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="mc-slot flex h-10 w-10 shrink-0 items-center justify-center">{c.icon}</span>
              <span className="mc-label text-mc-ink">{c.label}</span>
            </div>
            <Tooltip text={c.tooltip} />
          </div>

          <div className="mc-slot-dark mt-3 flex flex-wrap items-baseline gap-2 px-3 py-3">
            <span className={`font-pixel text-[15px] leading-none ${c.valueClass}`} style={{ textShadow: '2px 2px 0 #171615' }}>{c.value}</span>
            <span className="text-[14px] leading-none text-[#ede5e2]">{c.unit}</span>
          </div>

          <p className="mt-2 text-[14px] leading-tight text-mc-ink">{c.sub}</p>
          <p className="mt-1 text-[14px] leading-tight text-mc-muted">{c.range}</p>
          {c.badge && <div className="mt-2">{c.badge}</div>}
        </div>
      ))}
    </div>
  );
}
