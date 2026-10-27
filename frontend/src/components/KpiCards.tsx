import React from 'react';
import { TrendingDown, Activity, Syringe, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import type { SimulationResponse } from '../types/simulation';
import { Tooltip } from './Tooltip';

interface KpiCardsProps {
  result: SimulationResponse;
}

export function KpiCards({ result }: KpiCardsProps) {
  const k = result.summary_kpis;
  const scale = 271000 / result.params.n_nodes;

  const livesScaled     = Math.round(k.lives_saved_vs_none * scale);
  const livesRandScaled = Math.round(k.lives_saved_vs_random * scale);

  const cards = [
    {
      icon: <TrendingDown className="w-4 h-4" />,
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      border: 'border-emerald-500/20',
      label: 'Vidas Salvadas',
      tooltip: `Ciudadanos que NO se infectarán con Cortafuegos Manta vs. no intervenir. Escalado a la población real de Manta (271.000 hab.).`,
      value: `+${livesScaled.toLocaleString()}`,
      unit: 'hab.',
      valueClass: 'text-emerald-300',
      sub: `−${k.lives_saved_vs_none_pct}% vs. Sin Interv. · +${livesRandScaled.toLocaleString()} vs. Azar`,
      subClass: 'text-emerald-500',
    },
    {
      icon: <Activity className="w-4 h-4" />,
      iconBg: 'bg-rose-500/10 text-rose-400',
      border: 'border-slate-800',
      label: 'Pico de Infección',
      tooltip: 'Máximo de infectados simultáneos (media Monte Carlo). Dimensiona la capacidad hospitalaria necesaria.',
      value: String(k.peak_zombies_shield),
      unit: 'nodos',
      valueClass: 'text-white',
      sub: `Sin interv.: ${k.peak_zombies_none} · Al azar: ${k.peak_zombies_random}`,
      subClass: 'text-slate-500',
    },
    {
      icon: <Syringe className="w-4 h-4" />,
      iconBg: 'bg-sky-500/10 text-sky-400',
      border: 'border-slate-800',
      label: 'Eficiencia Vacunas',
      tooltip: 'Cortafuegos Manta aplica el filtro estricto state==SANO: 0% de dosis desperdiciadas.',
      value: k.zero_wasted_vaccines_verified ? '100%' : `${100 - k.wasted_vaccines_count}%`,
      unit: 'eficiencia',
      valueClass: 'text-sky-300',
      sub: k.zero_wasted_vaccines_verified ? '0 dosis desperdiciadas — filtro activo' : 'Revisar algoritmo',
      subClass: k.zero_wasted_vaccines_verified ? 'text-emerald-500' : 'text-amber-400',
      badge: k.zero_wasted_vaccines_verified
        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      icon: <DollarSign className="w-4 h-4" />,
      iconBg: 'bg-amber-500/10 text-amber-400',
      border: 'border-slate-800',
      label: 'Costo Ejecutado',
      tooltip: `Gasto total en vacunas + brigadas + cierres de hubs durante ${result.params.days} días.`,
      value: `$${k.total_budget_spent.toLocaleString()}`,
      unit: `${result.params.days}d`,
      valueClass: 'text-amber-300',
      sub: `$/vida salvada: $${k.cost_per_life_saved_vs_none} · Restante: $${k.remaining_budget.toLocaleString()}`,
      subClass: 'text-slate-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border ${c.border} bg-slate-900/60 backdrop-blur-sm p-4 space-y-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${c.iconBg}`}>{c.icon}</span>
              <span className="text-[11px] text-slate-400 font-medium">{c.label}</span>
            </div>
            <div className="flex items-center gap-1">
              {c.badge}
              <Tooltip text={c.tooltip} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono tracking-tight ${c.valueClass}`}>{c.value}</span>
            {c.unit && <span className="text-[11px] text-slate-500">{c.unit}</span>}
          </div>
          <p className={`text-[11px] leading-relaxed ${c.subClass}`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
