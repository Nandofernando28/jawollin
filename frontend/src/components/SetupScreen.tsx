/**
 * SetupScreen.tsx — Panel de configuración y Brotes Sorpresa.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §4.1 Espaciado base 4/8 px en formularios y grupos de botones
 * - §4.2 Rejilla responsive: contenedor max-w-4xl y 2 columnas en md:
 * - §5.1 Botones biselados en mayúsculas y tracking .03em
 * - §5.5 Sliders de rango con pista recta y pulgar cuadrado biselado
 */
import React from 'react';
import type { SimulationParams, StartHubOption } from '../types/simulation';
import { DEFAULT_SIMULATION_PARAMS } from '../types/simulation';
import { SURPRISE_PRESETS } from '../data/surprisePresets';
import { PixelIcon } from './PixelIcon';

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
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[15px] leading-tight text-mc-ink">{label}</span>
        <span className="font-pixel text-[10px] text-mc-ink">
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
        className="w-full cursor-pointer appearance-none"
        style={{ background: `linear-gradient(to right, #3c8527 0%, #3c8527 ${pct}%, #3d3938 ${pct}%, #3d3938 100%)` }}
        aria-label={label}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[14px] leading-tight text-mc-muted">{hint}</span>
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
          className="mc-slot-dark w-24 shrink-0 px-2 py-0.5 text-right text-[15px] text-white outline-none"
          aria-label={`${label} (valor exacto)`}
        />
      </div>
    </div>
  );
}

function Section({ icon, kicker, title, children }: { icon: React.ReactNode; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mc-panel p-4">
      <div className="mc-panel-dark mb-4 flex items-center justify-between gap-3 px-3 py-2">
        <div>
          <p className="mc-label text-[#ede5e2]">{kicker}</p>
          <h2 className="mc-title mt-1 text-[14px]">{title}</h2>
        </div>
        <div className="mc-slot flex h-10 w-10 shrink-0 items-center justify-center">{icon}</div>
      </div>
      <div className="space-y-5">{children}</div>
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
    <div className="min-h-screen px-4 py-10 text-white">
      <div className="mc-panel mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mc-panel-dark px-4 py-4">
          <p className="mc-label text-[#ede5e2]">Paso 1 · Operación Cortafuegos Manta · SpookyThon 2026 · Track B</p>
          <h1 className="mc-title mt-2 text-[16px] sm:text-[26px]">Parámetros de Contención Epidemiológica</h1>
          <p className="mt-3 text-[15px] leading-tight text-white">
            Todos los valores son libres y se envían al motor Monte Carlo (AWS o servidor local). Con la misma semilla el resultado es idéntico.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setParams({ ...DEFAULT_SIMULATION_PARAMS })}
            className="mc-button mc-button-primary"
          >
            <PixelIcon name="shield" size={16} />
            Escenario base (semilla 2026)
          </button>
          <span className="mc-label ml-1 text-mc-ink">Brotes Sorpresa:</span>
          {/* Solo cambian los parámetros (sin simular), para poder combinarlos antes de lanzar */}
          {SURPRISE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set(p.changes)}
              title={p.description}
              className="mc-button mc-button-danger"
            >
              <p.icon className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Section icon={<PixelIcon name="pin" size={24} />} kicker="Escenario" title="Semilla y escenario base">
            <label className="block">
              <span className="mb-2 block text-[15px] leading-tight text-mc-ink">Epicentro inicial (paciente cero)</span>
              <select
                value={params.start_hub}
                onChange={(e) => set({ start_hub: e.target.value as StartHubOption })}
                className="mc-slot-dark w-full cursor-pointer px-3 py-1.5 text-[15px] text-white outline-none"
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
            <Section icon={<PixelIcon name="zombie" size={24} />} kicker="Plaga" title="Parámetros biológicos">
              <Field label="Contagio diurno (β día)" hint="Hubs, buses, mercados y aulas" value={params.beta_day} min={0.02} max={0.4} step={0.005} format={(v) => v.toFixed(3)} onChange={(v) => set({ beta_day: v })} />
              <Field label="Contagio nocturno (β noche)" hint="Hogares y barrios" value={params.beta_night} min={0.02} max={0.4} step={0.005} format={(v) => v.toFixed(3)} onChange={(v) => set({ beta_night: v })} />
              <Field label="Incubación" hint="Días como Mordido antes de contagiar" unit="días" value={params.incubation_days} min={1} max={7} step={1} onChange={(v) => set({ incubation_days: v })} />
              <Field label="Fase infecciosa" hint="Días como Zombie contagiando" unit="días" value={params.infectious_days} min={2} max={10} step={1} onChange={(v) => set({ infectious_days: v })} />
            </Section>

            <Section icon={<PixelIcon name="coin" size={24} />} kicker="Escudo Manta" title="Recursos limitados y costos">
              <Field label="Eficacia de la vacuna" hint="Probabilidad de inmunizar a un sano" value={params.vaccine_efficacy} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ vaccine_efficacy: v })} />
              <Field label="Presupuesto diario" hint="Ingresa cada día al COE" unit="USD/día" value={params.daily_budget} min={100} max={3000} step={50} format={usd} onChange={(v) => set({ daily_budget: v })} />
              <Field label="Presupuesto total" hint={`Techo para toda la campaña · alcanza para unas ${Math.floor(params.total_budget / Math.max(params.vaccine_cost, 1)).toLocaleString()} vacunas`} unit="USD" value={params.total_budget} min={1000} max={50000} step={500} format={usd} onChange={(v) => set({ total_budget: v })} />
              <Field label="Costo por vacuna" hint="Por dosis aplicada" unit="USD" value={params.vaccine_cost} min={1} max={100} step={1} format={usd} onChange={(v) => set({ vaccine_cost: v })} />
              <Field label="Costo por brigada" hint="Por brigada de contención" unit="USD" value={params.brigade_cost} min={5} max={300} step={5} format={usd} onChange={(v) => set({ brigade_cost: v })} />
              <Field label="Costo de cierre de hub" hint="Por hub y por día de cortafuegos" unit="USD/día" value={params.hub_closure_cost} min={20} max={1000} step={10} format={usd} onChange={(v) => set({ hub_closure_cost: v })} />
            </Section>
          </div>
        </div>

        {error && (
          <p className="mc-slot-light mt-4 flex items-center gap-3 p-3 text-[15px] leading-tight">
            <PixelIcon name="warning" size={16} />
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onLaunch}
            disabled={loading}
            data-sound="custom"
            className="mc-button mc-button-primary flex-1 py-3 text-[11px]"
          >
            {loading ? <PixelIcon name="hourglass" size={16} className="mc-loading" /> : <PixelIcon name="play" size={16} />}
            {loading ? 'Ejecutando simulación Monte Carlo…' : '[ EJECUTAR SIMULACIÓN DE CONTENCIÓN ]'}
          </button>
          {hasResult && (
            <button
              type="button"
              onClick={onBack}
              className="mc-button py-3 text-[11px]"
            >
              <PixelIcon name="reset" size={16} />
              Volver al resultado actual
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
