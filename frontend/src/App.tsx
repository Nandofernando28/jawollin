import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Biohazard,
  Building2,
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
  standard: { label: 'Brote Estandar', multiplier: 0.0, note: 'Riesgo endemico estable en la ciudad' },
  supercontagion: { label: 'Variante Supercontagio (2x)', multiplier: 0.2, note: 'Riesgo de transmision acelerado' },
  budget_cut: { label: 'Corte Presupuestario (50%)', multiplier: -0.08, note: 'Recursos reducidos y respuesta lenta' },
  terminal_focus: { label: 'Foco en Terminal', multiplier: 0.1, note: 'Flujo de buses y pasajeros elevando la presion' },
};

const DEFAULT_HUB_STATE: HubToggleState = {
  tarqui: true,
  uleam: false,
  terminal: true,
  mercado_central: true,
  empacadoras: false,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

const formatCompact = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

export default function App() {
  const [currentDay, setCurrentDay] = useState(14);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [policy, setPolicy] = useState<Policy>('strict');
  const [selectedPreset, setSelectedPreset] = useState<CrisisPreset>('standard');
  const [alertOpen, setAlertOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [seed, setSeed] = useState(42);
  const [hubState, setHubState] = useState<HubToggleState>(DEFAULT_HUB_STATE);

  const policySummary = POLICY_META[policy];
  const presetSummary = PRESET_META[selectedPreset];

  const intervenedHubs = useMemo(
    () => Object.entries(hubState).filter(([, enabled]) => enabled).map(([id]) => id),
    [hubState],
  );

  useEffect(() => {
    if (!playing) {
      return undefined;
    }

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
      const strategicValue = Math.max(8, Math.round(baseValue * (1 - strategicReduction * (0.66 + (day / TOTAL_DAYS) * 0.45))));

      base.push(baseValue);
      random.push(randomValue);
      strategic.push(strategicValue);
    }

    return { baseCurve: base, randomCurve: random, strategicCurve: strategic };
  }, [effectiveReduction, intervenedHubs.length, policySummary.pressure, presetSummary.multiplier, seed, selectedPreset]);

  const currentBaseValue = baseCurve[currentDay - 1] ?? baseCurve[0];
  const currentRandomValue = randomCurve[currentDay - 1] ?? randomCurve[0];
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

  const budgetAvailable = 80000;
  const budgetSpent = useMemo(() => {
    const base =
      22000 +
      currentDay * 480 +
      intervenedHubs.length * 5300 +
      (policy === 'aggressive' ? 14000 : policy === 'strict' ? 9500 : 5500) +
      (selectedPreset === 'budget_cut' ? -15000 : selectedPreset === 'supercontagion' ? 10000 : 0);
    return clamp(base, 18000, 82000);
  }, [currentDay, intervenedHubs.length, policy, selectedPreset]);

  const budgetPercent = clamp((budgetSpent / budgetAvailable) * 100, 18, 100);
  const dosageAvailable = Math.max(180, 420 - currentDay * 5 - intervenedHubs.length * 18 + (selectedPreset === 'budget_cut' ? -80 : 20));
  const brigadesAvailable = Math.max(6, 16 - currentDay / 2 + intervenedHubs.length + (selectedPreset === 'budget_cut' ? -4 : 2));
  const testKits = Math.max(80, 260 - currentDay * 4 + intervenedHubs.length * 12 + (selectedPreset === 'budget_cut' ? -30 : 14));

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
  const radialAngle = (rValue / 2.8) * 270 - 135;
  const radialPoint = polarPoint(84, 84, 52, (radialAngle * Math.PI) / 180);

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

  return (
    <div className="min-h-screen bg-[#f6f6f8] text-[#111a4a]">
      <header className="sticky top-0 z-40 border-b border-[#e3e4e8] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-[62px] max-w-[1200px] items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111a4a]">
                Manta Epidemic Containment Console
              </p>
              <p className="text-[11px] text-[#7c7f88]">Hubs aislados: {intervenedHubs.length}/5</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] px-2 py-1.5 text-[10px] font-medium text-[#3b3e47] lg:flex">
              <Cpu className="h-3.5 w-3.5 text-[#167e6c]" />
              Seed {seed}
            </div>
            <label className="hidden items-center gap-2 rounded-lg border border-[#e3e4e8] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#3b3e47] md:flex">
              <BellRing className="h-3.5 w-3.5 text-[#111a4a]" />
              <select
                value={selectedPreset}
                onChange={(event) => setSelectedPreset(event.target.value as CrisisPreset)}
                className="bg-transparent pr-1 text-[#111a4a] outline-none"
              >
                {Object.entries(PRESET_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e3e4e8] bg-white px-3 py-2 text-[11px] font-medium text-[#111a4a] shadow-sm transition hover:bg-[#f6f6f8]"
            >
              <FileText className="h-4 w-4 text-[#111a4a]" />
              Informe Alcaldia
            </button>
            <button
              type="button"
              onClick={() => setAlertOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ec652b] px-3 py-2 text-[11px] font-medium text-white shadow-sm transition hover:bg-[#dc5725]"
            >
              <BellRing className="h-3.5 w-3.5" />
              Maxima Alerta
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
                  El foco de Tarqui sigue siendo el nodo principal, pero la estrategia {policySummary.label.toLowerCase()} logra
                  reducir la presion epidemiologica en el conjunto de la ciudad.
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

          <section className="overflow-hidden rounded-lg border border-[#e3e4e8] bg-white p-2 shadow-sm">
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
                      <div
                        className="h-full rounded-full bg-[#111a4a]"
                        style={{ width: `${budgetPercent}%` }}
                      />
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

                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-2.5">
                    <Dices className="h-4 w-4 text-[#111a4a]" />
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#7c7f88]">Seed</span>
                    <input
                      type="number"
                      value={seed}
                      onChange={(event) => setSeed(Number(event.target.value) || 0)}
                      className="w-20 bg-transparent text-right text-sm font-medium text-[#111a4a] outline-none"
                    />
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
