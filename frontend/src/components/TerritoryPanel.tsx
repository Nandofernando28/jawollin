/**
 * TerritoryPanel — Territorio y recursos en el día seleccionado (datos reales del backend)
 *
 * Fase 6 · tarea 5.3: tabla en vivo por parroquia y hub (casos activos, inmunizados y
 * defensas desplegadas) + consumo acumulado de recursos de la estrategia elegida.
 *
 * Estilo: cuadrícula de inventario del tema pixel (src/index.css).
 */
import React from 'react';
import type { SimulationResponse, SpatialDaySnapshot, StrategyType } from '../types/simulation';
import { PixelIcon, type PixelIconName } from './PixelIcon';

interface TerritoryPanelProps {
  result: SimulationResponse;
  currentDay: number;
  strategy: StrategyType;
}

const sumUpTo = (series: number[] | undefined, day: number) =>
  (series ?? []).slice(0, day + 1).reduce((acc, v) => acc + v, 0);

/** Franja de título oscura con el icono a la derecha */
function PanelTitle({ kicker, title, icon }: { kicker?: string; title: string; icon: PixelIconName }) {
  return (
    <div className="mc-panel-dark mb-3 flex items-center justify-between gap-3 px-3 py-2">
      <div>
        {kicker && <p className="mc-label text-[#d8d8d8]">{kicker}</p>}
        <h2 className="mc-title mt-1 text-[16px]">{title}</h2>
      </div>
      <PixelIcon name={icon} size={24} />
    </div>
  );
}

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
      <div className="mc-panel p-3">
        <PanelTitle kicker={`Control urbano · día ${currentDay}`} title="Hubs y cortafuegos de Manta" icon="torch" />
        <div className="space-y-2">
          {hubs.length === 0 && <p className="text-[20px] text-mc-muted">Sin serie espacial para esta estrategia.</p>}
          {hubs.map((hub) => (
            <div
              key={hub.hub_id}
              className={`${hub.firewall_active ? 'mc-slot-dark' : 'mc-slot-light'} px-3 py-2`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate text-[20px] leading-tight ${hub.firewall_active ? 'text-white' : 'text-mc-ink'}`}>{hub.hub_name}</p>
                <span
                  className={`mc-chip shrink-0 ${
                    hub.firewall_active ? 'bg-mc-lapis text-white' : 'bg-mc-stone-light text-white'
                  }`}
                >
                  {hub.firewall_active ? 'Cortafuegos activo' : 'Abierto'}
                </span>
              </div>
              <p className={`mt-1 text-[18px] leading-tight ${hub.firewall_active ? 'text-[#d8d8d8]' : 'text-mc-muted'}`}>
                Casos activos: <b className={`font-normal ${hub.firewall_active ? 'text-[#ff6b5f]' : 'text-mc-redstone-dark'}`}>{hub.active_cases}</b> · Vacunas en anillo hoy:{' '}
                <b className={`font-normal ${hub.firewall_active ? 'text-mc-diamond' : 'text-mc-lapis'}`}>{hub.vaccines_in_ring_today}</b>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mc-panel p-3">
        <PanelTitle title="Parroquias" icon="map" />
        <div className="mc-slot-dark overflow-x-auto p-1">
          <table className="w-full border-collapse text-left text-[20px]">
            <thead>
              <tr className="bg-mc-stone-mid">
                <th className="mc-label px-2 py-2 font-normal text-mc-gold">Parroquia</th>
                <th className="mc-label px-2 font-normal text-mc-gold">Zombies</th>
                <th className="mc-label px-2 font-normal text-mc-gold">Inmunes</th>
                <th className="mc-label px-2 font-normal text-mc-gold">Prev.</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {parishes.map((p, i) => (
                <tr key={p.parish_id} className={`border-t-2 border-black ${i % 2 ? 'bg-[#262626]' : 'bg-[#1e1e1e]'}`}>
                  <td className="px-2 py-1">{p.parish_name}</td>
                  <td className="px-2 text-[#ff6b5f]">{p.zombies}</td>
                  <td className="px-2 text-mc-diamond">{p.inmunes}</td>
                  <td className="px-2 text-mc-gold">{p.prevalence_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mc-panel p-3">
        <PanelTitle title="Recursos acumulados" icon="coin" />
        <div className="mb-2 flex items-center justify-between text-[20px] text-mc-ink">
          <span>Gasto municipal</span>
          <span className="font-pixel text-[10px]">
            ${Math.round(spent).toLocaleString()} / ${result.params.total_budget.toLocaleString()}
          </span>
        </div>
        {/* Barra de progreso hecha de bloques de oro */}
        <div className="mc-slot-dark h-6 p-0.5">
          <div
            className="h-full bg-mc-ore-gold"
            style={{
              width: `${budgetPct}%`,
              backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.35) 2px, transparent 2px)',
              backgroundSize: '12px 100%',
            }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="mc-slot-light p-2">
            <PixelIcon name="diamondBlock" size={16} />
            <p className="mc-label mt-2 text-mc-muted">Dosis</p>
            <p className="font-pixel mt-1 text-[14px] text-mc-ink">{Math.round(vaccines)}</p>
          </div>
          <div className="mc-slot-light p-2">
            <PixelIcon name="heart" size={16} />
            <p className="mc-label mt-2 text-mc-muted">Brigadas</p>
            <p className="font-pixel mt-1 text-[14px] text-mc-ink">{Math.round(brigades)}</p>
          </div>
          <div className="mc-slot-light p-2">
            <PixelIcon name="shield" size={16} />
            <p className="mc-label mt-2 text-mc-muted">Días-hub</p>
            <p className="font-pixel mt-1 text-[14px] text-mc-ink">{Math.round(hubDays)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
