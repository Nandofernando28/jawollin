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

  const livesScaled = Math.round(k.lives_saved_vs_none * scale);
  const livesRandScaled = Math.round(k.lives_saved_vs_random * scale);

  const cards = [
    {
      icon: <TrendingDown className="h-4 w-4" />,
      iconBg: 'bg-[#ecfdf7] text-[#167e6c]',
      border: 'border-[#e3e4e8]',
      label: 'Vidas salvadas',
      tooltip: `Ciudadanos que NO se infectarán con Cortafuegos Manta vs. no intervenir. Escalado a la población real de Manta (271.000 hab.).`,
      value: `+${livesScaled.toLocaleString()}`,
      unit: 'hab.',
      valueClass: 'text-[#167e6c]',
      sub: `−${k.lives_saved_vs_none_pct}% vs. sin interv. · +${livesRandScaled.toLocaleString()} vs. azar`,
      subClass: 'text-[#167e6c]',
    },
    {
      icon: <Activity className="h-4 w-4" />,
      iconBg: 'bg-[#fff3ef] text-[#ec652b]',
      border: 'border-[#e3e4e8]',
      label: 'Pico de infección',
      tooltip: 'Máximo de infectados simultáneos (media Monte Carlo). Dimensiona la capacidad hospitalaria necesaria.',
      value: String(k.peak_zombies_shield),
      unit: 'nodos',
      valueClass: 'text-[#111a4a]',
      sub: `Sin interv.: ${k.peak_zombies_none} · Al azar: ${k.peak_zombies_random}`,
      subClass: 'text-[#7c7f88]',
    },
    {
      icon: <Syringe className="h-4 w-4" />,
      iconBg: 'bg-[#edf9f6] text-[#167e6c]',
      border: 'border-[#e3e4e8]',
      label: 'Eficiencia vacunas',
      tooltip: 'Cortafuegos Manta aplica el filtro estricto state==SANO: 0% de dosis desperdiciadas.',
      value: k.zero_wasted_vaccines_verified ? '100%' : `${100 - k.wasted_vaccines_count}%`,
      unit: 'eficiencia',
      valueClass: 'text-[#167e6c]',
      sub: k.zero_wasted_vaccines_verified ? '0 dosis desperdiciadas — filtro activo' : 'Revisar algoritmo',
      subClass: k.zero_wasted_vaccines_verified ? 'text-[#167e6c]' : 'text-[#ec652b]',
      badge: k.zero_wasted_vaccines_verified ? <CheckCircle className="h-3.5 w-3.5 text-[#167e6c]" /> : <AlertCircle className="h-3.5 w-3.5 text-[#ec652b]" />,
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      iconBg: 'bg-[#fffaf2] text-[#ec652b]',
      border: 'border-[#e3e4e8]',
      label: 'Costo ejecutado',
      tooltip: `Gasto total en vacunas + brigadas + cierres de hubs durante ${result.params.days} días.`,
      value: `$${k.total_budget_spent.toLocaleString()}`,
      unit: `${result.params.days}d`,
      valueClass: 'text-[#111a4a]',
      sub: `$/vida salvada: $${k.cost_per_life_saved_vs_none} · Restante: $${k.remaining_budget.toLocaleString()}`,
      subClass: 'text-[#7c7f88]',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg border ${c.border} bg-white p-4 shadow-sm`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}>{c.icon}</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">{c.label}</span>
            </div>
            <div className="flex items-center gap-1">
              {c.badge}
              <Tooltip text={c.tooltip} />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={`font-mono text-[28px] font-semibold tracking-tight ${c.valueClass}`}>{c.value}</span>
            {c.unit && <span className="text-[11px] text-[#7c7f88]">{c.unit}</span>}
          </div>

          <p className={`mt-2 text-[11px] leading-relaxed ${c.subClass}`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
