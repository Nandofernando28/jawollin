import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Biohazard,
  Building2,
  ChevronDown,
  Clock,
  Cpu,
  Dices,
  FileText,
  FlaskConical,
  Gauge,
  Hash,
  HeartPulse,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Syringe,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react';

import { MantaMap } from './components/MantaMap';
import { MANTA_HUBS } from './data/mantaGeo';

type Policy = 'moderate' | 'strict' | 'aggressive';
type CrisisPreset = 'standard' | 'supercontagion' | 'budget_cut' | 'terminal_focus';
type HubToggleState = Record<string, boolean>;

const TOTAL_DAYS = 30;
const POLICY_META: Record<Policy, { label: string; reduction: number; pressure: number }> = {
  moderate: { label: 'Moderada', reduction: 0.24, pressure: 0.5 },
  strict: { label: 'Estricta', reduction: 0.41, pressure: 0.72 },
  aggressive: { label: 'Agresiva', reduction: 0.58, pressure: 0.9 },
};

const PRESET_META: Record<CrisisPreset, { label: string; multiplier: number; note: string }> = {
  standard: { label: 'Brote Estandar', multiplier: 0.0, note: 'Riesgo endemico estable' },
  supercontagion: { label: 'Variante Supercontagio (2x)', multiplier: 0.2, note: 'Transmision acelerada' },
  budget_cut: { label: 'Corte Presupuestario (50%)', multiplier: -0.08, note: 'Recursos reducidos' },
  terminal_focus: { label: 'Foco en Terminal', multiplier: 0.1, note: 'Presion alta por transito' },
};

const DEFAULT_HUB_STATE: HubToggleState = {
  tarqui: true,
  uleam: false,
  terminal: true,
  mercado_central: true,
  empacadoras: false,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatCompact = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

const buildLinePath = (values: number[], width: number, height: number, padding: number) => {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const ratio = (value - minValue) / range;
      const y = height - padding - ratio * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

const polarPoint = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = angle - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

export default function App() {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState(14);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [policy, setPolicy] = useState<Policy>('strict');
  const [selectedPreset, setSelectedPreset] = useState<CrisisPreset>('standard');
  const [alertOpen, setAlertOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [seed, setSeed] = useState(42);
  const [hubState, setHubState] = useState<HubToggleState>(DEFAULT_HUB_STATE);
  const [initialFocus, setInitialFocus] = useState<string>('tarqui');
  const [initialR0, setInitialR0] = useState(2.6);
  const [initialHub, setInitialHub] = useState<string>('tarqui');
  const [budgetAssigned, setBudgetAssigned] = useState(80000);
  const [initialDoses, setInitialDoses] = useState(300);
  const [initialBrigades, setInitialBrigades] = useState(8);
  const [setupSeed, setSetupSeed] = useState(42);
  const [setupPolicy, setSetupPolicy] = useState<Policy>('strict');

  const applyScenarioPreset = (preset: 'standard' | 'supercontagion') => {
    if (preset === 'standard') {
      setInitialFocus('tarqui');
      setInitialHub('tarqui');
      setInitialR0(2.6);
      setBudgetAssigned(80000);
      setInitialDoses(300);
      setInitialBrigades(8);
      setSetupSeed(42);
      setSetupPolicy('strict');
      setSelectedPreset('standard');
      setPolicy('strict');
      setSeed(42);
      setHubState({ tarqui: true, uleam: false, terminal: true, mercado_central: true, empacadoras: false });
      return;
    }

    setInitialFocus('terminal');
    setInitialHub('terminal');
    setInitialR0(4.1);
    setBudgetAssigned(94000);
    setInitialDoses(420);
    setInitialBrigades(10);
    setSetupSeed(91);
    setSetupPolicy('aggressive');
    setSelectedPreset('supercontagion');
    setPolicy('aggressive');
    setSeed(91);
    setHubState({ tarqui: true, uleam: true, terminal: true, mercado_central: true, empacadoras: true });
  };

  const launchSimulation = () => {
    setSeed(setupSeed);
    setPolicy(setupPolicy);
    setCurrentDay(14);
    setPlaying(false);
    setSelectedPreset('standard');
    setHubState((prev) => ({
      ...prev,
      tarqui: initialFocus === 'tarqui' || prev.tarqui,
      uleam: initialFocus === 'uleam' || prev.uleam,
      terminal: initialFocus === 'terminal' || prev.terminal,
      mercado_central: initialFocus === 'mercado_central' || prev.mercado_central,
      empacadoras: initialFocus === 'empacadoras' || prev.empacadoras,
    }));
    setIsConfigured(true);
  };

  const policySummary = POLICY_META[policy];
  const presetSummary = PRESET_META[selectedPreset];

  const intervenedHubs = useMemo(
    () => Object.entries(hubState).filter(([, enabled]) => enabled).map(([id]) => id),
    [hubState],
  );

  useEffect(() => {
    if (!playing) return undefined;

    const intervalMs = speed === 1 ? 1300 : speed === 2 ? 800 : 500;
    const timer = window.setInterval(() => {
      setCurrentDay((day) => {
        if (day >= TOTAL_DAYS) {
          setPlaying(false);
          return TOTAL_DAYS;
        }
        return day + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [playing, speed]);

  const effectiveReduction = clamp(
    policySummary.reduction + (intervenedHubs.length / Math.max(MANTA_HUBS.length, 1)) * 0.18 + presetSummary.multiplier * 0.24,
    0.12,
    0.82,
  );

  const { baseCurve, randomCurve, strategicCurve } = useMemo(() => {
    const base: number[] = [];
    const random: number[] = [];
    const strategic: number[] = [];

    for (let day = 1; day <= TOTAL_DAYS; day += 1) {
      const wave = 26 + day * 10.8 + (selectedPreset === 'supercontagion' ? 14 : 0);
      const acceleration = Math.pow(day, 1.52) * 1.7;
      const noise =
        Math.sin((day + seed * 0.13) * 0.88) * 28 +
        Math.cos(day * 0.33 + seed * 0.07) * 18 +
        (selectedPreset === 'terminal_focus' ? 12 : 0);
      const baseValue = Math.max(20, Math.round(wave + acceleration + noise));

      const randomReduction = clamp(
        0.12 + policySummary.pressure * 0.18 + presetSummary.multiplier * 0.22 + day * 0.003,
        0.08,
        0.48,
      );
      const strategicReduction = clamp(
        effectiveReduction +
          (intervenedHubs.length / Math.max(MANTA_HUBS.length, 1)) * 0.24 +
          (selectedPreset === 'budget_cut' ? -0.1 : 0.1) +
          0.08,
        0.18,
        0.8,
      );

      const randomValue = Math.max(16, Math.round(baseValue * (1 - randomReduction)));
      const strategicValue = Math.max(
        8,
        Math.round(baseValue * (1 - strategicReduction * (0.66 + (day / TOTAL_DAYS) * 0.45))),
      );

      base.push(baseValue);
      random.push(randomValue);
      strategic.push(strategicValue);
    }

    return { baseCurve: base, randomCurve: random, strategicCurve: strategic };
  }, [effectiveReduction, intervenedHubs.length, policySummary.pressure, presetSummary.multiplier, seed, selectedPreset]);

  const currentBaseValue = baseCurve[currentDay - 1] ?? baseCurve[0];
  const currentStrategicValue = strategicCurve[currentDay - 1] ?? strategicCurve[0];

  const cumulativeAvoided = useMemo(() => {
    return baseCurve
      .slice(0, currentDay)
      .reduce((total, value, index) => total + Math.max(0, value - (strategicCurve[index] ?? value)), 0);
  }, [baseCurve, currentDay, strategicCurve]);

  const totalRandomCases = randomCurve.reduce((sum, value) => sum + value, 0);
  const totalStrategicCases = strategicCurve.reduce((sum, value) => sum + value, 0);
  const avoidedPct = Math.round(((totalRandomCases - totalStrategicCases) / Math.max(totalRandomCases, 1)) * 100);

  const containmentLevel = clamp(Math.round((effectiveReduction + 0.07) * 100), 18, 98);
  const infectionRate = clamp(Math.round((currentStrategicValue / Math.max(currentBaseValue, 1)) * 100), 18, 100);
  const activeInfected = currentStrategicValue;
  const networkState =
    containmentLevel >= 75 ? 'Red estable' : containmentLevel >= 50 ? 'Presion controlada' : 'Riesgo activo';

  const zombieByParroquia = useMemo(() => {
    const baseMap: Record<string, number> = {
      Tarqui: 155,
      'Manta Centro': 131,
      'Los Esteros': 93,
      'Eloy Alfaro': 121,
      'San Mateo / Sur': 74,
    };

    const reductionMultiplier = 1 - effectiveReduction * 0.82;
    const activeIds = new Set(intervenedHubs);

    return Object.fromEntries(
      Object.entries(baseMap).map(([name, value]) => {
        const hubMultiplier =
          (name === 'Tarqui' && activeIds.has('tarqui') ? 0.62 : 1) *
          (name === 'Manta Centro' && activeIds.has('uleam') ? 0.68 : 1) *
          (name === 'Los Esteros' && activeIds.has('empacadoras') ? 0.58 : 1) *
          (name === 'Eloy Alfaro' && activeIds.has('terminal') ? 0.72 : 1) *
          (name === 'San Mateo / Sur' && activeIds.has('mercado_central') ? 0.79 : 1);

        const dayFactor = 0.7 + (currentDay / TOTAL_DAYS) * 0.9;
        const adjusted = Math.max(12, Math.round(value * reductionMultiplier * hubMultiplier * dayFactor));

        return [name, adjusted];
      }),
    );
  }, [currentDay, effectiveReduction, intervenedHubs]);

  const budgetAvailable = budgetAssigned;
  const budgetSpent = useMemo(() => {
    const base =
      22000 +
      currentDay * 480 +
      intervenedHubs.length * 5300 +
      (policy === 'aggressive' ? 14000 : policy === 'strict' ? 9500 : 5500) +
      (selectedPreset === 'budget_cut' ? -15000 : selectedPreset === 'supercontagion' ? 10000 : 0);
    return clamp(base, 18000, Math.max(18000, budgetAvailable));
  }, [budgetAvailable, currentDay, intervenedHubs.length, policy, selectedPreset]);

  const dashboardBudgetPercent = clamp((budgetSpent / Math.max(budgetAvailable, 1)) * 100, 18, 100);
  const dosageAvailable = Math.max(
    60,
    initialDoses - currentDay * 4 - intervenedHubs.length * 16 + (selectedPreset === 'budget_cut' ? -50 : 20),
  );
  const brigadesAvailable = Math.max(
    2,
    initialBrigades - currentDay / 2 + intervenedHubs.length + (selectedPreset === 'budget_cut' ? -2 : 1),
  );
  const testKits = Math.max(
    40,
    260 - currentDay * 4 + intervenedHubs.length * 12 + (selectedPreset === 'budget_cut' ? -30 : 14),
  );

  const seirState = useMemo(() => {
    const baseShare = Math.max(0.18, 0.76 - currentDay * 0.0035 - effectiveReduction * 0.32);
    const exposedShare = Math.max(0.08, 0.16 + effectiveReduction * 0.12 + (intervenedHubs.length / 5) * 0.08);
    const infectedShare = Math.max(0.04, 0.16 - effectiveReduction * 0.22 + (currentDay / TOTAL_DAYS) * 0.06);
    const recoveredShare = Math.max(0.06, 1 - baseShare - exposedShare - infectedShare);

    return [
      { label: 'Sano', value: clamp(baseShare * 100, 20, 80), color: '#167e6c', icon: ShieldCheck },
      { label: 'Expuesto', value: clamp(exposedShare * 100, 6, 24), color: '#f59e0b', icon: Clock },
      { label: 'Infectado', value: clamp(infectedShare * 100, 5, 20), color: '#ec652b', icon: Biohazard },
      { label: 'Recuperado', value: clamp(recoveredShare * 100, 6, 30), color: '#1e4199', icon: Shield },
    ];
  }, [currentDay, effectiveReduction, intervenedHubs.length]);

  const parishes = [
    { label: 'Tarqui', value: zombieByParroquia['Tarqui'] ?? 0 },
    { label: 'Centro', value: zombieByParroquia['Manta Centro'] ?? 0 },
    { label: 'Los Esteros', value: zombieByParroquia['Los Esteros'] ?? 0 },
    { label: 'Eloy Alfaro', value: zombieByParroquia['Eloy Alfaro'] ?? 0 },
    { label: 'San Mateo', value: zombieByParroquia['San Mateo / Sur'] ?? 0 },
  ];
  const maxParishValue = Math.max(...parishes.map((item) => item.value), 1);

  const chartWidth = 780;
  const chartHeight = 290;
  const chartPadding = 24;
  const baseLine = buildLinePath(baseCurve, chartWidth, chartHeight, chartPadding);
  const randomLine = buildLinePath(randomCurve, chartWidth, chartHeight, chartPadding);
  const strategicLine = buildLinePath(strategicCurve, chartWidth, chartHeight, chartPadding);
  const markerX = chartPadding + (currentDay / TOTAL_DAYS) * (chartWidth - chartPadding * 2);

  const hospitalCapacity = 120;
  const hospitalLoad = clamp((currentStrategicValue / hospitalCapacity) * 100, 0, 170);
  const hospitalAlert = hospitalLoad > 100;

  const rValue = clamp(2.8 - effectiveReduction * 2.4, 0.7, 2.8);
  const radialCircumference = 2 * Math.PI * 52;
  const radialDashOffset = radialCircumference - (rValue / 2.8) * radialCircumference;

  const statCards = [
    {
      label: 'Infectados Activos',
      value: formatCompact(activeInfected),
      helper: `Dia ${currentDay} / base ${formatCompact(currentBaseValue)}`,
      tint: 'bg-[#edf9f6]',
      percent: Math.min(100, Math.round((currentStrategicValue / Math.max(currentBaseValue, 1)) * 100)),
      icon: Activity,
    },
    {
      label: 'Casos Evitados',
      value: formatCompact(cumulativeAvoided),
      helper: `${avoidedPct}% vs. azar`,
      tint: 'bg-[#f3f6ff]',
      percent: Math.min(100, avoidedPct),
      icon: TrendingUp,
    },
    {
      label: 'Nivel de Contencion',
      value: `${containmentLevel}%`,
      helper: `${intervenedHubs.length} hubs aislados activos`,
      tint: 'bg-[#f6f6f8]',
      percent: containmentLevel,
      icon: ShieldCheck,
    },
    {
      label: 'Estado de la Red',
      value: networkState,
      helper: `${infectionRate}% infectados remanentes`,
      tint: 'bg-[#fffaf2]',
      percent: Math.min(100, infectionRate),
      icon: Gauge,
    },
  ];

  const toggleHub = (hubId: string) => {
    setHubState((prev) => ({
      ...prev,
      [hubId]: !prev[hubId],
    }));
  };

  const handleMaxAlert = () => {
    setAlertOpen(true);
    setHubState({
      tarqui: true,
      uleam: true,
      terminal: true,
      mercado_central: true,
      empacadoras: true,
    });
  };

  const gaussianPoints = useMemo(() => {
    const values: number[] = [];
    for (let index = 0; index < 22; index += 1) {
      const x = (index / 21) * 2 - 1;
      const y = Math.exp(-0.5 * (x * x) * 3.5) * 0.9;
      values.push(y);
    }
    return values;
  }, [seed]);

  const gaussianPath = useMemo(() => {
    const width = 220;
    const height = 62;
    const padding = 4;

    return gaussianPoints
      .map((value, index) => {
        const x = padding + (index / (gaussianPoints.length - 1)) * (width - padding * 2);
        const y = height - padding - value * (height - padding * 2);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [gaussianPoints]);

  const playbackSpeedForMap: 1 | 2 | 5 = speed === 4 ? 5 : speed;

  if (!isConfigured) {
    const r0Percent = ((initialR0 - 1.2) / (4.5 - 1.2)) * 100;
    const budgetPercent = ((budgetAssigned - 20000) / (120000 - 20000)) * 100;

    return (
      <div className="min-h-screen bg-[#f6f6f8] px-4 py-10 text-[#111a4a]">
        <div className="mx-auto max-w-2xl rounded-lg border border-[#e3e4e8] bg-white p-8 shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Configuracion</p>
                <h1 className="mt-1 text-2xl font-semibold text-[#111a4a]">Parametros de Contencion Epidemiologica Manta</h1>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-[#3b3e47]">
            Configure el escenario inicial de propagacion antes de iniciar el motor de simulacion.
          </p>

          <div className="mt-3 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => applyScenarioPreset('standard')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e3e4e8] bg-white px-4 py-2.5 text-center text-[11px] font-medium text-[#111a4a] shadow-sm transition hover:bg-[#f6f6f8]"
            >
              <ShieldCheck className="h-4 w-4 text-[#167e6c]" />
              <span>Cargar Escenario Estandar (COVID-19 base)</span>
            </button>
            <button
              type="button"
              onClick={() => applyScenarioPreset('supercontagion')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e3e4e8] bg-white px-4 py-2.5 text-center text-[11px] font-medium text-[#111a4a] shadow-sm transition hover:bg-[#f6f6f8]"
            >
              <Biohazard className="h-4 w-4 text-[#ec652b]" />
              <span>Cargar Variante de Alta Transmisibilidad</span>
            </button>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Patologia</p>
                  <h2 className="mt-2 text-lg font-semibold text-[#111a4a]">Foco Inicial</h2>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#111a4a]">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">Punto cero</span>
                <div className="relative w-full">
                  <select
                    value={initialHub}
                    onChange={(event) => setInitialHub(event.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#e3e4e8] bg-white px-3 py-2.5 pr-8 text-sm text-[#111a4a] outline-none focus:border-[#111a4a]"
                  >
                    {MANTA_HUBS.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#7c7f88]">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </label>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-[11px] text-[#3b3e47]">
                  <span>R0 inicial</span>
                  <span className="font-mono text-[#167e6c]">{initialR0.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="4.5"
                  step="0.1"
                  value={initialR0}
                  onChange={(event) => setInitialR0(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg"
                  style={{
                    background: `linear-gradient(to right, #167e6c 0%, #167e6c ${r0Percent}%, #e3e4e8 ${r0Percent}%, #e3e4e8 100%)`,
                  }}
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Recursos</p>
                    <h2 className="mt-2 text-lg font-semibold text-[#111a4a]">Presupuesto Municipal</h2>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#111a4a]">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[11px] text-[#3b3e47]">
                      <span>Presupuesto asignado</span>
                      <span className="font-mono text-[#111a4a]">${budgetAssigned.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="20000"
                      max="120000"
                      step="5000"
                      value={budgetAssigned}
                      onChange={(event) => setBudgetAssigned(Number(event.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg"
                      style={{
                        background: `linear-gradient(to right, #167e6c 0%, #167e6c ${budgetPercent}%, #e3e4e8 ${budgetPercent}%, #e3e4e8 100%)`,
                      }}
                    />
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">Dosis de vacunas COVID</span>
                    <div className="relative">
                      <Syringe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#167e6c]" />
                      <input
                        type="number"
                        value={initialDoses}
                        onChange={(event) => setInitialDoses(Number(event.target.value) || 0)}
                        className="w-full rounded-lg border border-[#e3e4e8] bg-white py-2.5 pl-10 pr-3 text-sm text-[#111a4a] outline-none"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">Brigadas de cerco epidemiologico</span>
                    <div className="relative">
                      <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111a4a]" />
                      <input
                        type="number"
                        value={initialBrigades}
                        onChange={(event) => setInitialBrigades(Number(event.target.value) || 0)}
                        className="w-full rounded-lg border border-[#e3e4e8] bg-white py-2.5 pl-10 pr-3 text-sm text-[#111a4a] outline-none"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Estrategia</p>
                    <h2 className="mt-2 text-lg font-semibold text-[#111a4a]">Reproducibilidad</h2>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#111a4a]">
                    <Hash className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">Semilla</span>
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#167e6c]" />
                      <input
                        type="number"
                        value={setupSeed}
                        onChange={(event) => setSetupSeed(Number(event.target.value) || 0)}
                        className="w-full rounded-lg border border-[#e3e4e8] bg-white py-2.5 pl-10 pr-3 text-sm text-[#111a4a] outline-none"
                      />
                    </div>
                  </label>

                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">Politica inicial</p>
                    <div className="mt-2 flex w-full flex-col gap-2">
                      {[
                        {
                          id: 'moderate',
                          label: 'MODERATE',
                          desc: 'Uso de mascarillas y aforo controlado',
                        },
                        {
                          id: 'strict',
                          label: 'STRICT',
                          desc: 'Restriccion vehicular y cerco perimetral',
                        },
                        {
                          id: 'aggressive',
                          label: 'AGGRESSIVE',
                          desc: 'Cuarentena total inmediata en focos',
                        },
                      ].map((item) => {
                        const isSelected = setupPolicy === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSetupPolicy(item.id as Policy)}
                            className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition ${
                              isSelected
                                ? 'border-[#167e6c] bg-[#167e6c]/10 text-[#111a4a] shadow-sm ring-1 ring-[#167e6c]/20'
                                : 'border-[#e3e4e8] bg-white text-[#3b3e47] hover:bg-[#f6f6f8]'
                            }`}
                          >
                            <div>
                              <span
                                className={`block text-[11px] font-mono font-semibold tracking-wide ${
                                  isSelected ? 'text-[#167e6c]' : 'text-[#111a4a]'
                                }`}
                              >
                                {item.label}
                              </span>
                              <span className="mt-0.5 block text-[10px] text-[#7c7f88]">{item.desc}</span>
                            </div>
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
                                isSelected ? 'border-[#167e6c] bg-[#167e6c]' : 'border-[#cbcccf] bg-white'
                              }`}
                            >
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={launchSimulation}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ec652b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dc5725]"
          >
            Lanzar Simulacion de Contencion
            <Play className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] text-[#111a4a]">
      <header className="sticky top-0 z-40 border-b border-[#e3e4e8] bg-white/90 px-6 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111a4a] font-mono text-xs font-bold text-white shadow-sm">
                M
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#111a4a]">
                    Manta Epidemic Console
                  </h1>
                  <span className="rounded border border-[#167e6c]/20 bg-[#167e6c]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#167e6c]">
                    Track B
                  </span>
                </div>
                <p className="text-[11px] text-[#7c7f88]">
                  Hubs intervenidos: <span className="font-semibold text-[#111a4a]">{intervenedHubs.length}/5</span>
                </p>
              </div>
            </div>

          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setIsConfigured(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e4e8] px-3 py-1.5 text-xs font-medium text-[#3b3e47] transition hover:bg-[#f6f6f8]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#111a4a]" />
              <span>Parametros</span>
            </button>

            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e4e8] px-3 py-1.5 text-xs font-medium text-[#3b3e47] transition hover:bg-[#f6f6f8]"
            >
              <FileText className="h-3.5 w-3.5 text-[#167e6c]" />
              <span>Informe</span>
            </button>

            <button
              type="button"
              onClick={handleMaxAlert}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#ec652b] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d8561f]"
            >
              <BellRing className="h-3.5 w-3.5" />
              <span>Maxima Alerta</span>
            </button>
          </div>
        </div>
      </header>

      {alertOpen && (
        <div className="mx-auto max-w-[1200px] px-6 pt-6">
          <div className="flex items-start gap-3 rounded-lg border border-[#f0d7a8] bg-[#fffaf2] p-4 text-sm text-[#7c5a1a] shadow-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ec652b]" />
            <div>
              <p className="font-semibold text-[#111a4a]">Alerta COE activada</p>
              <p className="mt-1 text-[#3b3e47]">
                aislamiento reforzado en {intervenedHubs.length} nodos con politica {policySummary.label.toLowerCase()}.
              </p>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111a4a]/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-[#e3e4e8] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Informe ejecutivo</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#111a4a]">Informe para la Alcaldia</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] px-3 py-1.5 text-[11px] font-medium text-[#111a4a]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4 text-[#3b3e47]">
              <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c7f88]">Diagnostico</p>
                <p className="mt-2 text-sm">
                  El foco de Tarqui sigue siendo el punto principal, pero la estrategia {policySummary.label.toLowerCase()} reduce la presion epidemiologica del conjunto de la ciudad.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-[#e3e4e8] bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">Costo</p>
                  <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">${formatCompact(budgetSpent)}</p>
                </div>
                <div className="rounded-lg border border-[#e3e4e8] bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">Casos evitados</p>
                  <p className="mt-2 font-mono text-xl font-semibold text-[#167e6c]">{formatCompact(cumulativeAvoided)}</p>
                </div>
                <div className="rounded-lg border border-[#e3e4e8] bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">R(t)</p>
                  <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">{rValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1200px] px-6 pb-20 pt-8">
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, value, helper, tint, percent, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-[#e3e4e8] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
                    <Icon className="h-4 w-4 text-[#111a4a]" />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">{label}</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="font-mono text-2xl font-semibold text-[#167e6c]">{value}</p>
                    <p className="mt-1 text-[11px] text-[#7c7f88]">{helper}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf0f3]">
                  <div
                    className="h-full rounded-full bg-[#167e6c]"
                    style={{ width: `${clamp(percent, 8, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </section>

          <section className="relative z-10 isolate overflow-hidden rounded-lg border border-[#e3e4e8] bg-white shadow-sm">
            <MantaMap
              result={{ params: { days: TOTAL_DAYS } }}
              currentDay={currentDay}
              playing={playing}
              playbackSpeed={playbackSpeedForMap}
              intervenedHubs={intervenedHubs}
              zombiesPerParroquia={zombieByParroquia}
              onDayChange={(day) => setCurrentDay(day)}
              onTogglePlay={() => setPlaying((current) => !current)}
              onResetDay={() => setCurrentDay(1)}
              onSpeedChange={(newSpeed) => setSpeed(newSpeed === 5 ? 4 : newSpeed)}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className="space-y-6 lg:col-span-4">
              <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Control urbano</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Nodos y Cortafuegos de Manta</h2>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
                    <MapPin className="h-4 w-4" />
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-2">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#7c7f88]">Politica</span>
                  <select
                    value={policy}
                    onChange={(event) => setPolicy(event.target.value as Policy)}
                    className="flex-1 bg-transparent text-sm font-medium text-[#111a4a] outline-none"
                  >
                    <option value="moderate">Moderada</option>
                    <option value="strict">Estricta</option>
                    <option value="aggressive">Agresiva</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {MANTA_HUBS.map((hub, index) => {
                    const enabled = !!hubState[hub.id];
                    return (
                      <button
                        key={hub.id}
                        type="button"
                        onClick={() => toggleHub(hub.id)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left shadow-sm transition ${
                          enabled ? 'border-[#cfe9df] bg-[#f2fbf8]' : 'border-[#e3e4e8] bg-[#f6f6f8]'
                        }`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-[#167e6c]/10 text-[#167e6c]' : 'bg-[#111a4a]/5 text-[#111a4a]'}`}>
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-[#111a4a]">{hub.name}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] ${
                                enabled ? 'bg-[#e3f8ef] text-[#167e6c]' : 'bg-[#f3f4f6] text-[#7c7f88]'
                              }`}
                            >
                              {enabled ? 'AISLADO' : 'ABIERTO'}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0f3]">
                            <div
                              className={`h-full rounded-full ${enabled ? 'bg-[#167e6c]' : 'bg-[#ec652b]'}`}
                              style={{ width: `${enabled ? 72 + index * 5 : 28 + index * 6}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Finanzas</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Recursos y Presupuesto Municipal</h2>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fffaf2] text-[#ec652b]">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[11px] text-[#3b3e47]">
                      <span>Gasto Municipal</span>
                      <span className="font-mono text-[#111a4a]">${formatCompact(budgetSpent)} / $80,000</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#edf0f3]">
                      <div className="h-full rounded-full bg-[#111a4a]" style={{ width: `${dashboardBudgetPercent}%` }} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <div className="rounded-lg bg-[#f6f6f8] p-3">
                      <div className="flex items-center gap-2 text-[#3b3e47]">
                        <Syringe className="h-4 w-4 text-[#167e6c]" />
                        <span className="text-[11px] uppercase tracking-[0.14em]">Dosis</span>
                      </div>
                      <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">{Math.round(dosageAvailable)}</p>
                    </div>
                    <div className="rounded-lg bg-[#f6f6f8] p-3">
                      <div className="flex items-center gap-2 text-[#3b3e47]">
                        <Truck className="h-4 w-4 text-[#111a4a]" />
                        <span className="text-[11px] uppercase tracking-[0.14em]">Brigadas</span>
                      </div>
                      <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">{Math.round(brigadesAvailable)}</p>
                    </div>
                    <div className="rounded-lg bg-[#f6f6f8] p-3">
                      <div className="flex items-center gap-2 text-[#3b3e47]">
                        <FlaskConical className="h-4 w-4 text-[#ec652b]" />
                        <span className="text-[11px] uppercase tracking-[0.14em]">Kits</span>
                      </div>
                      <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">{Math.round(testKits)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm lg:min-h-[330px]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">EFICIENCIA EPIDEMIOLOGICA</p>
                    <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-[#111a4a]">
                      Indice de Transmision Rt
                      <TrendingDown className="h-4 w-4 text-[#167e6c]" />
                    </h2>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className={`font-mono text-4xl font-semibold ${rValue < 1 ? 'text-[#167e6c]' : 'text-[#ec652b]'}`}>
                          {rValue.toFixed(2)}
                        </p>
                        <p className={`mt-2 text-[10px] font-medium uppercase tracking-[0.14em] ${rValue < 1 ? 'text-[#167e6c]' : 'text-[#ec652b]'}`}>
                          {rValue < 1 ? 'RITMO DE TRANSMISION CONTROLADO' : 'BROTE EN EXPANSION ACELERADA'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[#7c7f88]">Estado</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-[#111a4a]">{rValue < 1 ? 'OK' : 'ALERTA'}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] text-[#3b3e47]">Umbral critico de propagacion: 1.00</p>
                  </div>

                  <div className="rounded-lg border border-[#e3e4e8] bg-white p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#3b3e47]">Costo promedio por contagio evitado: $12.40 USD</p>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: 'Antidotos y vacunas', value: 50, color: '#167e6c' },
                        { label: 'Brigadas de campo', value: 32, color: '#111a4a' },
                        { label: 'Kits de monitoreo', value: 18, color: '#ec652b' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-[11px] text-[#3b3e47]">
                            <span>{item.label}</span>
                            <span className="font-mono text-[#111a4a]">{item.value}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#edf0f3]">
                            <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-8">
              <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Comparativa</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Curva Epidemiologica Comparativa</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe9e3] bg-[#edf9f6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#167e6c]">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Eficacia: +{avoidedPct}% vidas protegidas frente a azar
                  </div>
                </div>

                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[320px] w-full overflow-visible">
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = chartPadding + ((100 - tick) / 100) * (chartHeight - chartPadding * 2);
                    return (
                      <line
                        key={tick}
                        x1={chartPadding}
                        x2={chartWidth - chartPadding}
                        y1={y}
                        y2={y}
                        stroke="#edf0f3"
                        strokeWidth="1"
                      />
                    );
                  })}

                  <path d={baseLine} fill="none" stroke="#9aa1a9" strokeWidth="2.2" strokeDasharray="6 7" />
                  <path d={randomLine} fill="none" stroke="#ec652b" strokeWidth="2.4" strokeDasharray="9 7" />
                  <path d={strategicLine} fill="none" stroke="#167e6c" strokeWidth="3" />

                  <line
                    x1={markerX}
                    x2={markerX}
                    y1={chartPadding}
                    y2={chartHeight - chartPadding}
                    stroke="#111a4a"
                    strokeDasharray="6 7"
                    strokeWidth="1.5"
                  />

                  <circle
                    cx={markerX}
                    cy={
                      chartPadding +
                      (1 - (currentStrategicValue / Math.max(...strategicCurve, 1))) * (chartHeight - chartPadding * 2)
                    }
                    r="5"
                    fill="#167e6c"
                  />
                </svg>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-[#3b3e47]">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#9aa1a9]" />
                    Sin intervencion
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ec652b]" />
                    Intervencion al azar
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#167e6c]" />
                    Estrategia de cortafuegos
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Reproducibilidad</p>
                      <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Monte Carlo AWS</h2>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
                      <Cpu className="h-4 w-4" />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#111a4a] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
                  >
                    <Cpu className="h-4 w-4" />
                    Ejecutar Monte Carlo (1,000 corridas en AWS)
                  </button>

                  <div className="mt-4 rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-3">
                    <svg viewBox="0 0 220 62" className="h-[62px] w-full overflow-visible">
                      <path d={gaussianPath} fill="none" stroke="#167e6c" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf0f3]">
                      <div className="h-full w-[95%] rounded-full bg-[#167e6c]" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#7c7f88]">
                      <span>IC 95%</span>
                      <span className="font-mono text-[#167e6c]">+{avoidedPct}%</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Camas criticas</p>
                      <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Capacidad Hospitalaria de Manta</h2>
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${hospitalAlert ? 'bg-[#fff2ef] text-[#ec652b]' : 'bg-[#edf9f6] text-[#167e6c]'}`}>
                      <HeartPulse className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">UCI</span>
                      <span className="font-mono text-xl font-semibold text-[#111a4a]">{Math.round(currentStrategicValue)} / {hospitalCapacity}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#edf0f3]">
                      <div
                        className={`h-full rounded-full ${hospitalAlert ? 'bg-[#ec652b]' : 'bg-[#167e6c]'}`}
                        style={{ width: `${clamp(hospitalLoad, 0, 100)}%` }}
                      />
                    </div>
                    <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-3">
                      <div className="flex items-center justify-between text-[11px] text-[#3b3e47]">
                        <span>Ocupacion hospitalaria actual</span>
                        <span className="font-mono text-[#111a4a]">{Math.round(hospitalLoad)}%</span>
                      </div>
                      <p className="mt-2 font-mono text-2xl font-semibold text-[#111a4a]">{Math.round(currentStrategicValue)} / 120</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Poblacion</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Dinamica Poblacional SEIR Manta</h2>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-[#edf0f3]">
                  {seirState.map((item) => (
                    <div
                      key={item.label}
                      className="h-full float-left"
                      style={{ width: `${item.value}%`, backgroundColor: item.color }}
                    />
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    {seirState.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center justify-between gap-2 rounded-lg bg-[#f6f6f8] p-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}18` }}>
                              <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.12em] text-[#3b3e47]">{item.label}</span>
                          </div>
                          <span className="font-mono text-sm font-semibold text-[#111a4a]">{item.value.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {parishes.map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[#3b3e47]">
                          <span>{item.label}</span>
                          <span className="font-mono text-[#167e6c]">{item.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#edf0f3]">
                          <div
                            className="h-full rounded-full bg-[#167e6c]"
                            style={{ width: `${(item.value / maxParishValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-[#e3e4e8] bg-white/95 p-3 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#7c7f88]">Dia actual</p>
            <p className="text-sm font-semibold text-[#111a4a]">{currentDay} / {TOTAL_DAYS}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((current) => !current)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setCurrentDay(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="fixed bottom-6 left-6 z-40 hidden rounded-lg border border-[#e3e4e8] bg-white/95 p-3 shadow-lg backdrop-blur-sm md:block">
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#7c7f88]">R(t)</p>
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 168 168" className="h-20 w-20 -rotate-90">
              <circle cx="84" cy="84" r="52" fill="none" stroke="#edf0f3" strokeWidth="12" />
              <circle
                cx="84"
                cy="84"
                r="52"
                fill="none"
                stroke="#167e6c"
                strokeWidth="12"
                strokeDasharray={radialCircumference}
                strokeDashoffset={radialDashOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-[11px] font-semibold text-[#111a4a]">{rValue.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#7c7f88]">Efectividad</p>
            <p className="text-sm font-semibold text-[#111a4a]">{containmentLevel}%</p>
          </div>
          <div className="h-10 w-px bg-[#e3e4e8]" />
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#7c7f88]">Foco</p>
            <p className="text-sm font-semibold text-[#111a4a]">{presetSummary.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
