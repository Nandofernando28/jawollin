/**
 * MantaMap — CartoDB Dark Matter (Leaflet + react-leaflet)
 * Usa mantaGeo.ts: PARISHES, HUBS, BUS_ROUTES, projectToSVG, prevalenceToColor
 */

import 'leaflet/dist/leaflet.css';
import React, { useEffect, useMemo } from 'react';
import {
  MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Popup, useMap,
} from 'react-leaflet';
import { Play, Pause, RotateCcw } from 'lucide-react';

import type { SimulationResponse, ParishId, HubId } from '../types/simulation';
import {
  PARISHES, HUBS, BUS_ROUTES, prevalenceToColor,
} from '../data/mantaGeo';
import type { LonLat } from '../data/mantaGeo';

// Leaflet usa [lat, lon]; mantaGeo usa LonLat = [lon, lat]
const toLatLon = ([lon, lat]: LonLat): [number, number] => [lat, lon];

const MANTA_CENTER: [number, number] = [-0.9538, -80.7189];
const MANTA_ZOOM = 13;

// ── Configuracion de tiles de CARTO ───────────────────────────────────────────
const CARTO_KEY = (import.meta.env.VITE_CARTO_API_KEY || '').trim();
const CARTO_STYLE = (import.meta.env.VITE_CARTO_STYLE || 'dark_all').trim();
const TILE_URL = CARTO_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/${CARTO_STYLE}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
  : `https://{s}.basemaps.cartocdn.com/rastertiles/${CARTO_STYLE}/{z}/{x}/{y}{r}.png`;

// ── Paleta ────────────────────────────────────────────────────────────────────

const C = {
  sano:    '#10B981',
  mordido: '#F59E0B',
  zombie:  '#F43F5E',
  aislado: '#8B5CF6',
  inmune:  '#3B82F6',
} as const;

const LEGEND = [
  { color: C.sano,    label: 'Sano' },
  { color: C.mordido, label: 'Mordido' },
  { color: C.zombie,  label: 'Activo' },
  { color: C.aislado, label: 'Aislado' },
  { color: C.inmune,  label: 'Inmune' },
] as const;

// ── Mapeo ParishId → HubId para buscar en timelines ──────────────────────────
const HUB_ID_MAP: Record<string, HubId> = {
  mercado_tarqui:    'mercado_tarqui',
  uleam:             'uleam',
  mercado_central:   'mercado_central',
  empacadoras:       'empacadoras',
  terminal_terrestre:'terminal_terrestre',
};

// ── Color de parroquia ────────────────────────────────────────────────────────

function getParishColor(parishId: ParishId, day: number, result: SimulationResponse): string {
  const timeline = result.spatial_timelines?.shield;
  if (timeline?.length) {
    const snap = timeline[Math.min(day, timeline.length - 1)];
    const p = snap?.parishes?.[parishId];
    if (p) return prevalenceToColor(p.prevalence_pct);
  }
  // Fallback determinista
  const progress  = day / Math.max(1, result.params.days);
  const startHub  = result.params.start_hub === 'random' ? 'mercado_tarqui' : result.params.start_hub;
  const epicenterOf: Partial<Record<string, ParishId>> = {
    mercado_tarqui: 'tarqui', uleam: 'manta_centro',
    mercado_central: 'manta_centro', empacadoras: 'los_esteros',
    terminal_terrestre: 'tarqui',
  };
  const epicenter = epicenterOf[startHub] ?? 'tarqui';
  const DELAY: Record<ParishId, number> = {
    tarqui: 0, manta_centro: 0.12, los_esteros: 0.16, eloy_alfaro: 0.22, san_mateo: 0.30,
  };
  const delay = parishId === epicenter ? 0 : (DELAY[parishId] ?? 0.20);
  const lp = Math.max(0, progress - delay) / Math.max(0.01, 1 - delay);
  if (lp < 0.04) return C.sano;
  if (lp < 0.28) return C.mordido;
  if (lp < 0.54) return C.zombie;
  if (lp < 0.76) return C.aislado;
  return C.inmune;
}

function getHubFirewall(hubId: HubId, day: number, result: SimulationResponse): boolean {
  const timeline = result.spatial_timelines?.shield;
  if (timeline?.length) {
    const snap = timeline[Math.min(day, timeline.length - 1)];
    return snap?.hubs?.[hubId]?.firewall_active ?? false;
  }
  return day > result.params.days * 0.15;
}

// ── Resizer ───────────────────────────────────────────────────────────────────

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export function MantaMap({
  result, currentDay, playing, playbackSpeed,
  onDayChange, onTogglePlay, onResetDay, onSpeedChange,
}: MantaMapProps) {
  const maxDay = result.params.days;
  const pct = Math.round((currentDay / Math.max(1, maxDay)) * 100);

  const parishList = useMemo(() => Object.values(PARISHES), []);
  const hubList    = useMemo(() => Object.values(HUBS), []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-white">Mapa Epidemiológico — Cantón Manta</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">CartoDB Dark · 5 parroquias · 5 hubs · Corredores de bus</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {LEGEND.map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Mapa Leaflet */}
      <div style={{ height: 'calc(100vh - 360px)', minHeight: 460 }}>
        <MapContainer
          center={MANTA_CENTER}
          zoom={MANTA_ZOOM}
          minZoom={12}
          maxZoom={17}
          style={{ height: '100%', width: '100%', background: '#020617' }}
          scrollWheelZoom={false}
          zoomControl
        >
          <MapResizer />

          {/* CartoDB Dark Matter */}
          <TileLayer
            url={TILE_URL}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />

          {/* Corredores de buses */}
          {BUS_ROUTES.map((r) => (
            <Polyline
              key={r.id}
              positions={r.path.map(toLatLon)}
              pathOptions={{ color: '#334155', weight: 2, opacity: 0.55, dashArray: '6 5' }}
            />
          ))}

          {/* Polígonos de parroquias */}
          {parishList.map((p) => {
            const color = getParishColor(p.id, currentDay, result);
            return (
              <Polygon
                key={`${p.id}-${currentDay}`}
                positions={p.polygon.map(toLatLon)}
                pathOptions={{ fillColor: color, fillOpacity: 0.28, color, weight: 1.8, opacity: 0.65 }}
              >
                <Popup>
                  <div style={{ minWidth: 155 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: '#e2e8f0' }}>Día {currentDay}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>
                      Población: {p.populationPct}% del cantón
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Hubs */}
          {hubList.map((h) => {
            const simId  = HUB_ID_MAP[h.id] ?? h.id as HubId;
            const fw     = getHubFirewall(simId, currentDay, result);
            const epi    = result.params.start_hub === h.id ||
                           (result.params.start_hub === 'random' && h.id === 'mercado_tarqui');
            const col    = fw ? C.inmune : epi ? C.zombie : C.mordido;
            const latLon = toLatLon(h.coordinates);

            return (
              <React.Fragment key={h.id}>
                {/* Anillo de pulso */}
                <CircleMarker
                  center={latLon}
                  radius={fw ? 14 : epi ? 22 : 16}
                  pathOptions={{ color: col, fillColor: col, fillOpacity: 0.08, weight: 1.5, opacity: 0.40, dashArray: fw ? '4 3' : undefined }}
                />
                {/* Dot principal */}
                <CircleMarker
                  center={latLon}
                  radius={7}
                  pathOptions={{ color: col, fillColor: col, fillOpacity: 0.92, weight: 2 }}
                >
                  <Popup>
                    <div style={{ minWidth: 175 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', marginBottom: 4 }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{h.epidemicRole}</div>
                      <div style={{ fontSize: 11, color: col, fontWeight: 600, marginBottom: 6 }}>
                        {fw  ? 'Cortafuegos activo — fumigación en curso' :
                         epi ? `Epicentro del brote — Día ${currentDay}` :
                               'Hub activo — monitoreo continuo'}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>
                        Flujo: ~{h.dailyFlow.toLocaleString()} personas/día
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* Reproductor */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onResetDay} title="Reiniciar" className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onTogglePlay} title={playing ? 'Pausar' : 'Reproducir'} className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white cursor-pointer">
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range" min={0} max={maxDay} value={currentDay}
            onChange={(e) => onDayChange(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full cursor-pointer accent-emerald-500 bg-slate-800"
            aria-label="Día de la simulación"
          />
          <span className="font-mono text-xs text-emerald-400 w-16 text-right shrink-0">
            Día {String(currentDay).padStart(2, '0')} / {maxDay}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-600">Vel:</span>
            {([1, 2, 5] as const).map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                  playbackSpeed === s ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-200'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="flex-1 mx-3 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-slate-600 font-mono">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
