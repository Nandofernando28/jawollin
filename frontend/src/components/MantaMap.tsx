import React, { useEffect, useMemo, useRef } from 'react';
import { Circle, GeoJSON, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import { MANTA_COORDINATES, MANTA_HUBS, MANTA_PARROQUIAS_GEO, type ParishFeatureProps } from '../data/mantaGeo';
import type { Feature, Geometry } from 'geojson';
import type { HubId, ParishId } from '../types/simulation';

// ── Configuración de tiles de CARTO con Fallback Infalible ─────────────────────
// Los marcadores son divIcon propios (sin iconos de Leaflet).
const DEFAULT_CARTO_KEY = 'cb1_4wbd_1_65f9d0e2dc755e74c2198851';
const CARTO_KEY = (import.meta.env.VITE_CARTO_API_KEY || DEFAULT_CARTO_KEY).trim();
const CARTO_STYLE = (import.meta.env.VITE_CARTO_STYLE || 'dark_all').trim();

const TILE_URL = CARTO_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/${CARTO_STYLE}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
  : `https://tile.openstreetmap.org/{z}/{x}/{y}.png`;

interface MantaMapProps {
  result?: { params: { days: number } };
  currentDay?: number;
  playing?: boolean;
  playbackSpeed?: 1 | 2 | 5;
  /** Hubs con cortafuegos (cierre o fumigación) activo en el día mostrado */
  firewallHubs?: HubId[];
  /** Hubs con vacunación en anillo de sus asistentes en el día mostrado */
  ringVaccinationHubs?: HubId[];
  /** Casos activos (Mordidos + Zombies) entre los asistentes de cada hub */
  hubCases?: Partial<Record<HubId, number>>;
  /** % de la parroquia con infección activa (Mordidos + Zombies) */
  prevalenceByParish?: Partial<Record<ParishId, number>>;
  onDayChange?: (d: number) => void;
  onTogglePlay?: () => void;
  onResetDay?: () => void;
  onSpeedChange?: (s: 1 | 2 | 5) => void;
}

// Tramos de color por % de la parroquia con infección activa (colores oficiales de la Fase 6)
const PREVALENCE_LEVELS = [
  { max: 2, color: '#10b981', label: 'Menos de 2%' },
  { max: 10, color: '#f59e0b', label: 'De 2% a 10%' },
  { max: Infinity, color: '#ef4444', label: 'Más de 10%' },
];

const prevalenceColor = (pct: number) =>
  (PREVALENCE_LEVELS.find((l) => pct < l.max) ?? PREVALENCE_LEVELS[PREVALENCE_LEVELS.length - 1]).color;

type HubStatus = 'firewall' | 'ring' | 'open';

const HUB_STATUS_LABEL: Record<HubStatus, string> = {
  firewall: 'Cortafuegos activo',
  ring: 'Vacunación en anillo hoy',
  open: 'Abierto',
};

const buildHubIcon = (status: HubStatus) => {
  const html = status === 'ring'
    ? `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;border:3px solid white;background:#10b981;box-shadow:0 0 0 8px rgba(16,185,129,0.18),0 8px 20px rgba(16,185,129,0.28);">
        <span style="position:absolute;inset:-6px;border-radius:9999px;border:2px dashed rgba(16,185,129,0.8);animation:ping 1.8s ease-out infinite;"></span>
        <span style="width:8px;height:8px;border-radius:9999px;background:white;display:block;"></span>
      </span>
    `
    : status === 'firewall'
    ? `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;border:3px solid #44b48b;background:#1e4199;box-shadow:0 0 0 6px rgba(30,65,153,0.12),0 8px 20px rgba(30,65,153,0.25);">
        <span style="position:absolute;inset:-2px;border-radius:9999px;border:2px solid rgba(30,65,153,0.45);animation:ping 1.6s ease-out infinite;"></span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12.5 9 16l10-10"/>
        </svg>
      </span>
    `
    : `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;border:3px solid white;background:#ec652b;box-shadow:0 0 0 8px rgba(236,101,43,0.18),0 8px 20px rgba(236,101,43,0.28);">
        <span style="position:absolute;inset:-3px;border-radius:9999px;border:2px solid rgba(236,101,43,0.55);animation:ping 1.8s ease-out infinite;"></span>
        <span style="width:8px;height:8px;border-radius:9999px;background:white;display:block;"></span>
      </span>
    `;

  return L.divIcon({
    className: 'hub-pin',
    html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
};

export const MantaMap: React.FC<MantaMapProps> = ({
  result,
  currentDay = 1,
  playing = false,
  playbackSpeed = 1,
  firewallHubs = [],
  ringVaccinationHubs = [],
  hubCases = {},
  prevalenceByParish = {},
  onDayChange,
  onTogglePlay,
  onResetDay,
  onSpeedChange,
}) => {
  const maxDay = result?.params?.days ?? 30;
  const mapRef = useRef<L.Map | null>(null);
  const dayPercent = (currentDay / maxDay) * 100;

  // Recalcula el tamaño del mapa al montarse y al cambiar de día o de reproducción
  useEffect(() => {
    if (!mapRef.current) return;

    const frame = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 0);

    return () => window.clearTimeout(frame);
  }, [currentDay, playing]);

  const parishStyle = useMemo(
    () => (feature?: Feature<Geometry, ParishFeatureProps>) => ({
      fillColor: prevalenceColor(feature ? prevalenceByParish[feature.properties.parish_id] ?? 0 : 0),
      weight: 1.5,
      opacity: 0.8,
      color: '#167e6c',
      fillOpacity: 0.32,
    }),
    [prevalenceByParish],
  );

  const hubStatus = (id: HubId): HubStatus =>
    firewallHubs.includes(id) ? 'firewall' : ringVaccinationHubs.includes(id) ? 'ring' : 'open';

  return (
    <div className="relative z-10 isolate h-[650px] w-full overflow-hidden rounded-lg border border-[#e3e4e8] bg-white shadow-sm">
      <div className="absolute left-4 top-4 z-20 w-[min(100%,320px)] max-w-sm rounded-lg border border-[#e3e4e8] bg-white/95 p-4 shadow-md backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Timeline</p>
              <p className="text-sm font-semibold text-[#111a4a]">Día {currentDay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]"
              aria-label={playing ? 'Pausar reproducción' : 'Reproducir'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={onResetDay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]"
              aria-label="Reiniciar día"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={maxDay}
            step={1}
            value={currentDay}
            onChange={(e) => onDayChange?.(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
            style={{
              background: `linear-gradient(to right, #167e6c 0%, #167e6c ${dayPercent}%, #e3e4e8 ${dayPercent}%, #e3e4e8 100%)`,
            }}
            aria-label="Control de días"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#7c7f88]">
            <span>0</span>
            <span>{maxDay} días</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange?.(speed as 1 | 2 | 5)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                playbackSpeed === speed ? 'bg-[#111a4a] text-white' : 'bg-[#f6f6f8] text-[#7c7f88]'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <MapContainer
        key="manta-leaflet-map"
        center={MANTA_COORDINATES.center}
        zoom={MANTA_COORDINATES.defaultZoom}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        ref={(instance) => {
          mapRef.current = instance ?? null;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={TILE_URL}
          subdomains="abcd"
          maxZoom={19}
        />

        <GeoJSON key={`geojson-day-${currentDay}`} data={MANTA_PARROQUIAS_GEO} style={parishStyle} />

        {MANTA_HUBS.map((hub) => {
          const status = hubStatus(hub.id);
          const ringColor = status === 'firewall' ? '#1e4199' : status === 'ring' ? '#10b981' : '#ec652b';
          return (
            <React.Fragment key={hub.id}>
              <Circle
                center={hub.coords}
                radius={status === 'firewall' ? 500 : 700}
                pathOptions={{ color: ringColor, fillColor: ringColor, fillOpacity: 0.15, weight: 1.2 }}
              />
              <Marker position={hub.coords} icon={buildHubIcon(status)}>
                <Popup>
                  <div className="p-1 text-[#111a4a]">
                    <h4 className="text-sm font-semibold">{hub.name}</h4>
                    <p className="mt-1 text-xs text-[#3b3e47]">{hub.description}</p>
                    <p className="mt-2 text-xs text-[#3b3e47]">
                      Casos activos hoy: <b className="font-mono">{hubCases[hub.id] ?? 0}</b>
                    </p>
                    <div className="mt-1 text-xs font-semibold" style={{ color: ringColor }}>
                      {HUB_STATUS_LABEL[status]}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-20 rounded-lg border border-[#e3e4e8] bg-white/95 p-3 text-[11px] text-[#3b3e47] shadow-md">
        <p className="mb-1.5 font-semibold text-[#111a4a]">Parroquias: % con infección activa</p>
        {PREVALENCE_LEVELS.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
        <p className="mb-1 mt-2 font-semibold text-[#111a4a]">Hubs</p>
        {(['firewall', 'ring', 'open'] as HubStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: s === 'firewall' ? '#1e4199' : s === 'ring' ? '#10b981' : '#ec652b' }}
            />
            {HUB_STATUS_LABEL[s]}
          </div>
        ))}
      </div>
    </div>
  );
};
