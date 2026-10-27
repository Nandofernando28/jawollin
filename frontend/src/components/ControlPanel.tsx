import React from 'react';
import {
  Activity, Syringe, DollarSign, Cpu,
  Zap, MapPin, Shuffle, Play, Loader2, ChevronDown,
  Biohazard, ShieldAlert,
} from 'lucide-react';
import type { SimulationParams, StartHubOption } from '../types/simulation';
import { Tooltip } from './Tooltip';
import type { SurprisePreset } from '../hooks/useSimulation';

// ── Slider ────────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  accent?: 'emerald' | 'amber' | 'sky' | 'indigo';
  onChange: (v: number) => void;
}

function SliderRow({ label, tooltip, value, min, max, step, display, accent = 'emerald', onChange }: SliderProps) {
  const colors: Record<string, [string, string]> = {
    emerald: ['text-emerald-400', 'accent-emerald-500'],
    amber:   ['text-amber-400',   'accent-amber-500'],
    sky:     ['text-sky-400',     'accent-sky-500'],
    indigo:  ['text-indigo-400',  'accent-indigo-500'],
  };
  const [valColor, accentCss] = colors[accent];
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1.5 gap-1">
        <div className="flex items-center gap-1 text-slate-400 min-w-0">
          <span className="truncate">{label}</span>
          <Tooltip text={tooltip} />
        </div>
        <span className={`font-mono shrink-0 ${valColor}`}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-full cursor-pointer bg-slate-800 ${accentCss}`}
        aria-label={label}
      />
    </div>
  );
}

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS: { id: SurprisePreset; label: string; sub: string }[] = [
  { id: 'double_beta',     label: 'Contagio ×2',     sub: 'β_D y β_N al doble' },
  { id: 'half_vaccines',   label: '50% Presupuesto', sub: 'Fuerza priorización' },
  { id: 'market_outbreak', label: 'Brote Tarqui',    sub: 'Foco mercado ×10 casos' },
  { id: 'weak_vaccine',    label: 'Vacuna 40%',       sub: 'Cepa resistente' },
];

const START_HUB_OPTIONS: { id: StartHubOption; label: string }[] = [
  { id: 'mercado_tarqui',     label: 'Mercado de Tarqui' },
  { id: 'uleam',              label: 'Campus ULEAM' },
  { id: 'mercado_central',    label: 'Mercado Central' },
  { id: 'empacadoras',        label: 'Los Esteros (Atuneras)' },
  { id: 'terminal_terrestre', label: 'Terminal Terrestre' },
  { id: 'random',             label: 'Aleatorio' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface ControlPanelProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  loading: boolean;
  onRun: () => void;
  onPreset: (p: SurprisePreset) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ControlPanel({ params, setParams, loading, onRun, onPreset }: ControlPanelProps) {
  const set = (patch: Partial<SimulationParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <aside className="flex flex-col gap-3 min-w-0">

      {/* ── Brote Sorpresa ───────────────────────────────────── */}
      <section className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
          <Zap className="w-4 h-4 text-amber-400" />
          Brote Sorpresa — 1 Clic
          <Tooltip text="Reconfigura todos los parámetros y relanza la simulación. Responde al jurado en menos de 5 segundos." />
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(({ id, label, sub }) => (
            <button
              key={id}
              onClick={() => onPreset(id)}
              disabled={loading}
              className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-left transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="text-xs font-semibold text-slate-200">{label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Paciente Cero ────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          Punto de Infección
        </h2>
        <div className="relative">
          <select
            value={params.start_hub}
            onChange={(e) => set({ start_hub: e.target.value as StartHubOption })}
            className="w-full appearance-none px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white pr-8 cursor-pointer"
          >
            {START_HUB_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
        <SliderRow
          label="Infectados Iniciales"
          tooltip="Número de casos índice el día 0."
          value={params.initial_infected} min={1} max={50} step={1}
          display={`${params.initial_infected}`}
          onChange={(v) => set({ initial_infected: v })}
        />
      </section>

      {/* ── Parámetros del Virus ─────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Biohazard className="w-3.5 h-3.5 text-rose-400" />
          Parámetros del Virus
        </h2>
        <SliderRow
          label="Contagio Diurno β_D"
          tooltip="Probabilidad de transmisión en hubs y buses durante el día."
          value={params.beta_day} min={0.01} max={0.40} step={0.005}
          display={params.beta_day.toFixed(3)}
          onChange={(v) => set({ beta_day: v })}
        />
        <SliderRow
          label="Contagio Nocturno β_N"
          tooltip="Transmisión nocturna en hogares y barrios."
          value={params.beta_night} min={0.01} max={0.50} step={0.005}
          display={params.beta_night.toFixed(3)}
          accent="amber"
          onChange={(v) => set({ beta_night: v })}
        />
        <SliderRow
          label="Incubación (días)"
          tooltip="Días en estado Mordido antes de volverse Zombie activo."
          value={params.incubation_days} min={1} max={7} step={0.5}
          display={`${params.incubation_days}d`}
          accent="sky"
          onChange={(v) => set({ incubation_days: v })}
        />
        <SliderRow
          label="Duración Infecciosa"
          tooltip="Días que un nodo permanece Zombie e infeccioso."
          value={params.infectious_days} min={2} max={14} step={1}
          display={`${params.infectious_days}d`}
          accent="sky"
          onChange={(v) => set({ infectious_days: v })}
        />
      </section>

      {/* ── Recursos Municipales ─────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
          Recursos Municipales
        </h2>
        <SliderRow
          label="Eficacia Vacuna η_vac"
          tooltip="Probabilidad de que la vacuna confiera inmunidad. 85% es el valor base."
          value={params.vaccine_efficacy} min={0.10} max={1.0} step={0.05}
          display={`${Math.round(params.vaccine_efficacy * 100)}%`}
          accent="sky"
          onChange={(v) => set({ vaccine_efficacy: v })}
        />
        <SliderRow
          label="Presupuesto Diario ($)"
          tooltip="Recursos por día para vacunas, brigadas y cierres de hubs."
          value={params.daily_budget} min={100} max={3000} step={50}
          display={`$${params.daily_budget.toLocaleString()}`}
          accent="amber"
          onChange={(v) => set({ daily_budget: v })}
        />
        <SliderRow
          label="Presupuesto Total ($)"
          tooltip="Techo financiero total para toda la campaña."
          value={params.total_budget} min={1000} max={60000} step={1000}
          display={`$${params.total_budget.toLocaleString()}`}
          accent="amber"
          onChange={(v) => set({ total_budget: v })}
        />
      </section>

      {/* ── Simulación ───────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          Simulación
        </h2>

        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5">
            Semilla (Seed)
            <Tooltip text="Misma semilla + parámetros = resultado idéntico. Crítico para reproducibilidad." />
          </div>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={params.seed}
              onChange={(e) => set({ seed: Number(e.target.value) })}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-emerald-400"
            />
            <button
              onClick={() => set({ seed: Math.floor(Math.random() * 99999) })}
              title="Semilla aleatoria"
              className="px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5">
            Corridas Monte Carlo
            <Tooltip text="Más corridas = bandas P10-P90 más precisas." />
          </div>
          <select
            value={params.monte_carlo_runs}
            onChange={(e) => set({ monte_carlo_runs: Number(e.target.value) })}
            className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-sky-400 cursor-pointer"
          >
            <option value={1}>1 — Rápida</option>
            <option value={10}>10 réplicas</option>
            <option value={30}>30 réplicas</option>
            <option value={50}>50 réplicas</option>
            <option value={100}>100 — Máxima precisión</option>
          </select>
        </div>

        <SliderRow
          label="Horizonte (días)"
          tooltip="Duración total del brote simulado."
          value={params.days} min={7} max={90} step={5}
          display={`${params.days}d`}
          onChange={(v) => set({ days: v })}
        />

        <button
          onClick={onRun}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Simulando…</>
            : <><Play className="w-4 h-4" />Simular Estrategia</>}
        </button>
      </section>
    </aside>
  );
}
