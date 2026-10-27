/**
 * TerritoryPanel — Territorio y recursos en el día seleccionado (datos reales del backend)
 *
 * Fase 6 · tarea 5.3: tabla en vivo por parroquia y hub (casos activos, inmunizados y
 * defensas desplegadas) + consumo acumulado de recursos de la estrategia elegida.
 */
import React from 'react';
import { Building2, MapPin, ShieldCheck, Syringe, Truck } from 'lucide-react';
import type { SimulationResponse, SpatialDaySnapshot, StrategyType } from '../types/simulation';

interface TerritoryPanelProps {
  result: SimulationResponse;
  currentDay: number;
  strategy: StrategyType;
}

const sumUpTo = (series: number[] | undefined, day: number) =>
  (series ?? []).slice(0, day + 1).reduce((acc, v) => acc + v, 0);

export function TerritoryPanel({ result, currentDay, strategy }: TerritoryPanelProps) {
  const timeline: SpatialDaySnapshot[] | undefined = result.spatial_timelines?.[strategy];
  const snap = timeline?.length ? timeline[Math.min(currentDay, timeline.length - 1)] : undefined;
  const metrics = result.strategies[strategy];

  const spent = metrics.cumulative_budget_spent[Math.min(currentDay, metrics.cumulative_budget_spent.length - 1)] ?? 0;
  const vaccines = sumUpTo(metrics.vaccines_applied, currentDay);
  const brigades = sumUpTo(metrics.brigades_deployed, currentDay);
  const hubDays = sumUpTo(metrics.hubs_closed, currentDay);
  const budgetPct = Math.min(100, (spent / Math.max(result.params.total_budget, 1)) * 100);

  const hubs = snap ? Object.values(snap.hubs) : [];
  const parishes = snap ? Object.values(snap.parishes) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Control urbano · día {currentDay}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111a4a]">Hubs y cortafuegos de Manta</h2>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
        <div className="space-y-2">
          {hubs.length === 0 && <p className="text-sm text-[#7c7f88]">Sin serie espacial para esta estrategia.</p>}
          {hubs.map((hub) => (
            <div
              key={hub.hub_id}
              className={`rounded-lg border p-3 ${hub.firewall_active ? 'border-[#cfe9df] bg-[#f2fbf8]' : 'border-[#e3e4e8] bg-[#f6f6f8]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-[#111a4a]">{hub.hub_name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] ${
                    hub.firewall_active ? 'bg-[#e3f8ef] text-[#167e6c]' : 'bg-[#f3f4f6] text-[#7c7f88]'
                  }`}
                >
                  {hub.firewall_active ? 'Cortafuegos activo' : 'Abierto'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#7c7f88]">
                Casos activos: <b className="font-mono text-[#111a4a]">{hub.active_cases}</b> · Vacunas en anillo hoy:{' '}
                <b className="font-mono text-[#111a4a]">{hub.vaccines_in_ring_today}</b>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#111a4a]">Parroquias</h2>
          <ShieldCheck className="h-4 w-4 text-[#167e6c]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="text-[#7c7f88]">
              <tr>
                <th className="py-1 pr-2 font-medium">Parroquia</th>
                <th className="px-1 font-medium">Zombies</th>
                <th className="px-1 font-medium">Inmunes</th>
                <th className="pl-1 font-medium">Prev.</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[#111a4a]">
              {parishes.map((p) => (
                <tr key={p.parish_id} className="border-t border-[#edf0f3]">
                  <td className="py-1.5 pr-2 font-sans font-medium">{p.parish_name}</td>
                  <td className="px-1 text-[#ec652b]">{p.zombies}</td>
                  <td className="px-1 text-[#1e4199]">{p.inmunes}</td>
                  <td className="pl-1">{p.prevalence_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#111a4a]">Recursos acumulados</h2>
          <Building2 className="h-4 w-4 text-[#ec652b]" />
        </div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-[#3b3e47]">
          <span>Gasto municipal</span>
          <span className="font-mono text-[#111a4a]">
            ${Math.round(spent).toLocaleString()} / ${result.params.total_budget.toLocaleString()}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#edf0f3]">
          <div className="h-full rounded-full bg-[#111a4a]" style={{ width: `${budgetPct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[#f6f6f8] p-3">
            <Syringe className="h-4 w-4 text-[#167e6c]" />
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#7c7f88]">Dosis</p>
            <p className="font-mono text-lg font-semibold text-[#111a4a]">{Math.round(vaccines)}</p>
          </div>
          <div className="rounded-lg bg-[#f6f6f8] p-3">
            <Truck className="h-4 w-4 text-[#111a4a]" />
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#7c7f88]">Brigadas</p>
            <p className="font-mono text-lg font-semibold text-[#111a4a]">{Math.round(brigades)}</p>
          </div>
          <div className="rounded-lg bg-[#f6f6f8] p-3">
            <MapPin className="h-4 w-4 text-[#ec652b]" />
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#7c7f88]">Días-hub</p>
            <p className="font-mono text-lg font-semibold text-[#111a4a]">{Math.round(hubDays)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
