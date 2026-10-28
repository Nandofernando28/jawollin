/**
 * SetupScreen — Panel de parámetros libres (Calibración y Brote Sorpresa)
 *
 * Fase 6 · tarea 5.2: sliders e inputs numéricos libres, agrupados en
 *   1) Semilla y escenario base, 2) Parámetros biológicos, 3) Recursos y costos.
 * Cada control muestra valor actual, unidad y qué representa. Todos los valores
 * se envían tal cual al backend (SimulationParams); no hay datos simulados aquí.
 */
import React from 'react';
import { Biohazard, Hash, Loader2, MapPin, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import type { SimulationParams, StartHubOption } from '../types/simulation';
import { DEFAULT_SIMULATION_PARAMS } from '../types/simulation';
import { SURPRISE_PRESETS } from '../data/surprisePresets';

interface FieldProps {
  label: string;
  hint: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

function Field({ label, hint, unit, value, min, max, step, format, onChange }: FieldProps) {
  const pct = ((value - min) / (max - min)) * 100;
  // Borrador del input numérico: se puede escribir libremente ("2", "25", "2500") y el
  // valor se aplica (ajustado a min–max) solo al salir del campo o al pulsar Enter.
  const [draft, setDraft] = React.useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(',', '.'));
    if (draft.trim() !== '' && !Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
  };
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-medium text-[#111a4a]">{label}</span>
        <span className="font-mono text-[#167e6c]">
          {format ? format(value) : value}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg"
        style={{ background: `linear-gradient(to right, #167e6c 0%, #167e6c ${pct}%, #e3e4e8 ${pct}%, #e3e4e8 100%)` }}
        aria-label={label}
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] leading-tight text-[#7c7f88]">{hint}</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setDraft(null);
          }}
          className="w-20 shrink-0 rounded-md border border-[#e3e4e8] bg-white px-2 py-1 text-right font-mono text-[11px] text-[#111a4a] outline-none focus:border-[#111a4a]"
          aria-label={`${label} (valor exacto)`}
        />
      </div>
    </div>
  );
}

function Section({ icon, kicker, title, children }: { icon: React.ReactNode; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">{kicker}</p>
          <h2 className="mt-1 text-lg font-semibold text-[#111a4a]">{title}</h2>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#111a4a]">{icon}</div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const START_HUBS: { id: StartHubOption; label: string }[] = [
  { id: 'mercado_tarqui', label: 'Mercado de Tarqui' },
  { id: 'uleam', label: 'Campus ULEAM' },
  { id: 'mercado_central', label: 'Mercado Central' },
  { id: 'empacadoras', label: 'Empacadoras (Los Esteros)' },
  { id: 'terminal_terrestre', label: 'Terminal Terrestre' },
  { id: 'random', label: 'Aleatorio' },
];

interface SetupScreenProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  loading: boolean;
  error: string | null;
  hasResult: boolean;
  onLaunch: () => void;
  onBack: () => void;
}

export function SetupScreen({ params, setParams, loading, error, hasResult, onLaunch, onBack }: SetupScreenProps) {
  const set = (patch: Partial<SimulationParams>) => setParams((p) => ({ ...p, ...patch }));
  const usd = (v: number) => `$${v.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-[#f6f6f8] px-4 py-10 text-[#111a4a]">
      <div className="mx-auto max-w-4xl rounded-lg border border-[#e3e4e8] bg-white p-8 shadow-xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Operación Cortafuegos Manta · SpookyThon 2026 · Track B</p>
        <h1 className="mt-1 text-2xl font-semibold">Parámetros de Contención Epidemiológica</h1>
        <p className="mt-2 text-sm text-[#3b3e47]">
          Todos los valores son libres y se envían al motor Monte Carlo (AWS o servidor local). Con la misma semilla el resultado es idéntico.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setParams({ ...DEFAULT_SIMULATION_PARAMS })}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#e3e4e8] bg-white px-4 py-2.5 text-[11px] font-medium shadow-sm transition hover:bg-[#f6f6f8]"
          >
            <ShieldCheck className="h-4 w-4 text-[#167e6c]" />
            Escenario base (semilla 2026)
          </button>
          <span className="ml-1 text-[11px] font-semibold uppercase tracking-wider text-[#7c7f88]">Brotes Sorpresa:</span>
          {/* Solo cambian los parámetros (sin simular), para poder combinarlos antes de lanzar */}
          {SURPRISE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set(p.changes)}
              title={p.description}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e4e8] bg-white px-3 py-2.5 text-[11px] font-medium shadow-sm transition hover:bg-[#f6f6f8]"
            >
              <p.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Section icon={<MapPin className="h-4 w-4" />} kicker="Escenario" title="Semilla y escenario base">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium">Epicentro inicial (paciente cero)</span>
              <select
                value={params.start_hub}
                onChange={(e) => set({ start_hub: e.target.value as StartHubOption })}
                className="w-full cursor-pointer rounded-lg border border-[#e3e4e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#111a4a]"
              >
                {START_HUBS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Semilla determinista" hint="Misma semilla = mismo resultado exacto" value={params.seed} min={0} max={99999} step={1} onChange={(v) => set({ seed: Math.round(v) })} />
            <Field label="Población de la red" hint="Habitantes sintéticos simulados" unit="hab." value={params.n_nodes} min={200} max={5000} step={100} onChange={(v) => set({ n_nodes: v })} />
            <Field label="Pacientes cero" hint="Infectados iniciales en el epicentro" value={params.initial_infected} min={1} max={50} step={1} onChange={(v) => set({ initial_infected: v })} />
            <Field label="Horizonte" hint="Duración de la simulación" unit="días" value={params.days} min={7} max={90} step={1} onChange={(v) => set({ days: v })} />
            <Field label="Corridas Monte Carlo" hint="Más corridas = bandas P10–P90 más estables" value={params.monte_carlo_runs} min={5} max={100} step={5} onChange={(v) => set({ monte_carlo_runs: v })} />
          </Section>

          <div className="space-y-6">
            <Section icon={<Biohazard className="h-4 w-4" />} kicker="Plaga" title="Parámetros biológicos">
              <Field label="Contagio diurno (β día)" hint="Hubs, buses, mercados y aulas" value={params.beta_day} min={0.02} max={0.4} step={0.005} format={(v) => v.toFixed(3)} onChange={(v) => set({ beta_day: v })} />
              <Field label="Contagio nocturno (β noche)" hint="Hogares y barrios" value={params.beta_night} min={0.02} max={0.4} step={0.005} format={(v) => v.toFixed(3)} onChange={(v) => set({ beta_night: v })} />
              <Field label="Incubación" hint="Días como Mordido antes de contagiar" unit="días" value={params.incubation_days} min={1} max={7} step={1} onChange={(v) => set({ incubation_days: v })} />
              <Field label="Fase infecciosa" hint="Días como Zombie contagiando" unit="días" value={params.infectious_days} min={2} max={10} step={1} onChange={(v) => set({ infectious_days: v })} />
            </Section>

            <Section icon={<Hash className="h-4 w-4" />} kicker="Escudo Manta" title="Recursos limitados y costos">
              <Field label="Eficacia de la vacuna" hint="Probabilidad de inmunizar a un sano" value={params.vaccine_efficacy} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ vaccine_efficacy: v })} />
              <Field label="Presupuesto diario" hint="Ingresa cada día al COE" unit="USD/día" value={params.daily_budget} min={100} max={3000} step={50} format={usd} onChange={(v) => set({ daily_budget: v })} />
              <Field label="Presupuesto total" hint="Techo para toda la campaña" unit="USD" value={params.total_budget} min={1000} max={50000} step={500} format={usd} onChange={(v) => set({ total_budget: v })} />
              <Field label="Costo por vacuna" hint="Por dosis aplicada" unit="USD" value={params.vaccine_cost} min={1} max={100} step={1} format={usd} onChange={(v) => set({ vaccine_cost: v })} />
              <Field label="Costo por brigada" hint="Por brigada de contención" unit="USD" value={params.brigade_cost} min={5} max={300} step={5} format={usd} onChange={(v) => set({ brigade_cost: v })} />
              <Field label="Costo de cierre de hub" hint="Por hub y por día de cortafuegos" unit="USD/día" value={params.hub_closure_cost} min={20} max={1000} step={10} format={usd} onChange={(v) => set({ hub_closure_cost: v })} />
            </Section>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-[#f0d7a8] bg-[#fffaf2] p-3 text-sm text-[#7c5a1a]">{error}</p>}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onLaunch}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#ec652b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dc5725] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? 'Ejecutando simulación Monte Carlo…' : 'Ejecutar simulación Monte Carlo'}
          </button>
          {hasResult && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e3e4e8] bg-white px-5 py-3 text-sm font-medium text-[#3b3e47] transition hover:bg-[#f6f6f8]"
            >
              <RotateCcw className="h-4 w-4" />
              Volver al resultado actual
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
