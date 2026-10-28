/**
 * Resultados: resumen final como un pergamino. Compara la estrategia inteligente con
 * las dos líneas base obligatorias (no intervenir y azar con los mismos recursos)
 * usando los indicadores que ya calculó el backend, y da acceso al informe del alcalde.
 */
import React from 'react';
import type { SimulationResponse } from '../types/simulation';
import { PixelIcon, type PixelIconName } from './PixelIcon';
import { fmt } from '../utils/format';
import { STRATEGY_COLOR } from '../theme/pixelTheme';

interface ResultsScrollProps {
  result: SimulationResponse;
  reportLoading: boolean;
  onOpenReport: () => void;
  onReplay: () => void;
  onNewSetup: () => void;
}

export function ResultsScroll({ result, reportLoading, onOpenReport, onReplay, onNewSetup }: ResultsScrollProps) {
  const k = result.summary_kpis;
  const p = result.params;

  const rows: { id: 'none' | 'random' | 'shield'; label: string; icon: PixelIconName; infected: number; p10: number; p90: number; peak: number }[] = [
    { id: 'none', label: 'Sin intervención', icon: 'barrier', infected: k.total_infected_none, p10: k.total_infected_none_p10, p90: k.total_infected_none_p90, peak: k.peak_zombies_none },
    { id: 'random', label: 'Al azar (mismos recursos)', icon: 'dice', infected: k.total_infected_random, p10: k.total_infected_random_p10, p90: k.total_infected_random_p90, peak: k.peak_zombies_random },
    { id: 'shield', label: 'Cortafuegos Manta', icon: 'shield', infected: k.total_infected_shield, p10: k.total_infected_shield_p10, p90: k.total_infected_shield_p90, peak: k.peak_zombies_shield },
  ];
  const maxInfected = Math.max(...rows.map((r) => r.infected), 1);

  return (
    <section className="mc-frame-wood mc-paper p-4 sm:p-6" aria-labelledby="results-scroll-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="mc-slot flex h-12 w-12 items-center justify-center" aria-hidden="true">
            <PixelIcon name="book" size={32} />
          </span>
          <div>
            <p className="mc-label text-[#6b4a2b]">Resultados de la simulación</p>
            <h2 id="results-scroll-title" className="font-display text-[16px] leading-tight text-[#3a2a14]">
              Crónica de la contención
            </h2>
            <p className="text-[14px] text-[#6b4a2b]">
              {p.monte_carlo_runs} simulaciones de {p.days} días · semilla {p.seed} · {p.n_nodes.toLocaleString()} personas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenReport} disabled={reportLoading} className="mc-button mc-button-primary">
            {reportLoading ? <PixelIcon name="hourglass" size={16} className="mc-loading" /> : <PixelIcon name="book" size={16} />}
            Informe para el alcalde
          </button>
          <button type="button" onClick={onReplay} className="mc-button">
            <PixelIcon name="play" size={16} />
            Ver de nuevo
          </button>
          <button type="button" onClick={onNewSetup} className="mc-button">
            <PixelIcon name="gear" size={16} />
            Cambiar parámetros
          </button>
        </div>
      </div>

      {/* Vidas salvadas frente a cada línea base */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="mc-slot-dark p-3">
          <p className="mc-label text-[#ede5e2]">Contagios evitados frente a no intervenir</p>
          <p className="mt-2 font-pixel text-[15px] text-mc-grass-light" style={{ textShadow: '2px 2px 0 #000' }}>
            {fmt(k.lives_saved_vs_none)} <span className="font-ui text-[15px] text-white">personas</span>
          </p>
          <p className="mt-1 text-[14px] text-[#ede5e2]">{fmt(k.lives_saved_vs_none_pct, 1)}% menos contagios</p>
        </div>
        <div className="mc-slot-dark p-3">
          <p className="mc-label text-[#ede5e2]">Contagios evitados frente al azar</p>
          <p className="mt-2 font-pixel text-[15px] text-mc-diamond" style={{ textShadow: '2px 2px 0 #000' }}>
            {fmt(k.lives_saved_vs_random)} <span className="font-ui text-[15px] text-white">personas</span>
          </p>
          <p className="mt-1 text-[14px] text-[#ede5e2]">{fmt(k.lives_saved_vs_random_pct, 1)}% menos contagios</p>
        </div>
      </div>

      {/* Comparativa numérica y gráfica de las tres estrategias */}
      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        <div className="overflow-x-auto lg:col-span-3">
          <table className="w-full border-collapse text-left text-[15px] text-[#3a2a14]">
            <caption className="mc-label mb-2 text-left text-[#6b4a2b]">Personas contagiadas en {p.days} días (media y rango P10–P90)</caption>
            <thead>
              <tr className="border-b-2 border-[#3a2a14]">
                <th className="mc-label py-1 pr-2 font-normal">Estrategia</th>
                <th className="mc-label px-2 font-normal">Contagiados</th>
                <th className="mc-label px-2 font-normal">P10–P90</th>
                <th className="mc-label pl-2 font-normal">Pico de zombies</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-b border-dashed border-[#8b5a2b] ${r.id === 'shield' ? 'bg-[#f3ead0]' : ''}`}>
                  <td className="py-1.5 pr-2">
                    <span className="flex items-center gap-2">
                      <PixelIcon name={r.icon} size={16} />
                      {r.label}
                    </span>
                  </td>
                  <td className="px-2">{fmt(r.infected, 1)}</td>
                  <td className="px-2 text-[#6b4a2b]">{fmt(r.p10)}–{fmt(r.p90)}</td>
                  <td className="pl-2">{fmt(r.peak, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tres pilares de bloques: la altura es el número de contagiados */}
        <div className="mc-slot-dark flex h-48 items-end justify-around gap-3 px-3 pt-3 lg:col-span-2" role="img" aria-label={`Contagiados: sin intervención ${fmt(k.total_infected_none, 1)}, al azar ${fmt(k.total_infected_random, 1)}, Cortafuegos Manta ${fmt(k.total_infected_shield, 1)}`}>
          {rows.map((r) => (
            <div key={r.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="font-pixel text-[9px] text-white">{fmt(r.infected)}</span>
              <div
                className="w-full max-w-[56px] border-2 border-black"
                style={{
                  height: `${Math.max(3, (r.infected / maxInfected) * 100)}%`,
                  backgroundColor: STRATEGY_COLOR[r.id],
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.35) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.25) 2px, transparent 2px), linear-gradient(rgba(0,0,0,0.35) 2px, transparent 2px)',
                  backgroundSize: '100% 12px, 12px 12px, 100% 12px',
                  backgroundPosition: '0 0, 0 0, 0 10px',
                }}
              />
              <PixelIcon name={r.icon} size={16} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
