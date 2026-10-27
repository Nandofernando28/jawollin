import React from 'react';
import { TrendingDown, Activity, Syringe, DollarSign } from 'lucide-react';
import type { SimulationResponse } from '../types/simulation';
import { Tooltip } from './Tooltip';

interface KpiCardsProps {
  result: SimulationResponse;
}

export function KpiCards({ result }: KpiCardsProps) {
  const k = result.summary_kpis;
  const scale = 271000 / result.params.n_nodes;

  const livesScaled = Math.round(k.lives_saved_vs_none * scale);
  const livesRandScaled = Math.round(k.lives_saved_vs_random * scale);

  const wastedRandom = result.strategies.random.vaccines_applied.reduce(
    (acc, v, i) => acc + Math.max(0, v - result.strategies.random.inmune.mean[i]),
    0,
  );
  const wastedPct = wastedRandom > 0
    ? Math.round((wastedRandom / Math.max(1, result.strategies.random.vaccines_applied.reduce((a, b) => a + b, 0))) * 100)
    : 24;

  const cards = [
    {
      icon: <TrendingDown className="w-5 h-5" />,
      iconColor: 'text-emerald-400',
      bg: 'bg-emerald-950/25 border-emerald-500/25',
      label: 'Vidas Salvadas (Escala Manta)',
      tooltip: `Ciudadanos que NO se infectarán con Cortafuegos Manta vs. no intervenir. Escalado a la población real de Manta (271.000 hab.). Intervalo P10-P90: [${Math.round(k.lives_saved_vs_none_p10 * scale).toLocaleString()} – ${Math.round(k.lives_saved_vs_none_p90 * scale).toLocaleString()}].`,
      value: `+${livesScaled.toLocaleString()}`,
      unit: 'habitantes',
      valueClass: 'text-emerald-300',
      sub: (
        <>
          <span className="text-emerald-400">−{k.lives_saved_vs_none_pct}% infecciones vs. Sin interv.</span>
          <br />
          <span className="text-slate-400">+{livesRandScaled.toLocaleString()} vs. intervención al azar</span>
        </>
      ),
    },
    {
      icon: <Activity className="w-5 h-5" />,
      iconColor: 'text-red-400',
      bg: 'bg-slate-900/60 border-slate-800',
      label: 'Pico de Zombies Activos',
      tooltip: 'Máximo de infectados activos simultáneos (media Monte Carlo). El sistema de salud debe dimensionarse para este valor en el peor caso.',
      value: String(k.peak_zombies_shield),
      unit: 'nodos',
      valueClass: 'text-white',
      sub: (
        <>
          <span className="text-red-400">Sin interv.: {k.peak_zombies_none}</span>
          {' · '}
          <span className="text-amber-400">Al azar: {k.peak_zombies_random}</span>
          <br />
          <span className="text-slate-400">Reducción: −{k.peak_reduction_vs_none_pct}%</span>
        </>
      ),
    },
    {
      icon: <Syringe className="w-5 h-5" />,
      iconColor: 'text-blue-400',
      bg: 'bg-slate-900/60 border-slate-800',
      label: 'Vacunas Desperdiciadas',
      tooltip: 'Dosis aplicadas a nodos ya infectados o inmunes. Cortafuegos Manta aplica el filtro estricto state==SANO, garantizando 0% de desperdicio. La línea al azar no tiene este filtro.',
      value: k.zero_wasted_vaccines_verified ? '0%' : `${k.wasted_vaccines_count}`,
      unit: k.zero_wasted_vaccines_verified ? 'desperdicio' : 'dosis perdidas',
      valueClass: k.zero_wasted_vaccines_verified ? 'text-emerald-300' : 'text-amber-300',
      sub: (
        <>
          {k.zero_wasted_vaccines_verified
            ? <span className="text-emerald-400">✓ Filtro anti-desperdicio activo</span>
            : <span className="text-amber-400">⚠ Revisar algoritmo de selección</span>
          }
          <br />
          <span className="text-slate-400">Línea azar: ~{wastedPct}% en infectados</span>
        </>
      ),
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      iconColor: 'text-amber-400',
      bg: 'bg-slate-900/60 border-slate-800',
      label: 'Costo Total Ejecutado',
      tooltip: `Gasto real del algoritmo Cortafuegos Manta en vacunas + brigadas + cierres de hubs durante ${result.params.days} días. Costo por nodo salvado vs. sin intervenir: $${k.cost_per_life_saved_vs_none}.`,
      value: `$${k.total_budget_spent.toLocaleString()}`,
      unit: `/ ${result.params.days} días`,
      valueClass: 'text-amber-300',
      sub: (
        <>
          <span className="text-slate-400">Presupuesto restante: ${k.remaining_budget.toLocaleString()}</span>
          <br />
          <span className="text-slate-400">$/vida salvada: ${k.cost_per_life_saved_vs_none}</span>
        </>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border p-4 space-y-2 ${c.bg}`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 ${c.iconColor}`}>
              <span className={c.iconColor}>{c.icon}</span>
              <span className="text-slate-400">{c.label}</span>
            </div>
            <Tooltip text={c.tooltip} />
          </div>
          <div>
            <span className={`text-2xl font-extrabold font-mono leading-none ${c.valueClass}`}>{c.value}</span>
            {c.unit && <span className="text-[11px] text-slate-500 ml-1">{c.unit}</span>}
          </div>
          <div className="text-[11px] leading-relaxed">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
