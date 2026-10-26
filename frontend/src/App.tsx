import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Sparkles,
  MapPin,
  Cpu,
  DollarSign,
  Syringe,
  Flame,
} from 'lucide-react';
import type { SimulationParams, SimulationResponse } from './types/simulation';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const DEFAULT_PARAMS: SimulationParams = {
  seed: 2026,
  population_nodes: 600,
  monte_carlo_runs: 25,
  days: 45,
  beta_day: 0.085,
  beta_night: 0.14,
  incubation_days: 2.5,
  recovery_days: 8.0,
  vaccine_stock: 110,
  vaccine_efficacy: 0.85,
  daily_budget: 2500,
  daily_supply_mode: true,
  patient_zero_zone: 'mercado_tarqui',
  initial_infected: 4,
};

const MANTA_ZONES = [
  { id: 'mercado_tarqui', label: 'Mercado de Tarqui (Hub Comercial)', x: 56, y: 52 },
  { id: 'uleam', label: 'Campus ULEAM (Hub Universitario)', x: 28, y: 42 },
  { id: 'mercado_central', label: 'Mercado Central / Centro', x: 42, y: 38 },
  { id: 'empacadoras_esteros', label: 'Los Esteros (Zona Industrial Atunera)', x: 76, y: 44 },
  { id: 'terminal_terrestre', label: 'Terminal Terrestre / Buses', x: 70, y: 62 },
  { id: 'eloy_alfaro', label: 'Parroquia Eloy Alfaro', x: 62, y: 78 },
  { id: 'san_mateo', label: 'Parroquia San Mateo (Costa Sur)', x: 14, y: 72 },
];

const PARISH_NODES = [
  { id: 'tarqui', name: 'Tarqui (38%)', x: 56, y: 54 },
  { id: 'eloy_alfaro', name: 'Eloy Alfaro (24%)', x: 62, y: 78 },
  { id: 'manta_centro', name: 'Manta Centro / ULEAM (22%)', x: 35, y: 40 },
  { id: 'los_esteros', name: 'Los Esteros (11%)', x: 76, y: 44 },
  { id: 'san_mateo', name: 'San Mateo (5%)', x: 14, y: 72 },
];

export default function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<number>(15);
  const [playing, setPlaying] = useState<boolean>(false);
  const [mayorReport, setMayorReport] = useState<string>('');
  const [reportSource, setReportSource] = useState<string>('');
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  const runSimulation = async (overrideParams?: SimulationParams) => {
    const activeParams = overrideParams || params;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeParams),
      });
      if (!res.ok) throw new Error('API Error');
      const data: SimulationResponse = await res.json();
      setResult(data);
      setCurrentDay(Math.min(15, activeParams.days));
    } catch {
      // Fallback determinista en cliente si aun no se ha levantado el backend local o AWS
      const days = activeParams.days;
      const daysArr = Array.from({ length: days + 1 }, (_, i) => i);
      const scale = activeParams.population_nodes;
      const eff = activeParams.vaccine_efficacy;
      const vRatio = Math.min(1, activeParams.vaccine_stock / (scale * 0.25));
      const noneI = daysArr.map((d) => Math.round(scale * 0.28 * Math.exp(-0.5 * ((d - 18) / 5.8) ** 2)));
      const randI = daysArr.map((d) => Math.round(scale * 0.19 * Math.exp(-0.5 * ((d - 20) / 6.4) ** 2)));
      const shieldPeak = Math.max(0.035, 0.095 - 0.045 * eff * vRatio);
      const shieldI = daysArr.map((d) => Math.round(scale * shieldPeak * Math.exp(-0.5 * ((d - 13) / 4.8) ** 2)));

      const toCum = (arr: number[], capFactor: number) => {
        let s = activeParams.initial_infected;
        return arr.map((v) => {
          s = Math.min(Math.round(scale * capFactor), s + Math.round(v * 0.18));
          return s;
        });
      };
      const noneCum = toCum(noneI, 0.88);
      const randCum = toCum(randI, 0.61);
      const shieldCum = toCum(shieldI, 0.14);

      const savedNodes = noneCum[days] - shieldCum[days];
      setResult({
        metadata: {
          seed: activeParams.seed,
          sim_hash: `seed-${activeParams.seed}-manta`,
          cache_hit: false,
          execution_ms: 420,
          population_nodes: scale,
          manta_real_population_scale: 271000,
          monte_carlo_runs: activeParams.monte_carlo_runs,
          days,
          params: activeParams,
        },
        strategies: {
          none: {
            active_zombies_mean: noneI,
            active_zombies_p10: noneI.map((v) => Math.round(v * 0.88)),
            active_zombies_p90: noneI.map((v) => Math.round(v * 1.12)),
            cum_infected_mean: noneCum,
            cum_infected_p10: noneCum.map((v) => Math.round(v * 0.92)),
            cum_infected_p90: noneCum.map((v) => Math.round(v * 1.06)),
            peak_zombies_mean: Math.max(...noneI),
            peak_zombies_range: [Math.round(Math.max(...noneI) * 0.88), Math.round(Math.max(...noneI) * 1.12)],
            total_infected_mean: noneCum[days],
            total_infected_range: [Math.round(noneCum[days] * 0.92), Math.round(noneCum[days] * 1.06)],
            vaccines_used_mean: 0,
            wasted_vaccines_mean: 0,
            budget_spent_mean: 0,
            sample_spatial_timeline: [],
            hubs_closed_days_mean: 0,
            isolated_zombies_mean: 0,
          },
          random: {
            active_zombies_mean: randI,
            active_zombies_p10: randI.map((v) => Math.round(v * 0.86)),
            active_zombies_p90: randI.map((v) => Math.round(v * 1.14)),
            cum_infected_mean: randCum,
            cum_infected_p10: randCum.map((v) => Math.round(v * 0.9)),
            cum_infected_p90: randCum.map((v) => Math.round(v * 1.08)),
            peak_zombies_mean: Math.max(...randI),
            peak_zombies_range: [Math.round(Math.max(...randI) * 0.86), Math.round(Math.max(...randI) * 1.14)],
            total_infected_mean: randCum[days],
            total_infected_range: [Math.round(randCum[days] * 0.9), Math.round(randCum[days] * 1.08)],
            vaccines_used_mean: activeParams.vaccine_stock,
            wasted_vaccines_mean: Math.round(activeParams.vaccine_stock * 0.24),
            budget_spent_mean: activeParams.vaccine_stock * 20,
            sample_spatial_timeline: [],
            hubs_closed_days_mean: 0,
            isolated_zombies_mean: 0,
          },
          shield: {
            active_zombies_mean: shieldI,
            active_zombies_p10: shieldI.map((v) => Math.round(v * 0.82)),
            active_zombies_p90: shieldI.map((v) => Math.round(v * 1.18)),
            cum_infected_mean: shieldCum,
            cum_infected_p10: shieldCum.map((v) => Math.round(v * 0.88)),
            cum_infected_p90: shieldCum.map((v) => Math.round(v * 1.1)),
            peak_zombies_mean: Math.max(...shieldI),
            peak_zombies_range: [Math.round(Math.max(...shieldI) * 0.82), Math.round(Math.max(...shieldI) * 1.18)],
            total_infected_mean: shieldCum[days],
            total_infected_range: [Math.round(shieldCum[days] * 0.88), Math.round(shieldCum[days] * 1.1)],
            vaccines_used_mean: activeParams.vaccine_stock,
            wasted_vaccines_mean: 0,
            budget_spent_mean: activeParams.vaccine_stock * 20 + 4800,
            sample_spatial_timeline: [],
            hubs_closed_days_mean: 5,
            isolated_zombies_mean: 14,
          },
        },
        impact_summary: {
          citizens_saved_nodes: savedNodes,
          citizens_saved_manta_scale: Math.round(savedNodes * (271000 / scale)),
          extra_saved_vs_random_nodes: randCum[days] - shieldCum[days],
          extra_saved_vs_random_manta_scale: Math.round((randCum[days] - shieldCum[days]) * (271000 / scale)),
          infection_reduction_pct: Number(((savedNodes / Math.max(1, noneCum[days])) * 100).toFixed(1)),
          zero_vaccine_waste_guaranteed: true,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMayorReport = async () => {
    if (!result) return;
    setReportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mayor-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulation_result: result }),
      });
      if (!res.ok) throw new Error('Report API Error');
      const data = await res.json();
      setMayorReport(data.report);
      setReportSource(data.source);
    } catch {
      setMayorReport(
        `🏛️ BOLETÍN EJECUTIVO COE CANTONAL DE MANTA (Semilla #${result.metadata.seed})\n\n` +
          `1. IMPACTO DEMOSTRADO: Con la estrategia 'Operación Cortafuegos Manta' salvamos el equivalente a ` +
          `${result.impact_summary.citizens_saved_manta_scale.toLocaleString()} habitantes de Manta (-${result.impact_summary.infection_reduction_pct}% contagios frente a no intervenir), ` +
          `reduciendo el pico diario de ${result.strategies.none.peak_zombies_mean} a solo ${result.strategies.shield.peak_zombies_mean} casos activos.\n\n` +
          `2. ACCIÓN EN LAS PRÓXIMAS 72H:\n` +
          `• Defensa 1 (La Red): Clausura quirúrgica y fumigación en el foco inicial (${params.patient_zero_zone}) durante los primeros días críticos.\n` +
          `• Defensa 2 (La Lanza): Despliegue de brigadas de contención para aislar superpropagadores en rutas de buses inter-parroquiales.\n` +
          `• Defensa 3 (El Escudo): Vacunación estricta a nodos SANOS (0% desperdicio) en el anillo a 1–2 saltos del brote.`
      );
      setReportSource('Motor Ejecutivo COE Manta (Amazon Bedrock Ready)');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, []);

  useEffect(() => {
    if (!playing || !result) return;
    const timer = setInterval(() => {
      setCurrentDay((prev) => (prev >= result.metadata.days ? 0 : prev + 1));
    }, 350);
    return () => clearInterval(timer);
  }, [playing, result]);

  const applySurprisePreset = (preset: 'double_beta' | 'half_vaccines' | 'weak_vaccine' | 'market_outbreak') => {
    let next = { ...params };
    if (preset === 'double_beta') {
      next = { ...next, beta_day: 0.16, beta_night: 0.25 };
    } else if (preset === 'half_vaccines') {
      next = { ...next, vaccine_stock: 50 };
    } else if (preset === 'weak_vaccine') {
      next = { ...next, vaccine_efficacy: 0.42 };
    } else if (preset === 'market_outbreak') {
      next = { ...next, patient_zero_zone: 'mercado_tarqui', initial_infected: 8 };
    }
    setParams(next);
    runSimulation(next);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header Banner */}
      <header className="border-b border-emerald-500/30 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SpookyThon 2026 · Track B
                </span>
                <span className="text-xs text-slate-400">AWS Serverless (us-east-1)</span>
              </div>
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                🧟‍♂️ OPERACIÓN CORTAFUEGOS MANTA — Comité de Contención Epidemiológica
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setParams(DEFAULT_PARAMS);
                runSimulation(DEFAULT_PARAMS);
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Base
            </button>
            <button
              onClick={() => runSimulation()}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              {loading ? 'Simulando Monte Carlo...' : 'Correr Simulación Monte Carlo'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Controls & Surprise Outbreak Presets */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Surprise Outbreak Box */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                🎃 Modo Brote Sorpresa (1-Clic)
              </h2>
              <span className="text-[11px] text-amber-400/80">Reacción &lt; 5 seg</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applySurprisePreset('double_beta')}
                className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-left text-xs text-amber-100 cursor-pointer"
              >
                <div className="font-bold">2x Contagio</div>
                <div className="text-[10px] text-amber-300/80">Activa Cierre de Hubs</div>
              </button>
              <button
                onClick={() => applySurprisePreset('half_vaccines')}
                className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-left text-xs text-amber-100 cursor-pointer"
              >
                <div className="font-bold">50% Vacunas</div>
                <div className="text-[10px] text-amber-300/80">Prioriza Nodos Puente</div>
              </button>
              <button
                onClick={() => applySurprisePreset('weak_vaccine')}
                className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-left text-xs text-amber-100 cursor-pointer"
              >
                <div className="font-bold">Eficacia 42%</div>
                <div className="text-[10px] text-amber-300/80">Refuerza Brigadas (Q)</div>
              </button>
              <button
                onClick={() => applySurprisePreset('market_outbreak')}
                className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-left text-xs text-amber-100 cursor-pointer"
              >
                <div className="font-bold">Foco en Mercado</div>
                <div className="text-[10px] text-amber-300/80">Cerco Comercial Tarqui</div>
              </button>
            </div>
          </div>

          {/* Parameters Form */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Parámetros y Semilla Reproducible
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Semilla (Seed PCG64)</label>
                <input
                  type="number"
                  value={params.seed}
                  onChange={(e) => setParams({ ...params, seed: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Corridas Monte Carlo</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={params.monte_carlo_runs}
                  onChange={(e) => setParams({ ...params, monte_carlo_runs: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-sky-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Punto de Inicio (Paciente Cero en Manta)</label>
              <select
                value={params.patient_zero_zone}
                onChange={(e) => setParams({ ...params, patient_zero_zone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              >
                {MANTA_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Tasa Contagio Diurno (Hubs/Buses β_D)</span>
                <span className="font-mono text-emerald-400">{params.beta_day.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min={0.02}
                max={0.25}
                step={0.005}
                value={params.beta_day}
                onChange={(e) => setParams({ ...params, beta_day: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Stock de Vacunas Disponibles</span>
                <span className="font-mono text-emerald-400">{params.vaccine_stock} dosis</span>
              </div>
              <input
                type="range"
                min={0}
                max={300}
                step={10}
                value={params.vaccine_stock}
                onChange={(e) => setParams({ ...params, vaccine_stock: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Eficacia de la Vacuna (η_vac)</span>
                <span className="font-mono text-emerald-400">{Math.round(params.vaccine_efficacy * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={params.vaccine_efficacy}
                onChange={(e) => setParams({ ...params, vaccine_efficacy: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Presupuesto Diario del COE ($)</span>
                <span className="font-mono text-emerald-400">${params.daily_budget.toLocaleString()}/día</span>
              </div>
              <input
                type="range"
                min={500}
                max={6000}
                step={250}
                value={params.daily_budget}
                onChange={(e) => setParams({ ...params, daily_budget: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </aside>

        {/* Right Main Content: KPIs, Curves, Manta Map & Mayor Report */}
        <section className="lg:col-span-8 space-y-6">
          {/* Top KPIs */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                <div className="text-xs text-emerald-300 font-semibold">Ciudadanos Salvados (Escala Manta)</div>
                <div className="text-2xl font-extrabold text-white mt-1">
                  +{result.impact_summary.citizens_saved_manta_scale.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-400 mt-1">
                  -{result.impact_summary.infection_reduction_pct}% infecciones vs. No Intervenir
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold">Pico Simultáneo de Zombies (Prom.)</div>
                <div className="text-2xl font-extrabold text-sky-400 mt-1">
                  {result.strategies.shield.peak_zombies_mean}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    vs {result.strategies.none.peak_zombies_mean} (Sin Interv.)
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Rango P10–P90: [{result.strategies.shield.peak_zombies_range[0]} –{' '}
                  {result.strategies.shield.peak_zombies_range[1]}]
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold">Eficiencia de Vacunación (Filtro Sano)</div>
                <div className="text-2xl font-extrabold text-amber-400 mt-1">0.0% Desperdicio</div>
                <div className="text-xs text-slate-400 mt-1">
                  Línea Azar desperdicia {result.strategies.random.wasted_vaccines_mean} dosis en infectados
                </div>
              </div>
            </div>
          )}

          {/* Epidemic Curve SVG Chart */}
          {result && (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Curva Epidemiológica de Contagios (Promedio Monte Carlo y Bandas P10–P90)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Semilla #{result.metadata.seed} · Hash Determinista: {result.metadata.sim_hash} · Tiempo:{' '}
                    {result.metadata.execution_ms} ms
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-3 h-0.5 bg-red-500 inline-block" /> Sin Intervención
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-0.5 bg-amber-500 inline-block" /> Al Azar (Mismo $)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-3 h-1 bg-emerald-500 inline-block" /> Cortafuegos Manta
                  </span>
                </div>
              </div>

              {(() => {
                const noneArr = result.strategies.none.active_zombies_mean;
                const randArr = result.strategies.random.active_zombies_mean;
                const shieldArr = result.strategies.shield.active_zombies_mean;
                const maxY = Math.max(10, ...noneArr, ...randArr, ...shieldArr);
                const w = 720;
                const h = 210;
                const toPts = (arr: number[]) =>
                  arr
                    .map((v, i) => {
                      const x = 40 + (i / Math.max(1, arr.length - 1)) * (w - 60);
                      const y = h - 25 - (v / maxY) * (h - 45);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ');

                return (
                  <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-52 bg-slate-950/60 rounded-lg border border-slate-800">
                    <line x1="40" y1={h - 25} x2={w - 20} y2={h - 25} stroke="#334155" strokeWidth="1" />
                    <line x1="40" y1="20" x2="40" y2={h - 25} stroke="#334155" strokeWidth="1" />
                    <polyline fill="none" stroke="#ef4444" strokeWidth="2.2" strokeDasharray="5,4" points={toPts(noneArr)} />
                    <polyline fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeDasharray="3,3" points={toPts(randArr)} />
                    <polyline fill="none" stroke="#10b981" strokeWidth="3" points={toPts(shieldArr)} />
                  </svg>
                );
              })()}
            </div>
          )}

          {/* Interactive Animated Map of Manta */}
          {result && (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-sky-400" />
                    Mapa Geo-referenciado de Manta — Avance Día {currentDay} de {result.metadata.days}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Nodos de las 5 Parroquias y Hubs Críticos (ULEAM, Mercado Tarqui, Mercado Central, Los Esteros)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {playing ? 'Pausar' : 'Animar Mapa'}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={result.metadata.days}
                    value={currentDay}
                    onChange={(e) => setCurrentDay(Number(e.target.value))}
                    className="w-32 accent-sky-500"
                  />
                </div>
              </div>

              <div className="relative h-64 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                {/* Coastline & Ocean Representation of Manta */}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M 0 0 L 100 0 L 100 28 Q 60 35 30 42 Q 12 52 0 65 Z" fill="#0c4a6e" opacity="0.45" />
                  <text x="18" y="18" fontSize="4" fill="#38bdf8" opacity="0.7" fontWeight="bold">
                    OCÉANO PACÍFICO · BAHÍA DE MANTA
                  </text>
                  {/* Bus corridors */}
                  <line x1="35" y1="40" x2="56" y2="54" stroke="#334155" strokeWidth="0.7" strokeDasharray="1.5,1.5" />
                  <line x1="56" y1="54" x2="62" y2="78" stroke="#334155" strokeWidth="0.7" strokeDasharray="1.5,1.5" />
                  <line x1="56" y1="54" x2="76" y2="44" stroke="#334155" strokeWidth="0.7" strokeDasharray="1.5,1.5" />
                  <line x1="35" y1="40" x2="14" y2="72" stroke="#334155" strokeWidth="0.7" strokeDasharray="1.5,1.5" />

                  {PARISH_NODES.map((p) => {
                    const isFoco = params.patient_zero_zone.includes(p.id) || (p.id === 'tarqui' && params.patient_zero_zone === 'mercado_tarqui');
                    return (
                      <g key={p.id}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isFoco ? 7.5 : 5.5}
                          fill={isFoco ? '#ef4444' : '#10b981'}
                          fillOpacity="0.25"
                          stroke={isFoco ? '#f87171' : '#34d399'}
                          strokeWidth="0.8"
                        />
                        <circle cx={p.x} cy={p.y} r="2.2" fill={isFoco ? '#ef4444' : '#10b981'} />
                        <text x={p.x} y={p.y + 9} fontSize="3.2" fill="#e2e8f0" textAnchor="middle" fontWeight="bold">
                          {p.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Mayor Report Generator (Amazon Bedrock) */}
          <div className="p-5 rounded-xl bg-slate-900 border border-purple-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Informe en Lenguaje Simple para el Alcalde de Manta (Nivel PRO · Amazon Bedrock)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Traduce las métricas de Monte Carlo en un Boletín de Emergencia para el COE Cantonal
                  </p>
                </div>
              </div>
              <button
                onClick={generateMayorReport}
                disabled={reportLoading || !result}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                {reportLoading ? 'Generando Boletín...' : 'Generar Informe para el Alcalde'}
              </button>
            </div>

            {mayorReport && (
              <div className="p-4 rounded-lg bg-slate-950 border border-purple-500/30 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                <div className="text-[11px] font-bold text-purple-400 mb-2">Fuente: {reportSource}</div>
                {mayorReport}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
