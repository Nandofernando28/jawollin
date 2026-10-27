import React from 'react';
import {
  Activity, Syringe, DollarSign, Cpu,
  Flame, MapPin, Shuffle, Zap, Loader2, ChevronDown,
} from 'lucide-react';
import type { SimulationParams, StartHubOption } from '../types/simulation';
import { Tooltip } from './Tooltip';
import type { SurprisePreset } from '../hooks/useSimulation';

// ── Slider con label + valor + tooltip ─────────────────────────────────────

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
  const accentClass: Record<string, string> = {
    emerald: 'text-emerald-400 accent-emerald-500',
    amber:   'text-amber-400  accent-amber-500',
    sky:     'text-sky-400    accent-sky-500',
    indigo:  'text-indigo-400 accent-indigo-500',
  };
  const [valColor, accentCss] = accentClass[accent].split(' ');

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
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-full cursor-pointer bg-slate-800 ${accentCss}`}
        aria-label={label}
      />
    </div>
  );
}

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: { id: SurprisePreset; icon: string; label: string; sub: string }[] = [
  { id: 'double_beta',     icon: '⚡', label: 'Contagio ×2',     sub: 'β_D y β_N al doble' },
  { id: 'half_vaccines',   icon: '📉', label: '50% Presupuesto', sub: 'Fuerza priorización' },
  { id: 'market_outbreak', icon: '🐟', label: 'Brote Tarqui',    sub: 'Foco mercado ×10 casos' },
  { id: 'weak_vaccine',    icon: '🛡️', label: 'Vacuna 40%',      sub: 'Cepa resistente' },
];

const START_HUB_OPTIONS: { id: StartHubOption; label: string }[] = [
  { id: 'mercado_tarqui',    label: '🐟 Mercado de Tarqui' },
  { id: 'uleam',             label: '🎓 Campus ULEAM' },
  { id: 'mercado_central',   label: '🏙️ Mercado Central' },
  { id: 'empacadoras',       label: '🏭 Los Esteros (Atuneras)' },
  { id: 'terminal_terrestre',label: '🚌 Terminal Terrestre' },
  { id: 'random',            label: '🎲 Aleatorio' },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface ControlPanelProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  loading: boolean;
  onRun: () => void;
  onPreset: (p: SurprisePreset) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function ControlPanel({ params, setParams, loading, onRun, onPreset }: ControlPanelProps) {
  const set = (patch: Partial<SimulationParams>) =>
    setParams((p) => ({ ...p, ...patch }));

  return (
    <aside className="flex flex-col gap-4 min-w-0">

      {/* ── Brote Sorpresa ─── */}
      <section className="rounded-xl bg-amber-950/20 border border-amber-500/25 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
          <Flame className="w-4 h-4 text-amber-400" />
          🎃 Brote Sorpresa (1-Clic)
          <Tooltip text="Reconfigura parámetros y relanza la simulación instantáneamente. Diseñado para responder al jurado en &lt; 5 segundos." />
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(({ id, icon, label, sub }) => (
            <button
              key={id}
              onClick={() => onPreset(id)}
              disabled={loading}
              className="p-2.5 rounded-lg bg-amber-500/8 hover:bg-amber-500/18 border border-amber-500/20 text-left transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="text-xs font-bold text-amber-100">{icon} {label}</div>
              <div className="text-[10px] text-amber-300/65 mt-0.5">{sub}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Paciente Cero ──── */}
      <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <MapPin className="w-4 h-4 text-red-400" />
          Punto de Infección Inicial
        </h2>

        <div className="relative">
          <select
            value={params.start_hub}
            onChange={(e) => set({ start_hub: e.target.value as StartHubOption })}
            className="w-full appearance-none px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white pr-8 cursor-pointer"
            aria-label="Hub de inicio del brote"
          >
            {START_HUB_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        <SliderRow
          label="Infectados Iniciales (Día 0)"
          tooltip="Cantidad de zombies en el punto cero al inicio de la simulación. 4 es el escenario base del COE."
          value={params.initial_infected} min={1} max={50} step={1}
          display={`${params.initial_infected} casos`}
          onChange={(v) => set({ initial_infected: v })}
        />
      </section>

      {/* ── Parámetros del Virus ── */}
      <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Activity className="w-4 h-4 text-red-400" />
          Parámetros del Virus
        </h2>
        <SliderRow
          label="Contagio Diurno β_D"
          tooltip="Probabilidad de transmisión por contacto en hubs laborales/educativos y buses durante el día. Mayor β → brote más veloz."
          value={params.beta_day} min={0.01} max={0.40} step={0.005}
          display={params.beta_day.toFixed(3)}
          onChange={(v) => set({ beta_day: v })}
        />
        <SliderRow
          label="Contagio Nocturno β_N"
          tooltip="Transmisión en hogares y barrios durante la noche. Siempre > β_D porque los zombies se mueven sin control en la oscuridad."
          value={params.beta_night} min={0.01} max={0.50} step={0.005}
          display={params.beta_night.toFixed(3)}
          accent="amber"
          onChange={(v) => set({ beta_night: v })}
        />
        <SliderRow
          label="Período de Incubación (días)"
          tooltip="Tiempo en estado 'Mordido' antes de volverse Zombie activo. Más días = más ventana de tiempo para aislar antes del pico."
          value={params.incubation_days} min={1} max={7} step={0.5}
          display={`${params.incubation_days} días`}
          accent="sky"
          onChange={(v) => set({ incubation_days: v })}
        />
        <SliderRow
          label="Duración Infecciosa (días)"
          tooltip="Días que un nodo permanece en estado Zombie activo e infeccioso antes de pasar a Aislado o Exorcizado."
          value={params.infectious_days} min={2} max={14} step={1}
          display={`${params.infectious_days} días`}
          accent="sky"
          onChange={(v) => set({ infectious_days: v })}
        />
      </section>

      {/* ── Recursos y Presupuesto ── */}
      <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Syringe className="w-4 h-4 text-blue-400" />
          Recursos Municipales
        </h2>
        <SliderRow
          label="Eficacia de la Vacuna η_vac"
          tooltip="Probabilidad de que la vacuna confiera inmunidad duradera. 85% es el valor clínico base. Reducirlo simula una cepa resistente."
          value={params.vaccine_efficacy} min={0.10} max={1.0} step={0.05}
          display={`${Math.round(params.vaccine_efficacy * 100)}%`}
          accent="sky"
          onChange={(v) => set({ vaccine_efficacy: v })}
        />
        <SliderRow
          label="Presupuesto Diario COE ($)"
          tooltip="Recursos económicos disponibles por día para vacunas, brigadas y cierres de hubs. Limita cuántas defensas se pueden activar simultáneamente."
          value={params.daily_budget} min={100} max={3000} step={50}
          display={`$${params.daily_budget.toLocaleString()}`}
          accent="amber"
          onChange={(v) => set({ daily_budget: v })}
        />
        <SliderRow
          label="Presupuesto Total Campaña ($)"
          tooltip="Techo financiero total para toda la operación. El algoritmo optimizador no puede excederlo."
          value={params.total_budget} min={1000} max={60000} step={1000}
          display={`$${params.total_budget.toLocaleString()}`}
          accent="amber"
          onChange={(v) => set({ total_budget: v })}
        />
      </section>

      {/* ── Simulación ── */}
      <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Configuración de Simulación
        </h2>

        {/* Semilla */}
        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5">
            Semilla Reproducible (Seed PCG64)
            <Tooltip text="Fija el generador pseudoaleatorio. Misma semilla + mismos parámetros = resultado idéntico siempre. Crítico para reproducibilidad científica ante el jurado." />
          </div>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={params.seed}
              onChange={(e) => set({ seed: Number(e.target.value) })}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-emerald-400"
              aria-label="Semilla de simulación"
            />
            <button
              onClick={() => set({ seed: Math.floor(Math.random() * 99999) })}
              title="Generar semilla aleatoria"
              className="px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MC runs */}
        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5">
            Corridas Monte Carlo
            <Tooltip text="Número de réplicas independientes. Más corridas = bandas P10-P90 más precisas. 1 corre en &lt;1s, 100 en ~10s." />
          </div>
          <select
            value={params.monte_carlo_runs}
            onChange={(e) => set({ monte_carlo_runs: Number(e.target.value) })}
            className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-sky-400 cursor-pointer"
          >
            <option value={1}>1 — Rápida (demo)</option>
            <option value={10}>10 réplicas</option>
            <option value={30}>30 réplicas (recomendado)</option>
            <option value={50}>50 réplicas</option>
            <option value={100}>100 — Máxima precisión</option>
          </select>
        </div>

        <SliderRow
          label="Horizonte de simulación"
          tooltip="Días totales del brote simulado. 30 días cubre el pico de un brote típico urbano. 60 días muestra la extinción completa."
          value={params.days} min={7} max={90} step={5}
          display={`${params.days} días`}
          onChange={(v) => set({ days: v })}
        />

        <button
          onClick={onRun}
          disabled={loading}
          className="
            w-full flex items-center justify-center gap-2
            py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
            disabled:opacity-50 disabled:cursor-not-allowed
            text-sm font-bold text-white transition-all
            shadow-lg shadow-emerald-900/30 cursor-pointer
          "
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Simulando Monte Carlo…</>
            : <><Zap className="w-4 h-4" />▶ EJECUTAR SIMULACIÓN</>
          }
        </button>
      </section>
    </aside>
  );
}
