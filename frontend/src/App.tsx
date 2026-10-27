import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Building2,
  Cpu,
  FileText,
  Gauge,
  Hash,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Syringe,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { MantaMap } from './components/MantaMap';
import { MANTA_HUBS } from './data/mantaGeo';

type Policy = 'moderate' | 'strict' | 'aggressive';
type HubToggleState = Record<string, boolean>;

const TOTAL_DAYS = 30;
const POLICY_META: Record<Policy, { label: string; reduction: number; pressure: number }> = {
  moderate: { label: 'Moderada', reduction: 0.24, pressure: 0.5 },
  strict: { label: 'Estricta', reduction: 0.41, pressure: 0.72 },
  aggressive: { label: 'Agresiva', reduction: 0.58, pressure: 0.9 },
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

const formatCompact = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

const polarPoint = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = angle - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

export default function App() {
  const [currentDay, setCurrentDay] = useState(14);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [policy, setPolicy] = useState<Policy>('strict');
  const [alertOpen, setAlertOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [seed, setSeed] = useState(42);
  const [hubState, setHubState] = useState<HubToggleState>(DEFAULT_HUB_STATE);

  const speedOptions = [1, 2, 4] as const;

  const intervenedHubs = useMemo(
    () => Object.entries(hubState).filter(([, enabled]) => enabled).map(([id]) => id),
    [hubState],
  );

  const policySummary = POLICY_META[policy];

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
    policySummary.reduction + (intervenedHubs.length / Math.max(MANTA_HUBS.length, 1)) * 0.18,
    0.16,
    0.78,
  );

  const { baseCurve, randomCurve, strategicCurve } = useMemo(() => {
    const base: number[] = [];
    const random: number[] = [];
    const strategic: number[] = [];

    for (let day = 1; day <= TOTAL_DAYS; day += 1) {
      const wave = 42 + day * 10.2;
      const acceleration = Math.pow(day, 1.46) * 1.9;
      const noise = Math.sin((day + seed * 0.13) * 0.9) * 36 + Math.cos(day * 0.34 + seed * 0.07) * 20;
      const baseValue = Math.max(28, Math.round(wave + acceleration + noise));

      const randomReduction = clamp(0.12 + effectiveReduction * 0.32 + day * 0.0026, 0.08, 0.42);
      const strategicReduction = clamp(
        effectiveReduction + (intervenedHubs.length / Math.max(MANTA_HUBS.length, 1)) * 0.24 + 0.08,
        0.18,
        0.78,
      );

      const randomValue = Math.max(14, Math.round(baseValue * (1 - randomReduction)));
      const strategicValue = Math.max(
        10,
        Math.round(baseValue * (1 - strategicReduction * (0.64 + (day / TOTAL_DAYS) * 0.4))),
      );

      base.push(baseValue);
      random.push(randomValue);
      strategic.push(strategicValue);
    }

    return { baseCurve: base, randomCurve: random, strategicCurve: strategic };
  }, [effectiveReduction, intervenedHubs.length, seed]);

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

  const containmentLevel = clamp(Math.round((effectiveReduction + 0.08) * 100), 18, 98);
  const infectionRate = clamp(Math.round((currentStrategicValue / Math.max(currentBaseValue, 1)) * 100), 20, 100);
  const activeInfected = currentStrategicValue;
  const networkState = containmentLevel >= 75 ? 'Red estable' : containmentLevel >= 50 ? 'Presion controlada' : 'Riesgo activo';

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

  const chartWidth = 780;
  const chartHeight = 260;
  const chartPadding = 24;
  const baseLine = buildLinePath(baseCurve, chartWidth, chartHeight, chartPadding);
  const randomLine = buildLinePath(randomCurve, chartWidth, chartHeight, chartPadding);
  const strategicLine = buildLinePath(strategicCurve, chartWidth, chartHeight, chartPadding);
  const markerX = chartPadding + (currentDay / TOTAL_DAYS) * (chartWidth - chartPadding * 2);

  const seirState = useMemo(() => {
    const baseShare = Math.max(0.18, 0.76 - currentDay * 0.0035 - effectiveReduction * 0.32);
    const exposedShare = Math.max(0.08, 0.16 + effectiveReduction * 0.12 + (intervenedHubs.length / 5) * 0.08);
    const infectedShare = Math.max(0.04, 0.16 - effectiveReduction * 0.22 + (currentDay / TOTAL_DAYS) * 0.06);
    const recoveredShare = Math.max(0.06, 1 - baseShare - exposedShare - infectedShare);

    return [
      { label: 'Sano', value: clamp(baseShare * 100, 20, 80), color: '#167e6c' },
      { label: 'Expuesto', value: clamp(exposedShare * 100, 6, 24), color: '#f59e0b' },
      { label: 'Infectado', value: clamp(infectedShare * 100, 5, 20), color: '#ec652b' },
      { label: 'Recuperado', value: clamp(recoveredShare * 100, 6, 30), color: '#1e4199' },
    ];
  }, [currentDay, effectiveReduction, intervenedHubs.length]);

  const budgetSpent = useMemo(() => {
    const spent =
      22000 +
      currentDay * 480 +
      intervenedHubs.length * 5300 +
      (policy === 'aggressive' ? 13000 : policy === 'strict' ? 9000 : 5500);
    return clamp(spent, 18000, 82000);
  }, [currentDay, intervenedHubs.length, policy]);

  const budgetAvailable = 80000;
  const budgetPercent = clamp((budgetSpent / budgetAvailable) * 100, 18, 100);
  const dosageAvailable = Math.max(180, 420 - currentDay * 5 - intervenedHubs.length * 18);
  const brigadesAvailable = Math.max(6, 16 - currentDay / 2 + intervenedHubs.length);
  const testKits = Math.max(80, 260 - currentDay * 4 + intervenedHubs.length * 12);

  const hospitalCapacity = 120;
  const hospitalLoad = clamp((currentStrategicValue / hospitalCapacity) * 100, 0, 170);
  const hospitalAlert = hospitalLoad > 100;

  const parishes = [
    { label: 'Tarqui', value: zombieByParroquia['Tarqui'] ?? 0 },
    { label: 'Manta Centro', value: zombieByParroquia['Manta Centro'] ?? 0 },
    { label: 'Los Esteros', value: zombieByParroquia['Los Esteros'] ?? 0 },
    { label: 'Eloy Alfaro', value: zombieByParroquia['Eloy Alfaro'] ?? 0 },
    { label: 'San Mateo', value: zombieByParroquia['San Mateo / Sur'] ?? 0 },
  ];
  const maxParishValue = Math.max(...parishes.map((item) => item.value), 1);

  const rValue = clamp(2.8 - effectiveReduction * 2.6, 0.8, 2.8);
  const radialCircumference = 2 * Math.PI * 52;
  const radialDashOffset = radialCircumference - (rValue / 2.8) * radialCircumference;
  const radialAngle = (rValue / 2.8) * 270 - 135;
  const radialPoint = polarPoint(84, 84, 52, (radialAngle * Math.PI) / 180);

  const statCards = [
    {
      label: 'Infectados Activos',
      value: formatCompact(activeInfected),
      unit: 'casos',
      accent: 'text-[#167e6c]',
      helper: `Dia ${currentDay} / base ${formatCompact(currentBaseValue)}`,
      tint: 'bg-[#edf9f6]',
      percent: Math.min(100, Math.round((currentStrategicValue / Math.max(currentBaseValue, 1)) * 100)),
      icon: Activity,
    },
    {
      label: 'Casos Evitados',
      value: formatCompact(cumulativeAvoided),
      unit: 'evitados',
      accent: 'text-[#111a4a]',
      helper: `${avoidedPct}% vs. base`,
      tint: 'bg-[#f3f6ff]',
      percent: Math.min(100, avoidedPct),
      icon: TrendingUp,
    },
    {
      label: 'Nivel de Contencion',
      value: `${containmentLevel}%`,
      unit: 'cobertura',
      accent: 'text-[#167e6c]',
      helper: `${intervenedHubs.length} hubs aislados activos`,
      tint: 'bg-[#f6f6f8]',
      percent: containmentLevel,
      icon: ShieldCheck,
    },
    {
      label: 'Estado de la Red',
      value: networkState,
      unit: 'operativo',
      accent: 'text-[#ec652b]',
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

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#e3e4e8] bg-[#f6f6f8] px-2.5 py-1.5 text-[10px] font-medium text-[#3b3e47] sm:flex">
              <Cpu className="h-3.5 w-3.5 text-[#167e6c]" />
              Seed {seed}
            </div>
            <button
              type="button"
              onClick={() => setAlertOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ec652b] px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-[#dc5725]"
            >
              <BellRing className="h-3.5 w-3.5" />
              Desplegar Maxima Alerta
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

      <main className="mx-auto max-w-[1200px] px-6 pb-20 pt-8 lg:pt-10">
        <div className="flex flex-col gap-y-[72px]">
          <section className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#7c7f88]">Dashboard operativo</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#111a4a] md:text-[2.25rem]">
                  Manta Epidemic Response Console
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e3e4e8] bg-white px-3 py-2 text-[12px] font-medium text-[#111a4a] shadow-sm transition hover:bg-[#f6f6f8]"
              >
                <FileText className="h-4 w-4 text-[#111a4a]" />
                Informe para la Alcaldia
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ label, value, unit, accent, helper, tint, percent, icon: Icon }) => (
                <div key={label} className="rounded-lg border border-[#e3e4e8] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint} text-[#111a4a]`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7f88]">{label}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className={`font-mono text-[28px] font-semibold tracking-tight ${accent}`}>{value}</span>
                    <span className="text-[11px] text-[#7c7f88]">{unit}</span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0f3]">
                    <div className="h-full rounded-full bg-[#167e6c]" style={{ width: `${percent}%` }} />
                  </div>

                  <p className="mt-2 text-[11px] leading-relaxed text-[#7c7f88]">{helper}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-[#e3e4e8] bg-white shadow-xl">
            <div className="relative min-h-[680px] w-full overflow-hidden">
              <MantaMap
                result={{ params: { days: TOTAL_DAYS } }}
                currentDay={currentDay}
                playing={playing}
                playbackSpeed={playbackSpeedForMap}
                intervenedHubs={intervenedHubs}
                zombiesPerParroquia={zombieByParroquia}
                onDayChange={setCurrentDay}
                onTogglePlay={() => setPlaying((value) => !value)}
                onResetDay={() => {
                  setCurrentDay(1);
                  setPlaying(false);
                }}
                onSpeedChange={(nextSpeed) => setSpeed(nextSpeed === 5 ? 4 : nextSpeed)}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="space-y-6 lg:col-span-4">
              <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Control de nodos</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Politica y contencion</h2>
                  </div>
                  <div className="rounded-full bg-[#edf9f6] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#167e6c]">
                    {policySummary.label}
                  </div>
                </div>

                <div className="space-y-2">
                  {(['moderate', 'strict', 'aggressive'] as Policy[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPolicy(option)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                        policy === option
                          ? 'border-[#111a4a] bg-[#111a4a] text-white'
                          : 'border-[#e3e4e8] bg-[#f6f6f8] text-[#3b3e47] hover:bg-white'
                      }`}
                    >
                      <span className="text-sm font-medium">{POLICY_META[option].label}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em]">{Math.round(POLICY_META[option].reduction * 100)}%</span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 space-y-3">
                  {MANTA_HUBS.map((hub) => {
                    const isActive = Boolean(hubState[hub.id]);
                    const load = isActive ? 78 : 32;
                    return (
                      <button
                        key={hub.id}
                        type="button"
                        onClick={() => toggleHub(hub.id)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          isActive ? 'border-[#167e6c] bg-[#edf9f6]' : 'border-[#e3e4e8] bg-[#f6f6f8]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#111a4a]">{hub.name}</p>
                            <p className="mt-1 text-[11px] text-[#7c7f88]">{hub.parroquia}</p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                              isActive ? 'bg-[#167e6c] text-white' : 'bg-white text-[#7c7f88]'
                            }`}
                          >
                            {isActive ? 'AISLADO' : 'ABIERTO'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[10px] text-[#7c7f88]">
                            <span>Carga</span>
                            <span>{load}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/80">
                            <div
                              className={`h-full rounded-full ${isActive ? 'bg-[#167e6c]' : 'bg-[#ec652b]'}`}
                              style={{ width: `${load}%` }}
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
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Presupuesto</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Recursos municipales</h2>
                  </div>
                  <div className="rounded-full bg-[#fffaf2] px-2 py-1 text-[10px] font-semibold text-[#ec652b]">
                    {budgetPercent.toFixed(0)}% gastado
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-[#3b3e47]">
                      <span>Gasto total</span>
                      <span className="font-mono text-[#167e6c]">${formatCompact(budgetSpent)} USD</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#edf0f3]">
                      <div className="h-full rounded-full bg-[#ec652b]" style={{ width: `${budgetPercent}%` }} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-lg bg-[#f6f6f8] p-3">
                      <div className="flex items-center gap-2 text-[#3b3e47]">
                        <Syringe className="h-4 w-4 text-[#167e6c]" />
                        <span className="text-[11px] uppercase tracking-[0.14em]">Dosis</span>
                      </div>
                      <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">{Math.round(dosageAvailable)}</p>
                    </div>
                    <div className="rounded-lg bg-[#f6f6f8] p-3">
                      <div className="flex items-center gap-2 text-[#3b3e47]">
                        <Building2 className="h-4 w-4 text-[#167e6c]" />
                        <span className="text-[11px] uppercase tracking-[0.14em]">Brigadas</span>
                      </div>
                      <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">{Math.round(brigadesAvailable)}</p>
                    </div>
                    <div className="rounded-lg bg-[#f6f6f8] p-3">
                      <div className="flex items-center gap-2 text-[#3b3e47]">
                        <Hash className="h-4 w-4 text-[#167e6c]" />
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
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Casos por parroquia</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Distribucion de casos</h2>
                  </div>
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

              <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Comparativa epidemiologica</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Curva epidemiologica comparativa</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#e3e4e8] bg-[#f6f6f8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#167e6c]">
                    <TrendingDown className="h-3.5 w-3.5" />
                    +{avoidedPct}% vidas protegidas frente a azar
                  </div>
                </div>

                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[300px] w-full overflow-visible">
                  {[0, 25, 50, 75, 100].map((value) => {
                    const y = chartPadding + ((100 - value) / 100) * (chartHeight - chartPadding * 2);
                    return (
                      <line
                        key={value}
                        x1={chartPadding}
                        x2={chartWidth - chartPadding}
                        y1={y}
                        y2={y}
                        stroke="#edf0f3"
                        strokeWidth="1"
                      />
                    );
                  })}

                  <path d={baseLine} fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeDasharray="5 7" />
                  <path d={randomLine} fill="none" stroke="#ec652b" strokeWidth="2.5" strokeDasharray="8 8" />
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
                    cy={chartPadding + (1 - (currentStrategicValue / Math.max(...strategicCurve, 1))) * (chartHeight - chartPadding * 2)}
                    r="5"
                    fill="#167e6c"
                  />
                </svg>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-[11px] text-[#3b3e47]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#d1d5db]" />
                    Sin intervencion
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#3b3e47]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ec652b]" />
                    Intervencion al azar
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#3b3e47]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#167e6c]" />
                    Cortafuegos estrategico
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Capacidad hospitalaria</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Saturacion</h2>
                  </div>
                  <div className={`rounded-full px-2 py-1 text-[10px] font-semibold ${hospitalAlert ? 'bg-[#fff2f0] text-[#ec652b]' : 'bg-[#edf9f6] text-[#167e6c]'}`}>
                    {hospitalAlert ? 'ALERTA' : 'ESTABLE'}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-[#3b3e47]">
                      <span>Camas UCI</span>
                      <span className="font-mono text-[#111a4a]">{Math.round(currentStrategicValue)}/{hospitalCapacity}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#edf0f3]">
                      <div
                        className={`h-full rounded-full ${hospitalAlert ? 'bg-[#ec652b]' : 'bg-[#167e6c]'}`}
                        style={{ width: `${clamp(hospitalLoad, 0, 100)}%` }}
                      />
                    </div>
                    <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-3">
                      <div className="flex items-center gap-2 text-[#3b3e47]">
                        <TrendingDown className="h-4 w-4 text-[#167e6c]" />
                        <span className="text-[11px] uppercase tracking-[0.14em]">Ocupacion hospitalaria actual</span>
                      </div>
                      <p className="mt-2 font-mono text-2xl font-semibold text-[#111a4a]">{Math.round(currentStrategicValue)} / 120</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-4">
                    <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">
                      <span>R(t)</span>
                      <span className="font-mono text-[#111a4a]">{rValue.toFixed(2)}</span>
                    </div>
                    <svg viewBox="0 0 180 180" className="mx-auto block h-[160px] w-[160px]">
                      <circle cx="84" cy="84" r="52" fill="none" stroke="#edf0f3" strokeWidth="14" />
                      <circle
                        cx="84"
                        cy="84"
                        r="52"
                        fill="none"
                        stroke="#167e6c"
                        strokeWidth="14"
                        strokeDasharray={`${radialCircumference} ${radialCircumference}`}
                        strokeDashoffset={radialDashOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 84 84)"
                      />
                      <path d={`M ${84} ${84} L ${radialPoint.x} ${radialPoint.y}`} stroke="#111a4a" strokeWidth="2" />
                      <circle cx="84" cy="84" r="4.5" fill="#111a4a" />
                      <text x="84" y="92" textAnchor="middle" className="fill-[#111a4a] text-[12px] font-medium font-mono">
                        {rValue.toFixed(2)}
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">SEIR continuo</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Poblacion de Manta</h2>
                </div>
                <div className="rounded-full border border-[#e3e4e8] bg-[#f6f6f8] px-2 py-1 text-[10px] font-medium text-[#3b3e47]">
                  Dia {currentDay}
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-4 overflow-hidden rounded-full bg-[#edf0f3]">
                  <div className="flex h-full w-full">
                    {seirState.map((state) => (
                      <div
                        key={state.label}
                        className="h-full"
                        style={{ width: `${state.value}%`, backgroundColor: state.color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {seirState.map((state) => (
                    <div key={state.label} className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-3">
                      <div className="flex items-center gap-2 text-[#3b3e47]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: state.color }} />
                        <span className="text-[11px] uppercase tracking-[0.14em]">{state.label}</span>
                      </div>
                      <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">{state.value.toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Capacidad hospitalaria</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Saturacion</h2>
                </div>
                <div className={`rounded-full px-2 py-1 text-[10px] font-semibold ${hospitalAlert ? 'bg-[#fff2f0] text-[#ec652b]' : 'bg-[#edf9f6] text-[#167e6c]'}`}>
                  {hospitalAlert ? 'ALERTA' : 'ESTABLE'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#3b3e47]">
                  <span>Camas criticas</span>
                  <span className="font-mono text-[#111a4a]">{Math.round(currentStrategicValue)}/{hospitalCapacity}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#edf0f3]">
                  <div
                    className={`h-full rounded-full ${hospitalAlert ? 'bg-[#ec652b]' : 'bg-[#167e6c]'}`}
                    style={{ width: `${clamp(hospitalLoad, 0, 100)}%` }}
                  />
                </div>
                <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-3">
                  <div className="flex items-center gap-2 text-[#3b3e47]">
                    <TrendingDown className="h-4 w-4 text-[#167e6c]" />
                    <span className="text-[11px] uppercase tracking-[0.14em]">Carga hospitalaria</span>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-semibold text-[#111a4a]">{hospitalLoad.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Reproducibilidad</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Monte Carlo</h2>
                </div>
                <div className="rounded-full bg-[#edf9f6] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#167e6c]">
                  95% IC
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">Seed</span>
                  <input
                    type="number"
                    value={seed}
                    onChange={(event) => setSeed(Number(event.target.value) || 1)}
                    className="w-full rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] px-3 py-2 text-sm text-[#111a4a] outline-none ring-0"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setCurrentDay(Math.min(TOTAL_DAYS, currentDay + 3))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#111a4a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0e1639]"
                >
                  <Cpu className="h-4 w-4" />
                  Simulacion Monte Carlo AWS (1,000 corridas)
                </button>

                <div className="rounded-lg bg-[#f6f6f8] p-3 text-[11px] text-[#3b3e47]">
                  <div className="flex items-center justify-between">
                    <span>Intervalo de confianza</span>
                    <span className="font-mono text-[#167e6c]">95%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full w-[78%] rounded-full bg-[#167e6c]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#e3e4e8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Linea de tiempo</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#111a4a]">Control de simulacion</h2>
                </div>
                <div className="rounded-full bg-[#edf9f6] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#167e6c]">
                  Dia {currentDay}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPlaying((value) => !value)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a] transition hover:bg-[#edf9f6]"
                    aria-label={playing ? 'Pausar reproduccion' : 'Reproducir'}
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentDay(1);
                      setPlaying(false);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a] transition hover:bg-[#edf9f6]"
                    aria-label="Reiniciar dia"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={1}
                      max={TOTAL_DAYS}
                      step={1}
                      value={currentDay}
                      onChange={(event) => {
                        setCurrentDay(Number(event.target.value));
                        setPlaying(false);
                      }}
                      className="w-full accent-[#167e6c]"
                      aria-label="Control de dias"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#7c7f88]">
                  <span>Dia 1</span>
                  <span>Dia {TOTAL_DAYS}</span>
                </div>

                <div className="flex gap-2">
                  {speedOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSpeed(option)}
                      className={`rounded-full px-2.5 py-1.5 text-[10px] font-medium transition ${
                        speed === option ? 'bg-[#111a4a] text-white' : 'bg-[#f6f6f8] text-[#7c7f88]'
                      }`}
                    >
                      {option}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111a4a]/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-[#e3e4e8] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Informe ejecutivo</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#111a4a]">INFORME PARA LA ALCALDIA</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] px-2.5 py-1.5 text-xs font-medium text-[#3b3e47]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-[#3b3e47]">
              <div className="rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">Diagnostico</p>
                <p className="mt-2 leading-6">
                  Tarqui sigue siendo el punto de mayor presion con un riesgo residual de {Math.round((currentStrategicValue / currentBaseValue) * 100)}% en la estrategia activa.
                  El plan de aislamiento y la politica {policySummary.label.toLowerCase()} reducen de forma significativa la velocidad de transmision.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#e3e4e8] bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">Costo</p>
                  <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">${formatCompact(budgetSpent)} USD</p>
                </div>
                <div className="rounded-lg border border-[#e3e4e8] bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">Casos evitados</p>
                  <p className="mt-2 font-mono text-xl font-semibold text-[#167e6c]">{formatCompact(cumulativeAvoided)}</p>
                </div>
                <div className="rounded-lg border border-[#e3e4e8] bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">Vidas protegidas</p>
                  <p className="mt-2 font-mono text-xl font-semibold text-[#111a4a]">{Math.max(120, Math.round(cumulativeAvoided * 0.82))}</p>
                </div>
              </div>

              <div className="rounded-lg border border-[#e3e4e8] bg-[#fffaf2] p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7f88]">Recomendacion</p>
                <p className="mt-2 leading-6 text-[#3b3e47]">
                  Mantener la politica {policySummary.label.toLowerCase()} en los siguientes 14 dias y reforzar la vigilancia en Tarqui y Terminal con el apoyo de brigadas y dosis disponibles.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
