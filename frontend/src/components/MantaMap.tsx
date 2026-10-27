import React, { useMemo } from 'react';
import { Play, Pause, SkipBack, ZoomIn } from 'lucide-react';
import type { SimulationResponse, ParishId, HubId } from '../types/simulation';
import {
  PARISHES, HUBS, BUS_ROUTES, COASTAL_LINE,
  projectToSVG, projectPolygon, prevalenceToColor,
} from '../data/mantaGeo';

// ── Dimensiones del SVG ──────────────────────────────────────────────────────

const SVG_W = 560;
const SVG_H = 340;
const PAD   = 24;

// ── Etiquetas de estado ──────────────────────────────────────────────────────

const STATUS_LEGEND = [
  { color: '#10B981', label: 'Sano' },
  { color: '#F59E0B', label: 'Mordido' },
  { color: '#EF4444', label: 'Zombie' },
  { color: '#8B5CF6', label: 'Aislado' },
  { color: '#3B82F6', label: 'Inmune' },
] as const;

// ── Props ────────────────────────────────────────────────────────────────────

interface MantaMapProps {
  result: SimulationResponse;
  currentDay: number;
  playing: boolean;
  playbackSpeed: 1 | 2 | 5;
  onDayChange: (d: number) => void;
  onTogglePlay: () => void;
  onResetDay: () => void;
  onSpeedChange: (s: 1 | 2 | 5) => void;
}

// ── Helper: color de parroquia según el snapshot espacial del día ────────────

function getParishColor(
  parishId: ParishId,
  day: number,
  result: SimulationResponse,
): string {
  const timeline = result.spatial_timelines.shield;
  if (!timeline || timeline.length === 0) {
    // Fallback cuando no hay timeline — usar curva global de shield
    const totalDays = result.params.days;
    const progress = day / Math.max(1, totalDays);
    const epicenter = result.params.start_hub;
    const epicenterMap: Record<string, ParishId> = {
      mercado_tarqui: 'tarqui', uleam: 'manta_centro',
      mercado_central: 'manta_centro', empacadoras: 'los_esteros',
      terminal_terrestre: 'tarqui',
    };
    const epicenterParish = epicenterMap[epicenter] ?? 'tarqui';
    const delay = parishId === epicenterParish ? 0 : 0.18;
    const lp = Math.max(0, progress - delay) / (1 - delay);
    if (lp < 0.05) return '#10B981';
    if (lp < 0.30) return '#F59E0B';
    if (lp < 0.55) return '#EF4444';
    if (lp < 0.75) return '#8B5CF6';
    return '#3B82F6';
  }

  const snap = timeline[Math.min(day, timeline.length - 1)];
  if (!snap?.parishes?.[parishId]) return '#10B981';
  const p = snap.parishes[parishId];
  return prevalenceToColor(p.prevalence_pct);
}

function getHubFirewall(hubId: HubId, day: number, result: SimulationResponse): boolean {
  const timeline = result.spatial_timelines.shield;
  if (!timeline || timeline.length === 0) return day > result.params.days * 0.15;
  const snap = timeline[Math.min(day, timeline.length - 1)];
  return snap?.hubs?.[hubId]?.firewall_active ?? false;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MantaMap({
  result, currentDay, playing, playbackSpeed,
  onDayChange, onTogglePlay, onResetDay, onSpeedChange,
}: MantaMapProps) {
  const maxDay = result.params.days;

  // Pre-calcula proyecciones SVG
  const projectedParishes = useMemo(() =>
    Object.values(PARISHES).map((p) => ({
      ...p,
      svgPolygon: projectPolygon(p.polygon, SVG_W, SVG_H, PAD),
      svgCentroid: projectToSVG(p.centroid, SVG_W, SVG_H, PAD),
    })),
    [],
  );

  const projectedHubs = useMemo(() =>
    Object.values(HUBS).map((h) => ({
      ...h,
      svgPos: projectToSVG(h.coordinates, SVG_W, SVG_H, PAD),
    })),
    [],
  );

  const projectedRoutes = useMemo(() =>
    BUS_ROUTES.map((r) => ({
      ...r,
      svgPath: r.path
        .map((pt) => projectToSVG(pt, SVG_W, SVG_H, PAD).join(','))
        .join(' '),
    })),
    [],
  );

  const coastPoints = useMemo(() =>
    COASTAL_LINE.coordinates
      .map((pt) => projectToSVG(pt, SVG_W, SVG_H, PAD).join(','))
      .join(' '),
    [],
  );

  const progressPct = Math.round((currentDay / Math.max(1, maxDay)) * 100);

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Mapa Epidemiológico — Cantón Manta
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            5 parroquias · 5 hubs críticos · Corredores inter-parroquiales
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {STATUS_LEGEND.map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* SVG Map */}
      <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950/50">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ maxHeight: 320 }}
          role="img"
          aria-label={`Mapa epidemiológico de Manta, día ${currentDay}`}
        >
          <defs>
            <radialGradient id="bgGrad" cx="50%" cy="80%" r="70%">
              <stop offset="0%" stopColor="#0c1828" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>

          {/* Fondo */}
          <rect width={SVG_W} height={SVG_H} fill="url(#bgGrad)" />

          {/* Costa — Océano Pacífico */}
          <polyline points={coastPoints} fill="none" stroke="#1e3a5f" strokeWidth="3" strokeLinecap="round" />
          <text x={SVG_W / 2} y={PAD - 6} textAnchor="middle" fill="#1e40af" fontSize="10" opacity="0.7">
            ≈ Océano Pacífico · Bahía de Manta
          </text>

          {/* Corredores de buses */}
          {projectedRoutes.map((r) => (
            <polyline
              key={r.id}
              points={r.svgPath}
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity="0.7"
            />
          ))}

          {/* Parroquias */}
          {projectedParishes.map((p) => {
            const color = getParishColor(p.id as ParishId, currentDay, result);
            return (
              <g key={p.id}>
                <polygon
                  points={p.svgPolygon}
                  fill={color}
                  fillOpacity={0.20}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeOpacity={0.60}
                />
                {/* Centroide dot */}
                <circle
                  cx={p.svgCentroid[0]} cy={p.svgCentroid[1]}
                  r={5} fill={color} opacity={0.9}
                />
                {/* Label */}
                <text
                  x={p.svgCentroid[0]} y={p.svgCentroid[1] + 16}
                  textAnchor="middle" fill="#cbd5e1" fontSize="9.5" fontWeight="600"
                >
                  {p.name}
                </text>
                <text
                  x={p.svgCentroid[0]} y={p.svgCentroid[1] + 27}
                  textAnchor="middle" fill="#475569" fontSize="8"
                >
                  {p.populationPct}%
                </text>
              </g>
            );
          })}

          {/* Hubs */}
          {projectedHubs.map((h) => {
            const firewall = getHubFirewall(h.id as HubId, currentDay, result);
            const hx = h.svgPos[0];
            const hy = h.svgPos[1];
            return (
              <g key={h.id}>
                {firewall && (
                  <circle cx={hx} cy={hy} r={10} fill="#10B981" fillOpacity={0.12}
                    stroke="#10B981" strokeWidth="1" strokeDasharray="3 2" />
                )}
                <rect
                  x={hx - 5} y={hy - 5} width="10" height="10" rx="2"
                  fill={firewall ? '#10B981' : '#1e293b'}
                  stroke={firewall ? '#10B981' : '#475569'}
                  strokeWidth="1.5"
                  transform={`rotate(45,${hx},${hy})`}
                />
                <text x={hx} y={hy - 13} textAnchor="middle" fill="#94a3b8" fontSize="7.5">
                  {h.name.split(' ').slice(0, 2).join(' ')}
                </text>
                {firewall && (
                  <text x={hx + 8} y={hy - 6} fill="#10B981" fontSize="7" fontWeight="bold">
                    🔒
                  </text>
                )}
              </g>
            );
          })}

          {/* Contador de día */}
          <rect x="10" y={SVG_H - 42} width="110" height="32" rx="6"
            fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <text x="65" y={SVG_H - 29} textAnchor="middle" fill="#64748b" fontSize="8" letterSpacing="0.05em">
            DÍA SIMULADO
          </text>
          <text x="65" y={SVG_H - 16} textAnchor="middle"
            fill="#10b981" fontSize="14" fontWeight="bold" fontFamily="monospace">
            {String(currentDay).padStart(2, '0')} / {String(maxDay).padStart(2, '0')}
          </text>

          {/* Barra de progreso */}
          <rect x={PAD} y={SVG_H - 6} width={SVG_W - PAD * 2} height="3" rx="1.5" fill="#1e293b" />
          <rect
            x={PAD} y={SVG_H - 6}
            width={Math.round(((SVG_W - PAD * 2) * currentDay) / Math.max(1, maxDay))}
            height="3" rx="1.5"
            fill="#10b981" opacity={0.8}
          />
        </svg>
      </div>

      {/* Reproductor temporal */}
      <div className="space-y-2">
        {/* Slider + botones */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResetDay}
            title="Reiniciar al día 0"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTogglePlay}
            title={playing ? 'Pausar' : 'Reproducir animación'}
            className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white cursor-pointer"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <input
            type="range" min={0} max={maxDay} value={currentDay}
            onChange={(e) => onDayChange(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full cursor-pointer accent-emerald-500 bg-slate-800"
            aria-label="Día de la simulación"
          />

          <span className="font-mono text-xs text-slate-400 w-12 text-right">
            {progressPct}%
          </span>
        </div>

        {/* Speed selector + etiquetas */}
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1 text-slate-500">
            <span className="text-slate-600">Velocidad:</span>
            {([1, 2, 5] as const).map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                  playbackSpeed === s
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="flex justify-between gap-6 text-slate-600">
            <span>Día 0</span>
            <span>Día {Math.round(maxDay * 0.35)} (Pico)</span>
            <span>Día {maxDay}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
